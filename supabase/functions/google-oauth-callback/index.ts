import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // userId or encoded OAuth state
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(errorPage("Google denied access: " + error), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !state) {
      return new Response(errorPage("Missing authorization code"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const oauthState = parseOAuthState(state);

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("OAuth credentials not configured");

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-oauth-callback`;

    // Exchange code for tokens
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      console.error("Token exchange failed:", tokenData);
      return new Response(errorPage("Token exchange failed: " + (tokenData.error_description || tokenData.error)), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existingToken } = await supabaseAdmin
      .from("google_oauth_tokens")
      .select("refresh_token")
      .eq("user_id", oauthState.user_id)
      .maybeSingle();

    const refreshTokenToStore = refresh_token || existingToken?.refresh_token;
    if (!refreshTokenToStore) {
      return new Response(errorPage("No refresh token received. Please revoke access at myaccount.google.com/permissions and try again."), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    const { error: upsertError } = await supabaseAdmin
      .from("google_oauth_tokens")
      .upsert({
        user_id: oauthState.user_id,
        access_token,
        refresh_token: refreshTokenToStore,
        token_expires_at: expiresAt,
        scopes: oauthState.scopes.join(" "),
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Token storage failed:", upsertError);
      return new Response(errorPage("Failed to store tokens"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(successPage(oauthState.intent), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("google-oauth-callback error:", err);
    return new Response(errorPage(err.message), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function parseOAuthState(state: string): { user_id: string; intent: "contacts" | "analytics"; scopes: string[] } {
  const contactScope = "https://www.googleapis.com/auth/contacts";
  try {
    const parsed = JSON.parse(atob(state));
    return {
      user_id: parsed.user_id,
      intent: parsed.intent === "analytics" ? "analytics" : "contacts",
      scopes: Array.isArray(parsed.scopes) && parsed.scopes.length ? parsed.scopes : [contactScope],
    };
  } catch {
    return { user_id: state, intent: "contacts", scopes: [contactScope] };
  }
}

function successPage(intent: "contacts" | "analytics"): string {
  const label = intent === "analytics" ? "Google Analytics" : "Google Contacts";
  return `<!DOCTYPE html>
<html><head><title>Connected</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8faf8}
.card{text-align:center;padding:2rem;border-radius:12px;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08)}
h1{color:#16a34a;margin-bottom:.5rem}p{color:#555}</style></head>
<body><div class="card"><h1>✅ Google Connected</h1><p>${label} is now active.<br>You can close this window.</p>
<script>setTimeout(()=>window.close(),3000)</script></div></body></html>`;
}

function errorPage(msg: string): string {
  return `<!DOCTYPE html>
<html><head><title>Error</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fef2f2}
.card{text-align:center;padding:2rem;border-radius:12px;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08);max-width:400px}
h1{color:#dc2626;margin-bottom:.5rem}p{color:#555;word-break:break-word}</style></head>
<body><div class="card"><h1>❌ Connection Failed</h1><p>${msg}</p></div></body></html>`;
}
