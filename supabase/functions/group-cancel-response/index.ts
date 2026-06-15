import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";

function formatDateDMY(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, action, address, postcode, latitude, longitude, address_changed } = await req.json();

    if (!token || !action || !["keep", "cancel", "get_details"].includes(action)) {
      return new Response(JSON.stringify({ error: "Token and valid action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: apt, error: aptErr } = await supabaseAdmin
      .from("appointments")
      .select("*, services(name, price, duration_minutes)")
      .eq("access_token", token)
      .single();

    if (aptErr || !apt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === GET DETAILS: return appointment info for address confirmation ===
    if (action === "get_details") {
      if (apt.status === "cancelled") {
        return new Response(JSON.stringify({ error: "This appointment has already been cancelled" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        appointment: {
          client_name: apt.client_name,
          service_name: apt.services?.name || "Appointment",
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          address: apt.address,
          postcode: apt.postcode,
          latitude: apt.latitude,
          longitude: apt.longitude,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (apt.status === "cancelled") {
      return new Response(JSON.stringify({ error: "This appointment has already been cancelled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceName = apt.services?.name || "appointment";
    const dateFormatted = formatDateDMY(apt.appointment_date);
    const timeStr = apt.appointment_time?.slice(0, 5);
    const fullPrice = apt.services?.price;
    const siteUrl = Deno.env.get("SITE_URL") || "https://shawscope.co.uk";
    const cancelUrl = `${siteUrl}/cancel-appointment/${apt.access_token}`;
    const consentFormUrl = apt.consent_form_template_id ? `${siteUrl}/consent/${apt.access_token}` : "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const sendEmail = async (to: string, subject: string, html: string, recipientName: string) => {
      if (!resendApiKey) return;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "ShawScope <bookings@shawscope.co.uk>",
          to: [to],
          reply_to: "matt@shawscope.co.uk",
          subject,
          html,
        }),
      });
      try {
        await supabaseAdmin.from("communications_log").insert({
          channel: "email",
          recipient_name: recipientName,
          recipient_email: to,
          subject,
          body_preview: subject.slice(0, 100),
          body_html: html,
          trigger_type: "group_cancel_response",
          appointment_id: apt.id,
          status: res.ok ? "sent" : "failed",
        });
      } catch (_) {}
    };

    if (action === "cancel") {
      await supabaseAdmin
        .from("appointments")
        .update({
          status: "cancelled",
          admin_notes: (apt.admin_notes || "") + `\n[Group member chose to cancel after group change]`,
        })
        .eq("id", apt.id);

      await supabaseAdmin
        .from("scheduled_communications")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("appointment_id", apt.id)
        .eq("status", "pending");

      await supabaseAdmin.from("patient_activity_log").insert({
        client_email: apt.client_email.toLowerCase(),
        event_type: "cancelled",
        message: `${apt.client_name} chose to cancel after group member left. ${serviceName} on ${dateFormatted} at ${timeStr}.`,
        created_by: "patient",
      });

      const cancelHtml = `
        <div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;padding:0;">
          <div style="background-color:#292524;padding:20px 24px;text-align:center;">
            <h1 style="color:#FAFAF9;font-size:18px;letter-spacing:2px;margin:0;text-transform:uppercase;">ShawScope</h1>
          </div>
          <div style="padding:32px 24px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="display:inline-block;background-color:#fef2f2;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;text-align:center;">❌</div>
              <h2 style="color:#292524;margin:12px 0 4px;font-size:22px;">Appointment Cancelled</h2>
              <p style="color:#78716c;margin:0;font-size:14px;">Your appointment has been cancelled as requested, ${apt.client_name}.</p>
            </div>
            <div style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:20px;margin-bottom:20px;">
              <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">
                <tr><td style="padding:8px 0;color:#78716c;width:36px;">📋</td><td style="padding:8px 0;color:#78716c;">Service</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;">${serviceName}</td></tr>
                <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">📅</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Date</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${dateFormatted}</td></tr>
                <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">🕐</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Time</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${timeStr}</td></tr>
              </table>
            </div>
            <div style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:10px;padding:16px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#44403c;">🔄 Would you like to rebook?</p>
              <a href="${siteUrl}/book" style="display:inline-block;padding:12px 28px;background-color:#292524;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Book a New Appointment →</a>
            </div>
            <div style="border-top:1px solid #e7e5e4;margin-top:24px;padding-top:20px;text-align:center;">
              <p style="color:#a8a29e;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#292524;">Matt Shaw</strong><br/>ShawScope Clinical Services</p>
            </div>
          </div>
          <div style="background-color:#292524;padding:16px 24px;text-align:center;">
            <p style="color:#a8a29e;font-size:11px;margin:0;">ShawScope · Dorchester, Dorset</p>
            <p style="color:#a8a29e;font-size:10px;margin:4px 0 0;line-height:1.4;">⚠️ No Reply — This is an automated system message. Replies are not monitored.<br/>Contact us: <a href="tel:01305340194" style="color:#a8a29e;">01305 340 194</a> · <a href="mailto:matt@shawscope.co.uk" style="color:#a8a29e;">matt@shawscope.co.uk</a></p>
          </div>
        </div>`;

      await Promise.all([
        sendEmail(apt.client_email, `Appointment Cancelled — ShawScope`, cancelHtml, apt.client_name),
        sendEmail(ADMIN_EMAIL, `❌ ${apt.client_name} also cancelled (group change) — ${serviceName} ${dateFormatted}`,
          `<div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;">
            <div style="background-color:#292524;padding:20px 24px;text-align:center;"><h1 style="color:#FAFAF9;font-size:18px;letter-spacing:2px;margin:0;text-transform:uppercase;">ShawScope — Admin</h1></div>
            <div style="padding:32px 24px;text-align:center;">
              <div style="display:inline-block;background-color:#fef2f2;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;">❌</div>
              <h2 style="color:#292524;margin:12px 0 4px;">Group Member Also Cancelled</h2>
              <p style="color:#78716c;font-size:14px;"><strong>${apt.client_name}</strong> chose to cancel their ${serviceName} on ${dateFormatted} at ${timeStr} after their group booking changed.</p>
            </div>
            <div style="background-color:#292524;padding:16px 24px;text-align:center;"><p style="color:#a8a29e;font-size:11px;margin:0;">ShawScope · Admin</p></div>
          </div>`, "Admin"),
      ]);

      return new Response(JSON.stringify({ success: true, action: "cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === KEEP: Convert to individual booking ===
    const newPrice = fullPrice != null ? Number(fullPrice) : apt.price;
    const newAddress = address?.trim() || apt.address;
    const newPostcode = postcode?.trim()?.toUpperCase() || apt.postcode;
    const newLat = latitude ?? apt.latitude;
    const newLng = longitude ?? apt.longitude;
    const addressDidChange = !!address_changed;

    // Recalculate travel fee if address changed
    let newTravelFee = apt.travel_fee || 0;
    let newTravelDistance = apt.travel_distance_miles;
    if (addressDidChange && newPostcode) {
      try {
        const travelResp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/travel-fee-check`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ postcode: newPostcode }),
          }
        );
        if (travelResp.ok) {
          const travelData = await travelResp.json();
          newTravelFee = travelData.travel_fee || 0;
          newTravelDistance = travelData.distance_miles || null;
        }
      } catch (_) {}
    }

    const totalPrice = newPrice != null ? Number(newPrice) + newTravelFee : null;
    const baseDuration = apt.services?.duration_minutes || 60;
    const [startH, startM] = (apt.appointment_time || "00:00").split(":").map(Number);
    const endMinutes = startH * 60 + startM + baseDuration;
    const endTimeStr = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    const addressNote = addressDidChange
      ? `\n[Address updated by patient: ${newAddress}, ${newPostcode}]`
      : "";

    await supabaseAdmin
      .from("appointments")
      .update({
        group_id: null,
        price: totalPrice,
        address: newAddress,
        postcode: newPostcode,
        latitude: newLat,
        longitude: newLng,
        travel_fee: newTravelFee,
        travel_distance_miles: newTravelDistance,
        admin_notes: (apt.admin_notes || "") + `\n[Converted to individual booking after group change. Price: £${totalPrice != null ? totalPrice.toFixed(2) : "N/A"}. Duration: ${baseDuration} mins (${timeStr} – ${endTimeStr}).]${addressNote}`,
      })
      .eq("id", apt.id);

    // Update patient record address too
    if (addressDidChange && newAddress) {
      await supabaseAdmin
        .from("patients")
        .update({ address: newAddress })
        .eq("client_email", apt.client_email.toLowerCase());
    }

    await supabaseAdmin.from("patient_activity_log").insert({
      client_email: apt.client_email.toLowerCase(),
      event_type: "group_converted",
      message: `${apt.client_name} chose to keep appointment after group member cancelled. Converted to individual booking at £${totalPrice != null ? totalPrice.toFixed(2) : "N/A"}. Duration: ${baseDuration} mins (${timeStr} – ${endTimeStr}).${addressDidChange ? ` Address updated to: ${newAddress}, ${newPostcode}` : ""}`,
      created_by: "patient",
    });

    // Confirmation email
    const priceDisplay = totalPrice != null ? `£${totalPrice.toFixed(2)}` : "";
    const oldPrice = apt.price != null ? `£${Number(apt.price).toFixed(2)}` : "";
    const priceChanged = oldPrice && priceDisplay && oldPrice !== priceDisplay;

    const consentRow = consentFormUrl ? `
      <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;vertical-align:top;">📝</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Consent Form</td><td style="padding:8px 0;text-align:right;border-top:1px solid #e7e5e4;"><a href="${consentFormUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">Complete Form →</a></td></tr>` : "";

    const addressRow = newAddress ? `
      <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;vertical-align:top;">📍</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Address</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${newAddress}${newPostcode ? `<br/>${newPostcode}` : ""}</td></tr>` : "";

    const travelRow = newTravelFee > 0 ? `
      <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;vertical-align:top;">🚗</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Travel Fee</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">£${newTravelFee.toFixed(2)}${newTravelDistance ? ` (${newTravelDistance} mi)` : ""}</td></tr>` : "";

    const confirmHtml = `
      <div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;padding:0;">
        <div style="background-color:#292524;padding:20px 24px;text-align:center;">
          <h1 style="color:#FAFAF9;font-size:18px;letter-spacing:2px;margin:0;text-transform:uppercase;">ShawScope</h1>
        </div>
        <div style="padding:32px 24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background-color:#f0fdf4;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;text-align:center;">✅</div>
            <h2 style="color:#292524;margin:12px 0 4px;font-size:22px;">Booking Confirmed</h2>
            <p style="color:#78716c;margin:0;font-size:14px;">Great news, ${apt.client_name}! Your appointment is confirmed as an individual booking.</p>
          </div>

          <div style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:20px;margin-bottom:20px;">
            <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">
              <tr><td style="padding:8px 0;color:#78716c;width:36px;vertical-align:top;">👤</td><td style="padding:8px 0;color:#78716c;">Name</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;">${apt.client_name}</td></tr>
              <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;vertical-align:top;">📋</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Service</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${serviceName}</td></tr>
              <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;vertical-align:top;">📅</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Date</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${dateFormatted}</td></tr>
              <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;vertical-align:top;">🕐</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Time</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${timeStr} – ${endTimeStr} (${baseDuration} mins)</td></tr>
              ${addressRow}
              ${priceDisplay ? `<tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;vertical-align:top;">💰</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Price</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${priceDisplay}</td></tr>` : ""}
              ${travelRow}
              ${consentRow}
            </table>
          </div>

          ${priceChanged ? `
          <div style="background-color:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:12px;color:#92400e;font-weight:600;">💰 Price Adjustment</p>
            <p style="margin:0;font-size:13px;color:#78716c;">Your booking has been updated to an individual appointment. The price has changed from <span style="text-decoration:line-through;">${oldPrice}</span> to <strong style="color:#292524;">${priceDisplay}</strong> (group discount no longer applies).</p>
          </div>` : ""}

          ${addressDidChange ? `
          <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:12px;color:#1e40af;font-weight:600;">📍 Address Updated</p>
            <p style="margin:0;font-size:13px;color:#3b82f6;">Your visit address has been updated to: <strong>${newAddress}${newPostcode ? `, ${newPostcode}` : ""}</strong></p>
          </div>` : ""}

          <div style="background-color:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
            <p style="margin:0;font-size:13px;color:#166534;">🎉 We look forward to seeing you! If you have any questions, please don't hesitate to get in touch.</p>
          </div>

          <div style="text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid #e7e5e4;">
            <a href="${cancelUrl}" style="display:inline-block;padding:12px 28px;background-color:#dc2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">Cancel This Appointment</a>
            <p style="color:#a8a29e;font-size:11px;margin:10px 0 0;">Please give at least 24 hours notice</p>
          </div>

          <div style="border-top:1px solid #e7e5e4;margin-top:24px;padding-top:20px;text-align:center;">
            <p style="color:#a8a29e;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#292524;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/>
            <a href="mailto:matt@shawscope.co.uk" style="color:#2563eb;text-decoration:none;">matt@shawscope.co.uk</a> · <a href="tel:01305340194" style="color:#2563eb;text-decoration:none;">01305 340 194</a></p>
          </div>
        </div>
        <div style="background-color:#292524;padding:16px 24px;text-align:center;">
          <p style="color:#a8a29e;font-size:11px;margin:0;">ShawScope · Dorchester, Dorset</p>
          <p style="color:#a8a29e;font-size:10px;margin:4px 0 0;line-height:1.4;">⚠️ No Reply — This is an automated system message. Replies are not monitored.<br/>Contact us: <a href="tel:01305340194" style="color:#a8a29e;">01305 340 194</a> · <a href="mailto:matt@shawscope.co.uk" style="color:#a8a29e;">matt@shawscope.co.uk</a></p>
        </div>
      </div>`;

    // Admin email — include address change info
    const adminAddressSection = addressDidChange
      ? `<div style="background-color:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-size:12px;color:#92400e;font-weight:600;">📍 Address Changed</p>
          <p style="margin:0;font-size:13px;color:#78716c;"><strong>Previous:</strong> ${apt.address || "Not set"}${apt.postcode ? `, ${apt.postcode}` : ""}</p>
          <p style="margin:0;font-size:13px;color:#78716c;"><strong>New:</strong> ${newAddress}${newPostcode ? `, ${newPostcode}` : ""}</p>
          ${newTravelFee !== (apt.travel_fee || 0) ? `<p style="margin:4px 0 0;font-size:13px;color:#78716c;"><strong>Travel fee:</strong> £${(apt.travel_fee || 0).toFixed(2)} → £${newTravelFee.toFixed(2)}</p>` : ""}
        </div>`
      : "";

    const adminMapLink = newLat && newLng
      ? `<a href="https://maps.google.com/?q=${newLat},${newLng}" style="color:#2563eb;text-decoration:none;font-size:12px;">📍 View on Google Maps</a>`
      : newAddress
        ? `<a href="https://maps.google.com/?q=${encodeURIComponent(newAddress + " " + (newPostcode || ""))}" style="color:#2563eb;text-decoration:none;font-size:12px;">📍 View on Google Maps</a>`
        : "";

    await Promise.all([
      sendEmail(apt.client_email, `✅ Booking Confirmed (Updated) — ShawScope`, confirmHtml, apt.client_name),
      sendEmail(ADMIN_EMAIL, `✅ ${apt.client_name} kept their ${serviceName}${addressDidChange ? " (address changed)" : ""} — individual booking`,
        `<div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;">
          <div style="background-color:#292524;padding:20px 24px;text-align:center;"><h1 style="color:#FAFAF9;font-size:18px;letter-spacing:2px;margin:0;text-transform:uppercase;">ShawScope — Admin</h1></div>
          <div style="padding:32px 24px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="display:inline-block;background-color:#f0fdf4;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;">✅</div>
              <h2 style="color:#292524;margin:12px 0 4px;">Group Member Kept Appointment</h2>
              <p style="color:#78716c;font-size:14px;"><strong>${apt.client_name}</strong> chose to keep their ${serviceName} on ${dateFormatted} at ${timeStr}.</p>
              <p style="color:#78716c;font-size:13px;">Converted to individual booking at <strong>${priceDisplay || "original price"}</strong>. Duration: ${baseDuration} mins (${timeStr} – ${endTimeStr}). Group ID removed.</p>
            </div>
            <div style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:20px;margin-bottom:20px;">
              <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">
                <tr><td style="padding:8px 0;color:#78716c;width:36px;">👤</td><td style="padding:8px 0;color:#78716c;">Name</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;">${apt.client_name}</td></tr>
                <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">📋</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Service</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${serviceName}</td></tr>
                <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">📅</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Date</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${dateFormatted}</td></tr>
                <tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">🕐</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Time</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${timeStr} – ${endTimeStr} (${baseDuration} mins)</td></tr>
                ${newAddress ? `<tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">📍</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Address</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${newAddress}<br/>${newPostcode || ""}</td></tr>` : ""}
                ${priceDisplay ? `<tr><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">💰</td><td style="padding:8px 0;color:#78716c;border-top:1px solid #e7e5e4;">Price</td><td style="padding:8px 0;color:#292524;font-weight:600;text-align:right;border-top:1px solid #e7e5e4;">${priceDisplay}</td></tr>` : ""}
              </table>
              ${adminMapLink ? `<div style="text-align:center;margin-top:12px;">${adminMapLink}</div>` : ""}
            </div>
            ${adminAddressSection}
          </div>
          <div style="background-color:#292524;padding:16px 24px;text-align:center;"><p style="color:#a8a29e;font-size:11px;margin:0;">ShawScope · Admin</p></div>
        </div>`, "Admin"),
    ]);

    return new Response(JSON.stringify({ success: true, action: "kept", newPrice: totalPrice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
