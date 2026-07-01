// Shared TheSMSWorks helper. Replaces Twilio across all edge functions.
// API docs: https://thesmsworks.co.uk/docs

const SMSWORKS_URL = "https://api.thesmsworks.co.uk/v1/message/send";
const SMSWORKS_TOKEN_URL = "https://api.thesmsworks.co.uk/v1/auth/token";

export const SMS_SENDER = "SHAWSCOPE";

// In-memory cache for an auto-generated JWT, shared across invocations on
// the same warm function instance -- avoids requesting a fresh token on
// every single SMS send.
//
// THESMSWORKS_API_KEY/THESMSWORKS_SECRET (from the TheSMSWorks dashboard)
// are used to generate a fresh token on demand, and again automatically if
// a send comes back 401. This replaces depending on a single long-lived
// static THESMSWORKS_JWT, which has previously gone stale well before its
// own embedded exp claim suggested it would. THESMSWORKS_JWT is still
// supported as a fallback if the key/secret aren't configured.
let cachedJwt: string | null = null;
let cachedJwtFetchedAt = 0;
const JWT_CACHE_MS = 60 * 60 * 1000; // re-fetch hourly regardless of embedded exp

async function fetchFreshJwt(): Promise<string | null> {
  const key = Deno.env.get("THESMSWORKS_API_KEY");
  const secret = Deno.env.get("THESMSWORKS_SECRET");
  if (!key || !secret) return null;

  try {
    const res = await fetch(SMSWORKS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, secret }),
    });
    if (!res.ok) {
      console.error("[sms] token refresh failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const token = data?.token ?? data?.jwt ?? null;
    if (!token) {
      console.error("[sms] token refresh response missing token field:", JSON.stringify(data));
      return null;
    }
    cachedJwt = token;
    cachedJwtFetchedAt = Date.now();
    return token;
  } catch (err) {
    console.error("[sms] token refresh error:", err);
    return null;
  }
}

async function getJwt(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cachedJwt && Date.now() - cachedJwtFetchedAt < JWT_CACHE_MS) {
    return cachedJwt;
  }
  const fresh = await fetchFreshJwt();
  if (fresh) return fresh;
  // Fall back to a static configured JWT if auto-refresh isn't configured
  // or fails -- keeps backward compatibility.
  return Deno.env.get("THESMSWORKS_JWT") ?? null;
}

/**
 * Normalise a UK number into international format WITHOUT a leading '+'.
 * TheSMSWorks expects e.g. 447712345678.
 * Returns null when the value is empty/invalid.
 */
export function normalisePhoneForSmsWorks(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = String(phone).replace(/[\s\-\(\)]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "44" + digits.slice(1);
  if (/^7\d{9}$/.test(digits)) digits = "44" + digits;
  if (!/^\d{7,15}$/.test(digits)) return null;
  return digits;
}

/**
 * Returns true if the (raw) phone number is a UK mobile.
 * Mirrors the previous Twilio policy: drop UK landline prefixes (01, 02, 03).
 * Non-UK numbers are allowed through.
 */
export function isMobilePhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const normalised = normalisePhoneForSmsWorks(phone);
  if (!normalised) return false;
  if (normalised.startsWith("44")) {
    return normalised.startsWith("447");
  }
  return true;
}

export interface SendSmsResult {
  ok: boolean;
  status: number;
  messageid?: string;
  body: any;
}

async function postMessage(jwt: string, sender: string, destination: string, body: string) {
  const res = await fetch(SMSWORKS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: jwt,
    },
    body: JSON.stringify({ sender, destination, content: body }),
  });
  const raw = await res.text();
  let parsed: any = raw;
  try { parsed = JSON.parse(raw); } catch { /* keep raw text */ }
  return { res, parsed };
}

/**
 * Send a single SMS via TheSMSWorks.
 * - Silently no-ops (returns ok:false) when no credentials configured, or
 *   phone is non-mobile.
 * - On a 401 (e.g. stale cached token), automatically refreshes the token
 *   once and retries before giving up.
 * - Caller decides whether to log success/failure.
 */
export async function sendSms(
  toPhone: string,
  body: string,
  opts: { sender?: string } = {},
): Promise<SendSmsResult> {
  if (!isMobilePhone(toPhone)) {
    return { ok: false, status: 0, body: { error: "not_mobile", phone: toPhone } };
  }

  const jwt = await getJwt();
  if (!jwt) {
    console.warn("[sms] No TheSMSWorks credentials configured");
    return { ok: false, status: 0, body: { error: "sms_not_configured" } };
  }

  const destination = normalisePhoneForSmsWorks(toPhone)!;
  const sender = (opts.sender || SMS_SENDER).slice(0, 11);

  try {
    let { res, parsed } = await postMessage(jwt, sender, destination, body);

    if (res.status === 401) {
      console.warn("[sms] got 401, refreshing token and retrying once");
      const freshJwt = await getJwt(true);
      if (freshJwt && freshJwt !== jwt) {
        ({ res, parsed } = await postMessage(freshJwt, sender, destination, body));
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      messageid: parsed?.messageid,
      body: parsed,
    };
  } catch (err) {
    console.error("[sms] send failed:", err);
    return { ok: false, status: 0, body: { error: String(err) } };
  }
}
