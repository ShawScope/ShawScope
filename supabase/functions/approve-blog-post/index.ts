import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function page(title: string, body: string, color = "#16a34a") {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;background:#0E1420;color:#E8ECF1;margin:0;padding:48px 20px;text-align:center;}
  .card{max-width:480px;margin:0 auto;background:#1a2030;border-radius:16px;padding:36px 28px;border:1px solid #2a3142;}
  h1{color:${color};margin:0 0 12px;font-size:24px;} p{color:#9CA3AF;line-height:1.6;}
  a{color:#D4912A;text-decoration:none;font-weight:600;}</style>
  </head><body><div class="card"><h1>${title}</h1>${body}<p style="margin-top:24px;"><a href="https://shawscope.co.uk/blog">View blog →</a></p></div></body></html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const action = url.searchParams.get("action") || "approve";

  if (!token) {
    return new Response(page("Invalid Link", "<p>Missing approval token.</p>", "#dc2626"), {
      status: 400, headers: { "Content-Type": "text/html" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("id, title, status")
    .eq("approval_token", token)
    .maybeSingle();

  if (error || !post) {
    return new Response(page("Not Found", "<p>This approval link is invalid or has expired.</p>", "#dc2626"), {
      status: 404, headers: { "Content-Type": "text/html" },
    });
  }

  if (post.status === "approved" && action === "approve") {
    return new Response(page("Already Live", `<p><strong>${post.title}</strong> is already published.</p>`), {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (action === "reject") {
    await supabase.from("blog_posts").update({ status: "rejected" }).eq("id", post.id);
    return new Response(page("Rejected", `<p>The draft <strong>${post.title}</strong> has been discarded.</p>`, "#dc2626"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  await supabase.from("blog_posts")
    .update({ status: "approved", published_at: new Date().toISOString() })
    .eq("id", post.id);

  return new Response(page("✅ Published", `<p><strong>${post.title}</strong> is now live on the News & Special Offers page.</p>`), {
    headers: { "Content-Type": "text/html" },
  });
});