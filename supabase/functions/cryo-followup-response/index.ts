import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailWrap, emailIconHeading, emailDetailTable, emailInfoBox } from "../_shared/email-layout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "matt@shawscope.co.uk";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    const { accessToken, weekNumber, message, photoBase64, photoName, photos } = await req.json();

    if (!accessToken || !weekNumber) {
      return new Response(JSON.stringify({ error: "Missing accessToken or weekNumber" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get appointment
    const { data: apt } = await supabase
      .from("appointments")
      .select("id, client_name, client_email")
      .eq("access_token", accessToken)
      .maybeSingle();

    if (!apt) {
      return new Response(JSON.stringify({ error: "Invalid access token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build list of all photos (support both single and multiple)
    const allPhotos: { base64: string; name: string }[] = [];
    if (photos && Array.isArray(photos)) {
      for (const p of photos) {
        allPhotos.push({ base64: p.base64, name: p.name });
      }
    } else if (photoBase64 && photoName) {
      allPhotos.push({ base64: photoBase64, name: photoName });
    }

    // Upload all photos to storage
    const uploadedPaths: string[] = [];
    for (let i = 0; i < allPhotos.length; i++) {
      const photo = allPhotos[i];
      const base64Data = photo.base64.split(",").pop() || photo.base64;
      const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const ext = photo.name.split(".").pop() || "jpg";
      const storagePath = `followups/${apt.id}/week${weekNumber}_${Date.now()}_${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("shawscope")
        .upload(storagePath, bytes, { contentType: `image/${ext}`, upsert: true });

      if (!uploadError) {
        uploadedPaths.push(storagePath);
      } else {
        console.error("Upload error:", uploadError);
      }
    }

    const firstPhotoPath = uploadedPaths.length > 0 ? uploadedPaths[0] : null;

    // Upsert the follow-up record
    const { data: existingFollowup } = await supabase
      .from("cryo_followups")
      .select("id")
      .eq("appointment_id", apt.id)
      .eq("week_number", weekNumber)
      .maybeSingle();

    if (existingFollowup) {
      await supabase
        .from("cryo_followups")
        .update({
          patient_response: message || null,
          patient_photo_path: firstPhotoPath,
          responded_at: new Date().toISOString(),
        })
        .eq("id", existingFollowup.id);
    } else {
      await supabase
        .from("cryo_followups")
        .insert({
          appointment_id: apt.id,
          week_number: weekNumber,
          sent_at: new Date().toISOString(),
          patient_response: message || null,
          patient_photo_path: firstPhotoPath,
          responded_at: new Date().toISOString(),
        });
    }

    // Save all photos as patient files
    for (let i = 0; i < uploadedPaths.length; i++) {
      const photoPath = uploadedPaths[i];
      const photoFileName = allPhotos[i]?.name || `week${weekNumber}_photo_${i + 1}.jpg`;
      await supabase.from("patient_files").insert({
        client_email: apt.client_email,
        appointment_id: apt.id,
        file_name: photoFileName,
        file_path: photoPath,
        file_type: `image/${(photoFileName.split(".").pop() || "jpg")}`,
        description: `Cryo follow-up Week ${weekNumber} photo ${i + 1}`,
      });
    }

    // Append follow-up note to patient record
    const photoCount = uploadedPaths.length;
    const responseNote = `[Week ${weekNumber} Follow-Up - ${new Date().toLocaleDateString("en-GB")}] ${message || "(photo only)"}${photoCount > 0 ? ` (${photoCount} photo${photoCount > 1 ? "s" : ""} attached)` : ""}`;
    const { data: patient } = await supabase
      .from("patients")
      .select("id, notes")
      .eq("client_email", apt.client_email)
      .maybeSingle();

    if (patient) {
      const updatedNotes = patient.notes
        ? `${patient.notes}\n\n${responseNote}`
        : responseNote;
      await supabase
        .from("patients")
        .update({ notes: updatedNotes })
        .eq("id", patient.id);
    }

    // Build email to admin with all photos as attachments
    const attachments: any[] = [];
    for (const photo of allPhotos) {
      const base64Data = photo.base64.split(",").pop() || photo.base64;
      attachments.push({
        filename: photo.name,
        content: base64Data,
      });
    }

    const followupContent = `
      ${emailIconHeading("📸", "Patient Follow-Up Response", `${apt.client_name} has sent a Week ${weekNumber} update.`)}
      ${emailDetailTable([
        { icon: "👤", label: "Patient", value: `${apt.client_name} (${apt.client_email})` },
        { icon: "📅", label: "Week", value: `${weekNumber} post-treatment` },
        { icon: "📎", label: "Photos", value: photoCount > 0 ? `${photoCount} attached` : "None" },
      ])}
      ${message ? emailInfoBox("💬", "Patient Message", message.replace(/\n/g, "<br>")) : emailInfoBox("💬", "Message", "<em>No message provided</em>")}
      ${photoCount > 0 ? `<p style="color:#6B7280;font-size:13px;text-align:center;">📎 See email attachments for ${photoCount} photo${photoCount > 1 ? "s" : ""}</p>` : ""}`;
    const emailHtml = emailWrap(followupContent, { subtitle: "Follow-Up Response", noReply: false });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ShawScope System <bookings@shawscope.co.uk>",
        to: [ADMIN_EMAIL],
        reply_to: apt.client_email,
        subject: `Cryo Follow-Up: ${apt.client_name} — Week ${weekNumber} Response${photoCount > 1 ? ` (${photoCount} photos)` : ""}`,
        html: emailHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Email send failed:", errText);
    }

    return new Response(JSON.stringify({ success: true }), {
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