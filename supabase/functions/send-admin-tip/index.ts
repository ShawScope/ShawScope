import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { emailWrap, emailIconHeading, emailInfoBox } from "../_shared/email-layout.ts";
import { requireAdminOrCron } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authError = await requireAdminOrCron(req, corsHeaders);
    if (authError) return authError;

    const { subject, message, heading } = await req.json();
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ ok: false, error: "resend_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip HTML tags to prevent injection, then convert newlines to <br/>
    const stripped = String(message || "").replace(/<[^>]*>/g, "");
    const escaped = stripped
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const safeMessage = escaped.replace(/\n/g, "<br/>");
    const content = `
      ${emailIconHeading("🗺️", heading || "Route Tip")}
      <div style="color:#0E1420;font-size:14px;line-height:1.6;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px;">
        ${safeMessage}
      </div>
      ${emailInfoBox("💡", "Suggestion", "Consider reordering the schedule to follow the suggested sequence to reduce drive time and fuel costs.")}
    `;
    const html = emailWrap(content, { subtitle: "Schedule Optimisation", noReply: false });

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ShawScope <notifications@shawscope.co.uk>",
        to: [ADMIN_EMAIL],
        subject: subject || "🗺️ Route tip",
        html,
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
