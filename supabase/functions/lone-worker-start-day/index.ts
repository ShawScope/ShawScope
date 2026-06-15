import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { emailWrap, emailIconHeading, emailDetailTable, emailInfoBox } from "../_shared/email-layout.ts";

const WIFE_EMAIL = "tessa-ayles-01@hotmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TZ = "Europe/London";

const fmtUk = (d: Date) => new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ,
}).format(d);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Today in UK timezone
    const todayUkStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

    const { data: appts, error: aErr } = await admin
      .from("appointments")
      .select("appointment_time, duration_minutes, service_id, status")
      .eq("appointment_date", todayUkStr)
      .not("status", "in", "(cancelled,rejected,rejected_awaiting,form_only)")
      .order("appointment_time", { ascending: true });
    if (aErr) throw aErr;

    if (!appts || appts.length === 0) {
      return new Response(JSON.stringify({ error: "No appointments today" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch service durations for fallback
    const serviceIds = [...new Set(appts.map(a => a.service_id).filter(Boolean))] as string[];
    let svcMap = new Map<string, number>();
    if (serviceIds.length) {
      const { data: svcs } = await admin.from("services").select("id, duration_minutes").in("id", serviceIds);
      svcs?.forEach((s: any) => svcMap.set(s.id, s.duration_minutes ?? 60));
    }

    const first = appts[0];
    const last = appts[appts.length - 1];
    const lastDur = (last.duration_minutes && last.duration_minutes > 0)
      ? last.duration_minutes
      : (last.service_id ? (svcMap.get(last.service_id) ?? 60) : 60);

    // Build start/end Date objects in UK time
    const buildDate = (timeStr: string, addMin = 0) => {
      const [h, m] = timeStr.split(":").map(Number);
      // Construct as UK local time. ISO with no zone is interpreted as local — but server is UTC, so we build via parts.
      // Simpler: store as ISO using a known UK offset is fragile; use a string and let formatter present in UK.
      // We'll build a UTC date that, when formatted in UK tz, yields the desired time on today.
      // Approach: build candidate UTC date for today midnight UK, add hours/minutes/addMin.
      const ukMidnightUtcStr = `${todayUkStr}T00:00:00Z`;
      const probe = new Date(ukMidnightUtcStr);
      // Determine current offset between UTC and UK at probe
      const ukString = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(probe);
      const [ph, pm] = ukString.split(":").map(Number);
      // If probe formatted as UK gives ph:pm (which represents UK midnight + offset), offsetMin = ph*60+pm
      const offsetMin = ph * 60 + pm; // 0 in winter, 60 in BST
      // Desired UK time minutes since midnight:
      const desiredMin = h * 60 + m + addMin;
      // UTC = UK midnight (probe) + (desiredMin - offsetMin) ... wait, probe currently equals UK midnight in UTC means UK clock shows offsetMin.
      // So target UTC = probe + (desiredMin - offsetMin) minutes.
      return new Date(probe.getTime() + (desiredMin - offsetMin) * 60000);
    };

    const startDt = buildDate(first.appointment_time);
    const endDt = buildDate(last.appointment_time, lastDur);

    // Look up emergency contact from business settings (name only; email is hardcoded to wife)
    const { data: settings } = await admin.from("business_settings").select("emergency_contact_name").limit(1).maybeSingle();
    const contactName = settings?.emergency_contact_name ?? "Tessa";

    // Insert check-in
    const { data: checkin, error: cErr } = await admin
      .from("gov_lone_worker_checkins")
      .insert({
        start_time: startDt.toISOString(),
        expected_end: endDt.toISOString(),
        location: "Today's clinic round",
        emergency_contact: `${contactName} (${WIFE_EMAIL})`,
        notes: `Auto check-in for ${appts.length} appointment(s) today. Started by ${user.email}.`,
        status: "active",
      })
      .select("id")
      .single();
    if (cErr) throw cErr;

    // Send email to wife
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const textBody = `Matt has ${appts.length} appointment${appts.length === 1 ? "" : "s"} today, starting at ${fmtUk(startDt)} and ending at ${fmtUk(endDt)}. Track via Apple Find My Friends, follow the calendar, or call if concerned.`;
    const subject = `Matt's clinic day started — ${fmtUk(startDt)} to ${fmtUk(endDt)}`;
    const html = emailWrap(`
      ${emailIconHeading("🛡️", "Matt's clinic day has started", "Lone-worker safety check-in")}
      ${emailDetailTable([
        { icon: "📋", label: "Appointments today", value: String(appts.length) },
        { icon: "🟢", label: "Starting at", value: fmtUk(startDt) },
        { icon: "🔴", label: "Expected finish", value: fmtUk(endDt) },
      ])}
      ${emailInfoBox("📍", "If you're concerned", "Track via Apple Find My Friends, check the shared calendar, or call Matt directly.")}
    `, { subtitle: "Lone-worker check-in", noReply: false });

    let emailOk = false;
    let emailError: string | null = null;
    if (resendApiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ShawScope <bookings@shawscope.co.uk>",
            to: [WIFE_EMAIL],
            reply_to: "matt@shawscope.co.uk",
            subject,
            html,
          }),
        });
        emailOk = res.ok;
        if (!res.ok) emailError = (await res.text()).slice(0, 500);
      } catch (err) {
        emailError = err instanceof Error ? err.message : String(err);
      }
    } else {
      emailError = "RESEND_API_KEY not configured";
    }

    await admin.from("communications_log").insert({
      channel: "email",
      recipient_name: contactName,
      recipient_email: WIFE_EMAIL,
      subject,
      body_preview: textBody,
      body_html: html,
      trigger_type: "lone_worker_start_day",
      status: emailOk ? "sent" : "failed",
      error_message: emailError,
    });

    return new Response(JSON.stringify({
      ok: true,
      checkin_id: checkin.id,
      appointments: appts.length,
      start: startDt.toISOString(),
      end: endDt.toISOString(),
      sms_sent: emailOk,
      email_sent: emailOk,
      email_error: emailError,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("lone-worker-start-day", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});