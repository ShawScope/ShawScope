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
    const body = await req.json();
    const postcode = body.postcode as string | undefined;
    const query = body.query as string | undefined;

    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Google Maps not configured", addresses: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode 1: Free-text address search (autocomplete)
    if (query && query.trim().length >= 3) {
      const params = new URLSearchParams({
        input: query.trim(),
        key: GOOGLE_MAPS_API_KEY,
        components: "country:gb",
        types: "address",
      });
      const resp = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
      const data = await resp.json();

      const results: { description: string; placeId: string }[] = [];
      if (data.predictions) {
        for (const pred of data.predictions) {
          results.push({
            description: pred.description || "",
            placeId: pred.place_id || "",
          });
        }
      }

      // For each result, get detailed address to extract postcode
      const detailed = await Promise.all(
        results.slice(0, 8).map(async (r) => {
          try {
            const detailResp = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?place_id=${r.placeId}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const detailData = await detailResp.json();
            const result = detailData.results?.[0];
            if (!result) return { address: r.description, postcode: null, lat: null, lng: null };

            let pc: string | null = null;
            for (const comp of result.address_components || []) {
              if (comp.types?.includes("postal_code")) {
                pc = comp.long_name;
                break;
              }
            }
            // Clean address: remove UK/United Kingdom and postcode from display
            const parts = r.description.split(",").map((s: string) => s.trim());
            const cleaned = parts.filter((p: string) => {
              const upper = p.toUpperCase().replace(/\s/g, "");
              return upper !== "UK" && upper !== "UNITEDKINGDOM";
            }).join(", ");

            return {
              address: cleaned,
              postcode: pc,
              lat: result.geometry?.location?.lat ?? null,
              lng: result.geometry?.location?.lng ?? null,
            };
          } catch {
            return { address: r.description, postcode: null, lat: null, lng: null };
          }
        })
      );

      return new Response(
        JSON.stringify({ suggestions: detailed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode 2: Postcode-based lookup (existing behaviour)
    if (!postcode || typeof postcode !== "string") {
      return new Response(
        JSON.stringify({ error: "Please provide a valid postcode or query", addresses: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pc = postcode.trim().toUpperCase();
    const pcNorm = pc.replace(/\s/g, "").toUpperCase();

    const addresses: string[] = [];
    const seen = new Set<string>();

    const addAddress = (raw: string) => {
      const parts = raw.split(",").map((s: string) => s.trim());
      const filtered = parts.filter((p: string) => {
        const upper = p.toUpperCase().replace(/\s/g, "");
        return upper !== "UK" && upper !== "UNITEDKINGDOM" && !upper.includes(pcNorm);
      });
      const clean = filtered.join(", ");
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        addresses.push(clean);
      }
    };

    // Step 1: Geocode postcode to get lat/lng for biasing
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(pc)}&components=country:GB&key=${GOOGLE_MAPS_API_KEY}`;
    const geocodeResp = await fetch(geocodeUrl);
    const geocodeData = await geocodeResp.json();

    let centerLat = 0, centerLng = 0;
    if (geocodeData.results?.length) {
      centerLat = geocodeData.results[0].geometry.location.lat;
      centerLng = geocodeData.results[0].geometry.location.lng;
    }

    // Step 2: Use Place Autocomplete with number prefixes to discover individual addresses
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json`;
    
    const searchPrefixes = [
      "", "1 ", "2 ", "3 ", "4 ", "5 ", "6 ", "7 ", "8 ", "9 ", 
      "10 ", "11 ", "12 ", "13 ", "14 ", "15 ", "16 ", "17 ", "18 ", "19 ", "20 ",
      "21 ", "22 ", "23 ", "24 ", "25 ", "26 ", "27 ", "28 ", "29 ", "30 ",
    ];

    const batchSize = 8;
    for (let i = 0; i < searchPrefixes.length; i += batchSize) {
      const batch = searchPrefixes.slice(i, i + batchSize);
      const promises = batch.map(async (prefix) => {
        const input = `${prefix}${pc}`;
        const params = new URLSearchParams({
          input,
          key: GOOGLE_MAPS_API_KEY,
          components: "country:gb",
          types: "address",
        });
        if (centerLat && centerLng) {
          params.set("location", `${centerLat},${centerLng}`);
          params.set("radius", "500");
        }
        try {
          const resp = await fetch(`${autocompleteUrl}?${params}`);
          const data = await resp.json();
          if (data.predictions) {
            for (const pred of data.predictions) {
              addAddress(pred.description || "");
            }
          }
        } catch {
          // Skip failed requests
        }
      });
      await Promise.all(promises);
      if (addresses.length >= 25) break;
    }

    // Step 3: Also try reverse geocoding
    if (addresses.length < 15 && centerLat && centerLng) {
      const offsets = [
        [0, 0],
        [0.0003, 0], [-0.0003, 0], [0, 0.0005], [0, -0.0005],
        [0.0003, 0.0005], [-0.0003, -0.0005],
      ];
      
      const reversePromises = offsets.map(async ([dlat, dlng]) => {
        try {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${centerLat + dlat},${centerLng + dlng}&result_type=street_address|premise|subpremise&key=${GOOGLE_MAPS_API_KEY}`;
          const resp = await fetch(url);
          const data = await resp.json();
          if (data.results) {
            for (const result of data.results) {
              addAddress(result.formatted_address || "");
            }
          }
        } catch {
          // Skip failed requests
        }
      });
      await Promise.all(reversePromises);
    }

    // Sort addresses naturally by house number
    addresses.sort((a, b) => {
      const numA = parseInt(a.match(/^\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/^\d+/)?.[0] || "0");
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });

    return new Response(
      JSON.stringify({ addresses: addresses.slice(0, 50) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("address-lookup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", addresses: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
