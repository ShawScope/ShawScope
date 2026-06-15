import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireAdminOrCron } from "../_shared/auth-guard.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {

    const authError = await requireAdminOrCron(req, corsHeaders);
    if (authError) return authError;
    const { fileBase64, mimeType, fileName } = await req.json();
    if (!fileBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: 'Missing fileBase64 or mimeType' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Only image/* and application/pdf are supported by Gemini multimodal via the gateway.
    const supported = mimeType.startsWith('image/') || mimeType === 'application/pdf';
    if (!supported) {
      return new Response(JSON.stringify({ skipped: true, reason: `Unsupported file type for OCR: ${mimeType}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const dataUrl = `data:${mimeType};base64,${fileBase64}`;
    const systemPrompt = `You are an expert UK receipt OCR. Extract structured fields from the supplied receipt or invoice image.
Return ONLY a compact JSON object with these keys:
{
  "merchant": string | null,           // shop / supplier name
  "date": string | null,                // ISO date YYYY-MM-DD (UK dates dd/mm/yyyy converted)
  "total": number | null,               // grand total in GBP, decimal
  "vat": number | null,                 // VAT amount if shown, decimal
  "currency": string | null,            // e.g. "GBP"
  "category_hint": string | null,       // best HMRC category guess
  "description": string | null,         // brief one-line description
  "confidence": number                  // 0-1
}
Pick the FINAL total (after discounts), not subtotal. If unsure, set the field to null.`;

    const body = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: `File name: ${fileName || 'receipt'}. Extract the receipt details.` },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    };

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: 'Rate limit, please try again shortly' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: `AI error: ${txt.slice(0, 300)}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const json = await resp.json();
    const content: string = json?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }
    return new Response(JSON.stringify({ ok: true, data: parsed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});