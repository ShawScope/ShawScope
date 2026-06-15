import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";

function formatDateDMY(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, action, reason } = await req.json();

    if (!token || !action) {
      return new Response(JSON.stringify({ error: "Token and action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up appointment by access_token
    const { data: apt, error: aptErr } = await supabaseAdmin
      .from("appointments")
      .select("*, services(name)")
      .eq("access_token", token)
      .single();

    if (aptErr || !apt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const serviceName = apt.services?.name || "appointment";

    if (action === "accept") {
      // Patient accepts the alternative — reschedule and confirm
      if (!apt.alternative_date || !apt.alternative_time) {
        return new Response(JSON.stringify({ error: "No alternative was offered" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateErr } = await supabaseAdmin
        .from("appointments")
        .update({
          appointment_date: apt.alternative_date,
          appointment_time: apt.alternative_time,
          status: "confirmed",
          admin_notes: (apt.admin_notes || "") + "\n[Patient accepted alternative offer]",
        })
        .eq("id", apt.id)
        .in("status", ["rejected", "rejected_awaiting"]);

      if (updateErr) {
        return new Response(JSON.stringify({ error: "Failed to update appointment" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log activity
      await supabaseAdmin.from("patient_activity_log").insert({
        client_email: apt.client_email.toLowerCase(),
        event_type: "booking",
        message: `Patient accepted alternative: ${serviceName} on ${formatDateDMY(apt.alternative_date)} at ${apt.alternative_time.slice(0, 5)}`,
        created_by: "patient",
      });

      // Notify admin
      if (resendApiKey) {
        const altDate = formatDateDMY(apt.alternative_date);
        const altTime = apt.alternative_time.slice(0, 5);
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ShawScope <bookings@shawscope.co.uk>",
            to: [ADMIN_EMAIL],
            subject: `✅ ${apt.client_name} accepted the alternative — ${altDate} at ${altTime}`,
            html: `<p>Great news! <strong>${apt.client_name}</strong> has accepted the alternative appointment:</p>
              <ul>
                <li><strong>Service:</strong> ${serviceName}</li>
                <li><strong>New Date:</strong> ${altDate}</li>
                <li><strong>New Time:</strong> ${altTime}</li>
              </ul>
              <p>The appointment has been automatically confirmed.</p>`,
          }),
        });

        // Log communication
        await supabaseAdmin.from("communications_log").insert({
          channel: "email",
          recipient_name: "Admin",
          recipient_email: ADMIN_EMAIL,
          subject: `${apt.client_name} accepted the alternative`,
          body_preview: `Patient accepted alternative: ${altDate} at ${altTime}`,
          trigger_type: "rejection_response",
          appointment_id: apt.id,
          status: "sent",
        });
      }

      return new Response(JSON.stringify({ success: true, action: "accepted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "reject") {
      // Patient rejects the alternative
      const rejectReason = reason?.trim() || "No reason provided";

      // Keep status as rejected_awaiting so admin can offer another alternative
      await supabaseAdmin
        .from("appointments")
        .update({
          admin_notes: (apt.admin_notes || "") + `\n[Patient declined alternative: ${rejectReason}]`,
        })
        .eq("id", apt.id);

      // Log activity
      await supabaseAdmin.from("patient_activity_log").insert({
        client_email: apt.client_email.toLowerCase(),
        event_type: "cancelled",
        message: `Patient declined alternative offer. Reason: ${rejectReason}`,
        created_by: "patient",
      });

      // Notify admin via email
      if (resendApiKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ShawScope <bookings@shawscope.co.uk>",
            to: [ADMIN_EMAIL],
            subject: `❌ ${apt.client_name} declined the alternative appointment`,
            html: `<p><strong>${apt.client_name}</strong> has declined the alternative you offered.</p>
              <ul>
                <li><strong>Service:</strong> ${serviceName}</li>
                <li><strong>Original Date:</strong> ${formatDateDMY(apt.appointment_date)} at ${apt.appointment_time.slice(0, 5)}</li>
                <li><strong>Alternative Offered:</strong> ${apt.alternative_date ? formatDateDMY(apt.alternative_date) : "N/A"} at ${apt.alternative_time ? apt.alternative_time.slice(0, 5) : "N/A"}</li>
              </ul>
              <p><strong>Patient's reason:</strong></p>
              <blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin: 12px 0; color: #555;">${rejectReason}</blockquote>
              <p>You may want to reach out to the patient directly at <a href="mailto:${apt.client_email}">${apt.client_email}</a>${apt.client_phone ? ` or ${apt.client_phone}` : ""}.</p>`,
          }),
        });

        // Log communication
        await supabaseAdmin.from("communications_log").insert({
          channel: "email",
          recipient_name: "Admin",
          recipient_email: ADMIN_EMAIL,
          subject: `${apt.client_name} declined the alternative`,
          body_preview: `Reason: ${rejectReason}`,
          trigger_type: "rejection_response",
          appointment_id: apt.id,
          status: "sent",
        });
      }

      return new Response(JSON.stringify({ success: true, action: "rejected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use 'accept' or 'reject'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
