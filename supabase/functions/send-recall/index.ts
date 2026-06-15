import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailWrap, emailIconHeading, emailButton } from "../_shared/email-layout.ts";
import { requireAdminOrCron } from "../_shared/auth-guard.ts";
import { sendSms, isMobilePhone } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";
const SITE_URL = "https://shawscope.co.uk";

function getServiceSpecificMessage(serviceName: string, clientName: string): { emailContent: string; smsText: string } {
  const lowerService = serviceName.toLowerCase();
  let healthQuestion = "We hope you've been well since your last visit.";
  
  if (lowerService.includes("ear") || lowerService.includes("wax")) {
    healthQuestion = "How have your ears and hearing been feeling since your last visit? If you've noticed any changes in your hearing, discomfort, or wax build-up, it may be time for a check-up.";
  } else if (lowerService.includes("wellness") || lowerService.includes("well-being")) {
    healthQuestion = "How have your ears and general wellbeing been since we last saw you? Regular check-ups help us keep on top of things.";
  } else if (lowerService.includes("cryo")) {
    healthQuestion = "How has the treated area been healing? If you've noticed any new skin concerns or the original issue returning, we're here to help.";
  } else if (lowerService.includes("foot")) {
    healthQuestion = "How have your feet been feeling since your last appointment? Regular foot health checks help prevent issues from developing.";
  }

  const emailContent = `
    ${emailIconHeading("🔔", `Time for a Check-Up, ${clientName}!`, `You asked us to remind you about your ${serviceName} appointment.`)}
    <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:20px;">
      <p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0;">${healthQuestion}</p>
    </div>
    ${emailButton("Book an Appointment", `${SITE_URL}/book`)}
    <p style="color:#6B7280;font-size:13px;text-align:center;margin-top:20px;">
      If you no longer need this service, simply ignore this email. We're always here if you need us!
    </p>`;

  const smsText = `Hi ${clientName}, it's ShawScope! You asked us to remind you about your ${serviceName}. ${lowerService.includes("ear") || lowerService.includes("wax") ? "How are your ears feeling?" : "Time for a check-up?"} Book online: ${SITE_URL}/book`;

  return { emailContent, smsText };
}

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

    const { data: dueRecalls, error } = await supabase
      .from("patient_recalls")
      .select("*")
      .eq("status", "pending")
      .lte("recall_date", new Date().toISOString());

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueRecalls || dueRecalls.length === 0) {
      return new Response(JSON.stringify({ message: "No recalls due", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    let sent = 0;

    for (const recall of dueRecalls) {
      const { emailContent, smsText } = getServiceSpecificMessage(
        recall.service_name || "your appointment",
        recall.client_name
      );

      const emailHtml = emailWrap(emailContent, { subtitle: "Appointment Reminder" });

      if (resendApiKey) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
            body: JSON.stringify({
              from: "ShawScope <notifications@shawscope.co.uk>",
              to: [recall.client_email],
              reply_to: "matt@shawscope.co.uk",
              subject: `Reminder: Time for your ${recall.service_name || "appointment"} — ShawScope`,
              html: emailHtml,
            }),
          });
        } catch (e) { console.error("Recall email error:", e); }

        // Admin notification
        try {
          const adminContent = `
            ${emailIconHeading("📋", "Recall Reminder Sent", "A scheduled recall has just been sent to the following patient:")}
            <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
              <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">
                <tr><td style="padding:6px 0;color:#6B7280;">Patient</td><td style="padding:6px 0;font-weight:600;color:#0E1420;text-align:right;">${recall.client_name}</td></tr>
                <tr><td style="padding:6px 0;color:#6B7280;border-top:1px solid #E5E7EB;">Email</td><td style="padding:6px 0;color:#0E1420;text-align:right;border-top:1px solid #E5E7EB;">${recall.client_email}</td></tr>
                <tr><td style="padding:6px 0;color:#6B7280;border-top:1px solid #E5E7EB;">Phone</td><td style="padding:6px 0;color:#0E1420;text-align:right;border-top:1px solid #E5E7EB;">${recall.client_phone || "N/A"}</td></tr>
                <tr><td style="padding:6px 0;color:#6B7280;border-top:1px solid #E5E7EB;">Service</td><td style="padding:6px 0;color:#0E1420;text-align:right;border-top:1px solid #E5E7EB;">${recall.service_name || "General"}</td></tr>
                <tr><td style="padding:6px 0;color:#6B7280;border-top:1px solid #E5E7EB;">Recall Period</td><td style="padding:6px 0;color:#0E1420;text-align:right;border-top:1px solid #E5E7EB;">${recall.recall_months} months</td></tr>
              </table>
            </div>
            <p style="color:#6B7280;font-size:12px;">Channels used: Email${recall.client_phone ? " + SMS" : ""}</p>`;

          const adminHtml = emailWrap(adminContent, { subtitle: "Recall Notification", noReply: false });

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
            body: JSON.stringify({
              from: "ShawScope <notifications@shawscope.co.uk>",
              to: [ADMIN_EMAIL],
              subject: `📋 Recall Sent: ${recall.client_name} — ${recall.service_name}`,
              html: adminHtml,
            }),
          });
        } catch (e) { console.error("Admin notification error:", e); }
      }

      // Send SMS
      if (recall.client_phone && isMobilePhone(recall.client_phone)) {
        try {
          await sendSms(recall.client_phone, smsText + "\n\n(No-Reply)");
        } catch (e) { console.error("Recall SMS error:", e); }
      }

      await supabase
        .from("patient_recalls")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", recall.id);

      try {
        await supabase.from("communications_log").insert({
          channel: "email",
          recipient_name: recall.client_name,
          recipient_email: recall.client_email,
          recipient_phone: recall.client_phone,
          subject: `Recall: ${recall.service_name}`,
          body_preview: `Recall reminder for ${recall.service_name} sent after ${recall.recall_months} months`,
          trigger_type: "patient_recall",
          status: "sent",
        });
      } catch (_) {}

      sent++;
    }

    return new Response(
      JSON.stringify({ message: "Recalls processed", sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
