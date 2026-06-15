import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAdminOrCron } from "../_shared/auth-guard.ts";
import { sendSms, isMobilePhone } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    const authError = await requireAdminOrCron(req, corsHeaders);
    if (authError) return authError;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const now = new Date().toISOString();

    // ONLY process review requests that were manually scheduled via the consultation form
    const { data: pending, error } = await supabase
      .from("scheduled_communications")
      .select("id, appointment_id, channel, recipient_name, recipient_email, recipient_phone")
      .eq("trigger_type", "review_request")
      .eq("status", "pending")
      .lte("scheduled_for", now);

    if (error) {
      console.error("Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scheduled review requests to process", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch templates
    const { data: emailTpl } = await supabase
      .from("email_templates")
      .select("subject, body_html")
      .eq("trigger_type", "review_request")
      .eq("is_active", true)
      .limit(1)
      .single();

    const { data: smsTpl } = await supabase
      .from("sms_templates")
      .select("body_text")
      .eq("trigger_type", "review_request")
      .eq("is_active", true)
      .limit(1)
      .single();

    let emailsSent = 0;
    let smsSent = 0;

    for (const comm of pending) {
      const clientName = comm.recipient_name || "there";

      if (comm.channel === "email" && resendApiKey && emailTpl) {
        const html = emailTpl.body_html.replace(/\{\{client_name\}\}/g, clientName);
        const subject = emailTpl.subject.replace(/\{\{client_name\}\}/g, clientName);

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "ShawScope <bookings@shawscope.co.uk>",
              to: [comm.recipient_email],
              reply_to: "matt@shawscope.co.uk",
              subject,
              html,
            }),
          });

          const ok = res.ok;
          if (ok) emailsSent++;

          await supabase.from("communications_log").insert({
            channel: "email",
            recipient_name: clientName,
            recipient_email: comm.recipient_email,
            subject,
            body_preview: "Review request",
            body_html: html,
            trigger_type: "review_request",
            appointment_id: comm.appointment_id,
            status: ok ? "sent" : "failed",
          });
        } catch (e) {
          console.error("Email send error:", e);
        }
      }

      if (comm.channel === "sms" && smsTpl && comm.recipient_phone && isMobilePhone(comm.recipient_phone)) {
        const message = smsTpl.body_text.replace(/\{\{client_name\}\}/g, clientName);
        try {
          const result = await sendSms(comm.recipient_phone, message + "\n\n(No-Reply)");
          const ok = result.ok;
          if (ok) smsSent++;

          await supabase.from("communications_log").insert({
            channel: "sms",
            recipient_name: clientName,
            recipient_phone: comm.recipient_phone,
            subject: "Review request SMS",
            body_preview: message.slice(0, 200),
            body_html: message,
            trigger_type: "review_request",
            appointment_id: comm.appointment_id,
            status: ok ? "sent" : "failed",
          });
        } catch (e) {
          console.error("SMS send error:", e);
        }
      }

      // Mark scheduled comm as sent
      await supabase
        .from("scheduled_communications")
        .update({ status: "sent", sent_at: now })
        .eq("id", comm.id);

      // Mark appointment review_request_sent_at
      if (comm.appointment_id) {
        await supabase
          .from("appointments")
          .update({ review_request_sent_at: now })
          .eq("id", comm.appointment_id);
      }
    }

    return new Response(
      JSON.stringify({ message: "Review requests processed", emailsSent, smsSent, total: pending.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
