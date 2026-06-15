import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { poll_id, answers, comment, respondent_name, respondent_email } = body || {};
    if (!poll_id) {
      return new Response(JSON.stringify({ error: "poll_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load poll for question labels and notify_email
    const { data: poll } = await supabaseAdmin
      .from("marketing_polls")
      .select("id, title, question, questions, notify_email, options")
      .eq("id", poll_id)
      .maybeSingle();

    if (!poll) {
      return new Response(JSON.stringify({ error: "Poll not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipient = (poll as any).notify_email || "matt@shawscope.co.uk";
    const pollTitle = (poll as any).title || (poll as any).question || "Marketing poll";

    // Aggregate counts so far for this poll (across all responses)
    const { data: allResponses } = await supabaseAdmin
      .from("marketing_poll_responses")
      .select("answers, selected_option")
      .eq("poll_id", poll_id);

    const totalResponses = allResponses?.length || 0;

    // Build answer rows
    const questions: any[] = Array.isArray((poll as any).questions) ? (poll as any).questions : [];
    let answersHtml = "";

    if (questions.length > 0 && answers && typeof answers === "object") {
      // Multi-question
      for (const q of questions) {
        const a = (answers as any)[q.id];
        let displayValue: string;
        if (Array.isArray(a)) displayValue = a.length ? a.map(escapeHtml).join(", ") : "<em style='color:#999'>(no selection)</em>";
        else if (a == null || a === "") displayValue = "<em style='color:#999'>(no answer)</em>";
        else displayValue = escapeHtml(String(a));

        // Per-question rolling tally
        let tally = "";
        if (q.type === "radio" || q.type === "checkbox") {
          const counts: Record<string, number> = {};
          for (const r of (allResponses || [])) {
            const ra = (r as any).answers?.[q.id];
            if (Array.isArray(ra)) ra.forEach((v: string) => { counts[v] = (counts[v] || 0) + 1; });
            else if (ra) counts[String(ra)] = (counts[String(ra)] || 0) + 1;
          }
          const opts: string[] = Array.isArray(q.options) ? q.options : [];
          tally = `<div style="margin-top:8px;font-size:12px;color:#6B7280;">` +
            opts.map(o => `${escapeHtml(o)}: <strong>${counts[o] || 0}</strong>`).join(" · ") +
            `</div>`;
        }

        answersHtml += `
          <div style="padding:12px 14px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:10px;background:#FAFAF9;">
            <div style="font-size:13px;color:#0E1420;font-weight:600;margin-bottom:4px;">${escapeHtml(q.label || q.id)}</div>
            <div style="font-size:14px;color:#292524;">${displayValue}</div>
            ${tally}
          </div>
        `;
      }
    } else {
      // Legacy single-question
      const sel = (answers as any)?.single || body?.selected_option || "";
      answersHtml = `
        <div style="padding:12px 14px;border:1px solid #E5E7EB;border-radius:8px;background:#FAFAF9;">
          <div style="font-size:14px;color:#292524;">${escapeHtml(String(sel))}</div>
        </div>`;
    }

    const respondentBlock = `
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
        <tr><td style="padding:6px 0;color:#6B7280;width:120px;">Respondent</td><td style="padding:6px 0;color:#0E1420;">${escapeHtml(respondent_name || "(not provided)")}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Email</td><td style="padding:6px 0;color:#0E1420;">${escapeHtml(respondent_email || "(not provided)")}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Total responses so far</td><td style="padding:6px 0;color:#0E1420;"><strong>${totalResponses}</strong></td></tr>
      </table>`;

    const commentBlock = comment && String(comment).trim()
      ? `<div style="margin-top:12px;padding:12px 14px;border-left:3px solid #D4912A;background:#FFFBEB;font-size:13px;color:#78350F;"><strong>Comment:</strong> ${escapeHtml(String(comment))}</div>`
      : "";

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F5F4;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
        <div style="background:#0E1420;padding:24px;text-align:center;">
          <div style="font-size:22px;letter-spacing:4px;color:#fff;font-weight:300;"><span>SHAW</span><span style="color:#D4912A;">SCOPE</span></div>
          <div style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin-top:6px;">New Poll Response</div>
        </div>
        <div style="padding:24px;">
          <h2 style="margin:0 0 4px;font-size:18px;color:#0E1420;">${escapeHtml(pollTitle)}</h2>
          <p style="margin:0 0 12px;font-size:13px;color:#6B7280;">A new response has just been submitted.</p>
          ${respondentBlock}
          <h3 style="font-size:14px;color:#0E1420;margin:18px 0 10px;">Their answers</h3>
          ${answersHtml}
          ${commentBlock}
          <p style="margin-top:24px;font-size:12px;color:#9CA3AF;text-align:center;">View all results in the Marketing tab → Polls.</p>
        </div>
      </div></body></html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ShawScope <bookings@shawscope.co.uk>",
        to: [recipient],
        reply_to: "matt@shawscope.co.uk",
        subject: `New poll response · ${pollTitle} (${totalResponses} total)`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error", data);
      return new Response(JSON.stringify({ error: data?.message || "send failed", data }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-poll-response error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});