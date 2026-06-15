import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAdminOrCron } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- OAuth token management ---
async function getAccessToken(supabaseAdmin: any): Promise<string> {
  // Get stored OAuth tokens (any admin's)
  const { data: tokenRow, error } = await supabaseAdmin
    .from("google_oauth_tokens")
    .select("*")
    .limit(1)
    .single();

  if (error || !tokenRow) {
    throw new Error("Google not connected. Please connect Google from the Patients tab first.");
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(tokenRow.token_expires_at);
  if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return tokenRow.access_token;
  }

  // Refresh the token
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not configured");

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenRow.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(`Token refresh failed: ${data.error_description || data.error}`);

  const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

  // Update stored token
  await supabaseAdmin
    .from("google_oauth_tokens")
    .update({
      access_token: data.access_token,
      token_expires_at: newExpiresAt,
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
    })
    .eq("id", tokenRow.id);

  return data.access_token;
}

// --- People API helpers ---
const PEOPLE_API = "https://people.googleapis.com/v1";

interface PatientData {
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  notes?: string | null;
}

async function findExistingContact(token: string, email: string): Promise<string | null> {
  const url = `${PEOPLE_API}/people:searchContacts?query=${encodeURIComponent(email)}&readMask=emailAddresses&sources=READ_SOURCE_TYPE_CONTACT&pageSize=5`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json();
  if (data.results) {
    for (const r of data.results) {
      const emails = r.person?.emailAddresses || [];
      if (emails.some((e: any) => e.value?.toLowerCase() === email.toLowerCase())) {
        return r.person.resourceName;
      }
    }
  }
  return null;
}

function buildContactBody(patient: PatientData): any {
  const nameParts = patient.client_name.trim().split(/\s+/);
  const body: any = {
    names: [{ givenName: nameParts[0] || "", familyName: nameParts.slice(1).join(" ") || "" }],
    emailAddresses: [{ value: patient.client_email, type: "work" }],
    organizations: [{ name: "ShawScope Patient" }],
  };
  if (patient.client_phone) body.phoneNumbers = [{ value: patient.client_phone, type: "mobile" }];
  if (patient.address) body.addresses = [{ formattedValue: patient.address, type: "home" }];
  if (patient.date_of_birth) {
    const [y, m, d] = patient.date_of_birth.split("-").map(Number);
    body.birthdays = [{ date: { year: y, month: m, day: d } }];
  }
  if (patient.notes) body.biographies = [{ value: patient.notes, contentType: "TEXT_PLAIN" }];
  return body;
}

async function createContact(token: string, patient: PatientData): Promise<string> {
  const resp = await fetch(`${PEOPLE_API}/people:createContact`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildContactBody(patient)),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Create contact failed [${resp.status}]: ${JSON.stringify(data)}`);
  return data.resourceName;
}

async function updateContact(token: string, resourceName: string, patient: PatientData): Promise<void> {
  const getResp = await fetch(`${PEOPLE_API}/${resourceName}?personFields=metadata`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const existing = await getResp.json();
  if (!getResp.ok) throw new Error(`Get contact failed: ${JSON.stringify(existing)}`);

  const body = { ...buildContactBody(patient), etag: existing.etag };
  const updateFields = "names,emailAddresses,phoneNumbers,addresses,birthdays,biographies,organizations";
  const resp = await fetch(`${PEOPLE_API}/${resourceName}:updateContact?updatePersonFields=${updateFields}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Update contact failed [${resp.status}]: ${JSON.stringify(data)}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    const authError = await requireAdminOrCron(req, corsHeaders);
    if (authError) return authError;
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { mode, patient, patient_ids, patient_id } = await req.json();
    const token = await getAccessToken(supabaseAdmin);

    if (mode === "bulk") {
      let query = supabaseAdmin.from("patients").select("id, client_name, client_email, client_phone, address, date_of_birth, notes");
      if (patient_ids?.length > 0) query = query.in("id", patient_ids);
      const { data: patients, error } = await query;
      if (error) throw error;

      let created = 0, updated = 0, failed = 0;
      const errors: string[] = [];

      for (const p of patients || []) {
        if (p.client_email?.includes("@placeholder.local")) continue;

        try {
          const existing = await findExistingContact(token, p.client_email);
          if (existing) {
            await updateContact(token, existing, p);
            updated++;
          } else {
            await createContact(token, p);
            created++;
          }
        } catch (e) {
          failed++;
          errors.push(`${p.client_name}: ${e.message}`);
        } finally {
          await supabaseAdmin
            .from("patients")
            .update({ google_contact_synced_at: new Date().toISOString() })
            .eq("id", p.id);

          await new Promise(r => setTimeout(r, 150));
        }
      }

      return new Response(JSON.stringify({ success: true, created, updated, failed, errors: errors.slice(0, 10) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Single patient sync
      if (!patient?.client_email) throw new Error("Patient email required");
      if (patient.client_email?.includes("@placeholder.local")) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "placeholder email" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const existing = await findExistingContact(token, patient.client_email);
        let action: string;
        let resourceName: string;

        if (existing) {
          await updateContact(token, existing, patient);
          action = "updated";
          resourceName = existing;
        } else {
          resourceName = await createContact(token, patient);
          action = "created";
        }

        if (patient_id) {
          await supabaseAdmin
            .from("patients")
            .update({ google_contact_synced_at: new Date().toISOString() })
            .eq("id", patient_id);
        }

        return new Response(JSON.stringify({ success: true, action, resourceName }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (syncError) {
        if (patient_id) {
          await supabaseAdmin
            .from("patients")
            .update({ google_contact_synced_at: new Date().toISOString() })
            .eq("id", patient_id);
        }

        return new Response(JSON.stringify({ success: true, action: "failed", error: syncError.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } catch (err) {
    console.error("sync-google-contact error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
