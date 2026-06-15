import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { emailWrap, emailIconHeading, emailButton, emailInfoBox } from "../_shared/email-layout.ts";
import { requireAdminOrCron } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const TOPICS = [
  { category: "Ear Health", icon: "Ear", focus: "ear health best practice, hearing protection, or earwax facts" },
  { category: "Ear Health", icon: "Droplets", focus: "a historical story about how ear treatments used to be carried out (e.g. ear candling, syringing, Victorian remedies)" },
  { category: "Foot Health", icon: "Footprints", focus: "foot health best practice, common foot conditions, or interesting podiatry facts" },
  { category: "Cryotherapy", icon: "Snowflake", focus: "cryotherapy history, skin lesion myths, or interesting freezing-treatment facts" },
  { category: "ShawScope News", icon: "Heart", focus: "an interesting wellbeing story, healthcare history, or patient education topic" },
  { category: "Ear Health", icon: "Sun", focus: "seasonal ear care or interesting auditory facts" },
];

function pickTopic() {
  const month = new Date().getMonth();
  return TOPICS[month % TOPICS.length];
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {

    const authError = await requireAdminOrCron(req, corsHeaders);
    if (authError) return authError;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const topic = pickTopic();

    // 1. Generate article content with Lovable AI
    const sysPrompt = `You write engaging, friendly educational blog posts for ShawScope, a UK home-visiting, non-diagnostic ear care and wellness service in Dorchester, Dorset offering professional earwax removal, cosmetic cryotherapy and foot care (practitioner: Matt Shaw). Use British English. Keep tone warm, professional, conversational. Never use words like "diagnose", "diagnosis", "medical treatment", "treating hearing loss", "hearing loss clinic", "audiology assessment", "ENT assessment" or "healthcare provider". Prefer "ear care", "earwax management", "removal of visible excess earwax", "non-diagnostic hearing screening", "comfort and wellbeing", "cosmetic cryotherapy". Always remind readers to contact their GP, NHS 111 or a pharmacist for symptoms like pain, discharge, sudden hearing change, dizziness or bleeding. Output STRICT JSON only.`;
    const userPrompt = `Write a fresh, interesting blog article about: ${topic.focus}.
Return JSON: { "title": string (max 80 chars, catchy), "excerpt": string (1 sentence, max 160 chars), "read_time": string (e.g. "3 min read"), "image_prompt": string (vivid photographic prompt for hero image, no text in image), "content": string[] (4-6 paragraphs, each 2-4 sentences) }`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) throw new Error(`AI text failed: ${aiResp.status} ${await aiResp.text()}`);
    const aiData = await aiResp.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";
    const article = JSON.parse(raw);

    // 2. Generate hero image with Lovable AI image model
    let imageUrl: string | null = null;
    try {
      const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: `${article.image_prompt}. Photorealistic, warm natural lighting, editorial blog hero style, no text or watermarks.` }],
          modalities: ["image", "text"],
        }),
      });
      if (imgResp.ok) {
        const imgData = await imgResp.json();
        const b64 = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (b64) {
          const m = b64.match(/^data:(.+);base64,(.+)$/);
          if (m) {
            const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
            const fname = `${slugify(article.title)}-${Date.now()}.png`;
            const { error: upErr } = await supabase.storage
              .from("blog-images")
              .upload(fname, bytes, { contentType: m[1], upsert: true });
            if (!upErr) {
              imageUrl = supabase.storage.from("blog-images").getPublicUrl(fname).data.publicUrl;
            } else {
              console.error("Image upload failed:", upErr);
            }
          }
        }
      } else {
        console.error("Image gen failed:", await imgResp.text());
      }
    } catch (e) {
      console.error("Image gen error:", e);
    }

    // 3. Insert pending row
    const slug = `${slugify(article.title)}-${Date.now().toString(36)}`;
    const { data: inserted, error: insErr } = await supabase
      .from("blog_posts")
      .insert({
        slug,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        category: topic.category,
        icon_name: topic.icon,
        image_url: imageUrl,
        read_time: article.read_time || "3 min read",
        status: "pending",
      })
      .select("id, approval_token, slug")
      .single();

    if (insErr || !inserted) throw new Error(`Insert failed: ${insErr?.message}`);

    // 4. Email Matt with preview + approve button
    if (RESEND_API_KEY) {
      const approveUrl = `${SUPABASE_URL}/functions/v1/approve-blog-post?token=${inserted.approval_token}&action=approve`;
      const rejectUrl = `${SUPABASE_URL}/functions/v1/approve-blog-post?token=${inserted.approval_token}&action=reject`;

      const paragraphs = (article.content as string[]).map((p: string) =>
        `<p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">${p.replace(/</g, "&lt;")}</p>`
      ).join("");

      const imageBlock = imageUrl
        ? `<img src="${imageUrl}" alt="" style="width:100%;border-radius:10px;margin:0 0 16px;"/>`
        : "";

      const html = emailWrap(`
        ${emailIconHeading("✍️", "New Blog Post Ready for Review", `${topic.category} · ${article.read_time || "3 min read"}`)}
        ${imageBlock}
        <h3 style="margin:0 0 6px;font-size:20px;color:#0E1420;font-family:'DM Sans',Arial,sans-serif;">${article.title}</h3>
        <p style="margin:0 0 20px;color:#6B7280;font-size:14px;font-style:italic;">${article.excerpt}</p>
        ${paragraphs}
        ${emailInfoBox("ℹ️", "Approval", "Approve to publish this post live on the News & Special Offers page. Reject to discard.")}
        ${emailButton("✅  Approve & Publish", approveUrl, { color: "#16a34a" })}
        ${emailButton("❌  Reject", rejectUrl, { color: "#dc2626" })}
      `, { subtitle: "Monthly Blog Draft", noReply: false });

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "ShawScope <notifications@shawscope.co.uk>",
          to: [ADMIN_EMAIL],
          subject: `✍️ Blog draft for review: ${article.title}`,
          html,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true, id: inserted.id, slug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-monthly-blog error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});