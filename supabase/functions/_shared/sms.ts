// Shared TheSMSWorks helper. Replaces Twilio across all edge functions.
// API docs: https://thesmsworks.co.uk/docs

const SMSWORKS_URL = "https://api.thesmsworks.co.uk/v1/message/send";

export const SMS_SENDER = "SHAWSCOPE";

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

/**
 * Send a single SMS via TheSMSWorks.
 * - Silently no-ops (returns ok:false) when JWT missing or phone is non-mobile.
 * - Caller decides whether to log success/failure.
 */
export async function sendSms(
  toPhone: string,
  body: string,
  opts: { sender?: string } = {},
): Promise<SendSmsResult> {
  const jwt = Deno.env.get("THESMSWORKS_JWT");
  if (!jwt) {
    console.warn("[sms] THESMSWORKS_JWT not configured");
    return { ok: false, status: 0, body: { error: "sms_not_configured" } };
  }

  if (!isMobilePhone(toPhone)) {
    return { ok: false, status: 0, body: { error: "not_mobile", phone: toPhone } };
  }

  const destination = normalisePhoneForSmsWorks(toPhone)!;
  const sender = (opts.sender || SMS_SENDER).slice(0, 11);

  try {
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
