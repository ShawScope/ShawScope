import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { emailWrap, emailIconHeading, emailInfoBox } from "../_shared/email-layout.ts";

const WIFE_EMAIL = "tessa-ayles-01@hotmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: active, error: aErr } = await admin
      .from("gov_lone_worker_checkins")
      .select("id, emergency_contact")
      .eq("status", "active")
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!active) {
      return new Response(JSON.stringify({ error: "No active check-in" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const nowIso = new Date().toISOString();
    await admin.from("gov_lone_worker_checkins")
      .update({ end_time: nowIso, status: "completed" })
      .eq("id", active.id);

    const { data: settings } = await admin.from("business_settings").select("emergency_contact_name").limit(1).maybeSingle();
    const contactName = settings?.emergency_contact_name ?? "Tessa";

    const subject = "Matt has safely finished his clinic day";
    const textBody = "Matt has safely finished his clinic day.";
    const html = emailWrap(`
      ${emailIconHeading("✅", "Matt is safely finished", "Lone-worker check-in ended")}
      ${emailInfoBox("💚", "All done", "Matt has marked his clinic day as complete. No further action needed.")}
    `, { subtitle: "Lone-worker check-in", noReply: false });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailOk = false;
    let emailError: string | null = null;
    if (resendApiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ShawScope <bookings@shawscope.co.uk>",
            to: [WIFE_EMAIL],
            reply_to: "matt@shawscope.co.uk",
            subject,
            html,
          }),
        });
        emailOk = res.ok;
        if (!res.ok) emailError = (await res.text()).slice(0, 500);
      } catch (err) {
        emailError = err instanceof Error ? err.message : String(err);
      }
    } else {
      emailError = "RESEND_API_KEY not configured";
    }

    await admin.from("communications_log").insert({
      channel: "email",
      recipient_name: contactName,
      recipient_email: WIFE_EMAIL,
      subject,
      body_preview: textBody,
      body_html: html,
      trigger_type: "lone_worker_end_day",
      status: emailOk ? "sent" : "failed",
      error_message: emailError,
    });

    return new Response(JSON.stringify({ ok: true, email_sent: emailOk, email_error: emailError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lone-worker-end-day", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});