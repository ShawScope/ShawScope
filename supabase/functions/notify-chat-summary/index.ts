import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, reason } = await req.json().catch(() => ({}));
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row } = await supabase
      .from("chat_logs")
      .select("session_id, messages, patient_email, patient_phone, escalated, matt_notified_at, created_at")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ skipped: "no_row" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.matt_notified_at) {
      return new Response(JSON.stringify({ skipped: "already_notified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const msgs = (row.messages as Array<{ role: string; content: string }>) || [];
    const userMsgs = msgs.filter(m => m.role === "user");
    if (userMsgs.length === 0) {
      return new Response(JSON.stringify({ skipped: "no_user_messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Skip if already escalated (escalation email already sent)
    if (row.escalated) {
      await supabase.from("chat_logs").update({ matt_notified_at: new Date().toISOString() }).eq("session_id", sessionId);
      return new Response(JSON.stringify({ skipped: "escalated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const esc = (s: string) => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const transcriptHtml = msgs.map(m => {
      const who = m.role === "user" ? "Visitor" : "Matt AI";
      const bg = m.role === "user" ? "#eff6ff" : "#fafaf9";
      const border = m.role === "user" ? "#bfdbfe" : "#e7e5e4";
      return `<div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:10px 12px;margin-bottom:8px;">
        <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${who}</div>
        <div style="font-size:14px;color:#292524;white-space:pre-wrap;line-height:1.5;">${esc(m.content || "")}</div>
      </div>`;
    }).join("");

    const contactBits: string[] = [];
    if (row.patient_email) contactBits.push(`📧 <a href="mailto:${esc(row.patient_email)}" style="color:#2563eb;">${esc(row.patient_email)}</a>`);
    if (row.patient_phone) contactBits.push(`📱 <a href="tel:${esc(row.patient_phone)}" style="color:#2563eb;">${esc(row.patient_phone)}</a>`);

    const html = `
      <div style="font-family:Georgia,'Times New Roman',serif;max-width:640px;margin:0 auto;">
        <div style="background:#292524;padding:20px 24px;text-align:center;">
          <h1 style="color:#FAFAF9;font-size:18px;letter-spacing:2px;margin:0;text-transform:uppercase;">ShawScope</h1>
        </div>
        <div style="padding:28px 24px;">
          <div style="background:#ecfeff;border:2px solid #06b6d4;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center;">
            <p style="margin:0;font-size:18px;font-weight:bold;color:#0e7490;">💬 Chatbot conversation ended</p>
            <p style="margin:6px 0 0;font-size:13px;color:#0891b2;">${reason === "inactive" ? "No response for 3 minutes." : "Visitor closed the chat or left the page."}</p>
          </div>
          ${contactBits.length ? `<div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:14px 18px;margin-bottom:20px;font-size:14px;">
            <strong style="color:#292524;">Contact provided:</strong> ${contactBits.join(" &nbsp; ")}
          </div>` : ""}
          <p style="margin:0 0 10px;font-weight:700;color:#292524;font-size:14px;">Conversation transcript:</p>
          ${transcriptHtml}
          <p style="color:#a8a29e;font-size:12px;text-align:center;margin-top:24px;">Session: ${esc(sessionId)}</p>
        </div>
      </div>`;

    const emailResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ShawScope Chatbot <notifications@notify.shawscope.co.uk>",
        to: [ADMIN_EMAIL],
        subject: `💬 New chatbot conversation — ${userMsgs.length} question${userMsgs.length === 1 ? "" : "s"}`,
        html,
      }),
    });

    if (!emailResp.ok) {
      const t = await emailResp.text();
      console.error("Resend error:", t);
    }

    await supabase.from("chat_logs").update({ matt_notified_at: new Date().toISOString() }).eq("session_id", sessionId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-chat-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});