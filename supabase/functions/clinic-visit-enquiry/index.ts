import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailWrap, emailIconHeading, emailDetailTable, emailInfoBox } from "../_shared/email-layout.ts";
import { sendSms as sendSmsWorks, normalisePhoneForSmsWorks, isMobilePhone } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";
const ADMIN_PHONE = "+447444653593";

async function sendSms(to: string, body: string) {
  return await sendSmsWorks(to, body);
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return { ok: false, error: "resend_not_configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ShawScope <notifications@shawscope.co.uk>",
        to: [to],
        subject,
        html,
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_name, client_email, client_phone, service_name, number_of_people, notes } = await req.json();

    if (!client_name || !client_email) {
      return new Response(JSON.stringify({ error: "Name and email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: enquiry, error: dbError } = await supabase
      .from("clinic_visit_enquiries")
      .insert({
        client_name,
        client_email: client_email.toLowerCase().trim(),
        client_phone: client_phone || null,
        service_name: service_name || null,
        number_of_people: number_of_people || 1,
        notes: notes || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to save enquiry" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Send Admin Email ---
    const adminEmailContent = `
      ${emailIconHeading("🏠", "Clinic Visit Request")}
      <p style="color:#0E1420;font-size:14px;line-height:1.6;">A patient has requested to visit your clinic in Broadmayne.</p>
      ${emailDetailTable([
        { label: "Name", value: client_name },
        { label: "Email", value: client_email },
        { label: "Phone", value: client_phone || "Not provided" },
        { label: "Service", value: service_name || "Not specified" },
        { label: "People", value: String(number_of_people || 1) },
        ...(notes ? [{ label: "Notes", value: notes }] : []),
      ])}
      ${emailInfoBox("📋", "Action Required", "Please contact this patient to arrange their appointment and confirm availability.")}
    `;
    const adminHtml = emailWrap(adminEmailContent, { subtitle: "Clinic Visit Request", noReply: false });
    await sendEmail(ADMIN_EMAIL, `🏠 Clinic Visit Request — ${client_name}`, adminHtml);

    // --- Send Admin SMS ---
    const adminSmsBody = `🏠 Clinic Visit Request\n${client_name}\n${client_phone || client_email}\nService: ${service_name || "Not specified"}\nPeople: ${number_of_people || 1}\n\nCheck your dashboard to schedule.`;
    await sendSms(ADMIN_PHONE, adminSmsBody + "\n\n(No-Reply)");

    // --- Send Patient Confirmation Email ---
    const patientEmailContent = `
      ${emailIconHeading("✅", "Request Received")}
      <p style="color:#0E1420;font-size:14px;line-height:1.6;">Hi ${client_name},</p>
      <p style="color:#0E1420;font-size:14px;line-height:1.6;">Thank you for your interest in visiting our clinic in Broadmayne, Dorchester. We've received your request and will be in touch shortly to arrange a suitable appointment time.</p>
      ${emailInfoBox("📞", "What happens next?", "Matt will contact you to discuss availability and confirm your appointment details. This is usually within a few hours during working days.")}
      <p style="color:#55575D;font-size:13px;line-height:1.6;margin-top:16px;">If you have any questions in the meantime, please call <a href="tel:01305340194" style="color:#D4912A;">01305 340 194</a> or email <a href="mailto:matt@shawscope.co.uk" style="color:#D4912A;">matt@shawscope.co.uk</a>.</p>
    `;
    const patientHtml = emailWrap(patientEmailContent, { subtitle: "Request Received" });
    await sendEmail(client_email, "We've received your clinic visit request — ShawScope", patientHtml);

    // --- Send Patient Confirmation SMS ---
    if (client_phone) {
      const normPhone = normalisePhoneForSmsWorks(client_phone);
      if (normPhone && isMobilePhone(client_phone)) {
        const patientSmsBody = `Hi ${client_name.split(" ")[0]}, thanks for requesting a clinic visit at ShawScope. We'll be in touch shortly to arrange your appointment.\n\nShawScope · 01305 340 194\n\n(No-Reply)`;
        await sendSms(client_phone, patientSmsBody);
      }
    }

    return new Response(JSON.stringify({ ok: true, id: enquiry.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Clinic visit enquiry error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
