import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://shawscope.co.uk";

/* ── Branded email wrapper ── */
function brandWrap(content: string, subtitle?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">${subtitle || 'A Home Visiting Service'}</p>
    </div>
    <div style="padding:32px 28px;">
      ${content}
    </div>
    <div style="border-top:1px solid #E5E7EB;margin:0 28px;padding-top:20px;text-align:center;">
      <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/>
      <a href="mailto:matt@shawscope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shawscope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
    </div>
    <div style="background-color:#0E1420;padding:16px 24px;text-align:center;margin-top:24px;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Dorchester, Dorset · <a href="https://shawscope.co.uk" style="color:#D4912A;text-decoration:none;">shawscope.co.uk</a></p>
      <p style="color:#6B7280;font-size:10px;margin:8px 0 0;line-height:1.4;">⚠️ No Reply — This is an automated system message. Replies are not monitored.<br/>Contact us: <a href="tel:01305340194" style="color:#7A8494;">01305 340 194</a> · <a href="mailto:matt@shawscope.co.uk" style="color:#7A8494;">matt@shawscope.co.uk</a></p>
    </div>
  </div>
</body>
</html>`;
}

function buildAftercareEmail(clientName: string): string {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:32px;margin:0 0 12px;">❄️</div>
      <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">Your Cryotherapy Aftercare Guide</h2>
      <p style="color:#6B7280;margin:0;font-size:14px;">Hi ${clientName}, thank you for your treatment today! Here's everything you need to know.</p>
    </div>

    <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:20px;">
      <div style="background-color:#0E1420;padding:10px 14px;">
        <p style="margin:0;color:#E8ECF1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">🩹 What to Expect After Treatment</p>
      </div>
      <div style="padding:16px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;">
          <tr>
            <td style="padding:10px 0;color:#9CA3AF;width:36px;vertical-align:top;border-bottom:1px solid #E5E7EB;">🔴</td>
            <td style="padding:10px 0;border-bottom:1px solid #E5E7EB;"><strong style="color:#0E1420;">Redness & Inflammation</strong><br/><span style="color:#6B7280;">Initial redness is normal and part of healing. The area may be slightly raised.</span></td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#9CA3AF;vertical-align:top;border-bottom:1px solid #E5E7EB;">🩹</td>
            <td style="padding:10px 0;border-bottom:1px solid #E5E7EB;"><strong style="color:#0E1420;">Dry Scab</strong><br/><span style="color:#6B7280;">A small dry scab may form — do not pick or pull it. Allow it to come away naturally.</span></td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#9CA3AF;vertical-align:top;border-bottom:1px solid #E5E7EB;">✋</td>
            <td style="padding:10px 0;border-bottom:1px solid #E5E7EB;"><strong style="color:#0E1420;">Itching</strong><br/><span style="color:#6B7280;">May occur within a few minutes and usually lasts up to 30 minutes. This is due to histamine release and is totally normal.</span></td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#9CA3AF;vertical-align:top;">💧</td>
            <td style="padding:10px 0;"><strong style="color:#0E1420;">Blistering</strong><br/><span style="color:#6B7280;">Blisters may form and can last a few hours to days. DO NOT pop — they'll go down on their own. If one bursts, clean with an alcohol-free wipe and apply antiseptic cream.</span></td>
          </tr>
        </table>
      </div>
    </div>

    <div style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:12px;overflow:hidden;margin-bottom:20px;">
      <div style="background-color:#DC2626;padding:10px 14px;">
        <p style="margin:0;color:#ffffff;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">🚫 Following Treatment — Do NOT</p>
      </div>
      <div style="padding:16px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;">
          <tr><td style="padding:8px 0;color:#DC2626;width:24px;vertical-align:top;">✕</td><td style="padding:8px 0;color:#6B7280;">Scratch or pick the treated area — this will cause longer healing and may damage the skin.</td></tr>
          <tr><td style="padding:8px 0;color:#DC2626;vertical-align:top;border-top:1px solid #FECACA;">✕</td><td style="padding:8px 0;color:#6B7280;border-top:1px solid #FECACA;">Use scrubs on the area, as this will damage the surface of the skin.</td></tr>
          <tr><td style="padding:8px 0;color:#DC2626;vertical-align:top;border-top:1px solid #FECACA;">✕</td><td style="padding:8px 0;color:#6B7280;border-top:1px solid #FECACA;">Pop any blisters — allow them to go down naturally.</td></tr>
        </table>
      </div>
    </div>

    <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:20px;">
      <div style="background-color:#0E1420;padding:10px 14px;">
        <p style="margin:0;color:#E8ECF1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">💚 General Healing</p>
      </div>
      <div style="padding:16px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;">
          <tr><td style="padding:8px 0;color:#6B7280;width:24px;vertical-align:top;">•</td><td style="padding:8px 0;color:#6B7280;">Most healing takes place in <strong style="color:#0E1420;">4 to 6 weeks</strong>, though it may sometimes take longer.</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;vertical-align:top;border-top:1px solid #E5E7EB;">•</td><td style="padding:8px 0;color:#6B7280;border-top:1px solid #E5E7EB;">If healing takes longer than 6 weeks, it may need to be reviewed by your GP or clinic nurse.</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;vertical-align:top;border-top:1px solid #E5E7EB;">•</td><td style="padding:8px 0;color:#6B7280;border-top:1px solid #E5E7EB;">If your immune system is compromised, healing may take longer and further treatment may be needed.</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;vertical-align:top;border-top:1px solid #E5E7EB;">•</td><td style="padding:8px 0;color:#6B7280;border-top:1px solid #E5E7EB;">If the treated area is tanned, cryotherapy will remove the tanning. The skin will need to repigment.</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;vertical-align:top;border-top:1px solid #E5E7EB;">•</td><td style="padding:8px 0;color:#6B7280;border-top:1px solid #E5E7EB;">You may shower/wash as normal and use your usual cosmetics, makeup, deodorants and moisturising creams.</td></tr>
        </table>
      </div>
    </div>

    <div style="background-color:#FEF9F0;border:1px solid #F5E6CC;border-radius:10px;padding:14px 16px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-size:14px;color:#92400E;font-weight:600;">☀️ Sun Protection</p>
      <p style="margin:6px 0 0;font-size:13px;color:#6B7280;">Always use <strong style="color:#0E1420;">sun block (factor 50)</strong> following treatment of any pigmented lesions to prevent re-pigmentation.</p>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="${SITE_URL}/cryotherapy#aftercare" style="display:inline-block;padding:14px 32px;background-color:#D4912A;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">View Full Aftercare Guide →</a>
    </div>

    <div style="background-color:#F0FDF4;border:1px solid #86EFAC;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;color:#166534;font-weight:600;">📬 We'll Check In</p>
      <p style="margin:0;font-size:13px;color:#6B7280;">We'll be checking in with you over the coming weeks to see how your healing is going. If you have any concerns in the meantime, don't hesitate to reply to this email.</p>
    </div>`;

  return brandWrap(content, 'Cryotherapy Aftercare');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId } = await req.json();
    if (!appointmentId) {
      return new Response(JSON.stringify({ error: "appointmentId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const resendKey = Deno.env.get("RESEND_API_KEY")!;

    const { data: apt, error: aptError } = await supabase
      .from("appointments")
      .select("id, client_name, client_email, service_id, services(name)")
      .eq("id", appointmentId)
      .single();

    if (aptError || !apt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceName = (apt.services as any)?.name || "";
    if (!serviceName.toLowerCase().includes("cryotherapy")) {
      return new Response(JSON.stringify({ message: "Not a cryotherapy appointment, skipping", sent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = "Your Cryotherapy Aftercare Guide — ShawScope";
    const html = buildAftercareEmail(apt.client_name);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ShawScope Aftercare <bookings@shawscope.co.uk>",
        to: [apt.client_email],
        reply_to: "matt@shawscope.co.uk",
        subject,
        html,
      }),
    });

    const sent = emailRes.ok;

    try {
      await supabase.from("communications_log").insert({
        channel: "email",
        recipient_name: apt.client_name,
        recipient_email: apt.client_email,
        subject,
        body_preview: "Cryotherapy aftercare guide",
        body_html: html,
        trigger_type: "cryo_aftercare",
        appointment_id: apt.id,
        status: sent ? "sent" : "failed",
        error_message: sent ? null : await emailRes.text(),
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({ message: sent ? "Aftercare email sent" : "Failed to send", sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
