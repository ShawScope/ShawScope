import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// All public tables to back up
const TABLES = [
  "appointments","patients","patient_files","patient_recalls","patient_activity_log","patient_birthday_cards",
  "consent_form_responses","consent_form_templates","consultation_notes",
  "services","service_addons","service_offers","service_waitlist",
  "available_dates","blocked_times","booking_holds",
  "appointment_payments","appointment_timings","compliance_checks",
  "business_policies","business_settings","email_templates","sms_templates",
  "notices","blog_posts",
  "communications_log","scheduled_communications","scheduled_campaign_batches","marketing_campaigns",
  "marketing_polls","marketing_poll_responses","marketing_unsubscribes",
  "chat_logs","clinic_visit_enquiries","cryo_followups","cryo_followup_templates","foot_care_waitlist",
  "referrals","heidi_imports",
  "ai_diagnostic_assessments","hearing_screenings","hearing_screening_points","hearing_quick_tiles",
  "clinical_audit_entries","clinical_audit_actions","clinical_audit_files","clinical_audit_monthly_reviews",
  "clinical_audit_reflections","clinical_audit_updates",
  "accounts_category_mappings","accounts_employment_income","accounts_expenses",
  "admin_todos","kit_inventory","kit_usage_log",
  "mileage_journeys","mileage_places","mileage_day_submissions",
  "gov_access_log","gov_attachments","gov_audits","gov_calibration_checks","gov_clinical_waste",
  "gov_complaints","gov_compliments","gov_continuity_plans","gov_credentials","gov_documents",
  "gov_equipment","gov_equipment_service_log","gov_gdpr_breaches","gov_incidents","gov_ipc_audits",
  "gov_lone_worker_checkins","gov_patient_feedback","gov_risk_assessments","gov_safeguarding",
  "gov_significant_events","gov_training_cpd",
  "profiles","user_roles",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validate admin via JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result: Record<string, { count: number; rows: any[]; error?: string }> = {};
    for (const t of TABLES) {
      try {
        // Page through in chunks of 1000 to avoid limits
        const rows: any[] = [];
        let from = 0;
        const pageSize = 1000;
        // up to 200k rows per table
        for (let i = 0; i < 200; i++) {
          const { data, error } = await admin.from(t).select("*").range(from, from + pageSize - 1);
          if (error) { result[t] = { count: rows.length, rows, error: error.message }; break; }
          if (!data || data.length === 0) break;
          rows.push(...data);
          if (data.length < pageSize) break;
          from += pageSize;
        }
        if (!result[t]) result[t] = { count: rows.length, rows };
      } catch (e) {
        result[t] = { count: 0, rows: [], error: (e as Error).message };
      }
    }

    // Log access
    await admin.from("gov_access_log").insert({
      action: "export",
      entity: "full_backup",
      details: { generated_at: new Date().toISOString(), tables: TABLES.length },
      user_id: userData.user.id,
      user_email: userData.user.email,
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      generated_at: new Date().toISOString(),
      generated_by: userData.user.email,
      tables: result,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});