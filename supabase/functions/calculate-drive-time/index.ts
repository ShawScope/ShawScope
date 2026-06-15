import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_POSTCODE = "DT2 8DG";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, date } = await req.json();

    // origin & destination are postcodes
    // date is YYYY-MM-DD — we need to look up existing appointments for that date
    // If origin is not provided, we calculate from BASE_POSTCODE to destination
    // If we're calculating dynamic slots for a day, the client sends:
    //   { destination: "DT4 7TJ", date: "2025-07-01" }
    // And we return drive times from each existing appointment's postcode (and from base for first slot)

    if (!destination || typeof destination !== "string") {
      return new Response(
        JSON.stringify({ error: "Please provide a destination postcode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseServiceKey);

    const destClean = destination.trim().toUpperCase().replace(/\s+/g, " ");

    // If a specific origin is given, just do a single lookup
    if (origin) {
      const originClean = origin.trim().toUpperCase().replace(/\s+/g, " ");
      const result = await getDriveTime(sb, originClean, destClean, GOOGLE_MAPS_API_KEY);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If date is given, calculate drive times for the whole day's scheduling
    if (!date) {
      // Just calculate from base
      const result = await getDriveTime(sb, BASE_POSTCODE, destClean, GOOGLE_MAPS_API_KEY);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all appointments for this date with their postcodes and durations
    const { data: appointments } = await sb
      .from("appointments")
      .select("appointment_time, postcode, service_id, come_to_practitioner, services(duration_minutes)")
      .eq("appointment_date", date)
      .not("status", "in", '("cancelled","rejected")')
      .order("appointment_time", { ascending: true });

    // Get blocked times (lunch/mobile breaks) for this date
    const { data: blockedSlots } = await sb
      .from("blocked_times")
      .select("start_time, end_time, reason")
      .eq("blocked_date", date);

    // Build drive time map: from each appointment's postcode to the new patient's postcode
    // Plus from BASE to the new patient's postcode (for first slot of day)
    const origins = new Set<string>();
    origins.add(BASE_POSTCODE);

    const appointmentDetails: {
      time: string;
      duration: number;
      postcode: string | null;
      come_to_practitioner?: boolean;
    }[] = [];

    if (appointments) {
      for (const apt of appointments) {
        const pc = apt.postcode?.trim()?.toUpperCase()?.replace(/\s+/g, " ") || null;
        const svc = apt.services as any;
        const duration = svc?.duration_minutes ?? 60;
        appointmentDetails.push({
          time: apt.appointment_time,
          duration,
          postcode: pc,
          come_to_practitioner: (apt as any).come_to_practitioner || false,
        });
        if (pc) origins.add(pc);
      }
    }

    // Include lunch/break blocks as virtual appointments at base postcode
    // so travel time FROM base TO patient is factored in after breaks
    if (blockedSlots) {
      for (const bt of blockedSlots) {
        if (bt.reason?.includes("Lunch") || bt.reason?.includes("break")) {
          const startMin = parseInt(bt.start_time.slice(0, 2)) * 60 + parseInt(bt.start_time.slice(3, 5));
          const endMin = parseInt(bt.end_time.slice(0, 2)) * 60 + parseInt(bt.end_time.slice(3, 5));
          const durationMin = endMin - startMin;
          appointmentDetails.push({
            time: bt.start_time,
            duration: durationMin,
            postcode: BASE_POSTCODE,
          });
        }
      }
    }

    // Calculate drive times from all unique origins to destination
    const driveTimeMap: Record<string, { drive_time_minutes: number; distance_miles: number }> = {};

    await Promise.all(
      Array.from(origins).map(async (orig) => {
        const result = await getDriveTime(sb, orig, destClean, GOOGLE_MAPS_API_KEY);
        driveTimeMap[orig] = result;
      })
    );

    // Also calculate travel fee (from base)
    const fromBase = driveTimeMap[BASE_POSTCODE];
    const FREE_RADIUS_MILES = 10;
    const TRAVEL_FEE_PER_MILE = 2.5;
    const beyondFree = Math.max(0, (fromBase?.distance_miles ?? 0) - FREE_RADIUS_MILES);
    const travelFee = beyondFree > 0 ? Math.round(beyondFree * TRAVEL_FEE_PER_MILE * 100) / 100 : 0;

    return new Response(
      JSON.stringify({
        drive_times: driveTimeMap,
        appointments: appointmentDetails,
        base_postcode: BASE_POSTCODE,
        travel_fee: travelFee,
        distance_miles: fromBase?.distance_miles ?? 0,
        within_range: (fromBase?.distance_miles ?? 0) <= FREE_RADIUS_MILES,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("calculate-drive-time error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getDriveTime(
  sb: any,
  origin: string,
  destination: string,
  apiKey: string
): Promise<{ drive_time_minutes: number; distance_miles: number }> {
  // Check cache first
  const { data: cached } = await sb
    .from("route_cache")
    .select("drive_time_minutes, distance_miles")
    .eq("origin_postcode", origin)
    .eq("destination_postcode", destination)
    .maybeSingle();

  if (cached) {
    return {
      drive_time_minutes: cached.drive_time_minutes,
      distance_miles: Number(cached.distance_miles),
    };
  }

  // Call Google Maps Distance Matrix
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&units=imperial&key=${apiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") {
    // Return a fallback — assume 30 min drive if we can't calculate
    return { drive_time_minutes: 30, distance_miles: 15 };
  }

  const driveTimeSeconds = element.duration.value;
  const driveTimeMinutes = Math.ceil(driveTimeSeconds / 60);
  const distanceMetres = element.distance.value;
  const distanceMiles = Math.round((distanceMetres / 1609.344) * 10) / 10;

  // Cache the result
  await sb.from("route_cache").upsert(
    {
      origin_postcode: origin,
      destination_postcode: destination,
      drive_time_minutes: driveTimeMinutes,
      distance_miles: distanceMiles,
      cached_at: new Date().toISOString(),
    },
    { onConflict: "origin_postcode,destination_postcode" }
  );

  return { drive_time_minutes: driveTimeMinutes, distance_miles: distanceMiles };
}
