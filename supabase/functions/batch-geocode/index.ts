import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: "Google Maps not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const currentYear = new Date().getFullYear();
    let geocoded = 0;
    const results: { id: string; type: string; lat: number; lng: number }[] = [];

    // 1. Geocode appointments without coordinates for current year
    const { data: aptsNoCoords } = await serviceClient
      .from("appointments")
      .select("id, address, postcode")
      .is("latitude", null)
      .not("address", "is", null)
      .gte("appointment_date", `${currentYear}-01-01`)
      .lte("appointment_date", `${currentYear}-12-31`);

    for (const apt of aptsNoCoords || []) {
      const query = apt.address || apt.postcode;
      if (!query) continue;

      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ", UK")}&key=${GOOGLE_MAPS_API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.results?.length) {
          const loc = data.results[0].geometry.location;
          await serviceClient
            .from("appointments")
            .update({ latitude: loc.lat, longitude: loc.lng })
            .eq("id", apt.id);
          results.push({ id: apt.id, type: "appointment", lat: loc.lat, lng: loc.lng });
          geocoded++;
        }
      } catch {
        // Skip failed geocodes
      }

      if (geocoded % 10 === 0 && geocoded > 0) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // 2. Geocode patient addresses without coordinates
    const { data: patientsNoCoords } = await serviceClient
      .from("patients")
      .select("id, address")
      .is("latitude", null)
      .not("address", "is", null);

    let patientGeocoded = 0;

    for (const patient of patientsNoCoords || []) {
      if (!patient.address) continue;

      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(patient.address + ", UK")}&key=${GOOGLE_MAPS_API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.results?.length) {
          const loc = data.results[0].geometry.location;
          await serviceClient
            .from("patients")
            .update({ latitude: loc.lat, longitude: loc.lng })
            .eq("id", patient.id);
          results.push({ id: patient.id, type: "patient", lat: loc.lat, lng: loc.lng });
          patientGeocoded++;
        }
      } catch {
        // Skip failed geocodes
      }

      if ((geocoded + patientGeocoded) % 10 === 0) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return new Response(
      JSON.stringify({
        geocoded,
        patientGeocoded,
        totalAppointments: aptsNoCoords?.length || 0,
        totalPatients: patientsNoCoords?.length || 0,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("batch-geocode error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
