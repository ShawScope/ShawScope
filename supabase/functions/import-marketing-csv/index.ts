import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(current.trim()); current = ""; }
      else { current += ch; }
    }
  }
  fields.push(current.trim());
  return fields;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authError = await requireAdmin(req, corsHeaders);
    if (authError) return authError;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    let csv = body.csv as string;

    if (!csv && body.storagePath) {
      const { data, error } = await supabase.storage.from("shawscope").download(body.storagePath);
      if (error) throw new Error("Storage download failed: " + error.message);
      csv = await data.text();
    }

    if (!csv) {
      return new Response(JSON.stringify({ error: "No CSV data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lines = csv.split("\n").filter((l: string) => l.trim());
    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

    const emailIdx = header.findIndex(h => h.includes("email address"));
    const firstNameIdx = header.findIndex(h => h === "first name");
    const lastNameIdx = header.findIndex(h => h === "last name");
    const fullNameIdx = header.findIndex(h => h === "full name");
    const phoneIdx = header.findIndex(h => h === "phone number");
    const mobileIdx = header.findIndex(h => h === "mobile");
    const addressIdx = header.findIndex(h => h === "address");
    const postcodeIdx = header.indexOf("physical post code");
    const postcode2Idx = header.indexOf("post code");

    // Parse all rows first
    const parsed: { email: string; name: string; phone: string; address: string }[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const email = (cols[emailIdx] || "").toLowerCase().trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      if (email.includes("noemail") || email === "noemail@icloud.com") continue;

      let name = (fullNameIdx >= 0 ? cols[fullNameIdx] : "").trim();
      if (!name) {
        const first = (firstNameIdx >= 0 ? cols[firstNameIdx] : "").trim();
        const last = (lastNameIdx >= 0 ? cols[lastNameIdx] : "").trim();
        name = [first, last].filter(Boolean).join(" ");
      }
      name = name.replace(/^SS:\s*/i, "").trim();
      if (!name) name = email.split("@")[0];

      let phone = (mobileIdx >= 0 ? cols[mobileIdx] : "").trim();
      if (!phone) phone = (phoneIdx >= 0 ? cols[phoneIdx] : "").trim();
      phone = phone.replace(/^'+/, "").trim();
      if (phone && !phone.startsWith("+") && !phone.startsWith("0") && phone.startsWith("44")) {
        phone = "+" + phone;
      }

      let address = (addressIdx >= 0 ? cols[addressIdx] : "").trim();
      address = address.replace(/\s+(US|GB)\s*$/i, "").trim();
      const postcode = (postcodeIdx >= 0 ? cols[postcodeIdx] : "").trim() ||
                        (postcode2Idx >= 0 ? cols[postcode2Idx] : "").trim();
      if (postcode && address && !address.includes(postcode)) {
        address = `${address}, ${postcode}`;
      }

      parsed.push({ email, name, phone, address });
    }

    // Fetch ALL existing patients in one query
    const allEmails = parsed.map(p => p.email);
    const { data: existingPatients } = await supabase
      .from("patients")
      .select("id, client_email, marketing_email, client_phone, address")
      .in("client_email", allEmails);

    const existingMap = new Map<string, any>();
    (existingPatients || []).forEach(p => existingMap.set(p.client_email, p));

    let added = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    // Batch: new patients to insert
    const toInsert: any[] = [];
    // Updates to process
    const toUpdate: { id: string; updates: Record<string, any> }[] = [];

    for (const row of parsed) {
      const existing = existingMap.get(row.email);
      if (existing) {
        const updates: Record<string, any> = {};
        if (!existing.marketing_email) {
          updates.marketing_email = true;
          updates.marketing_opted_in_at = new Date().toISOString();
        }
        if (!existing.client_phone && row.phone) updates.client_phone = row.phone;
        if (!existing.address && row.address) updates.address = row.address;

        if (Object.keys(updates).length > 0) {
          toUpdate.push({ id: existing.id, updates });
        } else {
          skipped++;
        }
      } else {
        toInsert.push({
          client_name: row.name,
          client_email: row.email,
          client_phone: row.phone || null,
          address: row.address || null,
          marketing_email: true,
          marketing_opted_in_at: new Date().toISOString(),
        });
      }
    }

    // Batch insert new patients (50 at a time)
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { error } = await supabase.from("patients").insert(batch);
      if (error) {
        // Try individually
        for (const p of batch) {
          const { error: e2 } = await supabase.from("patients").insert(p);
          if (e2) { errors.push(`${p.client_name}: ${e2.message}`); skipped++; }
          else { added++; }
        }
      } else {
        added += batch.length;
      }
    }

    // Process updates
    for (const { id, updates } of toUpdate) {
      await supabase.from("patients").update(updates).eq("id", id);
      updated++;
    }

    return new Response(
      JSON.stringify({ success: true, added, updated, skipped, totalRows: parsed.length, errors: errors.slice(0, 20) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
