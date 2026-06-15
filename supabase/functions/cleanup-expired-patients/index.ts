import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const eightYearsAgo = new Date(now);
    eightYearsAgo.setFullYear(eightYearsAgo.getFullYear() - 8);

    // Get all patients
    const { data: patients, error: pErr } = await supabase
      .from("patients")
      .select("id, client_email, client_name, date_of_birth");

    if (pErr) throw pErr;

    const deletedPatients: string[] = [];

    for (const patient of patients || []) {
      // Get most recent appointment for this patient
      const { data: lastApt } = await supabase
        .from("appointments")
        .select("appointment_date")
        .eq("client_email", patient.client_email)
        .order("appointment_date", { ascending: false })
        .limit(1)
        .single();

      if (!lastApt) continue;

      const lastDate = new Date(lastApt.appointment_date);

      // Check if under-18 at time of last appointment, and capture age at conclusion
      let isMinor = false;
      let ageAtLastApt = 0;
      if (patient.date_of_birth) {
        const dob = new Date(patient.date_of_birth);
        ageAtLastApt =
          (lastDate.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        isMinor = ageAtLastApt < 18;
      }

      let shouldDelete = false;

      if (isMinor && patient.date_of_birth) {
        // NHS retention for minors: until 25th birthday, or 26th if aged 17 at conclusion of treatment
        const dob = new Date(patient.date_of_birth);
        const targetAge = ageAtLastApt >= 17 ? 26 : 25;
        const cutoff = new Date(dob);
        cutoff.setFullYear(cutoff.getFullYear() + targetAge);
        shouldDelete = now >= cutoff;
      } else {
        // Standard adult retention: 8 years after last appointment
        shouldDelete = lastDate <= eightYearsAgo;
      }

      if (shouldDelete) {
        const email = patient.client_email;

        // Delete patient files from storage
        const { data: files } = await supabase
          .from("patient_files")
          .select("file_path")
          .eq("client_email", email);

        if (files && files.length > 0) {
          const paths = files.map((f) => f.file_path);
          await supabase.storage.from("shawscope").remove(paths);
          await supabase.from("patient_files").delete().eq("client_email", email);
        }

        // Delete consent form responses for this patient's appointments
        const { data: apts } = await supabase
          .from("appointments")
          .select("id")
          .eq("client_email", email);

        if (apts && apts.length > 0) {
          const aptIds = apts.map((a) => a.id);
          await supabase
            .from("consent_form_responses")
            .delete()
            .in("appointment_id", aptIds);
          await supabase
            .from("consultation_notes")
            .delete()
            .in("appointment_id", aptIds);
          await supabase
            .from("cryo_followups")
            .delete()
            .in("appointment_id", aptIds);
          await supabase
            .from("scheduled_communications")
            .delete()
            .in("appointment_id", aptIds);
          await supabase
            .from("communications_log")
            .delete()
            .in("appointment_id", aptIds);
        }

        // Delete activity log
        await supabase
          .from("patient_activity_log")
          .delete()
          .eq("client_email", email);

        // Delete recalls
        await supabase
          .from("patient_recalls")
          .delete()
          .eq("patient_id", patient.id);

        // Delete appointments
        await supabase
          .from("appointments")
          .delete()
          .eq("client_email", email);

        // Delete patient record
        await supabase.from("patients").delete().eq("id", patient.id);

        deletedPatients.push(`${patient.client_name} (${email})`);
      }
    }

    console.log(
      `Retention cleanup complete. Deleted ${deletedPatients.length} patients.`,
      deletedPatients
    );

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedPatients.length,
        deleted: deletedPatients,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Retention cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
