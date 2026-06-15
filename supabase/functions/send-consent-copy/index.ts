import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailWrap, emailIconHeading, emailDetailTable, emailInfoBox, emailSectionHeader } from "../_shared/email-layout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId, responseId } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: appointment, error: aptErr } = await supabaseAdmin
      .from("appointments")
      .select("client_name, client_email, appointment_date, appointment_time, service_id, services(name)")
      .eq("id", appointmentId)
      .single();

    if (aptErr || !appointment) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: consentResponse, error: crErr } = await supabaseAdmin
      .from("consent_form_responses")
      .select("*, consent_form_templates(title, form_type)")
      .eq("id", responseId)
      .single();

    if (crErr || !consentResponse) {
      return new Response(JSON.stringify({ error: "Consent response not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (consentResponse.consent_form_templates?.form_type === "consultation") {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Consultation forms are not emailed to patients" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formTitle = consentResponse.consent_form_templates?.title || "Consent Form";
    const serviceName = (appointment as any).services?.name || "General";
    const rawDate = appointment.appointment_date;
    const dateParts = rawDate.split("-");
    const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate;
    const timeStr = appointment.appointment_time?.slice(0, 5);
    const responses = consentResponse.responses as Record<string, any>;

    const responseRows = Object.entries(responses)
      .filter(([key]) => !key.startsWith("__"))
      .map(([key, value]) => {
        const displayValue = typeof value === "boolean"
          ? (value ? '<span style="color:#16a34a;font-weight:600;">Yes ✓</span>' : '<span style="color:#dc2626;">No</span>')
          : String(value);
        return `<tr>
          <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;vertical-align:top;width:40%">${key}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;font-size:13px;color:#0E1420;vertical-align:top">${displayValue}</td>
        </tr>`;
      })
      .join("");

    let fitzpatrickHtml = "";
    if (responses["__fitzpatrick_score"] !== undefined) {
      fitzpatrickHtml = `
        <div style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px;margin:16px 0;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:#1E40AF;font-weight:600;text-transform:uppercase;letter-spacing:1px;">🔬 Fitzpatrick Skin Type</p>
          <p style="margin:0;font-size:28px;font-weight:bold;color:#2563EB;">${responses["__fitzpatrick_type"]}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#3B82F6;">Score: ${responses["__fitzpatrick_score"]} — ${responses["__fitzpatrick_description"]}</p>
        </div>`;
    }

    const signatureHtml = consentResponse.signature
      ? `<div style="background-color:#F0FDF4;border:1px solid #86EFAC;border-radius:10px;padding:16px;margin-top:20px;">
          <p style="margin:0 0 4px;font-size:12px;color:#166534;font-weight:600;">✍️ Signed by</p>
          <p style="margin:0;font-size:20px;font-family:Georgia,serif;font-style:italic;color:#0E1420;">${consentResponse.signature}</p>
          <p style="margin:6px 0 0;font-size:11px;color:#6B7280;">Signed on: ${consentResponse.signed_at ? new Date(consentResponse.signed_at).toLocaleString("en-GB") : "N/A"}</p>
        </div>`
      : "";

    const content = `
      ${emailIconHeading("📋", `Your ${formTitle}`, `A copy for your records, ${appointment.client_name}.`)}
      ${emailDetailTable([
        { icon: "👤", label: "Name", value: appointment.client_name },
        { icon: "📋", label: "Service", value: serviceName },
        { icon: "📅", label: "Date", value: dateStr },
        { icon: "🕐", label: "Time", value: timeStr },
      ])}
      ${fitzpatrickHtml}
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        ${emailSectionHeader("📝", "Your Responses")}
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${responseRows}
        </table>
      </div>
      ${signatureHtml}
      ${emailInfoBox("💡", "Keeping Your Records", "This is an automated copy for your records. Please keep this email for future reference. If you have any questions, don't hesitate to get in touch.")}`;

    const html = emailWrap(content, { subtitle: "Consent Form Copy" });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ShawScope <bookings@shawscope.co.uk>",
        to: [appointment.client_email],
        reply_to: "matt@shawscope.co.uk",
        subject: `Your ${formTitle} — ShawScope`,
        html,
      }),
    });

    const resData = await res.json();

    try {
      await supabaseAdmin.from("communications_log").insert({
        channel: "email",
        recipient_name: appointment.client_name,
        recipient_email: appointment.client_email,
        subject: `Your ${formTitle} — ShawScope`,
        body_preview: `Consent form copy: ${formTitle}`,
        body_html: html,
        trigger_type: "consent_form_copy",
        appointment_id: appointmentId,
        status: res.ok ? "sent" : "failed",
        error_message: res.ok ? null : JSON.stringify(resData),
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({ success: true, data: resData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
