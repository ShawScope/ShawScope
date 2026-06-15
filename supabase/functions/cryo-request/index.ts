import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailWrap, emailIconHeading } from "../_shared/email-layout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_NAME_LENGTH = 200;
const MAX_DESC_LENGTH = 1000;

function sanitize(str: string, maxLen: number): string {
  return String(str || "").trim().slice(0, maxLen);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const name = sanitize(body.name, MAX_NAME_LENGTH);
    const email = sanitize(body.email, 320);
    const treatmentDescription = sanitize(body.treatmentDescription || "", 2000);
    const attachments = body.attachments;
    const accessToken: string | null = typeof body.accessToken === "string" ? body.accessToken : null;

    if (!name || !email || !Array.isArray(attachments) || !attachments.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (attachments.length > MAX_ATTACHMENTS) {
      return new Response(JSON.stringify({ error: `Maximum ${MAX_ATTACHMENTS} attachments allowed` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSize = 0;
    for (const att of attachments) {
      if (!att.content || !att.filename || !att.type) {
        return new Response(JSON.stringify({ error: "Each attachment must have content, filename, and type" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!ALLOWED_TYPES.includes(att.type.toLowerCase())) {
        return new Response(JSON.stringify({ error: `File type '${att.type}' not allowed. Accepted: JPEG, PNG, WebP, PDF` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const estimatedSize = Math.ceil((att.content.length * 3) / 4);
      if (estimatedSize > MAX_ATTACHMENT_SIZE) {
        return new Response(JSON.stringify({ error: `File '${sanitize(att.filename, 100)}' exceeds 5MB limit` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      totalSize += estimatedSize;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return new Response(JSON.stringify({ error: "Total attachment size exceeds 15MB limit" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const descriptionsHtml = attachments
      .map((a: { filename: string; description: string; sizeMm?: { width: string; length: string; height: string } }, i: number) => {
        const sizeStr = a.sizeMm && (a.sizeMm.width || a.sizeMm.length || a.sizeMm.height)
          ? `<br><em style="color:#6B7280;">Size: ${a.sizeMm.width || '?'}mm × ${a.sizeMm.length || '?'}mm × ${a.sizeMm.height || '?'}mm (W×L×H)</em>`
          : "";
        return `<tr>
          <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#0E1420;font-size:13px;">${i + 1}. ${sanitize(a.filename, 200)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#4B5563;font-size:13px;">${sanitize(a.description, MAX_DESC_LENGTH) || "No description provided"}${sizeStr}</td>
        </tr>`;
      })
      .join("");

    const content = `
      ${emailIconHeading("❄️", "New Cryotherapy Assessment Request", `From ${name} (${email})`)}
      ${treatmentDescription ? `
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:12px;color:#92400E;font-weight:600;">📝 Treatment Description</p>
        <p style="margin:0;font-size:13px;color:#4B5563;white-space:pre-wrap;">${treatmentDescription}</p>
      </div>` : ""}
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        <div style="background-color:#0E1420;padding:10px 14px;">
          <p style="margin:0;color:#E8ECF1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">📸 Photos & Descriptions</p>
        </div>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          <tr style="background:#F3F4F6;"><th style="padding:8px 14px;text-align:left;font-size:12px;color:#6B7280;">Photo</th><th style="padding:8px 14px;text-align:left;font-size:12px;color:#6B7280;">Description</th></tr>
          ${descriptionsHtml}
        </table>
      </div>
      <p style="margin-top:16px;color:#6B7280;font-size:12px;text-align:center;">Photos are attached to this email.</p>`;

    const html = emailWrap(content, { subtitle: "Cryotherapy Request", noReply: false });

    const resendAttachments = attachments.map((a: { filename: string; content: string; type: string }) => ({
      filename: sanitize(a.filename, 200).replace(/[^a-zA-Z0-9._-]/g, "_"),
      content: a.content,
      type: a.type,
    }));

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ShawScope <bookings@shawscope.co.uk>",
        to: ["matt@shawscope.co.uk"],
        reply_to: email,
        subject: `Cryotherapy Assessment Request — ${name}`,
        html,
        attachments: resendAttachments,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: resData }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If this came from a confirmed booking (accessToken supplied), also attach the photos
    // to the patient's record so they appear in the patient file from the admin dashboard.
    if (accessToken) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && serviceKey) {
          const admin = createClient(supabaseUrl, serviceKey);
          const { data: apt } = await admin
            .from("appointments")
            .select("id, client_email")
            .eq("access_token", accessToken)
            .maybeSingle();
          if (apt?.id && apt.client_email) {
            const patientEmail = String(apt.client_email).toLowerCase();
            for (const att of attachments) {
              try {
                const ext = (att.type?.split("/")?.[1] || "jpg").replace(/[^a-z0-9]/gi, "");
                const safeName = sanitize(att.filename, 100).replace(/[^a-zA-Z0-9._-]/g, "_") || `lesion.${ext}`;
                const path = `patients/${patientEmail}/cryo/${Date.now()}_${safeName}`;
                const bin = Uint8Array.from(atob(att.content), c => c.charCodeAt(0));
                const { error: upErr } = await admin.storage.from("shawscope").upload(path, bin, {
                  contentType: att.type || "image/jpeg",
                  upsert: false,
                });
                if (upErr) { console.error("Storage upload failed:", upErr); continue; }
                await admin.from("patient_files").insert({
                  client_email: patientEmail,
                  appointment_id: apt.id,
                  file_name: safeName,
                  file_path: path,
                  file_type: att.type || "image/jpeg",
                  file_size: bin.length,
                  description: sanitize(att.description || "", 200) || "Cryotherapy lesion photo",
                });
              } catch (e) {
                console.error("Failed to attach photo to patient record:", e);
              }
            }
          }
        }
      } catch (e) {
        console.error("Patient record attach error:", e);
      }
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
