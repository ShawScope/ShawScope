import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify admin
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get GA4 configuration
    const propertyId = Deno.env.get("GA4_PROPERTY_ID");
    if (!propertyId) {
      return new Response(JSON.stringify({ error: "GA4_PROPERTY_ID not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    if (url.searchParams.get("debug") === "credentials") {
      const serviceAccount = parseServiceAccount(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON"));
      const { data: oauthToken } = await adminClient
        .from("google_oauth_tokens")
        .select("scopes, token_expires_at")
        .ilike("scopes", "%analytics.readonly%")
        .limit(1)
        .maybeSingle();
      return new Response(JSON.stringify({
        property_id: propertyId,
        auth_mode: oauthToken ? "google_oauth" : (serviceAccount ? "service_account_fallback" : "not_connected"),
        oauth_has_analytics_scope: Boolean(oauthToken),
        oauth_token_expires_at: oauthToken?.token_expires_at || null,
        service_account_email: serviceAccount?.client_email || null,
        service_account_project_id: serviceAccount?.project_id || null,
        service_account_type: serviceAccount?.type || null,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prefer admin Google OAuth. GA rejects some service accounts in Property Access Management,
    // while OAuth uses the already-authorised Google admin account directly.
    const accessToken = await getGoogleOAuthAccessToken(adminClient);

    // Determine reporting window (days) from query/body
    let days = 30;
    const daysParam = url.searchParams.get("days");
    if (daysParam) {
      const n = parseInt(daysParam, 10);
      if (!Number.isNaN(n) && n > 0 && n <= 365) days = n;
    } else if (req.method === "POST") {
      try {
        const body = await req.clone().json();
        if (body?.days) {
          const n = parseInt(String(body.days), 10);
          if (!Number.isNaN(n) && n > 0 && n <= 365) days = n;
        }
      } catch { /* ignore */ }
    }

    const today = new Date();
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - days);

    const startDate = formatDate(rangeStart);
    const endDate = formatDate(today);

    // Run multiple GA4 requests in parallel
    let overviewRes: any;
    let dailyRes: any;
    let pagesRes: any;
    let sourcesRes: any;
    let devicesRes: any;
    let countriesRes: any;
    try {
      [overviewRes, dailyRes, pagesRes, sourcesRes, devicesRes, countriesRes] = await Promise.all([
        runGA4Report(accessToken, propertyId, {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "totalUsers" },
            { name: "screenPageViews" },
            { name: "screenPageViewsPerSession" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
        }),
        runGA4Report(accessToken, propertyId, {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "totalUsers" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
        runGA4Report(accessToken, propertyId, {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
            { name: "engagementRate" },
          ],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 25,
        }),
        runGA4Report(accessToken, propertyId, {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        }),
        runGA4Report(accessToken, propertyId, {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        }),
        runGA4Report(accessToken, propertyId, {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "country" }],
          metrics: [{ name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          limit: 15,
        }),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("PERMISSION_DENIED") || message.includes("sufficient permissions")) {
        return new Response(JSON.stringify({
          error: `GA4 access denied. Connect Google Analytics again from Reports, using a Google account that has Viewer access to GA4 property ${propertyId}.`,
          property_id: propertyId,
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw err;
    }

    // Parse overview
    const overviewRow = overviewRes.rows?.[0]?.metricValues || [];
    const totalVisitors = parseInt(overviewRow[0]?.value || "0");
    const totalPageviews = parseInt(overviewRow[1]?.value || "0");
    const avgPageviewsPerVisit = parseFloat(overviewRow[2]?.value || "0");
    const avgSessionDuration = parseFloat(overviewRow[3]?.value || "0");
    const bounceRate = parseFloat(overviewRow[4]?.value || "0") * 100;

    // Parse daily visitors
    const dailyVisitors = (dailyRes.rows || []).map((row: any) => {
      const dateStr = row.dimensionValues[0].value;
      return {
        date: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`,
        visitors: parseInt(row.metricValues[0].value || "0"),
      };
    });

    // Parse top pages
    const topPages = (pagesRes.rows || []).map((row: any) => ({
      page: row.dimensionValues[0].value,
      views: parseInt(row.metricValues[0].value || "0"),
      avg_time_seconds: Math.round(parseFloat(row.metricValues[1]?.value || "0")),
      engagement_rate: Math.round(parseFloat(row.metricValues[2]?.value || "0") * 1000) / 10,
    }));

    // Parse traffic sources
    const topSources = (sourcesRes.rows || []).map((row: any) => ({
      source: row.dimensionValues[0].value || "(direct)",
      visits: parseInt(row.metricValues[0].value || "0"),
    }));

    // Parse devices
    const deviceBreakdown = (devicesRes.rows || []).map((row: any) => ({
      device: row.dimensionValues[0].value,
      count: parseInt(row.metricValues[0].value || "0"),
    }));

    // Parse countries
    const countryBreakdown = (countriesRes.rows || []).map((row: any) => ({
      country: row.dimensionValues[0].value,
      count: parseInt(row.metricValues[0].value || "0"),
    }));

    // Upsert into website_analytics_snapshots
    const snapshotDate = formatDate(today);
    const { error: upsertErr } = await adminClient
      .from("website_analytics_snapshots")
      .upsert({
        snapshot_date: snapshotDate,
        period_start: startDate,
        period_end: endDate,
        total_visitors: totalVisitors,
        total_pageviews: totalPageviews,
        avg_pageviews_per_visit: Math.round(avgPageviewsPerVisit * 10) / 10,
        avg_session_duration_seconds: Math.round(avgSessionDuration),
        bounce_rate: Math.round(bounceRate * 10) / 10,
        top_pages: topPages,
        top_sources: topSources,
        device_breakdown: deviceBreakdown,
        country_breakdown: countryBreakdown,
        daily_visitors: dailyVisitors,
      }, { onConflict: "snapshot_date" });

    if (upsertErr) {
      console.error("Upsert error:", upsertErr);
      // Try insert instead (no unique constraint on snapshot_date)
      const { error: insertErr } = await adminClient
        .from("website_analytics_snapshots")
        .insert({
          snapshot_date: snapshotDate,
          period_start: startDate,
          period_end: endDate,
          total_visitors: totalVisitors,
          total_pageviews: totalPageviews,
          avg_pageviews_per_visit: Math.round(avgPageviewsPerVisit * 10) / 10,
          avg_session_duration_seconds: Math.round(avgSessionDuration),
          bounce_rate: Math.round(bounceRate * 10) / 10,
          top_pages: topPages,
          top_sources: topSources,
          device_breakdown: deviceBreakdown,
          country_breakdown: countryBreakdown,
          daily_visitors: dailyVisitors,
        });
      if (insertErr) throw insertErr;
    }

    // Also update the cache table for the dashboard widget
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const thisWeekVisitors = dailyVisitors
      .filter((d: any) => new Date(d.date) >= thisWeekStart)
      .reduce((sum: number, d: any) => sum + d.visitors, 0);
    const lastWeekVisitors = dailyVisitors
      .filter((d: any) => { const dt = new Date(d.date); return dt >= lastWeekStart && dt <= lastWeekEnd; })
      .reduce((sum: number, d: any) => sum + d.visitors, 0);
    const thisMonthVisitors = dailyVisitors
      .filter((d: any) => new Date(d.date) >= monthStart)
      .reduce((sum: number, d: any) => sum + d.visitors, 0);
    const lastMonthVisitors = dailyVisitors
      .filter((d: any) => { const dt = new Date(d.date); return dt >= lastMonthStart && dt <= lastMonthEnd; })
      .reduce((sum: number, d: any) => sum + d.visitors, 0);

    // Update or insert cache
    const { data: existingCache } = await adminClient.from("website_analytics_cache").select("id").limit(1).maybeSingle();
    if (existingCache) {
      await adminClient.from("website_analytics_cache").update({
        this_week_visitors: thisWeekVisitors,
        last_week_visitors: lastWeekVisitors,
        this_month_visitors: thisMonthVisitors,
        last_month_visitors: lastMonthVisitors,
        updated_at: new Date().toISOString(),
      }).eq("id", existingCache.id);
    } else {
      await adminClient.from("website_analytics_cache").insert({
        this_week_visitors: thisWeekVisitors,
        last_week_visitors: lastWeekVisitors,
        this_month_visitors: thisMonthVisitors,
        last_month_visitors: lastMonthVisitors,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      total_visitors: totalVisitors,
      total_pageviews: totalPageviews,
      period: `${startDate} to ${endDate}`,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("GA4 fetch error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to fetch GA4 analytics" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseServiceAccount(serviceAccountJson: string | undefined): any | null {
  if (!serviceAccountJson) return null;
  try {
    return JSON.parse(serviceAccountJson);
  } catch {
    try {
      return JSON.parse(JSON.parse(serviceAccountJson));
    } catch {
      return null;
    }
  }
}

async function getGoogleOAuthAccessToken(adminClient: any): Promise<string> {
  const { data: tokenRow, error } = await adminClient
    .from("google_oauth_tokens")
    .select("*")
    .ilike("scopes", "%analytics.readonly%")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!tokenRow) {
    throw new Error("Google Analytics is not connected. Use Connect Google Analytics in Reports, then refresh again.");
  }

  const expiresAt = new Date(tokenRow.token_expires_at);
  if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return tokenRow.access_token;
  }

  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not configured");

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenRow.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(`Google token refresh failed: ${data.error_description || data.error}`);

  const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await adminClient
    .from("google_oauth_tokens")
    .update({
      access_token: data.access_token,
      token_expires_at: newExpiresAt,
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
    })
    .eq("id", tokenRow.id);

  return data.access_token;
}

async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signInput = `${headerB64}.${payloadB64}`;

  // Import the private key
  const pemKey = serviceAccount.private_key;
  const pemContents = pemKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const keyData = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signInput)
  );

  const jwt = `${signInput}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`Google token exchange failed [${tokenRes.status}]: ${errBody}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function runGA4Report(accessToken: string, propertyId: string, body: any): Promise<any> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GA4 API error [${res.status}]: ${errBody}`);
  }

  return res.json();
}
