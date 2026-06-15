import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_PHONE = "+447444653593";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    // Check user is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not an admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate previous codes
    await supabaseAdmin
      .from("login_otp_codes")
      .update({ used: true })
      .eq("user_id", user.id)
      .eq("used", false);

    // Store new code
    await supabaseAdmin.from("login_otp_codes").insert({
      user_id: user.id,
      code,
      expires_at: expiresAt.toISOString(),
    });

    // Send via TheSMSWorks
    const { sendSms } = await import("../_shared/sms.ts");
    const smsResult = await sendSms(
      ADMIN_PHONE,
      `ShawScope login code: ${code}\n\nThis code expires in 5 minutes. If you didn't request this, ignore this message.\n\n(No-Reply)`,
    );
    console.log("SMS provider response:", smsResult.status, JSON.stringify(smsResult.body));
    if (!smsResult.ok) {
      return new Response(JSON.stringify({ error: "Failed to send SMS code", detail: smsResult.body }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maskedPhone = ADMIN_PHONE.replace(/(.{4})(.*)(.{3})/, "$1•••$3");

    return new Response(
      JSON.stringify({ success: true, phone: maskedPhone }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-otp error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
