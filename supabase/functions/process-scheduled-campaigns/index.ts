import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAdminOrCron } from "../_shared/auth-guard.ts";
import { sendSms, isMobilePhone } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    const authError = await requireAdminOrCron(req, corsHeaders);
    if (authError) return authError;
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get today's date in YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];

    // Fetch all pending batches due today or earlier
    const { data: batches, error: fetchErr } = await supabaseAdmin
      .from("scheduled_campaign_batches")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_date", today)
      .order("scheduled_date")
      .limit(10);

    if (fetchErr) throw fetchErr;
    if (!batches || batches.length === 0) {
      return new Response(JSON.stringify({ message: "No batches due", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let totalProcessed = 0;

    for (const batch of batches) {
      // Mark as in-progress
      await supabaseAdmin
        .from("scheduled_campaign_batches")
        .update({ status: "sending" })
        .eq("id", batch.id);

      const recipients = batch.recipients as { name: string; email?: string; phone?: string }[];
      const results: { recipient: string; success: boolean; error?: string; email?: string; phone?: string }[] = [];

      if (batch.channel === "sms") {
        if (!Deno.env.get("THESMSWORKS_JWT")) {
          await supabaseAdmin.from("scheduled_campaign_batches").update({
            status: "failed", failed_count: recipients.length,
          }).eq("id", batch.id);
          continue;
        }

        for (let i = 0; i < recipients.length; i++) {
          const r = recipients[i];
          if (!r.phone) { results.push({ recipient: r.name, success: false, error: "No phone", phone: r.phone }); continue; }
          if (!isMobilePhone(r.phone)) { results.push({ recipient: r.name, success: false, error: "Landline — SMS skipped", phone: r.phone }); continue; }
          try {
            if (i > 0) await delay(4000);
            const personalMsg = (batch.body_html || "")
              .replace(/\{\{name\}\}/gi, r.name)
              .replace(/\{\{first_name\}\}/gi, r.name.split(" ")[0]);

            const res = await sendSms(r.phone, personalMsg + "\n\n(No-Reply)");
            if (res.ok) {
              results.push({ recipient: r.name, success: true, phone: r.phone });
            } else {
              results.push({ recipient: r.name, success: false, error: res.body?.error || `HTTP ${res.status}`, phone: r.phone });
            }
          } catch (e: any) {
            results.push({ recipient: r.name, success: false, error: e.message, phone: r.phone });
          }
        }
      } else if (batch.channel === "email") {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
          await supabaseAdmin.from("scheduled_campaign_batches").update({
            status: "failed", failed_count: recipients.length,
          }).eq("id", batch.id);
          continue;
        }

        for (let i = 0; i < recipients.length; i++) {
          const r = recipients[i];
          if (!r.email) { results.push({ recipient: r.name, success: false, error: "No email", email: r.email }); continue; }
          try {
            if (i > 0) await delay(4000);
            const personalBody = (batch.body_html || "")
              .replace(/\{\{name\}\}/gi, r.name)
              .replace(/\{\{first_name\}\}/gi, r.name.split(" ")[0])
              .replace(/\{\{name_url\}\}/gi, encodeURIComponent(r.name || ""))
              .replace(/\{\{email_url\}\}/gi, encodeURIComponent(r.email || ""));

            const personalSubject = (batch.subject || "Update from ShawScope")
              .replace(/\{\{name\}\}/gi, r.name)
              .replace(/\{\{first_name\}\}/gi, r.name.split(" ")[0]);

            // Strip old unsub links, add new
            let bodyWithUnsub = personalBody
              .replace(/<p[^>]*>.*?unsubscrib.*?<\/p>/gi, "")
              .replace(/You opted in to marketing emails\.?\s*Reply to unsubscribe\.?/gi, "")
              .replace(/You're receiving this because you opted in to marketing emails\.?\s*If you'd like to unsubscribe,?\s*please reply to this email\.?/gi, "");
            bodyWithUnsub += `<div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e7e5e4;"><a href="https://shawscope.co.uk/unsubscribe" style="color:#a8a29e;font-size:11px;text-decoration:underline;">Unsubscribe from marketing emails</a></div>`;

            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
            body: JSON.stringify({
              from: "ShawScope <bookings@shawscope.co.uk>",
              to: [r.email],
              reply_to: "matt@shawscope.co.uk",
              subject: personalSubject,
              html: bodyWithUnsub,
              tags: [{ name: "category", value: "marketing" }],
            }),
            });
            if (res.ok) {
              results.push({ recipient: r.name, success: true, email: r.email });
            } else {
              const errData = await res.json();
              results.push({ recipient: r.name, success: false, error: errData.message || `HTTP ${res.status}`, email: r.email });
            }
          } catch (e: any) {
            results.push({ recipient: r.name, success: false, error: e.message, email: r.email });
          }
        }
      }

      const sentCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      const failedRecipients = results
        .filter(r => !r.success)
        .map(r => ({ name: r.recipient, email: r.email || null, phone: r.phone || null, error: r.error || null }));

      // Update batch status
      await supabaseAdmin.from("scheduled_campaign_batches").update({
        status: "sent",
        sent_count: sentCount,
        failed_count: failedCount,
        failed_recipients: failedRecipients,
      }).eq("id", batch.id);

      // Log to communications_log and marketing_campaigns
      await Promise.all([
        supabaseAdmin.from("communications_log").insert({
          channel: batch.channel,
          trigger_type: "scheduled_campaign",
          recipient_name: `${batch.campaign_name} (Batch ${batch.batch_number}/${batch.total_batches})`,
          recipient_email: batch.channel === "email" ? `${sentCount} recipients` : null,
          recipient_phone: batch.channel === "sms" ? `${sentCount} recipients` : null,
          subject: batch.subject || null,
          body_preview: (batch.body_html || "").substring(0, 200),
          status: sentCount === recipients.length ? "sent" : sentCount > 0 ? "partial" : "failed",
        }),
        supabaseAdmin.from("marketing_campaigns").insert({
          campaign_name: `${batch.campaign_name} (Batch ${batch.batch_number}/${batch.total_batches})`,
          channel: batch.channel,
          subject: batch.subject || null,
          body_preview: (batch.body_html || "").substring(0, 300),
          body_html: batch.body_html,
          recipient_count: recipients.length,
          sent_count: sentCount,
          failed_count: failedCount,
          failed_recipients: failedRecipients,
        }),
      ]);

      totalProcessed++;
    }

    return new Response(JSON.stringify({
      success: true,
      processed: totalProcessed,
      batchIds: batches.map(b => b.id),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Scheduled campaign error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
