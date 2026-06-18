import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAdminOrCron } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const RETENTION_WEEKS = 6;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authError = await requireAdminOrCron(req, corsHeaders);
    if (authError) return authError;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Discover every table in the public schema dynamically (via a SQL helper
    // function) so this backup never goes stale if tables are added/removed.
    const { data: tableRows, error: tablesError } = await supabase.rpc("get_public_tables");
    if (tablesError || !tableRows) {
      return new Response(JSON.stringify({ error: "Could not discover tables", detail: tablesError?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tableNames: string[] = (tableRows as { tablename: string }[]).map((r) => r.tablename);

    const backup: Record<string, unknown[]> = {};
    const errors: Record<string, string> = {};

    for (const t of tableNames) {
      try {
        const rows: unknown[] = [];
        let from = 0;
        const pageSize = 1000;
        for (let i = 0; i < 500; i++) {
          const { data, error } = await supabase.from(t).select("*").range(from, from + pageSize - 1);
          if (error) { errors[t] = error.message; break; }
          if (!data || data.length === 0) break;
          rows.push(...data);
          if (data.length < pageSize) break;
          from += pageSize;
        }
        backup[t] = rows;
      } catch (e) {
        errors[t] = String(e);
      }
    }

    const generatedAt = new Date();
    const dateTag = generatedAt.toISOString().slice(0, 10);
    const payload = JSON.stringify({
      generated_at: generatedAt.toISOString(),
      table_count: tableNames.length,
      row_counts: Object.fromEntries(Object.entries(backup).map(([k, v]) => [k, v.length])),
      errors,
      data: backup,
    });

    const path = `automated/${dateTag}/full_backup.json`;
    const { error: uploadError } = await supabase.storage
      .from("system-backups")
      .upload(path, new Blob([payload], { type: "application/json" }), { upsert: true });

    if (uploadError) {
      return new Response(JSON.stringify({ error: "Upload failed", detail: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retention: delete automated backups older than RETENTION_WEEKS
    const { data: existing } = await supabase.storage.from("system-backups").list("automated");
    if (existing) {
      const cutoff = new Date(generatedAt);
      cutoff.setDate(cutoff.getDate() - RETENTION_WEEKS * 7);
      const toDelete = existing
        .filter((f) => {
          const d = new Date(f.name);
          return !isNaN(d.getTime()) && d < cutoff;
        })
        .map((f) => `automated/${f.name}/full_backup.json`);
      if (toDelete.length > 0) {
        await supabase.storage.from("system-backups").remove(toDelete);
      }
    }

    try {
      await supabase.from("gov_access_log").insert({
        action: "scheduled_backup",
        entity: "full_backup",
        details: { generated_at: generatedAt.toISOString(), table_count: tableNames.length, path },
        user_email: "system",
      });
    } catch (_) { /* non-fatal */ }

    return new Response(JSON.stringify({
      ok: true,
      path,
      table_count: tableNames.length,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
