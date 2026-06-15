import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_POSTCODE = "DT2 8DG";
const FREE_RADIUS_MILES = 10;
const MAX_RADIUS_MILES = 15;
const TRAVEL_FEE_PER_MILE = 2.5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postcode } = await req.json();

    if (!postcode || typeof postcode !== "string") {
      return new Response(
        JSON.stringify({ error: "Please provide a valid postcode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps not configured");
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(BASE_POSTCODE)}&destinations=${encodeURIComponent(postcode.trim())}&units=imperial&key=${GOOGLE_MAPS_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      console.error("Google Maps Distance Matrix failed", {
        status: data?.status,
        error_message: data?.error_message,
        element_status: element?.status,
        postcode,
      });
      return new Response(
        JSON.stringify({ error: "Could not find that postcode. Please check and try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const distanceMetres = element.distance.value;
    const distanceMiles = Math.round((distanceMetres / 1609.344) * 10) / 10;
    const beyondFree = Math.max(0, distanceMiles - FREE_RADIUS_MILES);
    const outOfArea = distanceMiles > MAX_RADIUS_MILES;
    const travelFee = outOfArea ? 0 : (beyondFree > 0 ? Math.round(beyondFree * TRAVEL_FEE_PER_MILE * 100) / 100 : 0);

    // Extract locality (town/suburb) from geocoding the destination postcode
    let locality = "";
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postcode.trim())}&components=country:GB&key=${GOOGLE_MAPS_API_KEY}`;
      const geoResp = await fetch(geoUrl);
      const geoData = await geoResp.json();
      if (geoData.results?.length) {
        const components = geoData.results[0].address_components || [];
        // Try postal_town first, then locality, then sublocality
        const sublocality = components.find((c: any) => c.types?.includes("sublocality") || c.types?.includes("sublocality_level_1"));
        const localityComp = components.find((c: any) => c.types?.includes("locality"));
        const neighborhood = components.find((c: any) => c.types?.includes("neighborhood"));
        const postalTown = components.find((c: any) => c.types?.includes("postal_town"));
        // Prefer village/suburb level: sublocality > locality > neighborhood > postal_town
        locality = (sublocality?.long_name || localityComp?.long_name || neighborhood?.long_name || postalTown?.long_name || "");
      }
    } catch {
      // Non-critical — continue without locality
    }

    return new Response(
      JSON.stringify({
        distance_miles: distanceMiles,
        travel_fee: travelFee,
        within_range: distanceMiles <= FREE_RADIUS_MILES,
        out_of_area: outOfArea,
        locality,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("travel-fee-check error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
