import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendSms, isMobilePhone, normalisePhoneForSmsWorks } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalisePhone = normalisePhoneForSmsWorks;
const compactVisitToken = (token: string | null | undefined) => (token || "").split("-")[0];

/* ── Branded email wrapper ── */
function brandWrap(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">A Home Visiting Service</p>
    </div>
    <div style="padding:32px 28px;">
      ${content}
    </div>
    <div style="border-top:1px solid #E5E7EB;margin:0 28px;padding-top:20px;text-align:center;">
      <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/>
      <a href="mailto:matt@shawscope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shawscope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
    </div>
    <div style="background-color:#0E1420;padding:16px 24px;text-align:center;margin-top:24px;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Dorchester, Dorset · <a href="https://shawscope.co.uk" style="color:#D4912A;text-decoration:none;">shawscope.co.uk</a></p>
      <p style="color:#6B7280;font-size:10px;margin:8px 0 0;line-height:1.4;">⚠️ No Reply — This is an automated system message. Replies are not monitored.<br/>Contact us: <a href="tel:01305340194" style="color:#7A8494;">01305 340 194</a> · <a href="mailto:matt@shawscope.co.uk" style="color:#7A8494;">matt@shawscope.co.uk</a></p>
    </div>
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

    const { appointmentId, etaMinutes: manualEta } = await req.json();
    if (!appointmentId) {
      return new Response(JSON.stringify({ error: "Missing appointmentId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: apt } = await sb.from("appointments")
      .select("id, client_name, client_email, client_phone, appointment_date, appointment_time, postcode, access_token")
      .eq("id", appointmentId)
      .single();

    if (!apt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName = apt.client_name.split(" ")[0];
    const trackingUrl = `https://shawscope.co.uk/visit-tracking/${apt.access_token}`;
    const smsTrackingUrl = `https://shawscope.co.uk/visit-tracking/${compactVisitToken(apt.access_token)}`;

    const etaMinutes = typeof manualEta === "number" && manualEta > 0 ? Math.round(manualEta) : 10;
    const etaText = `~${etaMinutes} min`;
    const etaLine = `Updated ETA: ${etaText}`;

    const arrivalTime = new Date(Date.now() + etaMinutes * 60 * 1000).toISOString();

    await sb.from("appointments")
      .update({ delay_notified_at: new Date().toISOString(), delay_eta_arrival: arrivalTime })
      .eq("id", apt.id);

    // Send SMS
    let smsSent = false;
    let smsError: string | null = null;

    if (apt.client_phone && isMobilePhone(apt.client_phone)) {
      {
        // Fetch SMS template from DB
        const { data: smsTpl } = await sb
          .from("sms_templates")
          .select("body_text")
          .eq("trigger_type", "delay_notification")
          .eq("is_active", true)
          .maybeSingle();

        const templateText = smsTpl?.body_text || `Hi {{client_name}}, Matt from ShawScope here. I'm running a little behind due to traffic but I'm still on my way to you! 🚗\n\n{{eta_line}}\n\nI'll be with you as soon as I can. Sorry for the slight delay.\n\nTrack live: {{tracking_url}}`;
        const smsBody = templateText
          .replace(/\{\{client_name\}\}/g, firstName)
          .replace(/\{\{eta\}\}/g, etaText)
          .replace(/\{\{eta_line\}\}/g, etaLine)
          .replace(/\{\{tracking_url\}\}/g, smsTrackingUrl);

        try {
          const result = await sendSms(apt.client_phone, smsBody + "\n\n(No-Reply)");
          smsSent = result.ok;
          if (!result.ok) {
            smsError = typeof result.body === "string" ? result.body : JSON.stringify(result.body);
            console.error("Delay SMS send failed:", smsError);
          }
        } catch (e) {
          smsError = e instanceof Error ? e.message : String(e);
          console.error("SMS error:", e);
        }
      }
    }

    if (apt.client_phone && !smsSent) {
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to send delay SMS",
        details: smsError || "Unknown SMS provider error",
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send Email
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (RESEND_API_KEY && apt.client_email) {
      // Fetch email template from DB
      const { data: emailTpl } = await sb
        .from("email_templates")
        .select("body_html, subject")
        .eq("trigger_type", "delay_notification")
        .eq("is_active", true)
        .maybeSingle();

      const vars: Record<string, string> = {
        "{{client_name}}": firstName,
        "{{eta}}": etaText,
        "{{eta_line}}": etaLine,
        "{{tracking_url}}": trackingUrl,
      };

      let emailContent: string;
      let emailSubject: string;

      if (emailTpl) {
        emailContent = emailTpl.body_html;
        emailSubject = emailTpl.subject;
        for (const [k, v] of Object.entries(vars)) {
          emailContent = emailContent.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
          emailSubject = emailSubject.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
        }
      } else {
        emailContent = `
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:32px;margin:0 0 12px;">🚗</div>
            <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">Slight Delay — Still on my way!</h2>
            <p style="color:#6B7280;margin:0;font-size:14px;">${etaLine}</p>
          </div>
          <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.7;">
            Hi ${firstName}, I'm running a little behind schedule due to traffic, but I'm still on my way to you. I'll be with you as soon as possible — apologies for the slight delay!
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.7;">
            You can track my progress in real-time below.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${trackingUrl}" style="display:inline-block;background-color:#D4912A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">📍&nbsp;&nbsp;Track Matt's Progress</a>
          </div>`;
        emailSubject = `Slight delay — Matt is still on his way (${etaText}) 🚗`;
      }

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
            to: [apt.client_email],
            subject: emailSubject,
            html: emailHtml,
          }),
        });
        emailSent = res.ok;
      } catch (e) {
        console.error("Email error:", e);
      }
    }

    // Log
    const logEntries = [];
    if (smsSent) {
      logEntries.push({
        appointment_id: apt.id,
        channel: "sms",
        trigger_type: "delay_notification",
        recipient_name: apt.client_name,
        recipient_phone: apt.client_phone,
        body_preview: `Delay notification sent (${etaText})`,
        status: "sent",
      });
    }
    if (emailSent) {
      logEntries.push({
        appointment_id: apt.id,
        channel: "email",
        trigger_type: "delay_notification",
        recipient_name: apt.client_name,
        recipient_email: apt.client_email,
        subject: "Slight delay — Matt is still on his way!",
        body_preview: `Delay notification sent (${etaText})`,
        status: "sent",
      });
    }
    if (logEntries.length > 0) {
      await sb.from("communications_log").insert(logEntries);
    }

    return new Response(JSON.stringify({
      success: true,
      sms_sent: smsSent,
      email_sent: emailSent,
      eta_text: etaText,
      eta_minutes: etaMinutes,
      arrival_time: arrivalTime,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-delay error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
