import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailWrap, emailIconHeading, emailDetailTable, emailInfoBox, emailButton } from "../_shared/email-layout.ts";

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
    const body = await req.json();
    const { appointmentId, recipientEmail, templateName, to, subject, html } = body;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Direct send mode (admin test buttons)
    if (to && subject && html) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authentication required for direct send" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid session" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "ShawScope <bookings@shawscope.co.uk>",
          to: [to],
          reply_to: "matt@shawscope.co.uk",
          subject,
          html,
        }),
      });
      const resData = await res.json();
      return new Response(
        JSON.stringify({ success: res.ok, data: resData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Standard mode
    if (!appointmentId || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "appointmentId and recipientEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: appointment, error } = await supabaseAdmin
      .from("appointments")
      .select("access_token, client_name, appointment_date, appointment_time, services(name)")
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) {
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://shawscope.co.uk";
    const consentFormUrl = `${siteUrl}/consent/${appointment.access_token}`;
    const serviceName = (appointment as any).services?.name || "your appointment";
    const rawDate = appointment.appointment_date;
    const dateParts = rawDate?.split("-");
    const dateStr = dateParts?.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate || "";
    const timeStr = appointment.appointment_time?.slice(0, 5) || "";

    const detailRows = [
      { icon: "👤", label: "Name", value: appointment.client_name },
    ];
    if (templateName) detailRows.push({ icon: "📋", label: "Form", value: templateName });
    detailRows.push(
      { icon: "🩺", label: "Service", value: serviceName },
      { icon: "📅", label: "Date", value: dateStr },
      { icon: "🕐", label: "Time", value: timeStr },
    );

    const content = `
      ${emailIconHeading("📝", "Form to Complete", `Hi ${appointment.client_name}, please complete this before your appointment.`)}
      ${emailDetailTable(detailRows)}
      ${emailInfoBox("⏰", "Important", "Please complete this form before your appointment. It helps us prepare for your visit and ensures we can provide you with the best care.")}
      ${emailButton("Complete Your Form →", consentFormUrl)}
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;margin-bottom:20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#6B7280;font-weight:600;">🔗 Link not working?</p>
        <p style="margin:0;font-size:11px;color:#9CA3AF;word-break:break-all;"><a href="${consentFormUrl}" style="color:#D4912A;text-decoration:none;">${consentFormUrl}</a></p>
      </div>`;

    const emailHtml = emailWrap(content, { subtitle: "Consent Form" });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ShawScope <bookings@shawscope.co.uk>",
        to: [recipientEmail],
        reply_to: "matt@shawscope.co.uk",
        subject: `Please Complete Your Form — ShawScope`,
        html: emailHtml,
      }),
    });

    const resData = await res.json();

    try {
      await supabaseAdmin.from("communications_log").insert({
        channel: "email",
        recipient_name: appointment.client_name,
        recipient_email: recipientEmail,
        subject: "Please Complete Your Form — ShawScope",
        body_preview: `Form sent: ${templateName || "Consent form"}`,
        body_html: emailHtml,
        trigger_type: "form_email",
        appointment_id: appointmentId,
        status: res.ok ? "sent" : "failed",
        error_message: res.ok ? null : JSON.stringify(resData),
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({ success: res.ok, data: resData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
