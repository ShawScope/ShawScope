import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendSms } from "../_shared/sms.ts";

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
    // Auth check — admin only
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { channel, recipients, subject, messageBody, campaignName, skipCampaignLog } = body;
    // recipients: Array<{ name: string; email?: string; phone?: string }>
    // channel: "sms" | "email"

    if (!channel || !recipients?.length || !messageBody) {
      return new Response(JSON.stringify({ error: "channel, recipients, and messageBody are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { recipient: string; success: boolean; error?: string; email?: string; phone?: string }[] = [];

    // Helper: delay between sends to avoid rate limits
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    if (channel === "sms") {
      if (!Deno.env.get("THESMSWORKS_JWT")) {
        return new Response(JSON.stringify({ error: "SMS provider not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        if (!r.phone) { results.push({ recipient: r.name, success: false, error: "No phone number", phone: r.phone }); continue; }
        try {
          if (i > 0) await delay(4000); // 4s delay between sends

          const personalMsg = messageBody
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
    } else if (channel === "email") {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        if (!r.email) { results.push({ recipient: r.name, success: false, error: "No email address", email: r.email }); continue; }
        try {
          if (i > 0) await delay(4000); // 4s delay between sends

          const personalBody = messageBody
            .replace(/\{\{name\}\}/gi, r.name)
            .replace(/\{\{first_name\}\}/gi, r.name.split(" ")[0]);

          const personalSubject = (subject || "Update from ShawScope")
            .replace(/\{\{name\}\}/gi, r.name)
            .replace(/\{\{first_name\}\}/gi, r.name.split(" ")[0]);

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

    // Log to communications_log (always) and marketing_campaigns (unless client handles it)
    const successCount = results.filter(r => r.success).length;

    // Per-recipient comms log entries
    const commsEntries = results.filter(r => r.success).map(r => ({
      channel,
      trigger_type: "marketing_campaign",
      recipient_name: r.recipient,
      recipient_email: r.email || null,
      recipient_phone: r.phone || null,
      subject: subject || null,
      body_preview: messageBody.substring(0, 200),
      status: "sent",
    }));
    if (commsEntries.length) {
      await supabaseAdmin.from("communications_log").insert(commsEntries);
    }

    // Only log campaign summary if client isn't handling it
    if (!skipCampaignLog) {
      const failedRecipients = results
        .filter(r => !r.success)
        .map(r => ({ name: r.recipient, email: r.email || null, phone: r.phone || null, error: r.error || null }));
      await supabaseAdmin.from("marketing_campaigns").insert({
        campaign_name: campaignName || `Marketing ${channel.toUpperCase()}`,
        channel,
        subject: subject || null,
        body_preview: messageBody.substring(0, 300),
        body_html: messageBody,
        recipient_count: recipients.length,
        sent_count: successCount,
        failed_count: recipients.length - successCount,
        failed_recipients: failedRecipients,
      });
    }

    const failedRecipients = results
      .filter(r => !r.success)
      .map(r => ({ name: r.recipient, email: r.email || null, phone: r.phone || null, error: r.error || null }));

    return new Response(JSON.stringify({
      success: true,
      total: recipients.length,
      sent: successCount,
      failed: recipients.length - successCount,
      results,
      failedRecipients,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Marketing campaign error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
