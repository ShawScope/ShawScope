import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import jsPDF from "npm:jspdf@2.5.2";
import autoTable from "npm:jspdf-autotable@3.8.2";
import { requireAdminOrCron } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECIPIENT = "matt@shawscope.co.uk";
const FROM = "ShawScope Mileage <noreply@shawscope.net>";
const BASE_POSTCODE = "DT2 8DG";
const HMRC_RATE_LOW = 0.45;
const HMRC_RATE_HIGH = 0.25;
const HMRC_THRESHOLD = 10000;

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDateUK = (s: string) => { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
const norm = (pc: string) => (pc || "").toUpperCase().replace(/\s+/g, " ").trim();

function previousMonthRange(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start, end, label: start.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
}

function calcCost(miles: number, prior: number) {
  let cost = 0;
  let remaining = miles;
  const lowLeft = Math.max(0, HMRC_THRESHOLD - prior);
  const atLow = Math.min(remaining, lowLeft);
  cost += atLow * HMRC_RATE_LOW;
  remaining -= atLow;
  cost += remaining * HMRC_RATE_HIGH;
  return Math.round(cost * 100) / 100;
}

function taxYearStart(d: Date) {
  const y = d.getMonth() < 3 || (d.getMonth() === 3 && d.getDate() < 6) ? d.getFullYear() - 1 : d.getFullYear();
  return `${y}-04-06`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {

    const authError = await requireAdminOrCron(req, corsHeaders);
    if (authError) return authError;
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Allow override of which month to send (for testing)
    let monthDate = new Date();
    try {
      const body = await req.json();
      if (body?.month) monthDate = new Date(body.month + "T00:00:00");
    } catch {}

    const { start, end, label } = previousMonthRange(monthDate);
    const startStr = ymd(start);
    const endStr = ymd(end);

    // Load data
    const [placesRes, journeysRes, apptsRes, routesRes, priorRes] = await Promise.all([
      sb.from("mileage_places").select("*"),
      sb.from("mileage_journeys").select("*").gte("journey_date", startStr).lte("journey_date", endStr),
      sb.from("appointments")
        .select("id, appointment_date, appointment_time, client_name, postcode, travel_distance_miles, come_to_practitioner, status")
        .gte("appointment_date", startStr).lte("appointment_date", endStr)
        .not("status", "in", "(cancelled,rejected,form_only)"),
      sb.from("route_cache").select("origin_postcode, destination_postcode, distance_miles"),
      sb.from("mileage_journeys").select("miles, hidden").gte("journey_date", taxYearStart(start)).lt("journey_date", startStr),
    ]);

    const places = placesRes.data || [];
    const journeys: any[] = journeysRes.data || [];
    const appointments: any[] = apptsRes.data || [];
    const routes: any[] = routesRes.data || [];
    const priorJourneys: any[] = priorRes.data || [];

    const base = places.find((p: any) => p.is_base);
    const baseLabel = base?.name || "Base";
    const basePc = norm(base?.postcode || BASE_POSTCODE);

    const routeMap = new Map<string, number>();
    for (const r of routes) {
      routeMap.set(`${norm(r.origin_postcode)}|${norm(r.destination_postcode)}`, Number(r.distance_miles));
    }
    const lookup = (a: string, b: string) => routeMap.get(`${norm(a)}|${norm(b)}`) ?? routeMap.get(`${norm(b)}|${norm(a)}`) ?? null;

    // Build chain rows (mirrors MileageTab logic)
    type Row = { date: string; time: string; from: string; to: string; miles: number; purpose: string; source: string };
    const out: Row[] = [];

    const overrideMap = new Map<string, any>();
    const returnsByDate: Record<string, any[]> = {};
    const standalone: any[] = [];
    for (const j of journeys) {
      if (j.is_return_to_base) (returnsByDate[j.journey_date] ??= []).push(j);
      else if (j.appointment_id) overrideMap.set(j.appointment_id, j);
      else standalone.push(j);
    }
    for (const k of Object.keys(returnsByDate)) {
      returnsByDate[k].sort((a, b) => (a.journey_time || "").localeCompare(b.journey_time || ""));
    }

    const apptsByDate: Record<string, any[]> = {};
    for (const a of appointments) {
      if (a.come_to_practitioner) continue;
      (apptsByDate[a.appointment_date] ??= []).push(a);
    }
    for (const k of Object.keys(apptsByDate)) apptsByDate[k].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    const allDates = new Set([...Object.keys(apptsByDate), ...Object.keys(returnsByDate)]);
    for (const date of allDates) {
      const dayAppts = apptsByDate[date] || [];
      const dayReturns = (returnsByDate[date] || []).slice();
      let prevApt: any = null;
      let rIdx = 0;

      const popReturns = (cutoff: string) => {
        while (rIdx < dayReturns.length && (dayReturns[rIdx].journey_time || "00:00") <= cutoff) {
          const r = dayReturns[rIdx++];
          if (prevApt) {
            const miles = Number(r.miles || 0) || Number(prevApt.travel_distance_miles || 0);
            out.push({
              date, time: r.journey_time || "",
              from: `${prevApt.client_name}${prevApt.postcode ? ` (${prevApt.postcode})` : ""}`,
              to: baseLabel, miles: Math.round(miles * 10) / 10,
              purpose: r.purpose || "Return to base", source: "Return",
            });
            prevApt = null;
          }
        }
      };

      for (const a of dayAppts) {
        popReturns(a.appointment_time);
        const ov = overrideMap.get(a.id);
        if (ov?.hidden) continue;

        let segMiles: number;
        let fromLabel: string;
        if (prevApt === null) {
          segMiles = Number(a.travel_distance_miles || 0);
          fromLabel = baseLabel;
        } else {
          fromLabel = `${prevApt.client_name}${prevApt.postcode ? ` (${prevApt.postcode})` : ""}`;
          segMiles = (prevApt.postcode && a.postcode) ? (lookup(prevApt.postcode, a.postcode) ?? 0) : 0;
        }
        if (ov && !ov.hidden) segMiles = Number(ov.miles || segMiles || 0);

        out.push({
          date, time: a.appointment_time,
          from: fromLabel,
          to: `${a.client_name}${a.postcode ? ` (${a.postcode})` : ""}`,
          miles: Math.round(segMiles * 10) / 10,
          purpose: ov?.purpose || `Visit · ${a.client_name}`,
          source: "Auto",
        });
        prevApt = a;
      }
      popReturns("99:99");
      if (prevApt) {
        const m = Number(prevApt.travel_distance_miles || 0);
        out.push({
          date, time: "99:99",
          from: `${prevApt.client_name}${prevApt.postcode ? ` (${prevApt.postcode})` : ""}`,
          to: baseLabel, miles: Math.round(m * 10) / 10,
          purpose: "Return to base (end of day)", source: "Auto",
        });
      }
    }

    for (const j of standalone) {
      if (j.hidden) continue;
      out.push({
        date: j.journey_date, time: j.journey_time || "",
        from: j.from_label || j.from_postcode || "—",
        to: j.to_label || j.to_postcode || "—",
        miles: Number(j.miles || 0),
        purpose: j.purpose || "", source: "Manual",
      });
    }

    out.sort((a, b) => a.date === b.date ? (a.time || "").localeCompare(b.time || "") : a.date.localeCompare(b.date));

    const totalMiles = Math.round(out.reduce((s, r) => s + r.miles, 0) * 10) / 10;
    const priorMiles = priorJourneys.filter((j: any) => !j.hidden).reduce((s, j) => s + Number(j.miles || 0), 0);
    const totalCost = calcCost(totalMiles, priorMiles);

    // Build PDF
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`ShawScope Mileage — ${label}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`HMRC rates: 45p/mile up to 10,000 miles, then 25p/mile`, 14, 23);
    doc.text(`Tax-year miles before this month: ${priorMiles.toFixed(1)}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [["Date", "From", "To", "Miles", "Purpose", "Type"]],
      body: out.map(r => [fmtDateUK(r.date), r.from, r.to, r.miles.toFixed(1), r.purpose, r.source]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [212, 145, 42] },
    });
    const finalY = (doc as any).lastAutoTable?.finalY || 40;
    doc.setFontSize(11);
    doc.text(`Total miles: ${totalMiles.toFixed(1)}`, 14, finalY + 10);
    doc.text(`Reclaimable expense: £${totalCost.toFixed(2)}`, 14, finalY + 16);

    const pdfBytes = doc.output("arraybuffer");
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
    const filename = `shawscope-mileage-${ymd(start).slice(0, 7)}.pdf`;

    // Send via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h2 style="color:#0F172A;margin:0 0 16px">Mileage report — ${label}</h2>
        <p>Hi Matt,</p>
        <p>Here's your monthly mileage summary for <strong>${label}</strong>:</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 12px;background:#f5f5f5"><strong>Total trips</strong></td><td style="padding:6px 12px;background:#f5f5f5">${out.length}</td></tr>
          <tr><td style="padding:6px 12px"><strong>Total miles</strong></td><td style="padding:6px 12px">${totalMiles.toFixed(1)} mi</td></tr>
          <tr><td style="padding:6px 12px;background:#f5f5f5"><strong>Reclaimable expense</strong></td><td style="padding:6px 12px;background:#f5f5f5;color:#D4912A;font-size:16px"><strong>£${totalCost.toFixed(2)}</strong></td></tr>
        </table>
        <p>To claim this from your business current account as a travel expense, transfer <strong>£${totalCost.toFixed(2)}</strong> from the business account to your personal account, with reference: <em>Mileage ${label}</em>.</p>
        <p>The full journey log is attached as a PDF for your records.</p>
        <p style="color:#666;font-size:12px;margin-top:24px">HMRC mileage allowance: 45p/mile up to 10,000 miles, then 25p/mile (tax-year-to-date prior to this month: ${priorMiles.toFixed(1)} mi).</p>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM,
        to: [RECIPIENT],
        subject: `Mileage report — ${label} · £${totalCost.toFixed(2)} claim`,
        html,
        attachments: [{ filename, content: pdfBase64 }],
      }),
    });
    const emailJson = await emailRes.json();
    if (!emailRes.ok) throw new Error(`Resend error: ${JSON.stringify(emailJson)}`);

    return new Response(JSON.stringify({
      success: true, month: label, trips: out.length, totalMiles, totalCost, emailId: emailJson.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("email-monthly-mileage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
