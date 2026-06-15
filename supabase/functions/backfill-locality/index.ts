import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) throw new Error("Google Maps API key not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if force re-process all
    let forceAll = false;
    try { const body = await req.json(); forceAll = !!body?.force; } catch {}

    // Get appointments to process
    let query = supabase
      .from("appointments")
      .select("id, postcode, address")
      .not("postcode", "is", null)
      .limit(200);
    
    if (!forceAll) {
      query = query.is("locality", null);
    }

    const { data: appointments, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: "No appointments to backfill", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate postcodes
    const postcodeMap = new Map<string, string[]>();
    for (const apt of appointments) {
      const pc = apt.postcode?.trim().toUpperCase();
      if (!pc) continue;
      if (!postcodeMap.has(pc)) postcodeMap.set(pc, []);
      postcodeMap.get(pc)!.push(apt.id);
    }

    let updated = 0;
    const results: Record<string, string> = {};

    for (const [postcode, aptIds] of postcodeMap) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postcode)},UK&key=${GOOGLE_MAPS_API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.status !== "OK" || !data.results?.[0]) {
          console.log(`No result for postcode ${postcode}`);
          continue;
        }

        const components = data.results[0].address_components || [];
        // Priority: sublocality > locality > neighborhood > postal_town (village/suburb level)
        let locality: string | null = null;
        for (const comp of components) {
          const types: string[] = comp.types || [];
          if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
            locality = comp.long_name;
            break;
          }
        }
        if (!locality) {
          for (const comp of components) {
            const types: string[] = comp.types || [];
            if (types.includes("locality")) {
              locality = comp.long_name;
              break;
            }
          }
        }
        if (!locality) {
          for (const comp of components) {
            const types: string[] = comp.types || [];
            if (types.includes("neighborhood")) {
              locality = comp.long_name;
              break;
            }
          }
        }
        if (!locality) {
          for (const comp of components) {
            const types: string[] = comp.types || [];
            if (types.includes("postal_town")) {
              locality = comp.long_name;
              break;
            }
          }
        }

        if (locality) {
          results[postcode] = locality;
          // Update all appointments with this postcode
          const { error: updateError } = await supabase
            .from("appointments")
            .update({ locality })
            .in("id", aptIds);

          if (updateError) {
            console.error(`Error updating for ${postcode}:`, updateError);
          } else {
            updated += aptIds.length;
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.error(`Error geocoding ${postcode}:`, e);
      }
    }

    return new Response(JSON.stringify({ message: "Backfill complete", updated, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("backfill-locality error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
