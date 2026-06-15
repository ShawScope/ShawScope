import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAdminOrCron } from "../_shared/auth-guard.ts";

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

    const authError = await requireAdminOrCron(req, corsHeaders);
    if (authError) return authError;
    const body = await req.json();
    const { mode, heading, description, policy_text, user_instructions } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate new policy from scratch
    if (mode === "generate") {
      if (!user_instructions?.trim()) {
        return new Response(JSON.stringify({ error: "Please describe the policy you need" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const systemPrompt = `You are a healthcare business policy advisor for a UK-based mobile clinical services practitioner (earwax removal and cryotherapy). Generate a comprehensive, professional business policy based on the user's description. The policy should be compliant with UK healthcare standards, CQC guidelines where applicable, and best practices for sole practitioners.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Create a business policy for: ${user_instructions}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_policy",
                description: "Return the generated policy",
                parameters: {
                  type: "object",
                  properties: {
                    heading: { type: "string", description: "Short policy title" },
                    description: { type: "string", description: "One-sentence summary" },
                    policy_text: { type: "string", description: "Full policy text with sections and paragraphs" },
                  },
                  required: ["heading", "description", "policy_text"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_policy" } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        return new Response(JSON.stringify({ error: "No policy generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Review existing policy
    if (!policy_text?.trim()) {
      return new Response(JSON.stringify({ error: "No policy text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a healthcare business policy advisor for a UK-based mobile clinical services practitioner (earwax removal and cryotherapy). Your role is to review and improve business policies.

You will be given a current policy and optional instructions from the practitioner. You must:

1. Review the current policy for completeness, clarity, and compliance with UK healthcare standards
2. Suggest improvements and additions
3. Provide a fully updated version of the policy text

Respond using this exact JSON structure (tool call):
{
  "suggestions": [
    { "type": "addition" | "change" | "removal", "description": "Brief description of the suggestion" }
  ],
  "updated_policy_text": "The full updated policy text incorporating all suggestions",
  "review_summary": "A 1-2 sentence summary of key changes made"
}`;

    const userContent = `Policy Title: ${heading}
${description ? `Description: ${description}` : ""}

Current Policy Text:
${policy_text}

${user_instructions ? `Practitioner's Instructions:\n${user_instructions}` : "Please review this policy and suggest improvements for completeness, clarity, and UK healthcare compliance."}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "policy_review_result",
              description: "Return the policy review results",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["addition", "change", "removal"] },
                        description: { type: "string" },
                      },
                      required: ["type", "description"],
                      additionalProperties: false,
                    },
                  },
                  updated_policy_text: { type: "string" },
                  review_summary: { type: "string" },
                },
                required: ["suggestions", "updated_policy_text", "review_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "policy_review_result" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI review failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No review generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("review-policy error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
