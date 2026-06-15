import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAdminOrCron } from "../_shared/auth-guard.ts";

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

    const authError = await requireAdminOrCron(req, corsHeaders);
    if (authError) return authError;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    let created = 0;

    // 1. SMS Reminders — for approved appointments in the future
    const { data: futureApts } = await supabase
      .from("appointments")
      .select("id, client_name, client_email, client_phone, appointment_date, appointment_time, service_id, services(name, duration_minutes)")
      .in("status", ["approved", "confirmed"])
      .gte("appointment_date", now.toISOString().split("T")[0])
      .not("client_phone", "is", null);

    for (const apt of futureApts || []) {
      // Schedule SMS reminder for day before at 18:00
      const reminderDate = new Date(`${apt.appointment_date}T18:00:00`);
      reminderDate.setDate(reminderDate.getDate() - 1);

      if (reminderDate <= now) continue;

      // Check if already scheduled
      const { data: existing } = await supabase
        .from("scheduled_communications")
        .select("id")
        .eq("appointment_id", apt.id)
        .eq("trigger_type", "sms_reminder")
        .eq("status", "pending")
        .limit(1);

      if (!existing?.length) {
        await supabase.from("scheduled_communications").insert({
          appointment_id: apt.id,
          channel: "sms",
          trigger_type: "sms_reminder",
          recipient_name: apt.client_name,
          recipient_phone: apt.client_phone,
          subject: "Appointment Reminder",
          scheduled_for: reminderDate.toISOString(),
          metadata: {},
        });
        created++;
      }
    }

    // 2. Review Requests — REMOVED: Review requests are now ONLY created manually
    // via the consultation form checkbox or the appointment completion workflow.
    // Auto-scheduling was causing unsolicited review requests to be sent.

    // 3. Cryo Follow-ups — for completed cryo appointments within 28 days
    const twentyEightDaysAgo = new Date(now);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const { data: cryoApts } = await supabase
      .from("appointments")
      .select("id, client_name, client_email, appointment_date, services!inner(name)")
      .eq("status", "completed")
      .gte("appointment_date", twentyEightDaysAgo.toISOString().split("T")[0])
      .ilike("services.name", "%cryotherapy%");

    for (const apt of cryoApts || []) {
      const appointmentDate = new Date(apt.appointment_date);

      for (const week of [1, 2, 3, 4]) {
        const { data: alreadySent } = await supabase
          .from("cryo_followups")
          .select("id")
          .eq("appointment_id", apt.id)
          .eq("week_number", week)
          .maybeSingle();

        if (alreadySent) continue;

        const sendDate = new Date(appointmentDate);
        sendDate.setDate(sendDate.getDate() + week * 7);
        sendDate.setHours(9, 0, 0, 0);

        if (sendDate <= now) continue;

        const { data: existing } = await supabase
          .from("scheduled_communications")
          .select("id")
          .eq("appointment_id", apt.id)
          .eq("trigger_type", "cryo_followup")
          .eq("metadata->>week_number", String(week))
          .eq("status", "pending")
          .limit(1);

        if (!existing?.length) {
          await supabase.from("scheduled_communications").insert({
            appointment_id: apt.id,
            channel: "email",
            trigger_type: "cryo_followup",
            recipient_name: apt.client_name,
            recipient_email: apt.client_email,
            subject: `Cryo Follow-up — Week ${week}`,
            scheduled_for: sendDate.toISOString(),
            metadata: { week_number: week },
          });
          created++;
        }
      }
    }

    // 4a. Cancel ALL consent reminders for appointments where consent is already completed
    // This catches cases where consent was completed between populate runs
    const { data: allPendingConsentReminders } = await supabase
      .from("scheduled_communications")
      .select("id, appointment_id")
      .eq("trigger_type", "consent_reminder")
      .eq("status", "pending");

    for (const reminder of allPendingConsentReminders || []) {
      if (!reminder.appointment_id) continue;
      const { data: completed } = await supabase
        .from("consent_form_responses")
        .select("id")
        .eq("appointment_id", reminder.appointment_id)
        .maybeSingle();

      if (completed) {
        await supabase
          .from("scheduled_communications")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", reminder.id);
      }
    }

    // 4b. Daily Consent Reminders — for future appointments with consent forms not yet completed
    const { data: consentApts } = await supabase
      .from("appointments")
      .select("id, client_name, client_email, appointment_date, appointment_time, consent_form_template_id, consent_sent_at, services(name)")
      .in("status", ["pending", "confirmed", "approved"])
      .not("consent_form_template_id", "is", null)
      .not("consent_sent_at", "is", null)
      .gte("appointment_date", now.toISOString().split("T")[0]);

    for (const apt of consentApts || []) {
      // Check if consent has already been completed
      const { data: completed } = await supabase
        .from("consent_form_responses")
        .select("id")
        .eq("appointment_id", apt.id)
        .maybeSingle();

      if (completed) {
        // Consent completed — cancel any pending reminders
        await supabase
          .from("scheduled_communications")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("appointment_id", apt.id)
          .eq("trigger_type", "consent_reminder")
          .eq("status", "pending");
        continue;
      }

      // Check if appointment date has passed
      const aptDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time || "23:59"}`);
      if (aptDateTime <= now) {
        // Appointment passed — cancel pending reminders
        await supabase
          .from("scheduled_communications")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("appointment_id", apt.id)
          .eq("trigger_type", "consent_reminder")
          .eq("status", "pending");
        continue;
      }

      // Schedule next daily 9am reminder if none pending
      const { data: existingReminder } = await supabase
        .from("scheduled_communications")
        .select("id")
        .eq("appointment_id", apt.id)
        .eq("trigger_type", "consent_reminder")
        .eq("status", "pending")
        .limit(1);

      if (!existingReminder?.length) {
        // Schedule for next eligible 9am (every other day)
        // Check when the last consent reminder was sent for this appointment
        const { data: lastSent } = await supabase
          .from("scheduled_communications")
          .select("scheduled_for")
          .eq("appointment_id", apt.id)
          .eq("trigger_type", "consent_reminder")
          .in("status", ["sent"])
          .order("scheduled_for", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextReminder = new Date(now);
        nextReminder.setHours(9, 0, 0, 0);
        if (nextReminder <= now) {
          nextReminder.setDate(nextReminder.getDate() + 1);
        }

        // If a reminder was sent, ensure at least 2 days gap
        if (lastSent) {
          const lastSentDate = new Date(lastSent.scheduled_for);
          const minNextDate = new Date(lastSentDate);
          minNextDate.setDate(minNextDate.getDate() + 2);
          minNextDate.setHours(9, 0, 0, 0);
          if (nextReminder < minNextDate) {
            nextReminder.setTime(minNextDate.getTime());
          }
        }
        // Don't schedule past the appointment
        if (nextReminder < aptDateTime) {
          const serviceName = (apt as any).services?.name || "your appointment";
          await supabase.from("scheduled_communications").insert({
            appointment_id: apt.id,
            channel: "email",
            trigger_type: "consent_reminder",
            recipient_name: apt.client_name,
            recipient_email: apt.client_email,
            subject: `Reminder: Please Complete Your Consent Form — ShawScope`,
            scheduled_for: nextReminder.toISOString(),
            metadata: { service_name: serviceName },
          });
          created++;
        }
      }
    }

    // 5. Morning-of Reminders — for today's approved appointments at 8 AM
    // Use UK local date + time (Europe/London) so 8 AM means 8 AM in Dorset,
    // regardless of server timezone or BST/GMT offset.
    const ukNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
    const ukYear = ukNow.getFullYear();
    const ukMonth = String(ukNow.getMonth() + 1).padStart(2, "0");
    const ukDay = String(ukNow.getDate()).padStart(2, "0");
    const todayStr = `${ukYear}-${ukMonth}-${ukDay}`;
    // Compute the exact UTC instant that corresponds to 08:00 UK local time today.
    // BST = UTC+1, GMT = UTC+0. Probe by formatting an arbitrary UTC instant.
    const probeUtc = new Date(`${todayStr}T12:00:00Z`);
    const ukHourAtProbe = Number(
      probeUtc.toLocaleString("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }).slice(0, 2)
    );
    const ukOffsetHours = ukHourAtProbe - 12; // 1 in BST, 0 in GMT
    const morningTime = new Date(`${todayStr}T${String(8 - ukOffsetHours).padStart(2, "0")}:00:00Z`);

    // Schedule for 8 AM today, or send immediately if already past 8 AM
    // (so same-day bookings still receive their morning tracking message)
    {
      const sendAt = now < morningTime ? morningTime : now;
      const { data: todayApts } = await supabase
        .from("appointments")
        .select("id, client_name, client_email, client_phone, appointment_date, appointment_time, access_token, services(name, duration_minutes)")
        .in("status", ["approved", "confirmed"])
        .eq("appointment_date", todayStr)
        .not("client_phone", "is", null);

      for (const apt of todayApts || []) {
        // Check if SMS already scheduled
        const { data: existingSms } = await supabase
          .from("scheduled_communications")
          .select("id")
          .eq("appointment_id", apt.id)
          .eq("trigger_type", "morning_reminder")
          .eq("channel", "sms")
          .in("status", ["pending", "sent"])
          .limit(1);

        if (!existingSms?.length) {
          await supabase.from("scheduled_communications").insert({
            appointment_id: apt.id,
            channel: "sms",
            trigger_type: "morning_reminder",
            recipient_name: apt.client_name,
            recipient_phone: apt.client_phone,
            subject: "Morning Reminder",
            scheduled_for: sendAt.toISOString(),
            metadata: { access_token: apt.access_token },
          });
          created++;
        }

        // Check if email already scheduled (separate check per channel)
        if (apt.client_email) {
          const { data: existingEmail } = await supabase
            .from("scheduled_communications")
            .select("id")
            .eq("appointment_id", apt.id)
            .eq("trigger_type", "morning_reminder")
            .eq("channel", "email")
            .in("status", ["pending", "sent"])
            .limit(1);

          if (!existingEmail?.length) {
            await supabase.from("scheduled_communications").insert({
              appointment_id: apt.id,
              channel: "email",
              trigger_type: "morning_reminder",
              recipient_name: apt.client_name,
              recipient_email: apt.client_email,
              subject: "Your ShawScope Visit Today",
              scheduled_for: sendAt.toISOString(),
              metadata: { access_token: apt.access_token },
            });
            created++;
          }
        }
      }
    }

    // === CLEANUP: Cancel pending comms for cancelled/rejected appointments ===
    const { data: pendingComms } = await supabase
      .from("scheduled_communications")
      .select("id, appointment_id")
      .eq("status", "pending")
      .not("appointment_id", "is", null);

    let cancelled = 0;
    for (const comm of pendingComms || []) {
      const { data: apt } = await supabase
        .from("appointments")
        .select("status")
        .eq("id", comm.appointment_id)
        .maybeSingle();

      if (apt && ["cancelled", "rejected"].includes(apt.status)) {
        await supabase
          .from("scheduled_communications")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", comm.id);
        cancelled++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Scheduled communications populated", created, cancelled }),
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
