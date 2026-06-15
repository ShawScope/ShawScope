import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendSms, isMobilePhone, normalisePhoneForSmsWorks } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalisePhone = normalisePhoneForSmsWorks;
const compactVisitToken = (token: string | null | undefined) => (token || "").split("-")[0];

/* ── Branded email building blocks ── */
const BRAND_HEADER = `
<div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
  </tr></table>
  <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">A Home Visiting Service</p>
</div>`;

const BRAND_SIGN_OFF = `
<div style="border-top:1px solid #E5E7EB;margin-top:24px;padding-top:20px;text-align:center;">
  <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/>
  <a href="mailto:matt@shawscope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shawscope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
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

function brandWrap(content: string, subtitle?: string): string {
  const header = subtitle
    ? BRAND_HEADER.replace('A Home Visiting Service', subtitle)
    : BRAND_HEADER;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    ${header}
    <div style="padding:32px 28px;">
      ${content}
    </div>
    ${BRAND_SIGN_OFF}
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

    // Verify admin
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

    const { appointmentId, etaOverrideMinutes, markArrived } = await req.json();
    if (!appointmentId) {
      return new Response(JSON.stringify({ error: "Missing appointmentId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (markArrived === true) {
      const { data: aptArrived } = await sb.from("appointments")
        .select("id, client_name, client_email")
        .eq("id", appointmentId)
        .single();

      if (!aptArrived) {
        return new Response(JSON.stringify({ error: "Appointment not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: logErr } = await sb.from("communications_log").insert({
        appointment_id: aptArrived.id,
        channel: "system",
        trigger_type: "arrived",
        recipient_name: aptArrived.client_name,
        recipient_email: aptArrived.client_email,
        body_preview: `Practitioner arrived at ${aptArrived.client_name}`,
        status: "sent",
      });
      if (logErr) throw logErr;

      const { error: aptErr } = await sb
        .from("appointments")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", aptArrived.id);
      if (aptErr) throw aptErr;

      return new Response(JSON.stringify({ success: true, arrived: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get appointment
    const { data: apt } = await sb.from("appointments")
      .select("id, client_name, client_email, client_phone, appointment_date, appointment_time, postcode, address, access_token, service_id, come_to_practitioner")
      .eq("id", appointmentId)
      .single();

    if (!apt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip OMW notifications for patients coming to practitioner
    if (apt.come_to_practitioner) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "Patient coming to practitioner — no OMW needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get service name
    let serviceName = "your appointment";
    if (apt.service_id) {
      const { data: svc } = await sb.from("services").select("name").eq("id", apt.service_id).maybeSingle();
      if (svc?.name) serviceName = svc.name;
    }

    // Calculate ETA
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    let etaMinutes: number | null = null;
    let etaText = "shortly";

    if (typeof etaOverrideMinutes === "number" && etaOverrideMinutes > 0) {
      etaMinutes = etaOverrideMinutes;
    } else if (GOOGLE_MAPS_API_KEY && apt.postcode) {
      const BASE_POSTCODE = "DT2 8DG";
      let originPostcode = BASE_POSTCODE;

      const { data: completedApts } = await sb.from("appointments")
        .select("postcode")
        .eq("appointment_date", apt.appointment_date)
        .eq("status", "completed")
        .not("postcode", "is", null)
        .order("appointment_time", { ascending: false })
        .limit(1);

      if (completedApts?.[0]?.postcode) {
        originPostcode = completedApts[0].postcode;
      }

      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originPostcode)}&destination=${encodeURIComponent(apt.postcode)}&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.routes?.[0]?.legs?.[0]) {
          const leg = data.routes[0].legs[0];
          const durationSeconds = leg.duration_in_traffic?.value || leg.duration.value;
          etaMinutes = Math.ceil(durationSeconds / 60);
        }
      } catch (e) {
        console.error("Directions API error:", e);
      }
    }

    const etaDisplay = etaMinutes ? `~${etaMinutes} min` : "shortly";
    const firstName = apt.client_name.split(" ")[0];
    const siteUrl = `https://shawscope.co.uk`;
    const trackingUrl = `${siteUrl}/visit-tracking/${apt.access_token}`;
    const smsTrackingUrl = `${siteUrl}/visit-tracking/${compactVisitToken(apt.access_token)}`;

    if (etaMinutes) {
      const arrivalTime = new Date(Date.now() + etaMinutes * 60000).toISOString();
      await sb.from("appointments").update({ delay_eta_arrival: arrivalTime }).eq("id", apt.id);
    }

    // --- Send SMS ---
    let smsSent = false;

    if (apt.client_phone && isMobilePhone(apt.client_phone)) {
      {
        // Fetch SMS template from DB
        const { data: smsTpl } = await sb
          .from("sms_templates")
          .select("body_text")
          .eq("trigger_type", "on_my_way")
          .eq("is_active", true)
          .maybeSingle();

        const templateText = smsTpl?.body_text || `Hi {{client_name}}, Matt from ShawScope is on his way to you! 🚗\n\nETA: {{eta}}\n\nTrack live: {{tracking_url}}\n\nPlease ensure you're ready for {{service_name}}. See you soon!`;
        const smsBody = templateText
          .replace(/\{\{client_name\}\}/g, firstName)
          .replace(/\{\{eta\}\}/g, etaDisplay)
          .replace(/\{\{tracking_url\}\}/g, smsTrackingUrl)
          .replace(/\{\{service_name\}\}/g, serviceName)
          .replace(/\{\{time\}\}/g, apt.appointment_time?.slice(0, 5) || "");

        try {
          const result = await sendSms(apt.client_phone, smsBody + "\n\n(No-Reply)");
          smsSent = result.ok;
          if (!result.ok) console.error("On-my-way SMS failed:", JSON.stringify(result.body));
        } catch (e) {
          console.error("On-my-way SMS error:", e);
        }
      }
    }

    // --- Send Email ---
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (RESEND_API_KEY && apt.client_email) {
      // Fetch email template from DB
      const { data: emailTpl } = await sb
        .from("email_templates")
        .select("body_html, subject")
        .eq("trigger_type", "on_my_way")
        .eq("is_active", true)
        .maybeSingle();

      const vars: Record<string, string> = {
        "{{client_name}}": firstName,
        "{{eta}}": etaDisplay,
        "{{tracking_url}}": trackingUrl,
        "{{service_name}}": serviceName,
        "{{time}}": apt.appointment_time?.slice(0, 5) || "",
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
            <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">Matt is on his way!</h2>
            <p style="color:#6B7280;margin:0;font-size:14px;">Your estimated arrival time is <strong style="color:#D4912A;">${etaDisplay}</strong></p>
          </div>
          <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.7;">
            Hi ${firstName}, Matt is heading to you now for ${serviceName}. Please make sure you're ready — have a seat prepared and any relevant areas accessible.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${trackingUrl}" style="display:inline-block;background-color:#D4912A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">📍&nbsp;&nbsp;Track Matt's Visit</a>
          </div>
          <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px;text-align:center;">
            <p style="margin:0;font-size:13px;color:#6B7280;">Your appointment: <strong style="color:#0E1420;">${apt.appointment_time?.slice(0, 5)} today</strong></p>
          </div>`;
        emailSubject = `Matt is on his way! ETA: ${etaDisplay} 🚗`;
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
        if (!res.ok) console.error("Email send failed:", await res.text());
      } catch (e) {
        console.error("Email error:", e);
      }
    }

    // Log communications
    const logEntries = [];
    if (smsSent) {
      logEntries.push({
        appointment_id: apt.id,
        channel: "sms",
        trigger_type: "on_my_way",
        recipient_name: apt.client_name,
        recipient_phone: apt.client_phone,
        recipient_email: apt.client_email,
        body_preview: `On my way - ETA ${etaDisplay}`,
        status: "sent",
      });
    }
    if (emailSent) {
      logEntries.push({
        appointment_id: apt.id,
        channel: "email",
        trigger_type: "on_my_way",
        recipient_name: apt.client_name,
        recipient_email: apt.client_email,
        subject: `Matt is on his way! ETA: ${etaDisplay}`,
        body_preview: `On my way notification with live tracking link`,
        status: "sent",
      });
    }
    if (logEntries.length > 0) {
      await sb.from("communications_log").insert(logEntries);
    }

    return new Response(JSON.stringify({
      success: true,
      eta_minutes: etaMinutes,
      eta_text: etaDisplay,
      sms_sent: smsSent,
      email_sent: emailSent,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("on-my-way error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
