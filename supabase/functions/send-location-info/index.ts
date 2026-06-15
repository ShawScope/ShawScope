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

/* ── Branded email building blocks ── */
const BRAND_HEADER = `
<div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
  </tr></table>
  <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">Your Appointment Location</p>
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { appointmentId, testMode = false } = await req.json();
    if (!appointmentId) {
      return new Response(JSON.stringify({ error: "Missing appointmentId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: apt } = await sb
      .from("appointments")
      .select("id, client_name, client_email, client_phone, appointment_date, appointment_time, service_id, access_token")
      .eq("id", appointmentId)
      .single();

    if (!apt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName = apt.client_name.split(" ")[0];
    let serviceName = "your appointment";
    if (apt.service_id) {
      const { data: svc } = await sb.from("services").select("name").eq("id", apt.service_id).maybeSingle();
      if (svc?.name) serviceName = svc.name;
    }

    const rawDate = apt.appointment_date;
    const dateParts = rawDate?.split("-");
    const dateStr = dateParts?.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate || "";
    const timeStr = apt.appointment_time?.slice(0, 5) || "";
    const locationUrl = `${SITE_URL}/location-info/${apt.access_token}`;
    const recipientName = testMode ? "Matt Shaw" : apt.client_name;
    const recipientEmail = testMode ? "matt@shawscope.co.uk" : apt.client_email;
    const recipientPhone = testMode ? "+447444653593" : apt.client_phone;
    const subjectPrefix = testMode ? "[TEST] " : "";

    // ── SMS (short) ──
    let smsSent = false;

    const smsBody = `Hi ${firstName}, your ${serviceName} is on ${dateStr} at ${timeStr} at our Broadmayne location 🏠\n\nAddress, parking, photos & directions:\n${locationUrl}\n\nQuestions? 01305 340 194\n\nMatt — ShawScope`;
    const smsLogBody = smsBody + "\n\n(No-Reply)";

    if (recipientPhone && isMobilePhone(recipientPhone)) {
      try {
        const result = await sendSms(recipientPhone, smsLogBody);
        smsSent = result.ok;
        if (!result.ok) console.error("Location SMS failed:", JSON.stringify(result.body));
      } catch (e) { console.error("Location SMS error:", e); }
    }

    // ── Email (short) ──
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (RESEND_API_KEY && recipientEmail) {
      const emailContent = `
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:32px;margin:0 0 12px;">🏠</div>
          <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">Your Appointment Location</h2>
        </div>

        <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:14px;color:#4B5563;"><strong>📅 Date:</strong> ${dateStr}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#4B5563;"><strong>🕐 Time:</strong> ${timeStr}</p>
          <p style="margin:0;font-size:14px;color:#4B5563;"><strong>🩺 Service:</strong> ${serviceName}</p>
        </div>

        <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.7;">
          Hi ${firstName}, your appointment will be at our Broadmayne location. We've put together a page with the address, parking details, photos, and a map to help you find us easily.
        </p>

        <div style="text-align:center;margin:24px 0;">
          <a href="${locationUrl}" style="display:inline-block;background-color:#D4912A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">📍&nbsp;&nbsp;View Location Details</a>
        </div>

        <div style="border-top:1px solid #E5E7EB;margin-top:24px;padding-top:20px;text-align:center;">
          <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/>
          <a href="mailto:matt@shawscope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shawscope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
        </div>`;

      const emailHtml = brandWrap(emailContent);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ShawScope <notifications@shawscope.co.uk>",
            to: [recipientEmail],
            subject: `${subjectPrefix}Your Appointment Location — ShawScope 🏠`,
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
        appointment_id: apt.id, channel: "sms", trigger_type: "location_info",
        recipient_name: recipientName, recipient_phone: recipientPhone,
        recipient_email: recipientEmail, body_preview: smsBody.slice(0, 200), body_html: smsLogBody, status: "sent",
      });
    }
    if (emailSent) {
      logEntries.push({
        appointment_id: apt.id, channel: "email", trigger_type: "location_info",
        recipient_name: recipientName, recipient_email: recipientEmail,
        subject: `${subjectPrefix}Your Appointment Location — ShawScope`, body_preview: "Location info link sent", body_html: emailHtml, status: "sent",
      });
    }
    if (logEntries.length > 0) {
      await sb.from("communications_log").insert(logEntries);
    }

    return new Response(
      JSON.stringify({ success: true, sms_sent: smsSent, email_sent: emailSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-location-info error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
