import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailWrap, emailIconHeading, emailInfoBox, emailButton, emailSectionHeader } from "../_shared/email-layout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";

function buildEmail(
  clientName: string,
  heading: string,
  guidanceHtml: string,
  followupUrl: string,
  weekNumber: number
): string {
  const weekLabel = weekNumber === 1 ? "1 Week" : `${weekNumber} Weeks`;
  const content = `
    ${emailIconHeading("❄️", heading, `Hi ${clientName}, we're checking in on your healing progress.`)}
    ${emailInfoBox("📅", "Progress Check", `<strong style="color:#3b82f6;">${weekLabel} Post-Treatment</strong>`, { bgColor: "#EFF6FF", borderColor: "#BFDBFE", textColor: "#3b82f6", labelColor: "#1E40AF" })}
    <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:20px;">
      ${emailSectionHeader("🩹", "What You Might Be Seeing")}
      <div style="padding:16px;color:#4B5563;font-size:14px;line-height:1.7;">
        ${guidanceHtml}
      </div>
    </div>
    ${emailInfoBox("💬", "How are things going?", "We'd love to hear how you're getting on. You can reply to this email, or use the button below to send us an update — including a photo if you'd like.", { bgColor: "#F0FDF4", borderColor: "#86EFAC", textColor: "#6B7280", labelColor: "#166534" })}
    ${emailButton("📸  Send an Update", followupUrl)}
    ${emailInfoBox("⚠️", "Concerned?", "If you have any concerns about your healing, don't hesitate to reply to this email or contact us directly. We're here to help.")}`;

  return emailWrap(content, { subtitle: 'Cryotherapy Follow-Up', noReply: false });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "https://shawscope.co.uk";

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: dbTemplates } = await supabase
      .from("cryo_followup_templates")
      .select("*")
      .eq("is_active", true)
      .order("week_number");

    const weekGuidance: Record<number, { subject: string; heading: string; guidance: string }> = {};
    if (dbTemplates) {
      for (const t of dbTemplates) {
        weekGuidance[t.week_number] = {
          subject: t.subject,
          heading: t.heading,
          guidance: t.guidance_html,
        };
      }
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* no body is fine for cron */ }

    if (body?.testMode) {
      const testEmail = body.testEmail || ADMIN_EMAIL;
      const testWeek = body.weekNumber;
      const weeks = testWeek ? [testWeek] : [1, 2, 3, 4];
      const results: string[] = [];

      for (const w of weeks) {
        const g = weekGuidance[w];
        if (!g) { results.push(`Week ${w}: no template found`); continue; }

        const followupUrl = `${siteUrl}/followup/test-token?week=${w}`;
        const emailHtml = buildEmail("Test Patient", g.heading, g.guidance, followupUrl, w);

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ShawScope Aftercare <bookings@shawscope.co.uk>",
            to: [testEmail],
            reply_to: ADMIN_EMAIL,
            subject: `[TEST] ShawScope — ${g.subject}`,
            html: emailHtml,
          }),
        });

        if (emailRes.ok) {
          results.push(`Week ${w}: sent to ${testEmail}`);
        } else {
          const errText = await emailRes.text();
          results.push(`Week ${w}: FAILED — ${errText}`);
        }
      }

      return new Response(JSON.stringify({ testMode: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find completed cryotherapy appointments that need follow-ups
    const now = new Date();
    const twentyEightDaysAgo = new Date(now);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const { data: appointments, error: aptError } = await supabase
      .from("appointments")
      .select("id, client_name, client_email, appointment_date, access_token, service_id, services!inner(name)")
      .eq("status", "completed")
      .gte("appointment_date", twentyEightDaysAgo.toISOString().split("T")[0])
      .ilike("services.name", "%cryotherapy%");

    if (aptError) {
      console.error("Error fetching appointments:", aptError);
      return new Response(JSON.stringify({ error: aptError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: "No follow-ups due", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;

    for (const apt of appointments) {
      const appointmentDate = new Date(apt.appointment_date);
      const daysSince = Math.floor((now.getTime() - appointmentDate.getTime()) / (1000 * 60 * 60 * 24));

      let weekDue: number | null = null;
      if (daysSince >= 6 && daysSince <= 9) weekDue = 1;
      else if (daysSince >= 13 && daysSince <= 16) weekDue = 2;
      else if (daysSince >= 20 && daysSince <= 23) weekDue = 3;
      else if (daysSince >= 27 && daysSince <= 30) weekDue = 4;

      if (!weekDue) continue;

      const { data: existing } = await supabase
        .from("cryo_followups")
        .select("id")
        .eq("appointment_id", apt.id)
        .eq("week_number", weekDue)
        .maybeSingle();

      if (existing) continue;

      const { data: scheduled } = await supabase
        .from("scheduled_communications")
        .select("id, status")
        .eq("appointment_id", apt.id)
        .eq("trigger_type", "cryo_followup")
        .eq("metadata->>week_number", String(weekDue))
        .maybeSingle();

      if (scheduled?.status === "cancelled") {
        await supabase.from("cryo_followups").insert({
          appointment_id: apt.id,
          week_number: weekDue,
        });
        continue;
      }

      const g = weekGuidance[weekDue];
      if (!g) continue;

      const followupUrl = `${siteUrl}/followup/${apt.access_token}?week=${weekDue}`;
      const emailHtml = buildEmail(apt.client_name, g.heading, g.guidance, followupUrl, weekDue);

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ShawScope Aftercare <bookings@shawscope.co.uk>",
          to: [apt.client_email],
          reply_to: ADMIN_EMAIL,
          subject: `ShawScope — ${g.subject}`,
          html: emailHtml,
        }),
      });

      if (emailRes.ok) {
        await supabase.from("cryo_followups").insert({
          appointment_id: apt.id,
          week_number: weekDue,
        });
        totalSent++;
        console.log(`Sent week ${weekDue} follow-up to ${apt.client_email}`);

        if (scheduled) {
          await supabase.from("scheduled_communications")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", scheduled.id);
        }

        try {
          await supabase.from("communications_log").insert({
            channel: "email",
            recipient_name: apt.client_name,
            recipient_email: apt.client_email,
            subject: `ShawScope — ${g.subject}`,
            body_preview: `Cryo follow-up week ${weekDue}`,
            body_html: emailHtml,
            trigger_type: "cryo_followup",
            appointment_id: apt.id,
            status: "sent",
          });
        } catch (_) {}
      } else {
        const errText = await emailRes.text();
        console.error(`Failed to send to ${apt.client_email}: ${errText}`);
      }
    }

    return new Response(JSON.stringify({ message: "Follow-ups processed", sent: totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
