import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_VERIFY_ATTEMPTS = 5;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

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

    const { code } = await req.json();
    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return new Response(JSON.stringify({ error: "Invalid code format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user's JWT
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

    // Fetch all valid (unused, not expired) OTP codes for this user
    const { data: validCodes } = await supabaseAdmin
      .from("login_otp_codes")
      .select("id, code, verify_attempts")
      .eq("user_id", user.id)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    if (!validCodes || validCodes.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if max attempts exceeded on the latest code
    const latestCode = validCodes[0];
    if (latestCode.verify_attempts >= MAX_VERIFY_ATTEMPTS) {
      // Invalidate all codes for this user
      await supabaseAdmin
        .from("login_otp_codes")
        .update({ used: true })
        .eq("user_id", user.id)
        .eq("used", false);

      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Timing-safe comparison against all valid codes
    let matchedId: string | null = null;
    const trimmedCode = code.trim();
    for (const record of validCodes) {
      if (timingSafeEqual(record.code, trimmedCode)) {
        matchedId = record.id;
      }
    }

    if (!matchedId) {
      // Increment attempt counter on the latest code
      await supabaseAdmin
        .from("login_otp_codes")
        .update({ verify_attempts: latestCode.verify_attempts + 1 })
        .eq("id", latestCode.id);

      const remaining = MAX_VERIFY_ATTEMPTS - latestCode.verify_attempts - 1;
      return new Response(
        JSON.stringify({ 
          error: remaining > 0 
            ? `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : "Invalid code. No attempts remaining — please request a new code."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as used
    await supabaseAdmin
      .from("login_otp_codes")
      .update({ used: true })
      .eq("id", matchedId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-otp error:", err);
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
