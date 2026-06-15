import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailWrap, emailIconHeading, emailDetailTable, emailInfoBox, emailButton, emailSectionHeader } from "../_shared/email-layout.ts";
import { requireAdminOrCron } from "../_shared/auth-guard.ts";
import { sendSms, isMobilePhone, normalisePhoneForSmsWorks } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const compactVisitToken = (token: string | null | undefined) => (token || "").split("-")[0];

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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Fetch all pending communications that are due
    const { data: pendingComms, error } = await supabase
      .from("scheduled_communications")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(50);

    // Immediately claim these rows to prevent duplicate processing by concurrent invocations
    if (pendingComms && pendingComms.length > 0) {
      const ids = pendingComms.map((c: any) => c.id);
      await supabase
        .from("scheduled_communications")
        .update({ status: "processing" })
        .in("id", ids);
    }

    if (error) {
      throw new Error(`Failed to fetch pending comms: ${error.message}`);
    }

    let sent = 0;
    let failed = 0;

    for (const comm of pendingComms || []) {
      try {
        // Check if the linked appointment has been cancelled/rejected — skip sending
        if (comm.appointment_id) {
          const { data: aptStatus } = await supabase
            .from("appointments")
            .select("status")
            .eq("id", comm.appointment_id)
            .maybeSingle();

          if (aptStatus && ["cancelled", "rejected"].includes(aptStatus.status)) {
            await supabase
              .from("scheduled_communications")
              .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
              .eq("id", comm.id);
            console.info(`Cancelled comm ${comm.id} — appointment ${comm.appointment_id} is ${aptStatus.status}`);
            continue;
          }
        }

        // For consent reminders, check if consent has been completed or appointment has passed
        if (comm.trigger_type === "consent_reminder" && comm.appointment_id) {
          const { data: completed } = await supabase
            .from("consent_form_responses")
            .select("id")
            .eq("appointment_id", comm.appointment_id)
            .maybeSingle();

          if (completed) {
            await supabase
              .from("scheduled_communications")
              .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
              .eq("id", comm.id);
            continue;
          }

          // Check if appointment has passed
          const { data: apt } = await supabase
            .from("appointments")
            .select("appointment_date, appointment_time, access_token, client_name, consent_form_template_id, services(name)")
            .eq("id", comm.appointment_id)
            .maybeSingle();

          if (apt) {
            const aptDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time || "23:59"}`);
            if (aptDateTime <= new Date()) {
              await supabase
                .from("scheduled_communications")
                .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                .eq("id", comm.id);
              continue;
            }
          }
        }

        if (comm.channel === "email") {
          if (!resendApiKey) {
            console.error("RESEND_API_KEY not configured");
            failed++;
            continue;
          }

          let bodyHtml = (comm.metadata as any)?.body_html || "";
          let emailSubject = comm.subject || "ShawScope Notification";

          // For consent reminders, use DB template with variable substitution
          if (comm.trigger_type === "consent_reminder" && comm.appointment_id) {
            const { data: apt } = await supabase
              .from("appointments")
              .select("access_token, client_name, appointment_date, appointment_time, services(name)")
              .eq("id", comm.appointment_id)
              .single();

            if (apt) {
              const siteUrl = "https://shawscope.co.uk";
              const consentFormUrl = `${siteUrl}/consent/${apt.access_token}`;
              const serviceName = (apt as any).services?.name || "your appointment";
              const rawDate = apt.appointment_date;
              const dateParts = rawDate?.split("-");
              const dateStr = dateParts?.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate || "";
              const timeStr = apt.appointment_time?.slice(0, 5) || "";

              const { data: consentTpl } = await supabase
                .from("email_templates")
                .select("body_html, subject")
                .eq("trigger_type", "consent_reminder")
                .eq("is_active", true)
                .maybeSingle();

              if (consentTpl) {
                const vars: Record<string, string> = {
                  "{{client_name}}": apt.client_name || comm.recipient_name || "Patient",
                  "{{service_name}}": serviceName,
                  "{{date}}": dateStr,
                  "{{time}}": timeStr,
                  "{{consent_url}}": consentFormUrl,
                };
                let html = consentTpl.body_html;
                let subj = consentTpl.subject;
                for (const [k, v] of Object.entries(vars)) {
                  html = html.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
                  subj = subj.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
                }
                bodyHtml = emailWrap(html, { subtitle: "Consent Reminder" });
                emailSubject = subj;
              } else {
                // Fallback to hardcoded
                const consentReminderContent = `
                  ${emailIconHeading("⏰", "Reminder: Form Still Needed", `Hi ${apt.client_name}, we noticed you haven't completed your consent form yet.`)}
                  ${emailDetailTable([
                    { icon: "🩺", label: "Service", value: serviceName },
                    { icon: "📅", label: "Date", value: dateStr },
                    { icon: "🕐", label: "Time", value: timeStr },
                  ])}
                  ${emailButton("📝  Complete Your Form", consentFormUrl)}`;
                bodyHtml = emailWrap(consentReminderContent, { subtitle: "Consent Reminder" });
              }
            }
          }

          // For morning reminders, use DB template with variable substitution
          if (comm.trigger_type === "morning_reminder" && comm.appointment_id) {
            const { data: apt } = await supabase
              .from("appointments")
              .select("access_token, client_name, appointment_date, appointment_time, service_id, come_to_practitioner")
              .eq("id", comm.appointment_id)
              .maybeSingle();

            let morningServiceName = "your appointment";
            if (apt?.service_id) {
              const { data: svc } = await supabase.from("services").select("name").eq("id", apt.service_id).maybeSingle();
              if (svc?.name) morningServiceName = svc.name;
            }

            if (apt) {
              const siteUrl = "https://shawscope.co.uk";
              const readyUrl = `${siteUrl}/visit-ready/${apt.access_token}`;
              const trackingUrl = `${siteUrl}/visit-tracking/${apt.access_token}`;
              const timeStr = apt.appointment_time?.slice(0, 5) || "";
              const isComeToMe = apt.come_to_practitioner === true;

              // For come-to-me appointments, use a different template trigger or skip DB template
              const templateTrigger = isComeToMe ? "morning_reminder_clinic" : "morning_reminder";

              const { data: morningTpl } = await supabase
                .from("email_templates")
                .select("body_html, subject")
                .eq("trigger_type", templateTrigger)
                .eq("is_active", true)
                .maybeSingle();

              // Do NOT fall back to home-visit template for come-to-me — use hardcoded clinic content instead
              const effectiveTpl = morningTpl;

              if (effectiveTpl) {
                const vars: Record<string, string> = {
                  "{{client_name}}": apt.client_name || comm.recipient_name || "Patient",
                  "{{service_name}}": morningServiceName,
                  "{{time}}": timeStr,
                  "{{ready_url}}": readyUrl,
                  "{{tracking_url}}": trackingUrl,
                };
                let html = effectiveTpl.body_html;
                let subj = effectiveTpl.subject;
                for (const [k, v] of Object.entries(vars)) {
                  html = html.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
                  subj = subj.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
                }
                bodyHtml = emailWrap(html, { subtitle: isComeToMe ? "Appointment Day" : "Visit Day" });
                emailSubject = subj;
              } else if (isComeToMe) {
                // Come-to-me fallback
                const clinicContent = `
                  ${emailIconHeading("🏠", "Your Appointment is Today!", `Hi ${apt.client_name}, your ${morningServiceName} is today at ${timeStr} at our Broadmayne location.`)}
                  <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:20px;">
                    <p style="color:#0E1420;font-size:14px;margin:0 0 12px;font-weight:600;">📍 Before you arrive:</p>
                    <table cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr><td style="padding:8px 0;vertical-align:top;">
                        <p style="color:#0E1420;font-size:14px;margin:0 0 8px;"><strong>⏳ Please wait for our ready text</strong></p>
                        <p style="color:#6B7280;font-size:13px;margin:0 0 12px;">Please don't arrive until you've received a text or email from us confirming we're ready. If you haven't heard from us, plan to arrive at your booked time of ${timeStr}.</p>
                      </td></tr>
                      <tr><td style="padding:12px 0;border-top:1px solid #E5E7EB;"></td></tr>
                      <tr><td style="padding:8px 0;vertical-align:top;">
                        <p style="color:#0E1420;font-size:14px;margin:0 0 8px;"><strong>📍 Track Your Appointment</strong></p>
                        <p style="color:#6B7280;font-size:13px;margin:0 0 12px;">See where your appointment is in today's schedule and whether we're running on time.</p>
                        ${emailButton("📍  Track Your Appointment", trackingUrl, { color: "#2563eb" })}
                      </td></tr>
                    </table>
                  </div>`;
                bodyHtml = emailWrap(clinicContent, { subtitle: "Appointment Day" });
                emailSubject = `Your ShawScope Appointment Today at ${timeStr}`;
              } else {
                // Home visit fallback
                const morningContent = `
                  ${emailIconHeading("🚗", "Your Visit is Today!", `Hi ${apt.client_name}, Matt is visiting you today for your ${morningServiceName} at ${timeStr}.`)}
                  <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:20px;">
                    <p style="color:#0E1420;font-size:14px;margin:0 0 12px;font-weight:600;">📍 Two things you can do:</p>
                    <table cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr><td style="padding:8px 0;vertical-align:top;">
                        <p style="color:#0E1420;font-size:14px;margin:0 0 8px;"><strong>1. Ready earlier?</strong></p>
                        <p style="color:#6B7280;font-size:13px;margin:0 0 12px;">Let Matt know if you're home and ready before your appointment time — he may be able to visit sooner.</p>
                        ${emailButton("✅  I'm Ready Early", readyUrl, { color: "#059669" })}
                      </td></tr>
                      <tr><td style="padding:12px 0;border-top:1px solid #E5E7EB;"></td></tr>
                      <tr><td style="padding:8px 0;vertical-align:top;">
                        <p style="color:#0E1420;font-size:14px;margin:0 0 8px;"><strong>2. Track Matt's Progress</strong></p>
                        <p style="color:#6B7280;font-size:13px;margin:0 0 12px;">See where you are on today's visit list and whether we're on schedule.</p>
                        ${emailButton("📍  Track My Visit", trackingUrl, { color: "#2563eb" })}
                      </td></tr>
                    </table>
                  </div>`;
                bodyHtml = emailWrap(morningContent, { subtitle: "Visit Day" });
                emailSubject = `Your ShawScope Visit Today at ${timeStr}`;
              }
            }
          }

          // For cryo followup emails, build the full HTML from cryo_followup_templates
          if (comm.trigger_type === "cryo_followup" && comm.appointment_id) {
            const weekNumber = (comm.metadata as any)?.week_number;
            if (weekNumber) {
              const { data: cryoTpl } = await supabase
                .from("cryo_followup_templates")
                .select("heading, guidance_html, subject")
                .eq("week_number", weekNumber)
                .eq("is_active", true)
                .maybeSingle();

              if (cryoTpl) {
                const { data: apt } = await supabase
                  .from("appointments")
                  .select("access_token, client_name")
                  .eq("id", comm.appointment_id)
                  .maybeSingle();

                const siteUrl = "https://shawscope.co.uk";
                const followupUrl = `${siteUrl}/followup/${apt?.access_token || "unknown"}?week=${weekNumber}`;
                const clientName = apt?.client_name || comm.recipient_name || "Patient";
                const weekLabel = weekNumber === 1 ? "1 Week" : `${weekNumber} Weeks`;

                const cryoContent = `
                  ${emailIconHeading("❄️", cryoTpl.heading, `Hi ${clientName}, we're checking in on your healing progress.`)}
                  ${emailInfoBox("📅", "Progress Check", `<strong style="color:#3b82f6;">${weekLabel} Post-Treatment</strong>`, { bgColor: "#EFF6FF", borderColor: "#BFDBFE", textColor: "#3b82f6", labelColor: "#1E40AF" })}
                  <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:20px;">
                    ${emailSectionHeader("🩹", "What You Might Be Seeing")}
                    <div style="padding:16px;color:#444;font-size:14px;line-height:1.7;">
                      ${cryoTpl.guidance_html}
                    </div>
                  </div>
                  ${emailInfoBox("💬", "How are things going?", "We'd love to hear how you're getting on. You can reply to this email, or use the button below to send us an update — including a photo if you'd like.", { bgColor: "#F0FDF4", borderColor: "#86EFAC", textColor: "#6B7280", labelColor: "#166534" })}
                  ${emailButton("📸  Send an Update", followupUrl)}
                  ${emailInfoBox("⚠️", "Concerned?", "If you have any concerns about your healing, don't hesitate to reply to this email or contact us directly. We're here to help.")}`;

                emailSubject = `ShawScope — ${cryoTpl.subject}`;
                bodyHtml = emailWrap(cryoContent, { subtitle: "Healing Check-In", noReply: false });

                // Also record it in cryo_followups to prevent the cryo-followup cron from double-sending
                await supabase.from("cryo_followups").upsert({
                  appointment_id: comm.appointment_id,
                  week_number: weekNumber,
                  sent_at: new Date().toISOString(),
                }, { onConflict: "appointment_id,week_number" }).select().maybeSingle();
              }
            }
          }

          // For non-manual, non-consent_reminder, non-morning_reminder, non-cryo_followup emails, resolve from email_templates
          if (!bodyHtml && comm.trigger_type !== "manual" && comm.trigger_type !== "consent_reminder" && comm.trigger_type !== "morning_reminder" && comm.trigger_type !== "cryo_followup") {
            // Map trigger types to email template trigger types
            const emailTemplateMapping: Record<string, string> = {
              review_request: "review_request",
              approved: "approved",
              new_request: "new_request_client",
              cancelled: "cancelled",
              rejected: "rejected",
              appointment_changed: "appointment_changed",
            };

            const templateTrigger = emailTemplateMapping[comm.trigger_type] || comm.trigger_type;
            const { data: emailTpl } = await supabase
              .from("email_templates")
              .select("body_html, subject")
              .eq("trigger_type", templateTrigger)
              .eq("is_active", true)
              .maybeSingle();

            if (emailTpl) {
              // Build template vars from appointment data
              let tplVars: Record<string, string> = {
                "{{client_name}}": comm.recipient_name || "Patient",
              };

              if (comm.appointment_id) {
                const { data: apt } = await supabase
                  .from("appointments")
                  .select("*, services:service_id(name)")
                  .eq("id", comm.appointment_id)
                  .maybeSingle();

                if (apt) {
                  const rawDate = apt.appointment_date;
                  const dateParts = rawDate?.split("-");
                  const dateStr = dateParts?.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate || "";
                  tplVars["{{service_name}}"] = (apt as any).services?.name || "Service";
                  tplVars["{{date}}"] = dateStr;
                  tplVars["{{time}}"] = apt.appointment_time?.slice(0, 5) || "";
                  tplVars["{{address}}"] = apt.address || "";
                  tplVars["{{notes}}"] = apt.notes || "";
                  tplVars["{{admin_notes}}"] = apt.admin_notes || "";
                  tplVars["{{cancel_url}}"] = `https://shawscope.co.uk/cancel-appointment/${apt.access_token}`;
                }
              }

              let html = emailTpl.body_html;
              for (const [key, val] of Object.entries(tplVars)) {
                html = html.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), val);
              }
              bodyHtml = html;

              // Also replace vars in subject
              let resolvedSubject = emailTpl.subject;
              for (const [key, val] of Object.entries(tplVars)) {
                resolvedSubject = resolvedSubject.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), val);
              }
              emailSubject = resolvedSubject;
            }
          }

          if (!bodyHtml) {
            bodyHtml = `<p>Notification for ${comm.recipient_name}</p>`;
          }

          // Build email headers for improved deliverability
          const emailHeaders: Record<string, string> = {
            "X-Entity-Ref-ID": comm.id, // unique per email to avoid threading/grouping
          };

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "ShawScope <bookings@shawscope.co.uk>",
              to: [comm.recipient_email],
              reply_to: "matt@shawscope.co.uk",
              subject: emailSubject,
              html: bodyHtml,
              headers: emailHeaders,
            }),
          });
          const resData = await res.json();

          await supabase
            .from("scheduled_communications")
            .update({ status: res.ok ? "sent" : "failed", sent_at: new Date().toISOString() })
            .eq("id", comm.id);

          await supabase.from("communications_log").insert({
            channel: "email",
            recipient_name: comm.recipient_name,
            recipient_email: comm.recipient_email,
            subject: comm.subject,
            body_preview: comm.subject,
            body_html: bodyHtml,
            trigger_type: comm.trigger_type,
            appointment_id: comm.appointment_id,
            status: res.ok ? "sent" : "failed",
            error_message: res.ok ? null : JSON.stringify(resData),
          });

          // For consent reminders, schedule the next day's reminder after sending
          if (comm.trigger_type === "consent_reminder" && res.ok && comm.appointment_id) {
            // Schedule next reminder in 2 days (every other day)
            const nextReminder = new Date();
            nextReminder.setDate(nextReminder.getDate() + 2);
            nextReminder.setHours(9, 0, 0, 0);

            // Only schedule if before the appointment
            const { data: apt } = await supabase
              .from("appointments")
              .select("appointment_date, appointment_time")
              .eq("id", comm.appointment_id)
              .maybeSingle();

            if (apt) {
              const aptDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time || "23:59"}`);
              if (nextReminder < aptDateTime) {
                await supabase.from("scheduled_communications").insert({
                  appointment_id: comm.appointment_id,
                  channel: "email",
                  trigger_type: "consent_reminder",
                  recipient_name: comm.recipient_name,
                  recipient_email: comm.recipient_email,
                  subject: comm.subject,
                  scheduled_for: nextReminder.toISOString(),
                  metadata: comm.metadata || {},
                });
              }
            }
          }

          if (res.ok) sent++;
          else failed++;

        } else if (comm.channel === "sms") {
          if (!Deno.env.get("THESMSWORKS_JWT")) {
            console.error("SMS provider not configured");
            failed++;
            continue;
          }

          let smsBody = (comm.metadata as any)?.body_text || "";

          // For SMS reminders, build the message from appointment data + template
          if (!smsBody && comm.trigger_type === "sms_reminder" && comm.appointment_id) {
            const { data: apt } = await supabase
              .from("appointments")
              .select("client_name, appointment_date, appointment_time, services(name)")
              .eq("id", comm.appointment_id)
              .maybeSingle();

            if (apt) {
              const { data: smsTemplate } = await supabase
                .from("sms_templates")
                .select("body_text")
                .eq("trigger_type", "appointment_reminder")
                .single();

              const templateText = smsTemplate?.body_text || "Hi {{client_name}}, reminder about your {{service_name}} appointment tomorrow ({{date}}) at {{time}}. Reply or call to reschedule. Thank you, ShawScope!";
              const rawDate = apt.appointment_date;
              const dateParts = rawDate?.split("-");
              const formattedDate = dateParts?.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate || "";
              const timeStr = apt.appointment_time?.slice(0, 5) || "";
              const serviceName = (apt as any).services?.name || "your appointment";

              smsBody = templateText
                .replace(/\{\{client_name\}\}/g, apt.client_name || comm.recipient_name || "")
                .replace(/\{\{service_name\}\}/g, serviceName)
                .replace(/\{\{date\}\}/g, formattedDate)
                .replace(/\{\{time\}\}/g, timeStr)
                .replace(/\{\{address\}\}/g, "")
                .replace(/\{\{admin_notes\}\}/g, "");
            }
          }

          // For morning reminder SMS, use DB template with variable substitution
          if (!smsBody && comm.trigger_type === "morning_reminder" && comm.appointment_id) {
            const { data: apt } = await supabase
              .from("appointments")
              .select("client_name, appointment_time, access_token, service_id, come_to_practitioner")
              .eq("id", comm.appointment_id)
              .maybeSingle();

            if (apt) {
              let smsServiceName = "your appointment";
              if (apt.service_id) {
                const { data: svc } = await supabase.from("services").select("name").eq("id", apt.service_id).maybeSingle();
                if (svc?.name) smsServiceName = svc.name;
              }
              const siteUrl = "https://shawscope.co.uk";
              const smsToken = compactVisitToken(apt.access_token);
              const readyUrl = `${siteUrl}/visit-ready/${smsToken}`;
              const trackingUrl = `${siteUrl}/visit-tracking/${smsToken}`;
              const timeStr = apt.appointment_time?.slice(0, 5) || "";
              const isComeToMe = apt.come_to_practitioner === true;

              const smsTrigger = isComeToMe ? "morning_reminder_clinic" : "morning_reminder";
              const { data: smsMorningTpl } = await supabase
                .from("sms_templates")
                .select("body_text")
                .eq("trigger_type", smsTrigger)
                .eq("is_active", true)
                .maybeSingle();

              const defaultHomeVisit = `Hi {{client_name}}, Matt is visiting you today for {{service_name}} at {{time}}.\n\nReady earlier? Let us know: {{ready_url}}\n\nTrack Matt's progress: {{tracking_url}}\n\nAny issues? Call us on 01305 340194\n\nShawScope`;
              const defaultComeToMe = `Hi {{client_name}}, your {{service_name}} is today at {{time}} at our Broadmayne location.\n\n⏳ Please wait for our ready text before arriving. If you don't hear from us, plan to arrive at {{time}}.\n\nTrack your appointment: {{tracking_url}}\n\nQuestions? 01305 340194\n\nShawScope`;

              const templateText = smsMorningTpl?.body_text || (isComeToMe ? defaultComeToMe : defaultHomeVisit);
              smsBody = templateText
                .replace(/\{\{client_name\}\}/g, apt.client_name || comm.recipient_name || "")
                .replace(/\{\{service_name\}\}/g, smsServiceName)
                .replace(/\{\{time\}\}/g, timeStr)
                .replace(/\{\{ready_url\}\}/g, readyUrl)
                .replace(/\{\{tracking_url\}\}/g, trackingUrl);
            }
          }

          // For review_request SMS, resolve from sms_templates
          if (!smsBody && comm.trigger_type === "review_request") {
            const { data: reviewSmsTpl } = await supabase
              .from("sms_templates")
              .select("body_text")
              .eq("trigger_type", "review_request")
              .eq("is_active", true)
              .maybeSingle();

            if (reviewSmsTpl?.body_text) {
              smsBody = reviewSmsTpl.body_text.replace(
                /\{\{client_name\}\}/g,
                comm.recipient_name || "there"
              );
            }
          }

          // Generic fallback for any other unresolved SMS
          if (!smsBody) {
            // Attempt to resolve from sms_templates by trigger_type
            const { data: genericSmsTpl } = await supabase
              .from("sms_templates")
              .select("body_text")
              .eq("trigger_type", comm.trigger_type)
              .eq("is_active", true)
              .maybeSingle();

            if (genericSmsTpl?.body_text) {
              smsBody = genericSmsTpl.body_text.replace(
                /\{\{client_name\}\}/g,
                comm.recipient_name || "there"
              );
            } else {
              smsBody = `ShawScope: Reminder for ${comm.recipient_name}. Please contact us if you need to reschedule. Thank you!`;
            }
          }

          const normalisedPhone = normalisePhoneForSmsWorks(comm.recipient_phone);
          if (!normalisedPhone) {
            console.error(`Invalid phone for ${comm.recipient_name}: ${comm.recipient_phone}`);
            await supabase
              .from("scheduled_communications")
              .update({ status: "failed" })
              .eq("id", comm.id);
            failed++;
            continue;
          }
          if (!isMobilePhone(comm.recipient_phone)) {
            console.log(`Skipping SMS to landline: ${comm.recipient_phone} (${comm.recipient_name})`);
            await supabase
              .from("scheduled_communications")
              .update({ status: "skipped" })
              .eq("id", comm.id);
            continue;
          }
          const smsRes = await sendSms(comm.recipient_phone, smsBody + "\n\n(No-Reply)");

          await supabase
            .from("scheduled_communications")
            .update({ status: smsRes.ok ? "sent" : "failed", sent_at: new Date().toISOString() })
            .eq("id", comm.id);

          await supabase.from("communications_log").insert({
            channel: "sms",
            recipient_name: comm.recipient_name,
            recipient_phone: comm.recipient_phone,
            recipient_email: comm.recipient_email,
            subject: comm.subject,
            body_preview: smsBody.slice(0, 200),
            body_html: smsBody,
            trigger_type: comm.trigger_type,
            appointment_id: comm.appointment_id,
            status: smsRes.ok ? "sent" : "failed",
            error_message: smsRes.ok ? null : (smsRes.body?.error || JSON.stringify(smsRes.body)),
          });

          if (smsRes.ok) sent++;
          else failed++;
        }
      } catch (commErr) {
        console.error(`Error processing comm ${comm.id}:`, commErr);
        await supabase
          .from("scheduled_communications")
          .update({ status: "failed" })
          .eq("id", comm.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed: (pendingComms || []).length, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
