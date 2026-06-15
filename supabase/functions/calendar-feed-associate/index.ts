import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_POSTCODE = "DT2 8DG";

function escapeIcal(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcalDate(dateStr: string, timeStr: string): string {
  const d = dateStr.replace(/-/g, "");
  const t = timeStr.replace(/:/g, "").slice(0, 6);
  return `${d}T${t}`;
}

function addMinutes(dateStr: string, timeStr: string, minutes: number): string {
  const dt = new Date(`${dateStr}T${timeStr}`);
  dt.setMinutes(dt.getMinutes() + minutes);
  const y = dt.getFullYear().toString();
  const m = (dt.getMonth() + 1).toString().padStart(2, "0");
  const day = dt.getDate().toString().padStart(2, "0");
  const h = dt.getHours().toString().padStart(2, "0");
  const min = dt.getMinutes().toString().padStart(2, "0");
  const s = dt.getSeconds().toString().padStart(2, "0");
  return `${y}${m}${day}T${h}${min}${s}`;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w.charAt(0).toUpperCase()).join("");
}

function getServiceCode(serviceName: string): string {
  const s = serviceName.toLowerCase();
  if (s.includes("earwax") || s.includes("ear wax")) return "EWR";
  if (s.includes("cryotherapy") || s.includes("cryo")) return "CRYO";
  if (s.includes("wellbeing") || s.includes("well")) return "WELL";
  if (s.includes("foot") || s.includes("podiat")) return "FOT";
  if (s.includes("ear")) return "EAR";
  return serviceName.slice(0, 4).toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [appointmentsResult, availableDatesResult, settingsResult, routeCacheResult, patientsResult, blockedTimesResult] = await Promise.all([
      supabaseAdmin
        .from("appointments")
        .select("*, services(name, duration_minutes)")
        .neq("status", "cancelled")
        .neq("status", "rejected")
        .order("appointment_date", { ascending: true }),
      supabaseAdmin
        .from("available_dates")
        .select("available_date, start_hour, end_hour")
        .eq("is_available", true)
        .order("available_date", { ascending: true }),
      supabaseAdmin
        .from("business_settings")
        .select("start_hour, end_hour")
        .limit(1)
        .single(),
      supabaseAdmin
        .from("route_cache")
        .select("destination_postcode, drive_time_minutes, distance_miles")
        .eq("origin_postcode", BASE_POSTCODE),
      supabaseAdmin
        .from("patients")
        .select("client_email, client_name, client_phone, alert_note"),
      supabaseAdmin
        .from("blocked_times")
        .select("id, blocked_date, start_time, end_time, reason")
        .order("blocked_date", { ascending: true }),
    ]);

    const appointments = appointmentsResult.data;
    if (appointmentsResult.error) throw appointmentsResult.error;

    const availableDates = availableDatesResult.data;
    const defaultStart = settingsResult.data?.start_hour ?? 9;
    const defaultEnd = settingsResult.data?.end_hour ?? 17;

    // Build patient lookup by email
    const patientMap: Record<string, { client_name: string; client_phone: string | null; alert_note: string | null }> = {};
    for (const p of patientsResult.data || []) {
      patientMap[p.client_email.toLowerCase()] = {
        client_name: p.client_name,
        client_phone: p.client_phone,
        alert_note: p.alert_note,
      };
    }

    // Build route cache lookup: destination postcode -> { drive_time_minutes, distance_miles }
    const routeMap: Record<string, { drive_time_minutes: number; distance_miles: number }> = {};
    for (const r of routeCacheResult.data || []) {
      routeMap[r.destination_postcode] = {
        drive_time_minutes: r.drive_time_minutes,
        distance_miles: Number(r.distance_miles),
      };
    }

    const formatHour = (h: number): string => {
      const hrs = Math.floor(h);
      const mins = Math.round((h - hrs) * 60);
      const suffix = hrs < 12 ? "am" : "pm";
      const display = hrs === 0 ? 12 : hrs > 12 ? hrs - 12 : hrs;
      return mins === 0 ? `${display}${suffix}` : `${display}:${String(mins).padStart(2, "0")}${suffix}`;
    };

    // Group durations
    const groupCounts: Record<string, number> = {};
    for (const a of appointments || []) {
      if (a.group_id) groupCounts[a.group_id] = (groupCounts[a.group_id] || 0) + 1;
    }

    const getGroupDuration = (apt: any): number => {
      const base = apt.services?.duration_minutes ?? 60;
      if (!apt.group_id) return base;
      const extra = (groupCounts[apt.group_id] || 1) - 1;
      if (extra <= 0) return base;
      const sName = (apt.services?.name || "").toLowerCase();
      if (sName.includes("earwax") || sName.includes("ear wax")) return base + (30 * extra);
      if (sName.includes("cryotherapy")) return base + (15 * extra);
      return base + (30 * extra);
    };

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ShawScope//Associate//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:ShawScope Schedule",
      "X-WR-TIMEZONE:Europe/London",
    ];

    // Add all-day "OPEN" events for available dates
    for (const ad of availableDates || []) {
      const startH = ad.start_hour ?? defaultStart;
      const endH = ad.end_hour ?? defaultEnd;
      const dateCompact = ad.available_date.replace(/-/g, "");
      const dt = new Date(ad.available_date + "T00:00:00");
      dt.setDate(dt.getDate() + 1);
      const nextDay = `${dt.getFullYear()}${(dt.getMonth() + 1).toString().padStart(2, "0")}${dt.getDate().toString().padStart(2, "0")}`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:open-assoc-${ad.available_date}@shawscope`);
      lines.push(`DTSTART;VALUE=DATE:${dateCompact}`);
      lines.push(`DTEND;VALUE=DATE:${nextDay}`);
      lines.push(`SUMMARY:${escapeIcal(`ShawScope OPEN ${formatHour(startH)}-${formatHour(endH)}`)}`);
      lines.push(`DESCRIPTION:${escapeIcal(`ShawScope is open for appointments today from ${formatHour(startH)} to ${formatHour(endH)}.`)}`);
      lines.push("TRANSP:TRANSPARENT");
      lines.push("END:VEVENT");
    }

    for (const apt of appointments || []) {
      const duration = getGroupDuration(apt);
      const serviceName = apt.services?.name ?? "Appointment";
      const serviceCode = getServiceCode(serviceName);
      const dtStart = formatIcalDate(apt.appointment_date, apt.appointment_time);
      const dtEnd = addMinutes(apt.appointment_date, apt.appointment_time, duration);

      const initials = getInitials(apt.client_name);

      // Lookup drive time/distance from base
      const pc = apt.postcode?.trim()?.toUpperCase()?.replace(/\s+/g, " ") || null;
      const route = pc ? routeMap[pc] : null;
      const driveMin = route ? Math.round(route.drive_time_minutes) : null;
      const distMi = route ? Math.round(route.distance_miles) : null;

      // Title: AB (EWR) 15min/10mi
      let summary = `${initials} (${serviceCode})`;
      if (driveMin !== null && distMi !== null) {
        summary += ` ${driveMin}min/${distMi}mi`;
      }

      // Notes
      const endTime = addMinutes(apt.appointment_date, apt.appointment_time, duration);
      const endFormatted = `${endTime.slice(9, 11)}:${endTime.slice(11, 13)}`;
      const startFormatted = `${apt.appointment_time.slice(0, 5)}`;

      const descParts: string[] = [];

      // AI summary (de-identified)
      const town = pc ? (() => {
        const towns = ["Dorchester", "Weymouth", "Portland", "Broadmayne", "Poundbury", "Wool", "Charminster", "Blandford", "Bridport", "Wareham", "Swanage", "Poole", "Bournemouth", "Sherborne", "Yeovil"];
        const fullText = [apt.address, apt.postcode].filter(Boolean).join(" ");
        for (const t of towns) { if (fullText.toLowerCase().includes(t.toLowerCase())) return t; }
        return "Dorset";
      })() : "Dorset";

      descParts.push(`Home visit to a patient in ${town} for ${serviceName.toLowerCase()}.`);
      descParts.push("─────────────────────");

      // Start and end times
      descParts.push(`Start: ${startFormatted}`);
      descParts.push(`End: ${endFormatted}`);
      descParts.push("─────────────────────");

      // Typed address
      if (apt.address || apt.postcode) {
        const fullAddr = [apt.address, apt.postcode].filter(Boolean).join(", ");
        descParts.push(`🏠 ${fullAddr}`);
        descParts.push("─────────────────────");
        descParts.push(`📍 Map: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr)}`);
        descParts.push("─────────────────────");
      }

      // Pin drop
      if (apt.latitude && apt.longitude) {
        descParts.push(`📌 Pin: https://www.google.com/maps/search/?api=1&query=${apt.latitude},${apt.longitude}`);
        descParts.push("─────────────────────");
      }

      // Patient details at the bottom
      const patient = patientMap[apt.client_email?.toLowerCase()];
      descParts.push("");
      descParts.push("👤 PATIENT DETAILS");
      descParts.push(`Name: ${apt.client_name}`);
      if (apt.client_phone) descParts.push(`Phone: ${apt.client_phone}`);
      else if (patient?.client_phone) descParts.push(`Phone: ${patient.client_phone}`);

      // Patient alerts
      const alertNote = patient?.alert_note;
      if (alertNote) {
        descParts.push("─────────────────────");
        descParts.push(`⚠️ ALERT: ${alertNote}`);
      }

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:assoc-${apt.id}@shawscope`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcal(summary)}`);
      lines.push(`DESCRIPTION:${escapeIcal(descParts.join("\n"))}`);
      if (town !== "Unknown" && town !== "Dorset") {
        lines.push(`LOCATION:${escapeIcal(town)}`);
      }
      lines.push(`STATUS:${apt.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`);
      lines.push("END:VEVENT");
    }

    // Add Castle View, Sick Day, Annual Leave, On Call blocked times
    for (const bt of blockedTimesResult.data || []) {
      const isCastleView = bt.reason === "Castle View";
      const isSickDay = bt.reason === "Sick Day" || (bt.reason || "").startsWith("Sick Day");
      const sickNote = isSickDay && (bt.reason || "").startsWith("Sick Day:") ? (bt.reason || "").slice("Sick Day:".length).trim() : "";
      const isAnnualLeave = bt.reason === "Annual Leave";
      const isOnCall = bt.reason === "On Call";

      if (isCastleView || isSickDay || isAnnualLeave || isOnCall) {
        const dateCompact = bt.blocked_date.replace(/-/g, "");
        const dt = new Date(bt.blocked_date + "T00:00:00");
        dt.setDate(dt.getDate() + 1);
        const nextDay = `${dt.getFullYear()}${(dt.getMonth() + 1).toString().padStart(2, "0")}${dt.getDate().toString().padStart(2, "0")}`;

        let summary = "";
        let desc = "";
        let transp = "OPAQUE";
        if (isCastleView) {
          summary = "🏥 Castle View (07:00–19:15)";
          desc = "Matt is working at Castle View today (full-time role).\\nShawScope is closed for the day.";
        } else if (isSickDay) {
          summary = sickNote ? `🤒 Sick Day — ${sickNote}` : "🤒 Sick Day";
          desc = sickNote ? `Matt is off sick today.\\nReason: ${sickNote}\\nShawScope is closed.` : "Matt is off sick today.\\nShawScope is closed.";
        } else if (isAnnualLeave) {
          summary = "🌴 Annual Leave";
          desc = "Matt is on annual leave today. ShawScope may be open or closed as normal.";
          transp = "TRANSPARENT";
        } else if (isOnCall) {
          summary = "📞 On Call";
          desc = "Matt is on call today. ShawScope may be open or closed as normal.";
          transp = "TRANSPARENT";
        }

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:cv-assoc-${bt.id}@shawscope`);
        lines.push(`DTSTART;VALUE=DATE:${dateCompact}`);
        lines.push(`DTEND;VALUE=DATE:${nextDay}`);
        lines.push(`SUMMARY:${escapeIcal(summary)}`);
        lines.push(`DESCRIPTION:${escapeIcal(desc)}`);
        lines.push(`TRANSP:${transp}`);
        lines.push("END:VEVENT");
      }
    }

    lines.push("END:VCALENDAR");

    return new Response(lines.join("\r\n"), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="shawscope-associate.ics"',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});