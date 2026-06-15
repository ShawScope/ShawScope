import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendSms, isMobilePhone, normalisePhoneForSmsWorks } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://shawscope.co.uk";

const normalisePhone = normalisePhoneForSmsWorks;

/* ── Branded email ── */
const BRAND_HEADER = `
<div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
  </tr></table>
  <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">Your Appointment</p>
</div>`;

const BRAND_FOOTER = `
<div style="background-color:#0E1420;padding:16px 24px;text-align:center;">
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
  </tr></table>
  <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Dorchester, Dorset · <a href="https://shawscope.co.uk" style="color:#D4912A;text-decoration:none;">shawscope.co.uk</a></p>
  <p style="color:#6B7280;font-size:10px;margin:8px 0 0;line-height:1.4;">⚠️ No Reply — This is an automated system message. Replies are not monitored.<br/>Contact us: <a href="tel:01305340194" style="color:#7A8494;">01305 340 194</a> · <a href="mailto:matt@shawscope.co.uk" style="color:#7A8494;">matt@shawscope.co.uk</a></p>
</div>`;

function brandWrap(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    ${BRAND_HEADER}
    <div style="padding:32px 28px;">${content}</div>
    ${BRAND_FOOTER}
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sbUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await sbUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { appointmentId, readyFromTime } = await req.json();
    if (!appointmentId) {
      return new Response(JSON.stringify({ error: "Missing appointmentId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: apt } = await sb.from("appointments")
      .select("id, client_name, client_email, client_phone, appointment_date, appointment_time, service_id, access_token, come_to_practitioner")
      .eq("id", appointmentId)
      .single();

    if (!apt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set ready_from_time on appointment
    const readyTime = readyFromTime || new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    await sb.from("appointments").update({ ready_from_time: readyTime }).eq("id", apt.id);

    const firstName = apt.client_name.split(" ")[0];
    let serviceName = "your appointment";
    if (apt.service_id) {
      const { data: svc } = await sb.from("services").select("name").eq("id", apt.service_id).maybeSingle();
      if (svc?.name) serviceName = svc.name;
    }

    const readyTimeDisplay = readyTime.slice(0, 5);
    const aptTimeDisplay = apt.appointment_time?.slice(0, 5) || "";
    const trackingUrl = `${SITE_URL}/visit-tracking/${apt.access_token}`;
    const locationUrl = `${SITE_URL}/location-info/${apt.access_token}`;

    // ── SMS ──
    let smsSent = false;

    const smsBody = `Hi ${firstName}, we're ready for you! 🏠\n\nYou can arrive anytime from ${readyTimeDisplay} up to your appointment at ${aptTimeDisplay}.\n\nTrack status: ${trackingUrl}\n\nAddress & directions: ${locationUrl}\n\nQuestions? 01305 340 194\n\nMatt — ShawScope`;
    const smsLogBody = smsBody + "\n\n(No-Reply)";

    if (apt.client_phone && isMobilePhone(apt.client_phone)) {
      try {
        const result = await sendSms(apt.client_phone, smsLogBody);
        smsSent = result.ok;
        if (!result.ok) console.error("Clinic-ready SMS failed:", JSON.stringify(result.body));
      } catch (e) { console.error("Clinic-ready SMS error:", e); }
    }

    // ── Email ──
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;
    let emailHtml = "";

    if (RESEND_API_KEY && apt.client_email) {
      const emailContent = `
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:32px;margin:0 0 12px;">🏠</div>
          <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">We're Ready for You!</h2>
          <p style="color:#6B7280;margin:0;font-size:14px;">You can arrive anytime from <strong style="color:#D4912A;">${readyTimeDisplay}</strong></p>
        </div>

        <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:14px;color:#4B5563;"><strong>🩺 Service:</strong> ${serviceName}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#4B5563;"><strong>🕐 Your appointment:</strong> ${aptTimeDisplay}</p>
          <p style="margin:0;font-size:14px;color:#4B5563;"><strong>✅ Ready from:</strong> ${readyTimeDisplay}</p>
        </div>

        <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.7;">
          Hi ${firstName}, Matt is ready and you're welcome to arrive anytime from ${readyTimeDisplay} up to your scheduled appointment at ${aptTimeDisplay}.
        </p>

        <div style="text-align:center;margin:24px 0;">
          <a href="${trackingUrl}" style="display:inline-block;background-color:#D4912A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">📍&nbsp;&nbsp;Track Your Appointment</a>
        </div>

        <div style="text-align:center;margin:16px 0;">
          <a href="${locationUrl}" style="display:inline-block;background-color:#0E1420;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">🗺️&nbsp;&nbsp;View Address & Directions</a>
        </div>

        <div style="border-top:1px solid #E5E7EB;margin-top:24px;padding-top:20px;text-align:center;">
          <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/>
          <a href="mailto:matt@shawscope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shawscope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
        </div>`;

      emailHtml = brandWrap(emailContent);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ShawScope <notifications@shawscope.co.uk>",
            to: [apt.client_email],
            subject: `We're Ready for You! Arrive from ${readyTimeDisplay} 🏠`,
            html: emailHtml,
          }),
        });
        emailSent = res.ok;
        if (!res.ok) console.error("Email send failed:", await res.text());
      } catch (e) {
        console.error("Email error:", e);
      }
    }

    // Log communications
    const logEntries: any[] = [];
    if (smsSent) {
      logEntries.push({
        appointment_id: apt.id, channel: "sms", trigger_type: "clinic_ready",
        recipient_name: apt.client_name, recipient_phone: apt.client_phone,
        recipient_email: apt.client_email, body_preview: smsBody.slice(0, 200), body_html: smsLogBody, status: "sent",
      });
    }
    if (emailSent) {
      logEntries.push({
        appointment_id: apt.id, channel: "email", trigger_type: "clinic_ready",
        recipient_name: apt.client_name, recipient_email: apt.client_email,
        subject: `We're Ready for You! Arrive from ${readyTimeDisplay}`,
        body_preview: `Ready from ${readyTimeDisplay} — tracking link sent`, body_html: emailHtml, status: "sent",
      });
    }
    if (logEntries.length > 0) {
      await sb.from("communications_log").insert(logEntries);
    }

    return new Response(
      JSON.stringify({ success: true, sms_sent: smsSent, email_sent: emailSent, ready_from: readyTime }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("clinic-ready error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
