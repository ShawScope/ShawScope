import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, postType, generateImage } = await req.json();

    // Gather business data for context
    const now = new Date();
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lmStart = `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, "0")}-01`;
    const lmEnd = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, "0")}-${String(lastMonthEnd.getDate()).padStart(2, "0")}`;

    // This month's appointments by locality
    const { data: thisMonthApts } = await supabaseAdmin
      .from("appointments")
      .select("locality, postcode, service_id, status")
      .gte("appointment_date", thisMonthStart)
      .in("status", ["confirmed", "completed"]);

    // Last month's data
    const { data: lastMonthApts } = await supabaseAdmin
      .from("appointments")
      .select("locality, postcode, service_id, status")
      .gte("appointment_date", lmStart)
      .lte("appointment_date", lmEnd)
      .in("status", ["confirmed", "completed"]);

    // Services for naming
    const { data: services } = await supabaseAdmin.from("services").select("id, name");
    const svcMap = Object.fromEntries((services || []).map((s: any) => [s.id, s.name]));

    // Build locality stats
    const localityCount = (apts: any[]) => {
      const map: Record<string, number> = {};
      for (const a of apts || []) {
        const loc = a.locality || a.postcode?.split(" ")[0] || "Unknown";
        map[loc] = (map[loc] || 0) + 1;
      }
      return Object.entries(map).sort((a, b) => b[1] - a[1]);
    };

    // Service breakdown
    const serviceCount = (apts: any[]) => {
      const map: Record<string, number> = {};
      for (const a of apts || []) {
        const name = svcMap[a.service_id] || "Other";
        map[name] = (map[name] || 0) + 1;
      }
      return Object.entries(map).sort((a, b) => b[1] - a[1]);
    };

    const thisMonthLocalities = localityCount(thisMonthApts || []);
    const lastMonthLocalities = localityCount(lastMonthApts || []);
    const thisMonthServices = serviceCount(thisMonthApts || []);
    const totalThisMonth = (thisMonthApts || []).length;
    const totalLastMonth = (lastMonthApts || []).length;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonth = monthNames[now.getMonth()];
    const lastMonth = monthNames[(now.getMonth() + 11) % 12];

    const businessContext = `
SHAWSCOPE BUSINESS DATA (use naturally, don't list everything):
- This month (${currentMonth}): ${totalThisMonth} appointments
- Last month (${lastMonth}): ${totalLastMonth} appointments
- Top areas this month: ${thisMonthLocalities.slice(0, 5).map(([l, c]) => `${l} (${c})`).join(", ") || "no data yet"}
- Top areas last month: ${lastMonthLocalities.slice(0, 5).map(([l, c]) => `${l} (${c})`).join(", ") || "no data yet"}
- Services this month: ${thisMonthServices.slice(0, 5).map(([s, c]) => `${s} (${c})`).join(", ") || "no data yet"}
- ShawScope services: Earwax Removal (microsuction), Cryotherapy (skin lesion treatment), Foot Health
- ShawScope is a mobile healthcare practitioner based in Dorchester, Dorset, covering the surrounding area
- Run by Matt Shaw, a qualified clinical practitioner
- Website: shawscope.co.uk | Booking: shawscope.co.uk/booking | Phone: 01305 340 194
    `.trim();

    const typePrompts: Record<string, string> = {
      "data-insight": `Write a social media post that shares an interesting insight from ShawScope's recent activity data. For example: "Did you know we visited X more than Y this month?" or "Our most popular service this month was..." Make it conversational and engaging. Use emojis sparingly.`,
      "health-tip": `Write a social media post sharing a useful health tip or interesting fact related to earwax, ear health, cryotherapy, skin lesions, or foot health. Make it educational but engaging. ShawScope branding.`,
      "seasonal": `Write a seasonal social media post for ShawScope that's timely for ${currentMonth}. Could relate to seasonal health advice, weather-related conditions, etc.`,
      "promotional": `Write a promotional social media post for ShawScope highlighting one of the services. Make it professional but warm and approachable. Include a call to action.`,
      "behind-scenes": `Write a "behind the scenes" or "day in the life" style social media post about mobile healthcare practitioner Matt Shaw from ShawScope visiting patients across Dorset. Make it authentic and relatable.`,
      "custom": `Write a social media post for ShawScope based on this specific request: "${prompt}"`,
    };

    const systemPrompt = `You are a social media content creator for ShawScope, a mobile, non-diagnostic ear care and wellness service in Dorset, UK (professional earwax removal, cosmetic cryotherapy and foot care). Never use words like "diagnose", "treatment of disease", "ENT assessment", "audiology assessment", "hearing loss clinic" or "healthcare provider". Prefer: "ear care", "earwax management", "removal of visible excess earwax", "non-diagnostic hearing screening", "cosmetic cryotherapy", "comfort and wellbeing". 
Write engaging, professional social media posts that are warm, approachable, and authentic. 
Keep posts suitable for Facebook and Instagram. Use 1-3 relevant emojis maximum.
Posts should be 50-200 words. Include relevant hashtags at the end (3-5 max).
Never make up specific patient stories or testimonials.
If using data, present it naturally (e.g., "We've been busy across Dorchester and Weymouth this month!") not as raw stats.

${businessContext}`;

    const userPrompt = typePrompts[postType] || typePrompts["custom"];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate text post
    const textResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!textResp.ok) {
      const status = textResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await textResp.text();
      console.error("AI text error:", status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const textData = await textResp.json();
    const postText = textData.choices?.[0]?.message?.content || "";

    let imageBase64 = null;

    // Optionally generate an image
    if (generateImage) {
      try {
        const imagePrompt = `Create a professional, clean social media image for a healthcare business called ShawScope. The image should be warm and inviting, suitable for Facebook/Instagram. ${
          postType === "data-insight" ? "Show an abstract heatmap or map of Dorset with warm colors indicating visit locations." :
          postType === "health-tip" ? "Show a clean medical/health themed image related to ear care or skin health." :
          postType === "seasonal" ? `Show a seasonal ${currentMonth} themed healthcare image.` :
          "Show the ShawScope brand - mobile healthcare visiting patients at home in Dorset."
        } Style: modern, professional healthcare. Aspect ratio: 1:1 square for social media. Do NOT include any text in the image.`;

        const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: imagePrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (imgResp.ok) {
          const imgData = await imgResp.json();
          const imgUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (imgUrl) {
            imageBase64 = imgUrl;
          }
        }
      } catch (imgErr) {
        console.error("Image generation failed:", imgErr);
        // Continue without image
      }
    }

    return new Response(
      JSON.stringify({ post: postText, image: imageBase64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Social post error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
