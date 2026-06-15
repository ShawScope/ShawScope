import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps API key not configured");
    }

    const { routes } = await req.json();
    // routes: Array<{ origin: string; destination: string }>

    if (!Array.isArray(routes) || routes.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap at 10 routes per request to limit API usage
    const limited = routes.slice(0, 10);

    const results = await Promise.all(
      limited.map(async (r: { origin: string; destination: string }) => {
        try {
          const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(r.origin)}&destination=${encodeURIComponent(r.destination)}&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`;
          const resp = await fetch(url);
          const data = await resp.json();

          const leg = data.routes?.[0]?.legs?.[0];
          if (!leg) {
            return { origin: r.origin, destination: r.destination, drive_time_minutes: null, distance_miles: null, in_traffic: false };
          }

          const durationSeconds = leg.duration_in_traffic?.value || leg.duration.value;
          const driveMinutes = Math.ceil(durationSeconds / 60);
          const distanceMetres = leg.distance.value;
          const distanceMiles = Math.round((distanceMetres / 1609.344) * 10) / 10;
          const hasTraffic = !!leg.duration_in_traffic;

          return {
            origin: r.origin,
            destination: r.destination,
            drive_time_minutes: driveMinutes,
            distance_miles: distanceMiles,
            in_traffic: hasTraffic,
          };
        } catch {
          return { origin: r.origin, destination: r.destination, drive_time_minutes: null, distance_miles: null, in_traffic: false };
        }
      })
    );

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("live-traffic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
