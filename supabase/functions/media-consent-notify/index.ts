import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { emailWrap, emailIconHeading, emailDetailTable, emailInfoBox } from "../_shared/email-layout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { client_name, client_email, client_phone, appointment_date, appointment_time, service_name } = await req.json();

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ ok: false, error: "resend_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dateParts = String(appointment_date || "").split("-");
    const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : (appointment_date || "");
    const timeStr = String(appointment_time || "").slice(0, 5);

    const content = `
      ${emailIconHeading("📸", "Patient Wants to Take Part!")}
      <p style="color:#0E1420;font-size:14px;line-height:1.6;">A patient has opted in to being photographed/filmed during their appointment for use on social media or the ShawScope website.</p>
      ${emailDetailTable([
        { label: "Name", value: client_name || "Unknown" },
        { label: "Email", value: client_email || "—" },
        { label: "Phone", value: client_phone || "Not provided" },
        { label: "Service", value: service_name || "—" },
        { label: "Date", value: dateStr },
        { label: "Time", value: timeStr },
      ])}
      ${emailInfoBox("✅", "Reminder", "Always share footage with the patient for approval before posting publicly.")}
    `;

    const html = emailWrap(content, { subtitle: "Media Consent Opt-In", noReply: false });

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ShawScope <notifications@shawscope.co.uk>",
        to: [ADMIN_EMAIL],
        subject: `📸 ${client_name || "A patient"} would like to take part — media consent`,
        html,
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
