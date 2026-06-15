import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
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

    // Fetch blocked times FIRST (needed for day-off logic below)
    const { data: blockedTimesData } = await supabaseAdmin
      .from("blocked_times")
      .select("id, blocked_date, start_time, end_time, reason")
      .order("blocked_date", { ascending: true });

    const { data: appointments, error } = await supabaseAdmin
      .from("appointments")
      .select("*, services(name, duration_minutes)")
      .not("status", "in", "(cancelled,rejected,form_only)")
      .order("appointment_date", { ascending: true });

    // Fetch service addons for duration calculations
    const { data: serviceAddonsData } = await supabaseAdmin
      .from("service_addons")
      .select("id, additional_duration_minutes");

    // Fetch consent form responses to get Fitzpatrick scores and track which apts have consent
    const { data: consentResponses } = await supabaseAdmin
      .from("consent_form_responses")
      .select("appointment_id, responses");
    
    const fitzScoreByApt: Record<string, { score: number; type: string }> = {};
    const consentCompletedApts = new Set<string>();
    for (const cr of consentResponses || []) {
      consentCompletedApts.add(cr.appointment_id);
      const resp = cr.responses as Record<string, any>;
      if (resp?.["__fitzpatrick_score"] !== undefined) {
        fitzScoreByApt[cr.appointment_id] = {
          score: resp["__fitzpatrick_score"],
          type: resp["__fitzpatrick_type"] || "Unknown",
        };
      }
    }

    if (error) throw error;

    // Fetch patient alerts
    const { data: patientsData } = await supabaseAdmin
      .from("patients")
      .select("client_email, alert_note");
    
    const alertByEmail: Record<string, string> = {};
    for (const p of patientsData || []) {
      if (p.alert_note) alertByEmail[p.client_email.toLowerCase()] = p.alert_note;
    }

    // Fetch route cache for travel time events
    const { data: routeCache } = await supabaseAdmin
      .from("route_cache")
      .select("origin_postcode, destination_postcode, drive_time_minutes, distance_miles");

    // Fetch available dates for "OPEN" all-day events
    const { data: availableDates } = await supabaseAdmin
      .from("available_dates")
      .select("available_date, start_hour, end_hour")
      .eq("is_available", true)
      .order("available_date", { ascending: true });

    // Fetch business settings for default hours
    const { data: bizSettings } = await supabaseAdmin
      .from("business_settings")
      .select("start_hour, end_hour")
      .single();

    const defaultStart = bizSettings?.start_hour ?? 9;
    const defaultEnd = bizSettings?.end_hour ?? 17;

    const formatHour = (h: number): string => {
      const hrs = Math.floor(h);
      const mins = Math.round((h - hrs) * 60);
      const suffix = hrs < 12 ? "am" : "pm";
      const display = hrs === 0 ? 12 : hrs > 12 ? hrs - 12 : hrs;
      return mins === 0 ? `${display}${suffix}` : `${display}:${String(mins).padStart(2, "0")}${suffix}`;
    };

    const getInitials = (name: string): string => {
      return name.split(/\s+/).map(w => w.charAt(0).toUpperCase()).join("");
    };

    const BASE_POSTCODE = "DT2 8DG";

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ShawScope//Appointments//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:ShawScope Appointments",
      "X-WR-TIMEZONE:Europe/London",
    ];

    // Build set of open dates for day-off detection
    const openDateSet = new Set<string>();
    for (const ad of availableDates || []) {
      openDateSet.add(ad.available_date);
    }

    // Add all-day "ShawScope OPEN" events for available dates
    for (const ad of availableDates || []) {
      const startH = ad.start_hour ?? defaultStart;
      const endH = ad.end_hour ?? defaultEnd;
      const dateCompact = ad.available_date.replace(/-/g, "");
      const dt = new Date(ad.available_date + "T00:00:00");
      dt.setDate(dt.getDate() + 1);
      const nextDay = `${dt.getFullYear()}${(dt.getMonth() + 1).toString().padStart(2, "0")}${dt.getDate().toString().padStart(2, "0")}`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:open-${ad.available_date}@shawscope`);
      lines.push(`DTSTART;VALUE=DATE:${dateCompact}`);
      lines.push(`DTEND;VALUE=DATE:${nextDay}`);
      lines.push(`SUMMARY:${escapeIcal(`ShawScope OPEN ${formatHour(startH)}-${formatHour(endH)}`)}`);
      lines.push(`DESCRIPTION:${escapeIcal(`ShawScope is open for appointments today from ${formatHour(startH)} to ${formatHour(endH)}.`)}`);
      lines.push("TRANSP:TRANSPARENT");
      lines.push("END:VEVENT");
    }

    // Build set of dates covered by Castle View, Sick Day, or Annual Leave blocks
    const coveredByBlockSet = new Set<string>();
    for (const bt of blockedTimesData || []) {
      if (bt.reason === "Castle View" || bt.reason === "Sick Day" || (bt.reason || "").startsWith("Sick Day") || bt.reason === "Annual Leave") {
        coveredByBlockSet.add(bt.blocked_date);
      }
    }

    // Add "Day Off" events for dates NOT in available_dates AND not covered by a block (from today to last open date)
    if ((availableDates || []).length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastOpen = new Date(availableDates![availableDates!.length - 1].available_date + "T00:00:00");
      const cursor = new Date(today);
      while (cursor <= lastOpen) {
        const iso = `${cursor.getFullYear()}-${(cursor.getMonth() + 1).toString().padStart(2, "0")}-${cursor.getDate().toString().padStart(2, "0")}`;
        if (!openDateSet.has(iso) && !coveredByBlockSet.has(iso)) {
          const dateCompact = iso.replace(/-/g, "");
          const next = new Date(cursor);
          next.setDate(next.getDate() + 1);
          const nextDay = `${next.getFullYear()}${(next.getMonth() + 1).toString().padStart(2, "0")}${next.getDate().toString().padStart(2, "0")}`;
          lines.push("BEGIN:VEVENT");
          lines.push(`UID:dayoff-${iso}@shawscope`);
          lines.push(`DTSTART;VALUE=DATE:${dateCompact}`);
          lines.push(`DTEND;VALUE=DATE:${nextDay}`);
          lines.push(`SUMMARY:${escapeIcal("🚫 Day Off")}`);
          lines.push(`DESCRIPTION:${escapeIcal("ShawScope is closed today. No appointments scheduled.")}`);
          lines.push("TRANSP:OPAQUE");
          lines.push("END:VEVENT");
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Pre-compute group sizes for duration calculation
    const groupCounts: Record<string, number> = {};
    for (const a of appointments || []) {
      if (a.group_id) {
        groupCounts[a.group_id] = (groupCounts[a.group_id] || 0) + 1;
      }
    }

    const addonLookup: Record<string, number> = {};
    for (const sa of serviceAddonsData || []) {
      addonLookup[sa.id] = sa.additional_duration_minutes ?? 0;
    }

    const getAddonDuration = (apt: any): number => {
      if (!apt.addon_selections || !Array.isArray(apt.addon_selections)) return 0;
      let extra = 0;
      for (const sel of apt.addon_selections) {
        if (typeof sel === 'object' && sel !== null) {
          const addonId = sel.addon_id || sel.id;
          if (addonId && addonLookup[addonId]) extra += addonLookup[addonId];
          else if (sel.duration) extra += Number(sel.duration) || 0;
        }
      }
      return extra;
    };

    const getGroupDuration = (apt: any): number => {
      const base = apt.services?.duration_minutes ?? 60;
      const addonTime = getAddonDuration(apt);
      if (!apt.group_id) return base + addonTime;
      const extraPeople = (groupCounts[apt.group_id] || 1) - 1;
      if (extraPeople <= 0) return base + addonTime;
      const sName = (apt.services?.name || "").toLowerCase();
      if (sName.includes("earwax") || sName.includes("ear wax")) return base + (30 * extraPeople) + addonTime;
      if (sName.includes("cryotherapy")) return base + (15 * extraPeople) + addonTime;
      if (sName.includes("wellness")) return base + (15 * extraPeople) + addonTime;
      if (sName.includes("foot")) return base + (base * extraPeople) + addonTime;
      return base + (30 * extraPeople) + addonTime;
    };

    for (const apt of appointments || []) {
      const duration = getGroupDuration(apt);
      const serviceName = apt.services?.name ?? "Appointment";
      const dtStart = formatIcalDate(apt.appointment_date, apt.appointment_time);
      const dtEnd = addMinutes(apt.appointment_date, apt.appointment_time, duration);

      // Build addon names for summary
      const addonNames: string[] = [];
      if (apt.addon_selections && Array.isArray(apt.addon_selections)) {
        for (const sel of apt.addon_selections) {
          if (typeof sel === 'object' && sel !== null && sel.name) addonNames.push(sel.name);
        }
      }
      const fullServiceName = addonNames.length > 0 ? `${serviceName} + ${[...new Set(addonNames)].join(", ")}` : serviceName;
      const summary = `${apt.client_name} - ${fullServiceName}`;
      
      const descParts: string[] = [];
      const isPhoneBooking = apt.client_email?.includes("@placeholder.local");

      // ADDRESS AT THE VERY TOP — typed/chosen address + pin drop
      if (apt.address || apt.postcode) {
        const fullAddress = [apt.address, apt.postcode].filter(Boolean).join(", ");
        descParts.push(`🏠 ADDRESS`);
        descParts.push(fullAddress);
        descParts.push("─────────────────────");
        descParts.push(`📍 Map: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`);
        descParts.push("");
        if (apt.latitude && apt.longitude) {
          descParts.push(`📌 Pin: https://www.google.com/maps/search/?api=1&query=${apt.latitude},${apt.longitude}`);
          descParts.push("");
        }
      }

      // AI summary
      if (apt.ai_consent_summary) {
        descParts.push("🤖 AI CLINICAL SUMMARY");
        descParts.push(apt.ai_consent_summary);
        descParts.push("");
      } else if (consentCompletedApts.has(apt.id)) {
        descParts.push("🤖 AI CLINICAL SUMMARY");
        descParts.push("Consent form completed — no AI summary generated.");
        descParts.push("");
      } else {
        descParts.push("⚠️ AI CLINICAL SUMMARY");
        descParts.push("No consent form completed yet.");
        descParts.push("");
      }

      descParts.push("📋 APPOINTMENT OVERVIEW");
      descParts.push(`Service: ${serviceName}`);
      descParts.push(`Duration: ${duration} minutes`);
      descParts.push(`Status: ${apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}`);
      if (apt.price) {
        const travelFee = apt.travel_fee ? Number(apt.travel_fee) : 0;
        const basePrice = Number(apt.price) - travelFee;
        let priceLine = `Price: £${apt.price}`;
        if (travelFee > 0) priceLine += ` (incl. £${travelFee.toFixed(2)} travel fee)`;
        descParts.push(priceLine);
      }

      // Fitzpatrick score
      const fitz = fitzScoreByApt[apt.id];
      if (fitz) {
        descParts.push("");
        if (fitz.score >= 21) {
          descParts.push("⚠️ SKIN TYPE WARNING");
          descParts.push(`${fitz.type} (Score: ${fitz.score})`);
          descParts.push("→ Half freezing time recommended");
          descParts.push("→ Likely retreatment in ~2 weeks");
        } else {
          descParts.push(`✅ Skin Type: ${fitz.type} (Score: ${fitz.score}) — Standard protocol`);
        }
      }
      
      descParts.push("");
      descParts.push("👤 CLIENT DETAILS");
      descParts.push(`Name: ${apt.client_name}`);
      descParts.push(`Email: ${apt.client_email}`);
      if (apt.client_phone) descParts.push(`Phone: ${apt.client_phone}`);
      
      // Patient alert
      const alertNote = alertByEmail[apt.client_email?.toLowerCase()];
      if (alertNote) {
        descParts.push("");
        descParts.push(`⚠️ ALERT: ${alertNote}`);
      }
      if (apt.notes) {
        descParts.push("");
        descParts.push("📝 PATIENT NOTES");
        descParts.push(apt.notes);
      }
      
      // Admin notes intentionally excluded from calendar feed for security
      
      const description = descParts.join("\n");

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${apt.id}@shawscope`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcal(summary)}`);
      lines.push(`DESCRIPTION:${escapeIcal(description)}`);
      const fullLocation = [apt.address, apt.postcode].filter(Boolean).join(", ");
      if (fullLocation) {
        lines.push(`LOCATION:${escapeIcal(fullLocation)}`);
      }
      lines.push(`STATUS:${apt.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`);
      lines.push("END:VEVENT");
    }

    // Travel events are now in a separate calendar feed (calendar-feed-travel)

    // blockedTimesData already fetched above

    for (const bt of blockedTimesData || []) {
      const isCastleView = bt.reason === "Castle View";
      const isSickDay = bt.reason === "Sick Day" || (bt.reason || "").startsWith("Sick Day");
      const sickNote = isSickDay && (bt.reason || "").startsWith("Sick Day:") ? (bt.reason || "").slice("Sick Day:".length).trim() : "";
      const isAnnualLeave = bt.reason === "Annual Leave";
      const isOnCall = bt.reason === "On Call";
      const isLunch = bt.reason?.includes("Lunch");
      const isMobile = bt.reason?.includes("Mobile");
      const isAllDay = isCastleView || isSickDay || isAnnualLeave || isOnCall;

      if (isAllDay) {
        const dateCompact = bt.blocked_date.replace(/-/g, "");
        const dt = new Date(bt.blocked_date + "T00:00:00");
        dt.setDate(dt.getDate() + 1);
        const nextDay = `${dt.getFullYear()}${(dt.getMonth() + 1).toString().padStart(2, "0")}${dt.getDate().toString().padStart(2, "0")}`;

        let summary = "";
        let desc = "";
        let transp = "OPAQUE";
        if (isCastleView) {
          summary = "🏥 Castle View (07:00–19:15)";
          desc = "Working at Castle View today.\nShawScope is closed.";
        } else if (isSickDay) {
          summary = sickNote ? `🤒 Sick Day — ${sickNote}` : "🤒 Sick Day";
          desc = sickNote ? `Off sick today.\nReason: ${sickNote}\nShawScope is closed.` : "Off sick today.\nShawScope is closed.";
        } else if (isAnnualLeave) {
          summary = "🌴 Annual Leave";
          desc = "Annual leave today. ShawScope may be open or closed as normal.";
          transp = "TRANSPARENT";
        } else if (isOnCall) {
          summary = "📞 On Call";
          desc = "On call today. ShawScope may be open or closed as normal.";
          transp = "TRANSPARENT";
        }

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:block-${bt.id}@shawscope`);
        lines.push(`DTSTART;VALUE=DATE:${dateCompact}`);
        lines.push(`DTEND;VALUE=DATE:${nextDay}`);
        lines.push(`SUMMARY:${escapeIcal(summary)}`);
        lines.push(`DESCRIPTION:${escapeIcal(desc)}`);
        lines.push(`TRANSP:${transp}`);
        lines.push("END:VEVENT");
      } else {
        const label = isLunch ? "BREAK — LUNCH AT BASE" : isMobile ? "BREAK — MOBILE" : bt.reason || "Blocked";
        const emoji = isLunch ? "🍽️" : isMobile ? "☕" : "🚫";
        const dtStart = formatIcalDate(bt.blocked_date, bt.start_time);
        const dtEnd = formatIcalDate(bt.blocked_date, bt.end_time);

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:block-${bt.id}@shawscope`);
        lines.push(`DTSTART:${dtStart}`);
        lines.push(`DTEND:${dtEnd}`);
        lines.push(`SUMMARY:${escapeIcal(`${emoji} ${label}`)}`);
        lines.push(`DESCRIPTION:${escapeIcal(`${label}\\n${bt.start_time.slice(0,5)} – ${bt.end_time.slice(0,5)}`)}`);
        if (isLunch) lines.push(`LOCATION:${escapeIcal("DT2 8DG")}`);
        lines.push("TRANSP:OPAQUE");
        lines.push("END:VEVENT");
      }
    }

    lines.push("END:VCALENDAR");

    return new Response(lines.join("\r\n"), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="shawscope.ics"',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
