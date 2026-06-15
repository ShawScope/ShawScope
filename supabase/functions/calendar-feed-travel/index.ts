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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: appointments, error } = await supabaseAdmin
      .from("appointments")
      .select("*, services(name, duration_minutes)")
      .neq("status", "cancelled")
      .neq("status", "rejected")
      .order("appointment_date", { ascending: true });

    if (error) throw error;

    // Fetch service addons for duration calculations
    const { data: serviceAddonsData } = await supabaseAdmin
      .from("service_addons")
      .select("id, additional_duration_minutes");

    // Fetch route cache
    const { data: routeCache } = await supabaseAdmin
      .from("route_cache")
      .select("origin_postcode, destination_postcode, drive_time_minutes, distance_miles");

    const getInitials = (name: string): string => {
      return name.split(/\s+/).map(w => w.charAt(0).toUpperCase()).join("");
    };

    const BASE_POSTCODE = "DT2 8DG";

    // Pre-compute group sizes
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

    const lookupRoute = (from: string, to: string) => {
      const normFrom = from.replace(/\s/g, "").toUpperCase();
      const normTo = to.replace(/\s/g, "").toUpperCase();
      return (routeCache || []).find(
        (r: any) => r.origin_postcode.replace(/\s/g, "").toUpperCase() === normFrom &&
                     r.destination_postcode.replace(/\s/g, "").toUpperCase() === normTo
      );
    };

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ShawScope//Travel//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:ShawScope Travel",
      "X-WR-TIMEZONE:Europe/London",
    ];

    // Group appointments by date
    const aptsByDate: Record<string, any[]> = {};
    for (const apt of appointments || []) {
      (aptsByDate[apt.appointment_date] ??= []).push(apt);
    }

    for (const [dateStr, dayApts] of Object.entries(aptsByDate)) {
      const sorted = dayApts.sort((a: any, b: any) => a.appointment_time.localeCompare(b.appointment_time));

      // Base to first appointment
      if (sorted.length > 0) {
        const first = sorted[0];
        const toPC = first.postcode?.trim().toUpperCase() || "";
        if (toPC) {
          const cached = lookupRoute(BASE_POSTCODE, toPC);
          if (cached) {
            const bufferMins = Math.ceil(cached.distance_miles * 0.5);
            const firstStartMin = parseInt(first.appointment_time.slice(0, 2)) * 60 + parseInt(first.appointment_time.slice(3, 5));
            const departMin = firstStartMin - cached.drive_time_minutes;
            const eventStartMin = departMin - bufferMins;
            const eventStartTime = `${Math.max(0, Math.floor(eventStartMin / 60)).toString().padStart(2, "0")}:${(((eventStartMin % 60) + 60) % 60).toString().padStart(2, "0")}:00`;
            const dtStart = formatIcalDate(dateStr, eventStartTime);
            const dtEnd = addMinutes(dateStr, first.appointment_time, -1);
            const departFormatted = `${Math.max(0, Math.floor(departMin / 60)).toString().padStart(2, "0")}:${(((departMin % 60) + 60) % 60).toString().padStart(2, "0")}`;
            lines.push("BEGIN:VEVENT");
            lines.push(`UID:travel-base-${first.id}@shawscope`);
            lines.push(`DTSTART:${dtStart}`);
            lines.push(`DTEND:${dtEnd}`);
            lines.push(`SUMMARY:${escapeIcal(`${cached.drive_time_minutes} min drive (${bufferMins} min buff) to ${getInitials(first.client_name)}`)}`);
            lines.push(`DESCRIPTION:${escapeIcal(`Drive from base (${BASE_POSTCODE}) to ${first.client_name} (${toPC})\\n${cached.distance_miles.toFixed(1)} miles · ${cached.drive_time_minutes} min drive · ${bufferMins} min buffer\\nDepart by ${departFormatted}`)}`);
            lines.push("TRANSP:OPAQUE");
            lines.push("END:VEVENT");
          }
        }
      }

      // Between appointments
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        if (current.group_id && next.group_id && current.group_id === next.group_id) continue;

        const fromPC = current.postcode?.trim().toUpperCase() || "";
        const toPC = next.postcode?.trim().toUpperCase() || "";
        if (!fromPC || !toPC) continue;

        const cached = lookupRoute(fromPC, toPC);
        const dur = getGroupDuration(current);
        const endMin = parseInt(current.appointment_time.slice(0, 2)) * 60 + parseInt(current.appointment_time.slice(3, 5)) + dur;
        const nextStartMin = parseInt(next.appointment_time.slice(0, 2)) * 60 + parseInt(next.appointment_time.slice(3, 5));

        const bufferMins = cached ? Math.ceil(cached.distance_miles * 0.5) : 0;
        const departMin = cached ? nextStartMin - cached.drive_time_minutes : endMin + 1;
        const eventStartMin = Math.max(endMin + 1, departMin - bufferMins);
        const eventStartTime = `${Math.floor(eventStartMin / 60).toString().padStart(2, "0")}:${(eventStartMin % 60).toString().padStart(2, "0")}:00`;
        const arriveTime = next.appointment_time;

        const dtStart = formatIcalDate(dateStr, eventStartTime);
        const dtEnd = addMinutes(dateStr, arriveTime, -1);

        const departFormatted = `${Math.floor(Math.max(0, departMin) / 60).toString().padStart(2, "0")}:${(Math.max(0, departMin) % 60).toString().padStart(2, "0")}`;
        const driveInfo = cached ? `${cached.drive_time_minutes} min drive · ${bufferMins} min buffer · ${cached.distance_miles.toFixed(1)} mi` : "Drive time unknown";
        lines.push("BEGIN:VEVENT");
        lines.push(`UID:travel-${current.id}-${next.id}@shawscope`);
        lines.push(`DTSTART:${dtStart}`);
        lines.push(`DTEND:${dtEnd}`);
        lines.push(`SUMMARY:${escapeIcal(`${cached ? cached.drive_time_minutes + " min drive (" + bufferMins + " min buff)" : "?"} to ${getInitials(next.client_name)}`)}`);
        lines.push(`DESCRIPTION:${escapeIcal(`Drive to ${next.client_name}\\n${fromPC} → ${toPC}\\n${driveInfo}\\nDepart by ${departFormatted}`)}`);
        lines.push("TRANSP:OPAQUE");
        lines.push("END:VEVENT");
      }
    }

    lines.push("END:VCALENDAR");

    return new Response(lines.join("\r\n"), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="shawscope-travel.ics"',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
