import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailWrap, emailIconHeading, emailDetailTable, emailInfoBox, emailButton, emailSectionHeader } from "../_shared/email-layout.ts";
import { sendSms, isMobilePhone } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In production these are Matt's real contacts.
// Set DEV_ADMIN_EMAIL / DEV_ADMIN_PHONE secrets to redirect notifications
// to yourself during testing so Matt doesn't receive test bookings.
const ADMIN_EMAIL = Deno.env.get("DEV_ADMIN_EMAIL") || "matt@shawscope.co.uk";
const ADMIN_PHONE = Deno.env.get("DEV_ADMIN_PHONE") || "+447444653593";

async function sendAdminSms(message: string) {
  const result = await sendSms(ADMIN_PHONE, message + "\n\n(No-Reply)");
  if (!result.ok) {
    console.error("Admin SMS send failed", result);
    return { ok: false, status: result.status, error: result.body?.error || "sms_send_failed" };
  }
  return { ok: true, status: result.status, providerResponse: result.body };
}

async function sendAdminEmail(subject: string, bodyText: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("RESEND_API_KEY not configured for admin email fallback");
    return { ok: false, error: "resend_not_configured" };
  }
  const content = `
    ${emailIconHeading("🔔", "Admin Alert")}
    <p style="color:#0E1420;font-size:14px;line-height:1.6;white-space:pre-line;">${bodyText}</p>`;
  const html = emailWrap(content, { subtitle: "Admin Alert", noReply: false });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ShawScope <notifications@shawscope.co.uk>",
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.error("Admin email fallback error:", e);
    return { ok: false, error: String(e) };
  }
}

function formatDateDMY(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function replaceTemplateVars(template: string, vars: Record<string, string>): string {
  let result = template;
  
  // Handle conditional blocks {{#var}}...{{/var}} — process multiple passes for nested conditionals
  let prevResult = "";
  let iterations = 0;
  while (prevResult !== result && iterations < 5) {
    prevResult = result;
    result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, content) => {
      return vars[key] ? content : "";
    });
    iterations++;
  }
  
  // Replace simple variables {{var}}
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { appointmentId, accessToken, type, additionalAttendees, testMode, clientName, readyTime, channels, consentDelivery } = body;
    // channels: { email?: boolean, sms?: boolean } — defaults to { email: true, sms: false } for backward compat
    const sendEmail = channels?.email !== false; // default true
    const sendSms = channels?.sms === true; // default false

    // Handle test notification to self
    if (testMode && type === "test") {
      const smsResult = await sendAdminSms("✅ ShawScope test notification — SMS is working correctly.");
      
      const resendKey = Deno.env.get("RESEND_API_KEY");
      let emailOk = false;
      if (resendKey) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ShawScope <notifications@shawscope.co.uk>",
            to: ["matt@shawscope.co.uk"],
            subject: "✅ ShawScope Test Notification",
            html: emailWrap(`${emailIconHeading("✅", "Test Notification", "Email notifications are working correctly.")}<p style="color:#6B7280;font-size:12px;text-align:center;">Sent at ${new Date().toISOString()}</p>`, { subtitle: "System Test", noReply: false }),
          }),
        });
        emailOk = emailRes.ok;
      }
      
      return new Response(JSON.stringify({ ok: true, sms: smsResult.ok, email: emailOk }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle ready-from-time update notification
    if (type === "ready_from_update") {
      const supabaseAdminForReadyUpdate = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      let effectiveClientName = clientName;
      let effectiveReadyTime = readyTime;

      if ((!effectiveClientName || !effectiveReadyTime) && (appointmentId || accessToken)) {
        let readyQuery = supabaseAdminForReadyUpdate
          .from("appointments")
          .select("client_name, ready_from_time")
          .limit(1);

        if (appointmentId) readyQuery = readyQuery.eq("id", appointmentId);
        else if (accessToken) readyQuery = readyQuery.eq("access_token", accessToken);

        const { data: readyApt } = await readyQuery.maybeSingle();
        if (readyApt) {
          effectiveClientName = effectiveClientName || readyApt.client_name || "Patient";
          effectiveReadyTime = effectiveReadyTime || readyApt.ready_from_time?.slice(0, 5) || "unknown time";
        }
      }

      if (!effectiveClientName || !effectiveReadyTime) {
        return new Response(JSON.stringify({ error: "clientName/readyTime (or appointmentId/accessToken) required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const smsBody = `${effectiveClientName} updated available time to ${effectiveReadyTime} (${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" })}).`;
      const smsResult = await sendAdminSms(smsBody);
      const emailResult = await sendAdminEmail(`⏰ Ready Early: ${effectiveClientName}`, smsBody);

      await supabaseAdminForReadyUpdate.from("communications_log").insert({
        channel: "sms",
        trigger_type: "ready_from_update",
        recipient_name: "Admin",
        recipient_phone: ADMIN_PHONE,
        body_preview: smsBody.slice(0, 200),
        status: smsResult.ok ? "sent" : "failed",
        error_message: smsResult.ok ? null : String(smsResult.error || "sms_send_failed"),
      });

      return new Response(JSON.stringify({ ok: smsResult.ok || emailResult.ok, sms: smsResult.ok, email: emailResult.ok }), {
        status: (smsResult.ok || emailResult.ok) ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle ready-early confirmation SMS to patient
    if (type === "ready_early_confirmation") {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Look up appointment for phone number and visit-ready link
      let patientPhone = "";
      let patientName = clientName || "there";
      let aptAccessToken = accessToken;

      if (appointmentId || accessToken) {
        let q = supabaseAdmin.from("appointments").select("client_name, client_phone, access_token").limit(1);
        if (appointmentId) q = q.eq("id", appointmentId);
        else q = q.eq("access_token", accessToken);
        const { data: aptData } = await q.maybeSingle();
        if (aptData) {
          patientPhone = aptData.client_phone || "";
          patientName = aptData.client_name || patientName;
          aptAccessToken = aptData.access_token || aptAccessToken;
        }
      }

      if (!patientPhone || !isMobilePhone(patientPhone)) {
        return new Response(JSON.stringify({ ok: false, error: patientPhone ? "landline_number" : "no_patient_phone" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const visitReadyUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '').includes('localhost') ? 'http://localhost:5173' : 'https://shawscope.co.uk'}/visit-ready/${aptAccessToken}`;
      const smsBody = `Hi ${patientName}, thanks for letting us know you're ready from ${readyTime}. If we are able, we'll try our best to visit a little earlier if we're ahead of schedule. You can change at any time: ${visitReadyUrl}`;

      try {
        const smsRes = await sendSms(patientPhone, smsBody + "\n\n(No-Reply)");
        const sent = smsRes.ok;

        await supabaseAdmin.from("communications_log").insert({
          channel: "sms",
          trigger_type: "ready_early_confirmation",
          recipient_name: patientName,
          recipient_phone: patientPhone,
          body_preview: smsBody.slice(0, 200),
          body_html: smsBody,
          appointment_id: appointmentId || null,
          status: sent ? "sent" : "failed",
          error_message: sent ? null : String(smsRes.body?.error || "sms_send_failed"),
        });

        return new Response(JSON.stringify({ ok: sent, sms: sent }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Patient confirmation SMS error:", e);
        return new Response(JSON.stringify({ ok: false, error: String(e) }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle low stock alert
    if (type === "low_stock_alert") {
      const { kit_name, available, threshold, is_washable } = body;
      const action = is_washable ? "clean" : "reorder";
      const subject = `⚠️ Low Stock: ${kit_name} (${available} remaining)`;
      const lowStockContent = `
        ${emailIconHeading("⚠️", "Low Stock Alert", `${kit_name} needs attention.`)}
        ${emailDetailTable([
          { icon: "📦", label: "Item", value: kit_name },
          { icon: "🔢", label: "Remaining", value: String(available) },
          { icon: "🎯", label: "Threshold", value: String(threshold) },
          { icon: "🔧", label: "Action", value: action },
        ])}`;
      const emailBody = emailWrap(lowStockContent, { subtitle: "Kit Inventory", noReply: false });
      
      const resendKey = Deno.env.get("RESEND_API_KEY");
      let emailOk = false;
      if (resendKey) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ShawScope <notifications@shawscope.co.uk>",
            to: [ADMIN_EMAIL],
            subject,
            html: emailBody,
          }),
        });
        emailOk = emailRes.ok;
      }

      return new Response(JSON.stringify({ ok: true, email: emailOk }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle consent help needed notification
    if (type === "consent_help_needed") {
      const { client_name, client_email, appointment_date, appointment_time, service_name, template_title, help_description, completed_responses } = body;
      
      // Build a summary of what was completed
      const completedFields: string[] = [];
      const skippedFields: string[] = [];
      if (completed_responses && typeof completed_responses === "object") {
        for (const [key, value] of Object.entries(completed_responses)) {
          if (key.startsWith("__")) continue; // skip internal fields
          if (value !== null && value !== undefined && value !== "" && value !== false) {
            completedFields.push(`✅ ${key}`);
          } else {
            skippedFields.push(`❌ ${key}`);
          }
        }
      }

      const formattedDate = appointment_date ? formatDateDMY(appointment_date) : "Unknown";
      const formattedTime = appointment_time ? appointment_time.slice(0, 5) : "Unknown";

      const subject = `⚠️ Consent Help Needed: ${client_name || "Patient"}`;

      const completionSummary = (completedFields.length > 0 || skippedFields.length > 0) ? `
        <div style="margin-top:16px;">
          ${completedFields.length > 0 ? `<p style="font-size:12px;color:#15803D;margin:0 0 4px 0;">✅ ${completedFields.length} fields completed</p>` : ""}
          ${skippedFields.length > 0 ? `<p style="font-size:12px;color:#DC2626;margin:0 0 4px 0;">❌ ${skippedFields.length} fields incomplete</p>` : ""}
          <details style="margin-top:8px;">
            <summary style="cursor:pointer;font-size:12px;color:#6B7280;">View field details</summary>
            <div style="padding:8px;font-size:11px;color:#374151;line-height:1.8;margin-top:4px;background:#F9FAFB;border-radius:4px;">
              ${[...completedFields, ...skippedFields].join("<br/>")}
            </div>
          </details>
        </div>` : "";

      const consentHelpContent = `
        ${emailIconHeading("⚠️", "Consent Help Needed", `${client_name || "Patient"} is struggling to complete their consent form.`)}
        ${emailInfoBox("🚨", "Action Required", `<strong>${client_name || "Patient"}</strong> submitted a partial consent form and needs help completing it.`, { bgColor: "#FEF3C7", borderColor: "#F59E0B", textColor: "#78350F", labelColor: "#92400E" })}
        ${emailDetailTable([
          { icon: "👤", label: "Patient", value: client_name || "Unknown" },
          { icon: "📧", label: "Email", value: client_email || "Unknown" },
          { icon: "📅", label: "Appointment", value: `${formattedDate} at ${formattedTime}` },
          { icon: "🩺", label: "Service", value: service_name || "Not specified" },
          { icon: "📋", label: "Form", value: template_title || "Consent Form" },
        ])}
        ${emailInfoBox("📝", "What they struggled with", help_description || "No specific details provided.", { bgColor: "#FFF7ED", borderColor: "#FDBA74", textColor: "#78350F", labelColor: "#9A3412" })}
        ${completionSummary}
        <p style="color:#6B7280;font-size:11px;margin-top:20px;border-top:1px solid #E5E7EB;padding-top:12px;">
          The partial form has been saved to the patient's record. Please contact the patient to help them complete it before their appointment.
        </p>`;
      const emailBody = emailWrap(consentHelpContent, { subtitle: "Consent Help", noReply: false });
      
      const resendKey = Deno.env.get("RESEND_API_KEY");
      let emailOk = false;
      if (resendKey) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ShawScope <notifications@shawscope.co.uk>",
            to: [ADMIN_EMAIL],
            reply_to: ADMIN_EMAIL,
            subject,
            html: emailBody,
          }),
        });
        emailOk = emailRes.ok;
        if (!emailRes.ok) {
          console.error("Consent help email failed:", await emailRes.text());
        }
      }

      // Also send SMS alert
      const smsBody = `⚠️ ${client_name || "Patient"} needs help completing their consent form for ${formattedDate} at ${formattedTime}. Check email for details.`;
      const smsResult = await sendAdminSms(smsBody);

      return new Response(JSON.stringify({ ok: emailOk || smsResult.ok, email: emailOk, sms: smsResult.ok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabaseAdmin.from("appointments").select("*, services(name, price)");
    if (appointmentId) {
      query = query.eq("id", appointmentId);
    } else if (accessToken) {
      query = query.eq("access_token", accessToken);
    } else {
      return new Response(JSON.stringify({ error: "appointmentId or accessToken required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: appointment, error } = await query.single();

    if (error || !appointment) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch email templates from DB
    const { data: allTemplates } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .eq("is_active", true);

    const templateMap: Record<string, { subject: string; body_html: string }> = {};
    for (const t of allTemplates || []) {
      templateMap[t.trigger_type] = { subject: t.subject, body_html: t.body_html };
    }

    const dateStr = formatDateDMY(appointment.appointment_date);
    const rawDate = appointment.appointment_date;
    const timeStr = appointment.appointment_time?.slice(0, 5);
    const serviceName = appointment.services?.name || "General";

    // Determine consent form template from service or appointment
    let consentFormTemplateId = appointment.consent_form_template_id;
    if (!consentFormTemplateId && appointment.service_id) {
      const { data: svc } = await supabaseAdmin
        .from("services")
        .select("consent_form_template_id")
        .eq("id", appointment.service_id)
        .single();
      if (svc?.consent_form_template_id) {
        consentFormTemplateId = svc.consent_form_template_id;
      }
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://shawscope.co.uk";
    const consentFormUrl = consentFormTemplateId
      ? `${siteUrl}/consent/${appointment.access_token}`
      : "";
    const rejectionResponseUrl = `${siteUrl}/rejection-response/${appointment.access_token}`;
    const cancelUrl = `${siteUrl}/cancel-appointment/${appointment.access_token}`;

    // Group booking info
    let groupSize = 0;
    let isGroupBooking = false;
    if (appointment.group_id) {
      const { count } = await supabaseAdmin
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("group_id", appointment.group_id)
        .not("status", "in", '("cancelled","rejected")');
      groupSize = count || 1;
      isGroupBooking = groupSize > 1;
    }

    // Price info
    const price = appointment.price;
    const serviceBasePrice = appointment.services?.price;
    let priceDisplay = "";
    let discountDisplay = "";
    if (price != null) {
      priceDisplay = `£${Number(price).toFixed(2)}`;
      if (serviceBasePrice != null && price < serviceBasePrice) {
        discountDisplay = `£${Number(serviceBasePrice).toFixed(2)}`;
      }
    }

    const vars: Record<string, string> = {
      client_name: appointment.client_name,
      client_email: appointment.client_email,
      client_phone: appointment.client_phone || "N/A",
      service_name: serviceName,
      date: dateStr,
      time: timeStr,
      address: appointment.address || "N/A",
      notes: appointment.notes || "",
      admin_notes: appointment.admin_notes || "",
      alternative: (appointment.alternative_date || appointment.alternative_time) ? "true" : "",
      alt_date: appointment.alternative_date ? formatDateDMY(appointment.alternative_date) : "",
      alt_time: appointment.alternative_time ? appointment.alternative_time.slice(0, 5) : "",
      consent_form_url: consentFormUrl,
      has_consent_form: consentFormTemplateId ? "true" : "",
      rejection_response_url: rejectionResponseUrl,
      cancel_url: cancelUrl,
      is_group: isGroupBooking ? "true" : "",
      group_size: String(groupSize),
      price: priceDisplay,
      has_price: priceDisplay ? "true" : "",
      original_price: discountDisplay,
      has_discount: discountDisplay ? "true" : "",
    };

    const emails: { to: string; subject: string; html: string }[] = [];

    switch (type) {
      case "new_request": {
        const adminTpl = templateMap["new_request_admin"];
        const clientTpl = templateMap["new_request_client"];
        if (adminTpl) {
          let adminHtml = replaceTemplateVars(adminTpl.body_html, vars);
          let adminSubject = replaceTemplateVars(adminTpl.subject, vars);

          // If group booking, prepend a big red banner and attendee grid
          const totalPeople = 1 + (additionalAttendees?.length || 0);
          if (totalPeople > 1) {
            adminSubject = `⚠️ GROUP (${totalPeople} PEOPLE) — ${adminSubject}`;

            const groupBanner = `
              <div style="background-color:#dc2626;color:#ffffff;padding:18px 24px;text-align:center;border-radius:8px;margin-bottom:20px;">
                <p style="margin:0;font-size:24px;font-weight:900;letter-spacing:1px;">⚠️ GROUP BOOKING — ${totalPeople} PEOPLE</p>
                <p style="margin:6px 0 0;font-size:14px;font-weight:400;opacity:0.9;">Each person listed below requires their own consent form</p>
              </div>`;

            // Build attendee table rows
            let attendeeRows = `
              <tr style="background-color:#0E1420;color:#E8ECF1;">
                <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:700;">#</th>
                <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:700;">Name</th>
                <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:700;">Email</th>
                <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:700;">Phone</th>
                <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:700;">DOB</th>
              </tr>`;

            // Primary booker
            attendeeRows += `
              <tr style="background-color:#fafaf9;">
                <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #e7e5e4;">1</td>
                <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #e7e5e4;font-weight:600;">${appointment.client_name} <span style="color:#dc2626;font-size:11px;font-weight:700;">(LEAD)</span></td>
                <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #e7e5e4;">${appointment.client_email}</td>
                <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #e7e5e4;">${appointment.client_phone || "—"}</td>
                <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #e7e5e4;">—</td>
              </tr>`;

            if (additionalAttendees?.length) {
              for (let i = 0; i < additionalAttendees.length; i++) {
                const att = additionalAttendees[i];
                attendeeRows += `
                  <tr style="background-color:${i % 2 === 0 ? "#ffffff" : "#fafaf9"};">
                    <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #e7e5e4;">${i + 2}</td>
                    <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #e7e5e4;font-weight:600;">${att.name}</td>
                    <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #e7e5e4;">${att.email}</td>
                    <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #e7e5e4;">${att.phone || "—"}</td>
                    <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #e7e5e4;">${att.dob || "—"}</td>
                  </tr>`;
              }
            }

            const attendeeTable = `
              <div style="margin-bottom:20px;">
                <h3 style="color:#0E1420;font-size:15px;margin:0 0 10px;font-weight:700;">👥 All Attendees</h3>
                <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e7e5e4;border-radius:8px;border-collapse:collapse;overflow:hidden;">
                  ${attendeeRows}
                </table>
              </div>`;

            // Insert banner + table at the top of email body
            adminHtml = groupBanner + attendeeTable + adminHtml;
          }

          emails.push({
            to: ADMIN_EMAIL,
            subject: adminSubject,
            html: adminHtml,
          });
        }
        // Send client booking received email WITHOUT consent form link (consent sent separately on approval)
        const clientVarsNoConsent = { ...vars, consent_form_url: "", has_consent_form: "" };
        if (clientTpl) {
          emails.push({
            to: appointment.client_email,
            subject: replaceTemplateVars(clientTpl.subject, clientVarsNoConsent),
            html: replaceTemplateVars(clientTpl.body_html, clientVarsNoConsent),
          });
        }
        // Handle additional attendees: create profiles + send individual consent emails
        if (additionalAttendees?.length) {
          for (const attendee of additionalAttendees) {
            // Create or update patient profile for each attendee
            const attendeeEmail = attendee.email.toLowerCase().trim();
            let attendeeDob: string | null = null;
            if (attendee.dob) {
              const parts = attendee.dob.split("/");
              if (parts.length === 3) {
                attendeeDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
            }

            const { data: existingPatient } = await supabaseAdmin
              .from("patients")
              .select("id")
              .eq("client_email", attendeeEmail)
              .maybeSingle();

            if (existingPatient) {
              const updatePayload: Record<string, unknown> = {};
              if (attendeeDob) updatePayload.date_of_birth = attendeeDob;
              if (attendee.phone) updatePayload.client_phone = attendee.phone;
              if (Object.keys(updatePayload).length > 0) {
                await supabaseAdmin.from("patients").update(updatePayload).eq("id", existingPatient.id);
              }
            } else {
              await supabaseAdmin.from("patients").insert({
                client_name: attendee.name,
                client_email: attendeeEmail,
                client_phone: attendee.phone || null,
                date_of_birth: attendeeDob,
                address: appointment.address || null,
              });
            }

            // Log activity
            await supabaseAdmin.from("patient_activity_log").insert({
              client_email: attendeeEmail,
              event_type: "profile_created",
              message: `Patient profile created/updated as additional attendee for appointment on ${dateStr}`,
              created_by: "system",
            });

            // Send individual booking received email WITHOUT consent form (consent sent separately on approval)
            const attendeeVars = {
              ...vars,
              client_name: attendee.name,
              consent_form_url: "",
              has_consent_form: "",
            };
            if (clientTpl) {
              emails.push({
                to: attendee.email,
                subject: replaceTemplateVars(clientTpl.subject, attendeeVars),
                html: replaceTemplateVars(clientTpl.body_html, attendeeVars),
              });
            }
          }
        }
        break;
      }
      case "approved": {
        // Send confirmation email WITHOUT consent form link
        const approvedVars = { ...vars, consent_form_url: "", has_consent_form: "" };
        const tpl = templateMap["approved"];
        if (tpl) {
          emails.push({
            to: appointment.client_email,
            subject: replaceTemplateVars(tpl.subject, approvedVars),
            html: replaceTemplateVars(tpl.body_html, approvedVars),
          });
        }

        // Schedule a SEPARATE consent form email if applicable
        if (consentFormTemplateId && consentFormUrl) {
          // Get template name for the consent email
          let consentTemplateName = "Consent Form";
          try {
            const { data: cftData } = await supabaseAdmin
              .from("consent_form_templates")
              .select("title")
              .eq("id", consentFormTemplateId)
              .single();
            if (cftData?.title) consentTemplateName = cftData.title;
          } catch (_) {}

          const consentContent = `
            ${emailIconHeading("📝", "Consent Form Required", `Hi ${appointment.client_name}, please complete this form before your appointment.`)}
            ${emailDetailTable([
              { icon: "👤", label: "Name", value: appointment.client_name },
              { icon: "📋", label: "Form", value: consentTemplateName },
              { icon: "🩺", label: "Service", value: serviceName },
              { icon: "📅", label: "Date", value: dateStr },
              { icon: "🕐", label: "Time", value: timeStr },
            ])}
            ${emailInfoBox("⏰", "Important", "Please complete this form before your appointment. It helps us prepare for your visit and ensures we can provide you with the best care.")}
            ${emailButton("📝  Complete Your Consent Form", consentFormUrl)}
            <div style="text-align:center;margin-bottom:16px;">
              <p style="margin:0;font-size:11px;color:#9CA3AF;">🔗 Link not working? Copy this URL: <a href="${consentFormUrl}" style="color:#D4912A;text-decoration:none;word-break:break-all;">${consentFormUrl}</a></p>
            </div>`;
          const consentEmailHtml = emailWrap(consentContent, { subtitle: "Consent Form" });

          emails.push({
            to: appointment.client_email,
            subject: `📝 Please Complete Your Consent Form — ShawScope`,
            html: consentEmailHtml,
          });

          // Update consent_sent_at
          await supabaseAdmin.from("appointments").update({ consent_sent_at: new Date().toISOString() }).eq("id", appointment.id);
        }
        break;
      }
      case "rejected": {
        const hasAlt = appointment.alternative_date && appointment.alternative_time;
        const altDate = appointment.alternative_date ? formatDateDMY(appointment.alternative_date) : "";
        const altTime = appointment.alternative_time ? appointment.alternative_time.slice(0, 5) : "";
        const adminNotes = appointment.admin_notes || "";
        const acceptUrl = `${rejectionResponseUrl}?action=accept`;
        const rejectUrl = `${rejectionResponseUrl}?action=reject`;

        let altSection = "";
        if (hasAlt) {
          altSection = `
            <div style="background-color:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:24px 20px;margin:20px 0;text-align:center;">
              <div style="font-size:28px;margin-bottom:8px;">🗓️</div>
              <h3 style="color:#166534;margin:0 0 6px;font-size:16px;font-weight:bold;">We'd Like to Offer an Alternative</h3>
              <p style="margin:0 0 4px;font-size:20px;color:#166534;font-weight:700;">${altDate} at ${altTime}</p>
              <p style="margin:0 0 20px;font-size:13px;color:#16a34a;">Same service, just a different time.</p>
              <div>
                <a href="${acceptUrl}" style="display:inline-block;background-color:#22c55e;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin-right:8px;">✓ Yes, Book Me In!</a>
                <a href="${rejectUrl}" style="display:inline-block;background-color:#ef4444;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">✗ Doesn't Work</a>
              </div>
            </div>`;
        }

        const rejectionContent = `
          ${emailIconHeading("😔", `We're Sorry, ${appointment.client_name}`, "Unfortunately, we're unable to accommodate your appointment.")}
          ${emailDetailTable([
            { icon: "📋", label: "Service", value: serviceName },
            { icon: "📅", label: "Requested Date", value: dateStr },
            { icon: "🕐", label: "Requested Time", value: timeStr },
          ])}
          ${adminNotes ? emailInfoBox("💬", "Message from Matt", `<em>"${adminNotes}"</em>`) : ""}
          <p style="color:#6B7280;font-size:14px;text-align:center;">We sincerely apologise for any inconvenience.</p>
          ${altSection}
          ${!hasAlt ? emailButton("🔄  Book a New Appointment", "https://shawscope.co.uk/book") : ""}`;
        const rejectionHtml = emailWrap(rejectionContent, { subtitle: "Appointment Update" });

        emails.push({
          to: appointment.client_email,
          subject: `We're sorry — your ${serviceName} appointment needs rescheduling`,
          html: rejectionHtml,
        });
        break;
      }
      case "follow_up": {
        const tpl = templateMap["follow_up"];
        if (tpl) {
          emails.push({
            to: appointment.client_email,
            subject: replaceTemplateVars(tpl.subject, vars),
            html: replaceTemplateVars(tpl.body_html, vars),
          });
        }
        break;
      }
      case "appointment_changed": {
        const tpl = templateMap["appointment_changed"];
        if (tpl) {
          emails.push({
            to: appointment.client_email,
            subject: replaceTemplateVars(tpl.subject, vars),
            html: replaceTemplateVars(tpl.body_html, vars),
          });
        }
        break;
      }
      case "cancelled": {
        const tpl = templateMap["cancelled"];
        if (tpl) {
          emails.push({
            to: appointment.client_email,
            subject: replaceTemplateVars(tpl.subject, vars),
            html: replaceTemplateVars(tpl.body_html, vars),
          });
        } else {
          const cancelledContent = `
            ${emailIconHeading("❌", "Appointment Cancelled", "We're writing to let you know your appointment has been cancelled.")}
            ${emailDetailTable([
              { icon: "👤", label: "Name", value: appointment.client_name },
              { icon: "📋", label: "Service", value: serviceName },
              { icon: "📅", label: "Date", value: dateStr },
              { icon: "🕐", label: "Time", value: timeStr },
            ])}
            ${emailButton("🔄  Book a New Appointment", "https://shawscope.co.uk/book")}`;
          const cancelledHtml = emailWrap(cancelledContent, { subtitle: "Appointment Cancelled" });
          emails.push({
            to: appointment.client_email,
            subject: `Appointment Cancelled — ShawScope`,
            html: cancelledHtml,
          });
        }
        break;
      }
      default: {
        emails.push({
          to: appointment.client_email,
          subject: "Appointment Update — ShawScope",
          html: `<p>Dear ${appointment.client_name}, your appointment has been updated.</p>`,
        });
      }
    }

    // No-reply footer for all client emails
    const noReplyFooter = `<div style="text-align:center;padding:12px 20px;"><p style="margin:0;font-size:10px;color:#a8a29e;line-height:1.4;">⚠️ No Reply — This is an automated system message. Replies to this email are not monitored.<br/>If you need to contact us, please call <a href="tel:01305340194" style="color:#a8a29e;">01305 340 194</a> or email <a href="mailto:matt@shawscope.co.uk" style="color:#a8a29e;">matt@shawscope.co.uk</a></p></div>`;

    // Cancel button footer for client emails
    const cancelFooter = `<div style="text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid #e7e5e4;"><a href="${cancelUrl}" style="display:inline-block;padding:12px 28px;background-color:#dc2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Cancel This Appointment</a><p style="color:#a8a29e;font-size:11px;margin:10px 0 0;">Please give at least 24 hours notice</p></div>`;

    // Delay confirmation (approved) emails by 5 mins; consent form emails stagger +3 mins after
    const DELAY_MINUTES = type === "approved" ? 5 : 0;
    const CONSENT_EXTRA_DELAY = 3; // extra minutes after approval email for consent form
    // Define scheduledFor at the outer scope so SMS scheduling can also use it
    const scheduledFor = new Date(Date.now() + DELAY_MINUTES * 60 * 1000).toISOString();
    const results = [];

    // Filter emails based on channel preference
    const filteredEmails = sendEmail ? emails : emails.filter(e => e.to === ADMIN_EMAIL);
    let clientEmailIndex = 0;
    for (const email of filteredEmails) {
      // Append cancel link to client-facing emails (not admin, not cancellation emails)
      let finalHtml = email.html;
      if (email.to !== ADMIN_EMAIL && type !== "cancelled") {
        finalHtml = finalHtml + cancelFooter;
      }
      // Add no-reply footer to all client-facing emails
      if (email.to !== ADMIN_EMAIL) {
        finalHtml = finalHtml + noReplyFooter;
      }

      // Admin emails send immediately, patient emails get delayed
      if (email.to === ADMIN_EMAIL) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ShawScope <bookings@shawscope.co.uk>",
            to: [email.to],
            reply_to: "matt@shawscope.co.uk",
            subject: email.subject,
            html: finalHtml,
          }),
        });
        const resData = await res.json();
        results.push({ to: email.to, status: res.status, data: resData });

        try {
          await supabaseAdmin.from("communications_log").insert({
            channel: "email",
            recipient_name: "Admin",
            recipient_email: email.to,
            subject: email.subject,
            body_preview: email.subject,
            body_html: finalHtml,
            trigger_type: type || "notification",
            appointment_id: appointment.id,
            status: res.ok ? "sent" : "failed",
            error_message: res.ok ? null : JSON.stringify(resData),
          });
        } catch (_) {}
      } else {
        // Stagger patient emails: first one at base delay, subsequent ones +3 mins each
        // This prevents two emails arriving simultaneously (triggers spam filters)
        const emailDelay = DELAY_MINUTES + (clientEmailIndex * CONSENT_EXTRA_DELAY);
        const emailScheduledFor = new Date(Date.now() + emailDelay * 60 * 1000).toISOString();
        clientEmailIndex++;

        await supabaseAdmin.from("scheduled_communications").insert({
          appointment_id: appointment.id,
          channel: "email",
          trigger_type: type || "notification",
          recipient_name: appointment.client_name,
          recipient_email: email.to,
          subject: email.subject,
          scheduled_for: emailScheduledFor,
          status: "pending",
          metadata: { body_html: finalHtml },
        });
        results.push({ to: email.to, scheduled: true, scheduled_for: emailScheduledFor });
      }
    }

    // === Admin SMS alert for key events ===
    if (["new_request", "cancelled", "help_needed"].includes(type)) {
      const groupLabel = additionalAttendees?.length ? ` (group of ${additionalAttendees.length + 1})` : "";
      let adminSmsMsg = "";
      if (type === "new_request") {
        adminSmsMsg = `📋 New booking request: ${appointment.client_name}${groupLabel} — ${serviceName} on ${dateStr} at ${timeStr}`;
      } else if (type === "cancelled") {
        adminSmsMsg = `❌ Cancellation: ${appointment.client_name} — ${serviceName} on ${dateStr} at ${timeStr}`;
      } else if (type === "help_needed") {
        adminSmsMsg = `🆘 Help request: ${appointment.client_name} — ${serviceName} on ${dateStr} at ${timeStr}`;
      }
      if (adminSmsMsg) {
        const smsResult = await sendAdminSms(adminSmsMsg);
        results.push({ to: ADMIN_PHONE, type: "admin_sms", ...smsResult });
        
        // Email fallback for admin alert — only send if SMS failed
        if (!smsResult.ok) {
          const emailSubject = type === "new_request" 
            ? `📋 New Booking: ${appointment.client_name} — ${serviceName}`
            : type === "cancelled"
            ? `❌ Cancellation: ${appointment.client_name} — ${serviceName}`
            : `🆘 Help Request: ${appointment.client_name} — ${serviceName}`;
          const emailResult = await sendAdminEmail(emailSubject, adminSmsMsg);
          results.push({ to: ADMIN_EMAIL, type: "admin_email_fallback", ok: emailResult.ok });
        }

        try {
          await supabaseAdmin.from("communications_log").insert({
            channel: "sms",
            recipient_name: "Admin",
            recipient_phone: ADMIN_PHONE,
            subject: `Admin alert: ${type}`,
            body_preview: adminSmsMsg.slice(0, 200),
            body_html: adminSmsMsg,
            trigger_type: `admin_${type}_sms`,
            appointment_id: appointment.id,
            status: smsResult.ok ? "sent" : "failed",
            error_message: smsResult.ok ? null : JSON.stringify(smsResult),
          });
        } catch (_) {}
      }
    }

    // === SMS: Send cancellation SMS to patient if requested ===
    if (type === "cancelled" && sendSms && appointment.client_phone) {
      const normPhone = appointment.client_phone.replace(/[\s\-\(\)]/g, "");
      const isMobile = normPhone.startsWith("+447") || normPhone.startsWith("07") || /^7\d{9}$/.test(normPhone) || (!normPhone.startsWith("+44") && !normPhone.startsWith("0"));
      if (isMobile) {
        // Look for SMS template
        const { data: smsTpl } = await supabaseAdmin
          .from("sms_templates")
          .select("body_text")
          .eq("trigger_type", "appointment_cancelled")
          .eq("is_active", true)
          .maybeSingle();

        let smsBody = smsTpl?.body_text || "Hi {{client_name}}, your {{service_name}} appointment on {{date}} at {{time}} has been cancelled. To rebook, visit shawscope.co.uk/book or call 01305 340194. — Matt, ShawScope";
        smsBody = smsBody
          .replace(/\{\{client_name\}\}/g, appointment.client_name)
          .replace(/\{\{service_name\}\}/g, serviceName)
          .replace(/\{\{date\}\}/g, dateStr)
          .replace(/\{\{time\}\}/g, timeStr);

        // Schedule SMS
        await supabaseAdmin.from("scheduled_communications").insert({
          appointment_id: appointment.id,
          channel: "sms",
          trigger_type: "appointment_cancelled_sms",
          recipient_name: appointment.client_name,
          recipient_phone: appointment.client_phone,
          recipient_email: appointment.client_email,
          subject: "Cancellation SMS",
          scheduled_for: new Date().toISOString(),
          status: "pending",
          metadata: { body_text: smsBody },
        });
        results.push({ to: appointment.client_phone, type: "sms", scheduled: true });
      }
    }

    // === SMS: Schedule confirmation texts for new_request AND approved ===
    if (type === "new_request" || type === "approved") {
      const smsRecipients: { name: string; phone: string; email: string }[] = [];

      if (appointment.client_phone) {
        // Only schedule SMS for mobile numbers
        const normPhone = appointment.client_phone.replace(/[\s\-\(\)]/g, "");
        const isMobile = normPhone.startsWith("+447") || normPhone.startsWith("07") || /^7\d{9}$/.test(normPhone) || (!normPhone.startsWith("+44") && !normPhone.startsWith("0"));
        if (isMobile) {
          smsRecipients.push({
            name: appointment.client_name,
            phone: appointment.client_phone,
            email: appointment.client_email,
          });
        }
      }

      if (additionalAttendees?.length) {
        for (const att of additionalAttendees) {
          if (att.phone?.trim()) {
            const attNorm = att.phone.trim().replace(/[\s\-\(\)]/g, "");
            const attIsMobile = attNorm.startsWith("+447") || attNorm.startsWith("07") || /^7\d{9}$/.test(attNorm) || (!attNorm.startsWith("+44") && !attNorm.startsWith("0"));
            if (attIsMobile) {
              smsRecipients.push({
                name: att.name,
                phone: att.phone.trim(),
                email: att.email,
              });
            }
          }
        }
      }

      if (smsRecipients.length > 0) {
        // Fetch SMS template — use correct trigger types matching the DB
        const smsTrigger = type === "approved" ? "appointment_approved" : "booking_received";
        const { data: smsTpl } = await supabaseAdmin
          .from("sms_templates")
          .select("body_text")
          .eq("trigger_type", smsTrigger)
          .eq("is_active", true)
          .maybeSingle();

        let smsTemplate = smsTpl?.body_text;
        if (!smsTemplate) {
          smsTemplate = type === "approved"
            ? "Hi {{client_name}}, great news! Your {{service_name}} appointment on {{date}} at {{time}} has been confirmed. Please check your email for your consent form. Questions? Call 01305 340194. — Matt, ShawScope"
            : "Hi {{client_name}}, your ShawScope booking request for {{date}} at {{time}} has been received 👂\nPlease check your email/junk for updates.\n— Matt, ShawScope (no reply)";
        }

        const smsTriggerType = type === "approved" ? "booking_confirmed_sms" : "booking_received_sms";

        for (const recipient of smsRecipients) {
          // Dedup: check if SMS already scheduled for this appointment + trigger type + phone
          const { data: existingSms } = await supabaseAdmin
            .from("scheduled_communications")
            .select("id")
            .eq("appointment_id", appointment.id)
            .eq("trigger_type", smsTriggerType)
            .eq("recipient_phone", recipient.phone)
            .in("status", ["pending", "sent"])
            .maybeSingle();

          if (existingSms) {
            results.push({ to: recipient.phone, type: "sms", skipped: true, reason: "already_scheduled" });
            continue;
          }

          const smsBody = smsTemplate
            .replace(/\{\{client_name\}\}/g, recipient.name)
            .replace(/\{\{service_name\}\}/g, serviceName)
            .replace(/\{\{date\}\}/g, dateStr)
            .replace(/\{\{time\}\}/g, timeStr)
            .replace(/\{\{address\}\}/g, appointment.address || "")
            .replace(/\{\{postcode\}\}/g, appointment.postcode || "")
            .replace(/\{\{admin_notes\}\}/g, "");

          // Schedule SMS with 5-min delay
          await supabaseAdmin.from("scheduled_communications").insert({
            appointment_id: appointment.id,
            channel: "sms",
            trigger_type: smsTriggerType,
            recipient_name: recipient.name,
            recipient_phone: recipient.phone,
            recipient_email: recipient.email,
            subject: type === "approved" ? "Booking Confirmed SMS" : "Booking Confirmation SMS",
            scheduled_for: scheduledFor,
            status: "pending",
            metadata: { body_text: smsBody },
          });
          results.push({ to: recipient.phone, type: "sms", scheduled: true, scheduled_for: scheduledFor });
        }
      }
    }

    // === Send consent form IMMEDIATELY after a new_request, using patient's chosen channel ===
    if (type === "new_request" && consentFormTemplateId && consentFormUrl) {
      const chosen = consentDelivery === "in_person"
        ? "in_person"
        : consentDelivery === "sms" ? "sms" : "email";
      let consentTemplateName = "Consent Form";
      try {
        const { data: cftData } = await supabaseAdmin
          .from("consent_form_templates")
          .select("title")
          .eq("id", consentFormTemplateId)
          .single();
        if (cftData?.title) consentTemplateName = cftData.title;
      } catch (_) {}

      if (chosen === "in_person") {
        const alertSubject = `📋 BRING PAPER CONSENT FORM — ${appointment.client_name} on ${dateStr}`;
        const alertBody =
          `Patient has no email or SMS access for a digital consent form.\n\n` +
          `Patient: ${appointment.client_name}\n` +
          `Service: ${serviceName}\n` +
          `Form needed: ${consentTemplateName}\n` +
          `Date: ${dateStr}\n` +
          `Time: ${timeStr}\n` +
          `Phone: ${appointment.client_phone || "—"}\n` +
          `Email: ${appointment.client_email || "—"}\n\n` +
          `⚠️ Remember to take a PAPER ${consentTemplateName} to this appointment.`;
        await sendAdminEmail(alertSubject, alertBody);
        await sendAdminSms(`📋 BRING PAPER ${consentTemplateName} for ${appointment.client_name} — ${dateStr} ${timeStr}. Patient has no email/SMS for digital consent.`);
        results.push({ type: "consent_in_person_admin_alert", scheduled: true });
      } else if (chosen === "sms" && appointment.client_phone && isMobilePhone(appointment.client_phone)) {
        const smsBody = `Hi ${appointment.client_name.split(" ")[0]}, please complete your ${consentTemplateName} for your ShawScope appointment on ${dateStr} at ${timeStr}: ${consentFormUrl}\n— Matt, ShawScope (no reply)`;
        await supabaseAdmin.from("scheduled_communications").insert({
          appointment_id: appointment.id,
          channel: "sms",
          trigger_type: "consent_form_sms",
          recipient_name: appointment.client_name,
          recipient_phone: appointment.client_phone,
          recipient_email: appointment.client_email,
          subject: "Consent form SMS",
          scheduled_for: new Date().toISOString(),
          status: "pending",
          metadata: { body_text: smsBody },
        });
        await supabaseAdmin.from("appointments").update({ consent_sent_at: new Date().toISOString() }).eq("id", appointment.id);
        results.push({ to: appointment.client_phone, type: "consent_sms", scheduled: true });
      } else if (sendEmail) {
        const consentContent = `
          ${emailIconHeading("📝", "Consent Form Required", `Hi ${appointment.client_name}, please complete this form before your appointment.`)}
          ${emailDetailTable([
            { icon: "👤", label: "Name", value: appointment.client_name },
            { icon: "📋", label: "Form", value: consentTemplateName },
            { icon: "🩺", label: "Service", value: serviceName },
            { icon: "📅", label: "Date", value: dateStr },
            { icon: "🕐", label: "Time", value: timeStr },
          ])}
          ${emailInfoBox("⏰", "Important", "Please complete this form before your appointment so we're fully prepared for your visit.")}
          ${emailButton("📝  Complete Your Consent Form", consentFormUrl)}
          <div style="text-align:center;margin-bottom:16px;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;">🔗 Link not working? Copy this URL: <a href="${consentFormUrl}" style="color:#D4912A;text-decoration:none;word-break:break-all;">${consentFormUrl}</a></p>
          </div>`;
        const consentEmailHtml = emailWrap(consentContent, { subtitle: "Consent Form" }) + noReplyFooter;
        await supabaseAdmin.from("scheduled_communications").insert({
          appointment_id: appointment.id,
          channel: "email",
          trigger_type: "consent_form_email",
          recipient_name: appointment.client_name,
          recipient_email: appointment.client_email,
          subject: `📝 Please Complete Your Consent Form — ShawScope`,
          scheduled_for: new Date().toISOString(),
          status: "pending",
          metadata: { body_html: consentEmailHtml },
        });
        await supabaseAdmin.from("appointments").update({ consent_sent_at: new Date().toISOString() }).eq("id", appointment.id);
        results.push({ to: appointment.client_email, type: "consent_email", scheduled: true });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results, delayed: true, delay_minutes: DELAY_MINUTES }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
