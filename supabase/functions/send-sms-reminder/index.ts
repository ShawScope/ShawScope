import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendSms, normalisePhoneForSmsWorks, isMobilePhone, SMS_SENDER } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Can be called two ways:
    // 1. Scheduled (no body) — sends reminders for tomorrow's appointments
    // 2. Manual (with appointmentId) — sends reminder for a specific appointment
    let appointments: any[] = [];

    const body = await req.json().catch(() => ({}));

    // Test mode: send a specific message to a specific phone number
    if (body.testMode && body.testPhone && body.testMessage) {
      const result = await sendSms(body.testPhone, `[TEST] ${body.testMessage}\n\n(No-Reply)`);
      return new Response(
        JSON.stringify({ message: "Test SMS sent", status: result.status, messageid: result.messageid }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.appointmentId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, client_name, client_phone, appointment_date, appointment_time, services(name)")
        .eq("id", body.appointmentId)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Appointment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      appointments = [data];
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("appointments")
        .select("id, client_name, client_phone, appointment_date, appointment_time, services(name)")
        .eq("appointment_date", tomorrowStr)
        .eq("status", "approved")
        .not("client_phone", "is", null);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      appointments = data || [];
    }

    if (appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No appointments to remind", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const results: any[] = [];

    // Fetch SMS template for reminders
    const { data: smsTemplate } = await supabase
      .from("sms_templates")
      .select("body_text, is_active")
      .eq("trigger_type", "appointment_reminder")
      .single();

    const templateText = smsTemplate?.body_text || "Hi {{client_name}}, reminder about your {{service_name}} appointment tomorrow ({{date}}) at {{time}}. Reply or call to reschedule. Thank you, ShawScope!";

    for (const apt of appointments) {
      if (!apt.client_phone) continue;

      // Check if cancelled in scheduled_communications (for auto reminders)
      if (!body.appointmentId) {
        const { data: scheduled } = await supabase
          .from("scheduled_communications")
          .select("id, status")
          .eq("appointment_id", apt.id)
          .eq("trigger_type", "sms_reminder")
          .maybeSingle();

        if (scheduled?.status === "cancelled") {
          if (scheduled) {
            await supabase.from("scheduled_communications")
              .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
              .eq("id", scheduled.id);
          }
          continue;
        }
      }


      // Use custom message if provided, otherwise build from template
      let message: string;
      if (body.customMessage) {
        message = body.customMessage;
      } else {
        const timeStr = apt.appointment_time?.slice(0, 5);
        const serviceName = apt.services?.name || "your appointment";
        const rawDate = apt.appointment_date;
        const dateParts = rawDate.split("-");
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate;
        message = templateText
          .replace(/\{\{client_name\}\}/g, apt.client_name)
          .replace(/\{\{service_name\}\}/g, serviceName)
          .replace(/\{\{date\}\}/g, formattedDate)
          .replace(/\{\{time\}\}/g, timeStr)
          .replace(/\{\{address\}\}/g, "")
          .replace(/\{\{admin_notes\}\}/g, "");
      }

      const normalisedPhone = normalisePhoneForSmsWorks(apt.client_phone);
      if (!normalisedPhone) {
        results.push({ to: apt.client_phone, status: 400, sid: null, error: "Invalid phone number format" });
        continue;
      }
      if (!isMobilePhone(apt.client_phone)) {
        console.log(`Skipping SMS to landline: ${apt.client_phone} (${apt.client_name})`);
        results.push({ to: apt.client_phone, status: 400, sid: null, error: "Landline number — SMS not sent" });
        continue;
      }

      const smsResult = await sendSms(apt.client_phone, message + "\n\n(No-Reply)");
      results.push({
        to: apt.client_phone,
        status: smsResult.status,
        sid: smsResult.messageid || null,
        error: smsResult.ok ? null : (smsResult.body?.message || JSON.stringify(smsResult.body)),
      });

      // Log to communications_log
      try {
        await supabase.from("communications_log").insert({
          channel: "sms",
          recipient_name: apt.client_name,
          recipient_phone: apt.client_phone,
          subject: "SMS Reminder",
          body_preview: message.slice(0, 200),
          body_html: message,
          trigger_type: body.appointmentId ? "manual_sms_reminder" : "auto_sms_reminder",
          appointment_id: apt.id,
          status: smsResult.ok ? "sent" : "failed",
          error_message: smsResult.ok ? null : (smsResult.body?.message || JSON.stringify(smsResult.body)),
        });
      } catch (_) { /* don't fail the main flow */ }

      if (smsResult.ok) sent++;
    }

    return new Response(
      JSON.stringify({ message: "SMS reminders processed", sent, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
