const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a clinical-governance assistant for ShawScope — a sole-practitioner, home-visiting earwax-removal, foot-health and minor-skin clinic run by Matt Shaw in Dorset, UK.

Write practical, plain-English documents tailored to a one-clinician mobile service. Use UK English, UK GDPR / CQC / NMC terminology where appropriate. Avoid generic corporate boilerplate. Keep it concise but complete enough for CQC inspection evidence. Format with clear section headings (## H2) and bullet points where it improves clarity. Date format DD/MM/YYYY.

Return ONLY valid JSON in this exact shape:
{
  "title": "<short title>",
  "body": "<markdown body>",
  "meta": { /* kind-specific extras, optional */ }
}

For "policy": meta may include "review_frequency_months" (default 12).
For "continuity": meta may include "scenario" (one-line scenario), "next_test_in_months" (default 6).
For "risk_assessment": meta may include "category" (clinical, lone_working, infection, fire, manual_handling, equipment, travel, other), "risk_rating" (low, medium, high, very_high), "hazards" (string), "controls" (string).

No commentary, no markdown fences — just the JSON object.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { kind, topic, extras } = await req.json();
    if (!kind || !topic) {
      return new Response(JSON.stringify({ error: "kind and topic required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const kindLabel: Record<string, string> = {
      policy: "policy document",
      continuity: "business continuity plan",
      risk_assessment: "risk assessment",
    };

    const userPrompt = `Draft a ${kindLabel[kind] ?? kind} on: "${topic}".${extras ? `\n\nAdditional context: ${extras}` : ""}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: "AI rate limit reached — try again in a minute" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted — top up to continue" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }
    if (!parsed?.title || !parsed?.body) throw new Error("AI returned malformed draft");

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("governance-ai-writer error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});