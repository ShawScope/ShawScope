import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailWrap, emailIconHeading, emailButton, emailInfoBox } from "../_shared/email-layout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const { data: expiredHolds, error: fetchErr } = await supabaseAdmin
      .from("booking_holds")
      .select("*")
      .eq("released", false)
      .eq("help_email_sent", false)
      .lt("expires_at", new Date().toISOString());

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredHolds || expiredHolds.length === 0) {
      return new Response(JSON.stringify({ message: "No expired holds", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const hold of expiredHolds) {
      await supabaseAdmin
        .from("booking_holds")
        .update({ released: true, help_email_sent: true })
        .eq("id", hold.id);

      if (!RESEND_API_KEY || !hold.client_email) {
        processed++;
        continue;
      }

      const dateStr = hold.appointment_date;
      const timeStr = hold.appointment_time?.slice(0, 5) || "";
      const formattedDate = dateStr
        ? `${dateStr.split("-")[2]}/${dateStr.split("-")[1]}/${dateStr.split("-")[0]}`
        : "your selected date";

      // Patient help email
      try {
        const patientContent = `
          ${emailIconHeading("🤝", "Need a hand with your booking?", "")}
          <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.7;">
            Hi${hold.client_name ? ` ${hold.client_name}` : ""},
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.7;">
            We noticed you started booking an appointment for <strong>${formattedDate} at ${timeStr}</strong> but didn't get chance to finish.
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.7;">
            Your time slot has now been released, but we'd love to help you book. You can:
          </p>
          <ul style="color:#4B5563;line-height:1.8;font-size:14px;padding-left:20px;">
            <li>Visit <a href="https://shawscope.co.uk/book" style="color:#D4912A;font-weight:600;">our booking page</a> to try again</li>
            <li>Reply to this email and we'll book it for you</li>
            <li>Call us on <a href="tel:01305340194" style="color:#D4912A;">01305 340 194</a> and we'll sort it out</li>
          </ul>
          ${emailButton("Book Your Appointment", "https://shawscope.co.uk/book")}`;

        const patientHtml = emailWrap(patientContent, { noReply: false });

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ShawScope <notifications@shawscope.co.uk>",
            to: [hold.client_email],
            reply_to: "matt@shawscope.co.uk",
            subject: "Do you need help completing your booking?",
            html: patientHtml,
          }),
        });
      } catch (emailErr) {
        console.error("Failed to send patient help email:", emailErr);
      }

      // Admin notification
      try {
        const adminContent = `
          ${emailIconHeading("⚠️", "Abandoned Booking", "A patient started a booking but didn't complete it.")}
          <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <table cellpadding="0" cellspacing="0" style="width:100%;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">
              <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">Name</td><td style="padding:8px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;">${hold.client_name || "Not entered"}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;border-top:1px solid #E5E7EB;">Email</td><td style="padding:8px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #E5E7EB;">${hold.client_email || "Not entered"}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;border-top:1px solid #E5E7EB;">Phone</td><td style="padding:8px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #E5E7EB;">${hold.client_phone || "Not entered"}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;border-top:1px solid #E5E7EB;">Date</td><td style="padding:8px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #E5E7EB;">${formattedDate}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;border-top:1px solid #E5E7EB;">Time</td><td style="padding:8px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #E5E7EB;">${timeStr}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;border-top:1px solid #E5E7EB;">Postcode</td><td style="padding:8px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #E5E7EB;">${hold.postcode || "N/A"}</td></tr>
            </table>
          </div>
          <p style="color:#6B7280;font-size:13px;">A help email has been sent to the patient. You may wish to follow up.</p>`;

        const adminHtml = emailWrap(adminContent, { subtitle: "Admin Alert", noReply: false });

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ShawScope <notifications@shawscope.co.uk>",
            to: [ADMIN_EMAIL],
            subject: `Abandoned booking: ${hold.client_name || hold.client_email || "Unknown"} — ${formattedDate} ${timeStr}`,
            html: adminHtml,
          }),
        });
      } catch (emailErr) {
        console.error("Failed to send admin notification:", emailErr);
      }

      if (hold.client_email) {
        await supabaseAdmin.from("patient_activity_log").insert({
          client_email: hold.client_email.toLowerCase(),
          event_type: "booking_abandoned",
          message: `Booking hold expired for ${formattedDate} at ${timeStr}. Help email sent.`,
          created_by: "system",
        });
      }

      processed++;
    }

    await supabaseAdmin
      .from("booking_holds")
      .delete()
      .eq("released", true)
      .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return new Response(
      JSON.stringify({ success: true, processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
