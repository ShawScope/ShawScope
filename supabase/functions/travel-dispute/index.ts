import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { emailWrap, emailIconHeading, emailSectionHeader } from "../_shared/email-layout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, postcode, address, calculatedDistance, calculatedFee, reason } = await req.json();

    if (!name || !email || !postcode || !reason) {
      return new Response(
        JSON.stringify({ error: "Name, email, postcode and reason are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (name.length > 200 || email.length > 320 || reason.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Input too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminEmail = "matt@shawscope.co.uk";

    const rows = [
      { label: "Name", value: escapeHtml(name) },
      { label: "Email", value: escapeHtml(email) },
    ];
    if (phone) rows.push({ label: "Phone", value: escapeHtml(phone) });
    rows.push({ label: "Postcode", value: escapeHtml(postcode) });
    if (address) rows.push({ label: "Address", value: escapeHtml(address) });
    rows.push(
      { label: "Calculated Distance", value: `${calculatedDistance ?? "N/A"} miles` },
      { label: "Calculated Fee", value: `£${Number(calculatedFee ?? 0).toFixed(2)}` }
    );

    const tableRows = rows.map((r, i) => `
      <tr>
        <td style="padding:10px 0;color:#6B7280;font-size:14px;${i > 0 ? 'border-top:1px solid #E5E7EB;' : ''}">${r.label}</td>
        <td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;${i > 0 ? 'border-top:1px solid #E5E7EB;' : ''}">${r.value}</td>
      </tr>`).join('');

    const content = `
      ${emailIconHeading("⚠️", "Travel Fee Dispute", "A patient believes their travel fee calculation may be incorrect.")}
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">
          ${tableRows}
        </table>
      </div>
      <div style="background-color:#FEF9F0;border:1px solid #F5E6CC;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0 0 4px;font-size:12px;color:#92400E;font-weight:600;">📝 Patient's Reason</p>
        <p style="margin:0;font-size:13px;color:#4B5563;white-space:pre-wrap;">${escapeHtml(reason)}</p>
      </div>`;

    const emailHtml = emailWrap(content, { subtitle: "Travel Fee Dispute", noReply: false });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ShawScope <bookings@shawscope.co.uk>",
        to: [adminEmail],
        reply_to: "matt@shawscope.co.uk",
        subject: `Travel Fee Dispute — ${name} (${postcode})`,
        html: emailHtml,
      }),
    });

    const resData = await res.json();

    return new Response(
      JSON.stringify({ success: res.ok }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
