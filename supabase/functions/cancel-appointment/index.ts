import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailWrap, emailIconHeading, emailDetailTable, emailInfoBox, emailButton, emailSectionHeader } from "../_shared/email-layout.ts";
import { sendSms } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";
const ADMIN_PHONE = "+447444653593";

async function sendAdminSms(message: string) {
  try {
    await sendSms(ADMIN_PHONE, message + "\n\n(No-Reply)");
  } catch (e) { console.error("Admin SMS error:", e); }
}

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
    const { token, reason } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (apt.status === "cancelled") {
      return new Response(JSON.stringify({ error: "This appointment has already been cancelled" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (apt.status === "completed") {
      return new Response(JSON.stringify({ error: "This appointment has already been completed and cannot be cancelled" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cancelReason = reason?.trim() || "No reason provided";
    const serviceName = apt.services?.name || "appointment";
    const dateFormatted = formatDateDMY(apt.appointment_date);
    const timeStr = apt.appointment_time?.slice(0, 5);
    const siteUrl = Deno.env.get("SITE_URL") || "https://shawscope.co.uk";

    // Cancel the appointment
    const { error: updateErr } = await supabaseAdmin
      .from("appointments")
      .update({
        status: "cancelled",
        admin_notes: (apt.admin_notes || "") + `\n[Patient cancelled: ${cancelReason}]`,
      })
      .eq("id", apt.id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to cancel appointment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel scheduled communications
    await supabaseAdmin
      .from("scheduled_communications")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("appointment_id", apt.id)
      .eq("status", "pending");

    // Log activity
    await supabaseAdmin.from("patient_activity_log").insert({
      client_email: apt.client_email.toLowerCase(),
      event_type: "cancelled",
      message: `Patient cancelled ${serviceName} on ${dateFormatted} at ${timeStr}. Reason: ${cancelReason}`,
      created_by: "patient",
    });

    // Find remaining group members
    let groupMembers: any[] = [];
    if (apt.group_id) {
      const { data: others } = await supabaseAdmin
        .from("appointments")
        .select("*, services(name, price, duration_minutes)")
        .eq("group_id", apt.group_id)
        .neq("id", apt.id)
        .not("status", "in", '("cancelled","rejected")');
      groupMembers = others || [];

      const remainingCount = groupMembers.length;
      if (remainingCount > 0) {
        const svcName = (groupMembers[0]?.services?.name || "").toLowerCase();
        const basePrice = groupMembers[0]?.services?.price ? Number(groupMembers[0].services.price) : null;
        const isEarwax = svcName.includes("earwax") || svcName.includes("ear wax");
        let newGroupTotalPrice: number | null = null;
        if (basePrice != null) {
          if (isEarwax) {
            if (remainingCount === 1) newGroupTotalPrice = basePrice;
            else if (remainingCount === 2) newGroupTotalPrice = 100;
          } else {
            newGroupTotalPrice = basePrice;
          }
        }
        const baseDuration = groupMembers[0]?.services?.duration_minutes || 60;
        for (const member of groupMembers) {
          const memberTravelFee = member.travel_fee || 0;
          const memberPrice = newGroupTotalPrice != null ? newGroupTotalPrice + memberTravelFee : null;
          const oldPrice = member.price;
          if (remainingCount === 1) {
            await supabaseAdmin
              .from("appointments")
              .update({
                price: memberPrice,
                admin_notes: (member.admin_notes || "") +
                  `\n[Auto-updated: Group reduced to 1 person. Price recalculated to £${memberPrice != null ? memberPrice.toFixed(2) : "N/A"} (was £${oldPrice != null ? Number(oldPrice).toFixed(2) : "null"}). Duration: ${baseDuration} mins.]`,
              })
              .eq("id", member.id);
          }
        }
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      const sendEmail = async (to: string, subject: string, html: string, recipientName: string, appointmentId: string) => {
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
            body_preview: `Cancellation: ${cancelReason.slice(0, 100)}`,
            body_html: html,
            trigger_type: "patient_cancellation",
            appointment_id: appointmentId,
            status: res.ok ? "sent" : "failed",
          });
        } catch (_) {}
      };

      // === PATIENT CANCEL EMAIL ===
      const groupNotice = groupMembers.length > 0
        ? emailInfoBox("👥", "Group Booking Notice",
            `We will contact the other ${groupMembers.length} member${groupMembers.length > 1 ? "s" : ""} in your group to ask whether they'd like to keep their appointment or cancel.`,
            { bgColor: "#EFF6FF", borderColor: "#BFDBFE", textColor: "#3B82F6", labelColor: "#1E40AF" })
        : "";

      const patientContent = `
        ${emailIconHeading("❌", "Appointment Cancelled", `Your appointment has been successfully cancelled, ${apt.client_name}.`)}
        ${emailDetailTable([
          { icon: "👤", label: "Name", value: apt.client_name },
          { icon: "📋", label: "Service", value: serviceName },
          { icon: "📅", label: "Date", value: dateFormatted },
          { icon: "🕐", label: "Time", value: timeStr },
        ])}
        ${emailInfoBox("📝", "Reason", cancelReason, { bgColor: "#FEF2F2", borderColor: "#FECACA", textColor: "#78716C", labelColor: "#DC2626" })}
        ${groupNotice}
        <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#4B5563;">🔄 Would you like to rebook?</p>
          <a href="${siteUrl}/book" style="display:inline-block;padding:12px 28px;background-color:#D4912A;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:13px;">Book a New Appointment →</a>
        </div>`;

      const patientCancelHtml = emailWrap(patientContent);

      // === GROUP MEMBER EMAILS ===
      const memberEmails: Promise<void>[] = [];
      for (const member of groupMembers) {
        const keepUrl = `${siteUrl}/group-cancel-response/${member.access_token}?action=keep`;
        const cancelMemberUrl = `${siteUrl}/group-cancel-response/${member.access_token}?action=cancel`;
        const fullPrice = member.services?.price != null ? `£${Number(member.services.price).toFixed(2)}` : "";
        const currentPrice = member.price != null ? `£${Number(member.price).toFixed(2)}` : "";
        const baseDuration = member.services?.duration_minutes || 60;
        const [startH, startM] = (member.appointment_time || "00:00").split(":").map(Number);
        const endMinutes = startH * 60 + startM + baseDuration;
        const endTimeStr = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
        const memberTimeStr = member.appointment_time?.slice(0, 5);

        const priceChangeNote = fullPrice && currentPrice && fullPrice !== currentPrice
          ? emailInfoBox("💰", "Price Update",
              `If you choose to keep your appointment, it will be converted to an individual booking at the standard price of <strong style="color:#0E1420;">${fullPrice}</strong> (previously ${currentPrice} with group discount).`,
              { bgColor: "#FEFCE8", borderColor: "#FDE68A", textColor: "#78716C", labelColor: "#92400E" })
          : fullPrice
            ? emailInfoBox("💰", "Price Confirmation",
                `If you choose to keep your appointment, the price will be <strong style="color:#0E1420;">${fullPrice}</strong> as an individual booking.`,
                { bgColor: "#FEFCE8", borderColor: "#FDE68A", textColor: "#78716C", labelColor: "#92400E" })
            : "";

        const detailRows = [
          { icon: "👤", label: "Your Name", value: member.client_name },
          { icon: "📋", label: "Service", value: serviceName },
          { icon: "📅", label: "Date", value: dateFormatted },
          { icon: "🕐", label: "Time", value: `${memberTimeStr} – ${endTimeStr} (${baseDuration} mins)` },
        ];
        if (fullPrice) detailRows.push({ icon: "💰", label: "Individual Price", value: fullPrice });
        if (member.address) detailRows.push({ icon: "📍", label: "Address", value: `${member.address}${member.postcode ? `<br/>${member.postcode}` : ""}` });

        const memberContent = `
          ${emailIconHeading("⚠️", "A Change to Your Group Booking", `${member.client_name}, someone in your group has cancelled.`)}
          ${emailInfoBox("ℹ️", "What happened", `<strong>${apt.client_name}</strong> has cancelled their appointment from your group booking.`, { bgColor: "#EFF6FF", borderColor: "#BFDBFE", textColor: "#3B82F6", labelColor: "#1E40AF" })}
          ${emailDetailTable(detailRows)}
          ${priceChangeNote}
          <div style="text-align:center;margin:24px 0;">
            <p style="margin:0 0 16px;font-size:15px;color:#0E1420;font-weight:600;">Would you like to keep your appointment?</p>
            <a href="${keepUrl}" style="display:inline-block;background-color:#22c55e;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;margin-right:8px;">✓ Yes, Keep My Appointment</a>
            <a href="${cancelMemberUrl}" style="display:inline-block;background-color:#ef4444;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;">✗ Cancel My Appointment</a>
          </div>`;

        const memberHtml = emailWrap(memberContent);

        memberEmails.push(
          sendEmail(member.client_email, `⚠️ A change to your group booking — ShawScope`, memberHtml, member.client_name, member.id)
        );

        await supabaseAdmin.from("patient_activity_log").insert({
          client_email: member.client_email.toLowerCase(),
          event_type: "group_member_cancelled",
          message: `${apt.client_name} cancelled from group booking. ${member.client_name} asked to keep or cancel.`,
          created_by: "system",
        });
      }

      // === ADMIN EMAIL ===
      const totalInGroup = 1 + groupMembers.length;
      const membersList = groupMembers.length > 0
        ? groupMembers.map(m => `<tr><td style="padding:6px 12px;color:#0E1420;font-size:13px;border-bottom:1px solid #E5E7EB;">${m.client_name}</td><td style="padding:6px 12px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB;">${m.client_email}</td><td style="padding:6px 12px;color:#16a34a;font-size:13px;border-bottom:1px solid #E5E7EB;">Notified — awaiting response</td></tr>`).join("")
        : "";

      const adminContent = `
        ${emailIconHeading("🚨", "Patient Cancellation", `<strong>${apt.client_name}</strong> has cancelled their appointment.`)}
        ${groupMembers.length > 0 ? `
        <div style="background-color:#EFF6FF;border:2px solid #BFDBFE;border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:14px;color:#1E40AF;font-weight:bold;">👥 Group Booking (was ${totalInGroup} people)</p>
          <p style="margin:0 0 12px;font-size:13px;color:#3B82F6;">The remaining ${groupMembers.length} member${groupMembers.length > 1 ? "s have" : " has"} been emailed and asked whether they'd like to keep or cancel their appointment.</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;">
            <tr style="background:#F0F9FF;"><th style="padding:6px 12px;text-align:left;color:#6B7280;font-size:11px;text-transform:uppercase;">Name</th><th style="padding:6px 12px;text-align:left;color:#6B7280;font-size:11px;text-transform:uppercase;">Email</th><th style="padding:6px 12px;text-align:left;color:#6B7280;font-size:11px;text-transform:uppercase;">Status</th></tr>
            ${membersList}
          </table>
        </div>` : ""}
        ${emailDetailTable([
          { icon: "📋", label: "Service", value: serviceName },
          { icon: "📅", label: "Date", value: dateFormatted },
          { icon: "🕐", label: "Time", value: timeStr },
          { icon: "📍", label: "Address", value: apt.address || "N/A" },
        ])}
        ${emailInfoBox("📝", "Reason for Cancellation", `"${cancelReason}"`, { bgColor: "#FEFCE8", borderColor: "#FDE68A", textColor: "#78716C", labelColor: "#92400E" })}
        <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#4B5563;">📧 <a href="mailto:${apt.client_email}" style="color:#D4912A;text-decoration:none;">${apt.client_email}</a>${apt.client_phone ? ` · 📱 ${apt.client_phone}` : ""}</p>
        </div>`;

      const adminHtml = emailWrap(adminContent, { subtitle: "Admin Notification", noReply: false });

      const emailPromises = [
        sendEmail(apt.client_email, `Appointment Cancelled — ShawScope`, patientCancelHtml, apt.client_name, apt.id),
        sendEmail(ADMIN_EMAIL, `❌ ${apt.client_name} cancelled their ${serviceName} — ${dateFormatted}${groupMembers.length > 0 ? ` (group of ${totalInGroup})` : ""}`, adminHtml, "Admin", apt.id),
        ...memberEmails,
      ];

      await Promise.all(emailPromises);

      const groupTag = groupMembers.length > 0 ? ` (group of ${totalInGroup})` : "";
      await sendAdminSms(`❌ Cancellation: ${apt.client_name}${groupTag} — ${serviceName} on ${dateFormatted} at ${timeStr}. Reason: ${cancelReason}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
