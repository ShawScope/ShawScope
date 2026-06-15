import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find rejected appointments where:
    // - status is "rejected"
    // - alternative was offered (alternative_date is set)
    // - rejected_at is more than 3 days ago
    // - no response yet (status still "rejected", not "confirmed")
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredHolds, error: fetchErr } = await supabaseAdmin
      .from("appointments")
      .select("id, client_name, client_email, alternative_date, alternative_time, rejected_at")
      .eq("status", "rejected_awaiting")
      .not("rejected_at", "is", null)
      .lt("rejected_at", threeDaysAgo);

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredHolds || expiredHolds.length === 0) {
      return new Response(JSON.stringify({ message: "No expired holds to clean up", deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = expiredHolds.map((a) => a.id);

    // Delete the expired appointments
    const { error: deleteErr } = await supabaseAdmin
      .from("appointments")
      .delete()
      .in("id", ids);

    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log activity for each
    for (const apt of expiredHolds) {
      await supabaseAdmin.from("patient_activity_log").insert({
        client_email: apt.client_email.toLowerCase(),
        event_type: "cancelled",
        message: `Rejected appointment auto-deleted after 3 days with no response`,
        created_by: "system",
      });
    }

    return new Response(
      JSON.stringify({ success: true, deleted: ids.length, ids }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
