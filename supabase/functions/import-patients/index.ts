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
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function convertPhone(val: string): string | null {
  if (!val) return null;
  val = val.trim();
  // Already formatted
  if (val.startsWith("+44") || val.startsWith("07") || val.startsWith("01") || val.startsWith("02")) {
    return val;
  }
  // Scientific notation from Excel
  if (val.includes("E+") || val.includes("e+")) {
    const num = Math.round(parseFloat(val));
    if (isNaN(num)) return null;
    const str = num.toString();
    if (str.startsWith("44") && str.length >= 11) {
      return "+" + str;
    }
    return str;
  }
  const digits = val.replace(/\D/g, "");
  // Looks like a mobile missing leading 0 (e.g. 7599664847)
  if (digits.length === 10 && digits.startsWith("7")) {
    return "0" + digits;
  }
  if (digits.startsWith("44") && digits.length >= 11) return "+" + digits;
  if (digits.length >= 10) return digits;
  if (digits.length >= 7) return digits;
  return null;
}

function convertDob(val: string): string | null {
  if (!val) return null;
  const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function isPlaceholderEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return lower.includes("noemail") || lower.includes("declined@") || lower === "mary@mary.com" || lower === "richard@richard.com";
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
    const csv = body.csv as string;
    if (!csv || csv.length < 50) {
      return new Response(JSON.stringify({ error: "No CSV data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lines = csv.split("\n").filter((l: string) => l.trim());
    const dataLines = lines.slice(1);

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Batch insert for efficiency
    const patients: any[] = [];

    for (const line of dataLines) {
      const fields = parseCSVLine(line);
      const fullName = fields[0]?.trim() || "";
      const phone = fields[2]?.trim() || "";
      const email = fields[3]?.trim() || "";
      const addr1 = fields[4]?.trim() || "";
      const addr2 = fields[5]?.trim() || "";
      const suburb = fields[6]?.trim() || "";
      const dob = fields[10]?.trim() || "";

      if (!fullName || fullName.toLowerCase().startsWith("test ") || fullName === "My Test") {
        skipped++;
        continue;
      }

      const addressParts = [addr1, addr2, suburb].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(", ") : null;
      const clientPhone = convertPhone(phone) || null;

      let clientEmail: string;
      if (email && !isPlaceholderEmail(email)) {
        clientEmail = email.toLowerCase();
      } else {
        const slug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
        clientEmail = `noemail.${slug}@placeholder.local`;
      }

      const dateOfBirth = convertDob(dob);

      patients.push({
        client_name: fullName,
        client_email: clientEmail,
        client_phone: clientPhone,
        address: address,
        date_of_birth: dateOfBirth,
      });
    }

    // Insert in batches of 50
    for (let i = 0; i < patients.length; i += 50) {
      const batch = patients.slice(i, i + 50);
      const { error } = await supabase.from("patients").insert(batch);
      if (error) {
        errors.push(`Batch ${i / 50 + 1}: ${error.message}`);
        // Try individual inserts for failed batch
        for (const p of batch) {
          const { error: indErr } = await supabase.from("patients").insert(p);
          if (indErr) {
            errors.push(`${p.client_name}: ${indErr.message}`);
            skipped++;
          } else {
            inserted++;
          }
        }
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ message: "Import complete", inserted, skipped, totalRows: dataLines.length, errors: errors.slice(0, 30) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
