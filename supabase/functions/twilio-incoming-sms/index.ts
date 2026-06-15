import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Validate Twilio webhook signature (HMAC-SHA1 of url + sorted form params)
async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  if (!signature) return false;
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return expected === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get("TWILIOACCOUNTSID");
    const authToken = Deno.env.get("twilioauthtowken");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");
    const adminPhone = "+447444653593";
    const SMS_SENDER = "SHAWSCOPE";

    if (!accountSid || !authToken) {
      return new Response("Twilio credentials not configured", { status: 500 });
    }

    // Twilio sends webhooks as application/x-www-form-urlencoded
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = v.toString();

    // Verify Twilio signature
    const twilioSig = req.headers.get("x-twilio-signature") || "";
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-incoming-sms`;
    const valid = await validateTwilioSignature(authToken, twilioSig, webhookUrl, params);
    if (!valid) {
      console.warn("Rejected Twilio webhook: invalid signature");
      return new Response("Forbidden", { status: 403 });
    }

    const from = formData.get("From")?.toString() || "Unknown";
    const body = formData.get("Body")?.toString() || "";
    const messageSid = formData.get("MessageSid")?.toString() || "";

    console.log(`Incoming SMS from ${from}: ${body}`);

    // Log to database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("communications_log").insert({
      channel: "sms",
      recipient_name: "Admin",
      recipient_phone: from,
      subject: "Incoming SMS Reply",
      body_preview: body.slice(0, 200),
      body_html: body,
      trigger_type: "incoming_sms",
      status: "received",
    });

    // Forward to admin via SMS
    const notifyMessage = `📩 SMS Reply from ${from}:\n\n"${body}"`;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const twilioHeaders = {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
    };

    const forwardParams = new URLSearchParams();
    forwardParams.append("To", adminPhone);
    forwardParams.append("From", SMS_SENDER);
    forwardParams.append("Body", notifyMessage + "\n\n(No-Reply)");

    const fwdRes = await fetch(twilioUrl, {
      method: "POST",
      headers: twilioHeaders,
      body: forwardParams.toString(),
    });
    const fwdData = await fwdRes.json();
    console.log("Admin forward sent:", fwdRes.status, fwdData.sid);

    // Email fallback: also forward to admin email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ShawScope <notifications@shawscope.co.uk>",
            to: ["matt@shawscope.co.uk"],
            subject: `📩 SMS Reply from ${from}`,
            html: `<div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;">
              <div style="background-color:#292524;padding:16px 24px;text-align:center;">
                <h1 style="color:#FAFAF9;font-size:16px;letter-spacing:2px;margin:0;">SHAWSCOPE — SMS REPLY</h1>
              </div>
              <div style="padding:24px;">
                <p style="color:#78716c;font-size:13px;margin:0 0 8px;">From: <strong style="color:#292524;">${from}</strong></p>
                <div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;padding:16px;margin:12px 0;">
                  <p style="color:#292524;font-size:14px;line-height:1.6;margin:0;white-space:pre-line;">${body}</p>
                </div>
                <p style="color:#a8a29e;font-size:11px;margin-top:16px;">Forwarded automatically from incoming SMS.</p>
              </div>
            </div>`,
          }),
        });
      } catch (e) { console.error("Email forward error:", e); }
    }

    // Auto-reply to sender via API using Twilio phone number
    // (Alphanumeric sender IDs like SHAWSCOPE are one-way only and can't reply to incoming messages)
    const autoReply = `Thank you for your message. This is an unmonitored number used for notifications only. Your message has been forwarded to Matt, who will get back to you as soon as possible.`;
    const replyParams = new URLSearchParams();
    replyParams.append("To", from);
    // Use the Twilio phone number for replies since alphanumeric IDs can't send replies
    replyParams.append("From", twilioPhone || SMS_SENDER);
    replyParams.append("Body", autoReply + "\n\n(No-Reply)");

    const replyRes = await fetch(twilioUrl, {
      method: "POST",
      headers: twilioHeaders,
      body: replyParams.toString(),
    });
    const replyData = await replyRes.json();
    console.log("Auto-reply sent:", replyRes.status, replyData.sid || replyData.message);

    // Return empty TwiML (reply already sent via API)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { "Content-Type": "application/xml" } }
    );
  } catch (err) {
    console.error("Error processing incoming SMS:", err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { "Content-Type": "application/xml" } }
    );
  }
});
