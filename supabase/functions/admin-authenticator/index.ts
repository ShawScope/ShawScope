import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ISSUER = "ShawScope Admin";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateSecret(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE32_ALPHABET[bytes[i] % BASE32_ALPHABET.length];
  }
  return out;
}

function base32ToBytes(base32: string): Uint8Array {
  const cleaned = base32.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const char of cleaned) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

async function totpForStep(secret: string, step: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    base32ToBytes(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(step / 0x100000000), false);
  view.setUint32(4, step % 0x100000000, false);

  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const offset = sig[sig.length - 1] & 0x0f;
  const code =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);

  return String(code % 1_000_000).padStart(6, "0");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifyTotp(secret: string, code: string): Promise<boolean> {
  const nowStep = Math.floor(Date.now() / 1000 / 30);
  for (let drift = -1; drift <= 1; drift++) {
    const candidate = await totpForStep(secret, nowStep + drift);
    if (timingSafeEqual(candidate, code)) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    console.log("admin-authenticator action:", action, "user:", user.id);

    if (action === "status") {
      const { data: factor } = await supabaseAdmin
        .from("admin_authenticator_factors")
        .select("is_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          enabled: !!factor?.is_enabled,
          configured: !!factor,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "setup") {
      const secret = generateSecret(32);
      const accountName = encodeURIComponent(user.email ?? "admin");
      const issuer = encodeURIComponent(ISSUER);
      const otpauthUri = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

      const { data: existingFactor, error: selectError } = await supabaseAdmin
        .from("admin_authenticator_factors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (selectError) {
        console.error("setup select error:", selectError);
        return new Response(JSON.stringify({ error: "Could not check existing authenticator setup", detail: selectError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const writeQuery = existingFactor
        ? supabaseAdmin
            .from("admin_authenticator_factors")
            .update({
              secret,
              is_enabled: false,
              enabled_at: null,
            })
            .eq("id", existingFactor.id)
        : supabaseAdmin
            .from("admin_authenticator_factors")
            .insert({
              user_id: user.id,
              secret,
              is_enabled: false,
              enabled_at: null,
            });

      const { error: writeError } = await writeQuery;

      console.log("setup write result, error:", writeError);

      if (writeError) {
        return new Response(JSON.stringify({ error: "Could not save authenticator setup", detail: writeError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ secret, otpauthUri }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "enable") {
      const code = String(body?.code ?? "").trim();
      if (!/^\d{6}$/.test(code)) {
        return new Response(JSON.stringify({ error: "Invalid code format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: factor } = await supabaseAdmin
        .from("admin_authenticator_factors")
        .select("id, secret")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!factor) {
        return new Response(JSON.stringify({ error: "Authenticator not set up yet" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ok = await verifyTotp(factor.secret, code);
      if (!ok) {
        return new Response(JSON.stringify({ error: "Invalid authenticator code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("admin_authenticator_factors")
        .update({ is_enabled: true, enabled_at: new Date().toISOString() })
        .eq("id", factor.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const code = String(body?.code ?? "").trim();
      if (!/^\d{6}$/.test(code)) {
        return new Response(JSON.stringify({ error: "Invalid code format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: factor } = await supabaseAdmin
        .from("admin_authenticator_factors")
        .select("secret, is_enabled")
        .eq("user_id", user.id)
        .eq("is_enabled", true)
        .maybeSingle();

      if (!factor) {
        return new Response(JSON.stringify({ error: "Authenticator is not enabled" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ok = await verifyTotp(factor.secret, code);
      if (!ok) {
        return new Response(JSON.stringify({ error: "Invalid authenticator code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-authenticator error:", err);
    return new Response(JSON.stringify({ error: "Authenticator request failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
