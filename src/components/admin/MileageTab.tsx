import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Download, MapPin, Car, RefreshCw, EyeOff, Mail } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import CompleteDayMileageDialog from "./CompleteDayMileageDialog";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

const HMRC_RATE_LOW = 0.45; // first 10,000 miles
const HMRC_RATE_HIGH = 0.25;
const HMRC_THRESHOLD = 10000;

type Place = { id: string; name: string; postcode: string; address: string | null; is_base: boolean };
type Journey = {
  id: string;
  journey_date: string;
  journey_time: string | null;
  from_label: string | null;
  to_label: string | null;
  from_postcode: string | null;
  to_postcode: string | null;
  miles: number;
  purpose: string | null;
  notes: string | null;
  appointment_id: string | null;
  source: string;
  hidden: boolean;
  is_return_to_base: boolean;
};
type Appt = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  postcode: string | null;
  travel_distance_miles: number | null;
  come_to_practitioner: boolean;
  status: string;
};

type Row = {
  key: string;
  date: string;
  time?: string | null;
  from: string;
  to: string;
  miles: number;
  purpose: string;
  source: "auto" | "manual" | "return";
  journey?: Journey;
  appointment?: Appt;
  pending?: boolean;
};

function fmtDate(d: string) {
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { start: fmt(start), end: fmt(end) };
}

function taxYearStart(d: Date) {
  // UK tax year starts 6 April
  const y = d.getMonth() < 3 || (d.getMonth() === 3 && d.getDate() < 6) ? d.getFullYear() - 1 : d.getFullYear();
  return `${y}-04-06`;
}

function calcCost(miles: number, milesAlreadyThisYear: number): number {
  let cost = 0;
  let remaining = miles;
  const lowLeft = Math.max(0, HMRC_THRESHOLD - milesAlreadyThisYear);
  const atLow = Math.min(remaining, lowLeft);
  cost += atLow * HMRC_RATE_LOW;
  remaining -= atLow;
  cost += remaining * HMRC_RATE_HIGH;
  return Math.round(cost * 100) / 100;
}

export default function MileageTab() {
  const [month, setMonth] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [places, setPlaces] = useState<Place[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [allJourneys, setAllJourneys] = useState<Journey[]>([]); // for tax-year tally
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittedDates, setSubmittedDates] = useState<Set<string>>(new Set());
  const [completeDialogDate, setCompleteDialogDate] = useState<string | null>(null);
  // Cached direct postcode→postcode distances for chained legs
  const [pairMiles, setPairMiles] = useState<Record<string, number>>({});
  const [emailingTest, setEmailingTest] = useState(false);

  const [placeDialogOpen, setPlaceDialogOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [placeForm, setPlaceForm] = useState({ name: "", postcode: "", address: "", is_base: false });

  const [journeyDialogOpen, setJourneyDialogOpen] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [editingApptKey, setEditingApptKey] = useState<string | null>(null);
  const [journeyForm, setJourneyForm] = useState({
    journey_date: "",
    from_place_id: "",
    to_place_id: "",
    from_label: "",
    to_label: "",
    from_postcode: "",
    to_postcode: "",
    miles: "",
    purpose: "",
    notes: "",
  });
  const [calcing, setCalcing] = useState(false);

  const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  async function loadAll() {
    setLoading(true);
    const { start, end } = monthRange(month);
    const tyStart = taxYearStart(month);
    const [pl, jr, ap, ty, sub] = await Promise.all([
      supabase.from("mileage_places").select("*").order("is_base", { ascending: false }).order("name"),
      supabase.from("mileage_journeys").select("*").gte("journey_date", start).lte("journey_date", end).order("journey_date"),
      supabase.from("appointments")
        .select("id, appointment_date, appointment_time, client_name, postcode, travel_distance_miles, come_to_practitioner, status")
        .gte("appointment_date", start).lte("appointment_date", end)
        .not("status", "in", "(cancelled,rejected,form_only)"),
      supabase.from("mileage_journeys").select("journey_date, miles, hidden").gte("journey_date", tyStart).lt("journey_date", start),
      supabase.from("mileage_day_submissions").select("journey_date").gte("journey_date", start).lte("journey_date", end),
    ]);
    setPlaces((pl.data as Place[]) || []);
    setJourneys((jr.data as Journey[]) || []);
    setAppointments((ap.data as Appt[]) || []);
    setAllJourneys((ty.data as Journey[]) || []);
    setSubmittedDates(new Set(((sub.data as { journey_date: string }[]) || []).map(s => s.journey_date)));
    setLoading(false);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [month]);

  const base = useMemo(() => places.find(p => p.is_base) || null, [places]);
  const basePostcode = (base?.postcode || "DT2 8DG").toUpperCase().replace(/\s+/g, " ");
  const baseLabel = base?.name || "Base";

  function pairKey(from: string, to: string) {
    return `${(from || "").toUpperCase().replace(/\s+/g, " ")}|${(to || "").toUpperCase().replace(/\s+/g, " ")}`;
  }

  // Build chained rows. Default = appointments are connected A→B; only break the chain
  // when a return-to-base journey is logged for that day.
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];

    // Per-appointment override map (a saved journey row tied to an appointment.id)
    const overrideMap = new Map<string, Journey>();
    const returnsByDate: Record<string, Journey[]> = {};
    const standaloneManual: Journey[] = [];

    for (const j of journeys) {
      if (j.is_return_to_base) {
        (returnsByDate[j.journey_date] ??= []).push(j);
      } else if (j.appointment_id) {
        overrideMap.set(j.appointment_id, j);
      } else {
        standaloneManual.push(j);
      }
    }
    for (const k of Object.keys(returnsByDate)) {
      returnsByDate[k].sort((a, b) => (a.journey_time || "").localeCompare(b.journey_time || ""));
    }

    // Group appointments by date, only counting visits (not come-to-practitioner)
    const apptsByDate: Record<string, Appt[]> = {};
    for (const a of appointments) {
      if (a.come_to_practitioner) continue;
      (apptsByDate[a.appointment_date] ??= []).push(a);
    }
    for (const k of Object.keys(apptsByDate)) {
      apptsByDate[k].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    }

    const allDates = new Set<string>([...Object.keys(apptsByDate), ...Object.keys(returnsByDate)]);

    for (const date of allDates) {
      // Only render auto / return-derived legs for days the practitioner has submitted.
      // Pending days stay hidden until they Complete Mileage for that day.
      if (!submittedDates.has(date)) continue;
      const dayAppts = apptsByDate[date] || [];
      const dayReturns = (returnsByDate[date] || []).slice();

      // Walk the day, building chain segments
      let prevApt: Appt | null = null; // null = currently at Base
      let returnIdx = 0;

      const popReturnsBefore = (cutoffTime: string) => {
        while (returnIdx < dayReturns.length && (dayReturns[returnIdx].journey_time || "00:00") <= cutoffTime) {
          const r = dayReturns[returnIdx++];
          if (prevApt) {
            // Emit Apt → Base
            const miles = Number(r.miles || 0) || Number(prevApt.travel_distance_miles || 0);
            out.push({
              key: `r-${r.id}`,
              date,
              time: r.journey_time,
              from: `${prevApt.client_name}${prevApt.postcode ? ` (${prevApt.postcode})` : ""}`,
              to: baseLabel,
              miles: Math.round(miles * 10) / 10,
              purpose: r.purpose || "Return to base",
              source: "return",
              journey: r,
              appointment: prevApt,
            });
            prevApt = null;
          } else {
            // Return logged but already at base — still surface it so user can delete
            out.push({
              key: `r-${r.id}`,
              date,
              time: r.journey_time,
              from: r.from_label || baseLabel,
              to: baseLabel,
              miles: Number(r.miles || 0),
              purpose: r.purpose || "Return to base",
              source: "return",
              journey: r,
            });
          }
        }
      };

      for (const a of dayAppts) {
        // Apply any returns scheduled before this appointment's time
        popReturnsBefore(a.appointment_time);

        const ov = overrideMap.get(a.id);
        if (ov?.hidden) {
          // Hidden — skip but treat as if we never went; keep prevApt as-is
          continue;
        }

        let segMiles: number;
        let fromLabel: string;
        if (prevApt === null) {
          // Base → A (use the appointment's recorded base distance)
          segMiles = Number(a.travel_distance_miles || 0);
          fromLabel = baseLabel;
        } else {
          // Apt → Apt direct (use cached pair distance if known)
          fromLabel = `${prevApt.client_name}${prevApt.postcode ? ` (${prevApt.postcode})` : ""}`;
          if (prevApt.postcode && a.postcode) {
            const cached = pairMiles[pairKey(prevApt.postcode, a.postcode)];
            segMiles = typeof cached === "number" ? cached : NaN;
          } else {
            segMiles = 0;
          }
        }

        if (ov && !ov.hidden) {
          segMiles = Number(ov.miles || segMiles || 0);
        }

        out.push({
          key: ov ? `j-${ov.id}` : `seg-${a.id}`,
          date,
          time: a.appointment_time,
          from: fromLabel,
          to: `${a.client_name}${a.postcode ? ` (${a.postcode})` : ""}`,
          miles: Number.isFinite(segMiles) ? Math.round(segMiles * 10) / 10 : 0,
          purpose: ov?.purpose || `Visit · ${a.client_name}`,
          source: "auto",
          journey: ov,
          appointment: a,
          pending: !Number.isFinite(segMiles),
        });

        prevApt = a;
      }

      // Pop any remaining returns (after the last appointment)
      popReturnsBefore("99:99");

      // End-of-day: if still away from base after last appointment, add closing leg back to base
      if (prevApt) {
        const lastMiles = Number(prevApt.travel_distance_miles || 0);
        out.push({
          key: `eod-${prevApt.id}`,
          date,
          time: "99:99",
          from: `${prevApt.client_name}${prevApt.postcode ? ` (${prevApt.postcode})` : ""}`,
          to: baseLabel,
          miles: Math.round(lastMiles * 10) / 10,
          purpose: "Return to base (end of day)",
          source: "auto",
          appointment: prevApt,
        });
      }
    }

    // Standalone manual journeys (fuel, errands etc.)
    for (const j of standaloneManual) {
      if (j.hidden) continue;
      out.push({
        key: `j-${j.id}`,
        date: j.journey_date,
        time: j.journey_time,
        from: j.from_label || j.from_postcode || "—",
        to: j.to_label || j.to_postcode || "—",
        miles: Number(j.miles || 0),
        purpose: j.purpose || "",
        source: "manual",
        journey: j,
      });
    }

    out.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "").localeCompare(b.time || "");
    });
    return out;
  }, [appointments, journeys, baseLabel, pairMiles, submittedDates]);

  // Fetch any missing direct A→B distances for chained legs
  useEffect(() => {
    const needed: Array<{ from: string; to: string }> = [];
    const seen = new Set<string>();
    const apptsByDate: Record<string, Appt[]> = {};
    for (const a of appointments) {
      if (a.come_to_practitioner) continue;
      (apptsByDate[a.appointment_date] ??= []).push(a);
    }
    for (const list of Object.values(apptsByDate)) {
      list.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1], b = list[i];
        if (!a.postcode || !b.postcode) continue;
        const k = pairKey(a.postcode, b.postcode);
        if (seen.has(k) || pairMiles[k] != null) continue;
        seen.add(k);
        needed.push({ from: a.postcode, to: b.postcode });
      }
    }
    if (needed.length === 0) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, number> = {};
      for (const { from, to } of needed) {
        try {
          const { data } = await supabase.functions.invoke("calculate-drive-time", {
            body: { origin: from, destination: to },
          });
          const m = Number(data?.distance_miles);
          if (m > 0) updates[pairKey(from, to)] = m;
        } catch { /* ignore */ }
      }
      if (!cancelled && Object.keys(updates).length) {
        setPairMiles(prev => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
  }, [appointments]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthMiles = useMemo(() => rows.reduce((s, r) => s + r.miles, 0), [rows]);
  const priorMiles = useMemo(() => {
    // Approximate tax-year-to-date miles before this month: sum manual journeys (we have them) + all appointment auto miles in the same tax year before this month would need a separate query.
    // For simplicity, just count manual journey rows from prior periods (DB query already returns those).
    return allJourneys.filter(j => !j.hidden).reduce((s, j) => s + Number(j.miles || 0), 0);
  }, [allJourneys]);
  const monthCost = useMemo(() => calcCost(monthMiles, priorMiles), [monthMiles, priorMiles]);

  // Days that have visits but haven't been submitted yet (today and past only — future days never prompted).
  const pendingDays = useMemo(() => {
    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const byDate: Record<string, Appt[]> = {};
    for (const a of appointments) {
      if (a.come_to_practitioner) continue;
      if (a.appointment_date > todayStr) continue;
      (byDate[a.appointment_date] ??= []).push(a);
    }
    return Object.entries(byDate)
      .filter(([d]) => !submittedDates.has(d))
      .map(([d, list]) => {
        const total = list.length;
        const done = list.filter(a => a.status === "completed").length;
        return { date: d, total, done, allDone: done === total };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [appointments, submittedDates]);

  async function emailTestReport() {
    setEmailingTest(true);
    try {
      // Send a report for the currently-viewed month
      const target = new Date(month.getFullYear(), month.getMonth() + 1, 1); // function computes "previous month"
      const monthStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-01`;
      const { data, error } = await supabase.functions.invoke("email-monthly-mileage", {
        body: { month: monthStr },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Emailed mileage report to matt@shawscope.co.uk · £${(data as any)?.totalCost?.toFixed(2) || "0.00"}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setEmailingTest(false);
    }
  }

  // ===== Places handlers =====
  function openNewPlace() {
    setEditingPlace(null);
    setPlaceForm({ name: "", postcode: "", address: "", is_base: false });
    setPlaceDialogOpen(true);
  }
  function openEditPlace(p: Place) {
    setEditingPlace(p);
    setPlaceForm({ name: p.name, postcode: p.postcode, address: p.address || "", is_base: p.is_base });
    setPlaceDialogOpen(true);
  }
  async function savePlace() {
    if (!placeForm.name.trim() || !placeForm.postcode.trim()) {
      toast.error("Name and postcode required");
      return;
    }
    const payload = {
      name: placeForm.name.trim(),
      postcode: placeForm.postcode.trim().toUpperCase(),
      address: placeForm.address.trim() || null,
      is_base: placeForm.is_base,
    };
    const { error } = editingPlace
      ? await supabase.from("mileage_places").update(payload).eq("id", editingPlace.id)
      : await supabase.from("mileage_places").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Place saved");
    setPlaceDialogOpen(false);
    loadAll();
  }
  async function deletePlace(p: Place) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("mileage_places").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Place deleted");
    loadAll();
  }

  // ===== Journey handlers =====
  function openNewJourney() {
    setEditingJourney(null);
    setEditingApptKey(null);
    const today = new Date();
    const inMonth = today.getMonth() === month.getMonth() && today.getFullYear() === month.getFullYear();
    const d = inMonth ? today : new Date(month.getFullYear(), month.getMonth(), 1);
    const base = places.find(p => p.is_base);
    setJourneyForm({
      journey_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      from_place_id: base?.id || "",
      to_place_id: "",
      from_label: base?.name || "",
      to_label: "",
      from_postcode: base?.postcode || "",
      to_postcode: "",
      miles: "",
      purpose: "",
      notes: "",
    });
    setJourneyDialogOpen(true);
  }
  function openEditRow(r: Row) {
    if (r.journey) {
      setEditingJourney(r.journey);
      setEditingApptKey(null);
      setJourneyForm({
        journey_date: r.journey.journey_date,
        from_place_id: "",
        to_place_id: "",
        from_label: r.journey.from_label || "",
        to_label: r.journey.to_label || "",
        from_postcode: r.journey.from_postcode || "",
        to_postcode: r.journey.to_postcode || "",
        miles: String(r.journey.miles),
        purpose: r.journey.purpose || "",
        notes: r.journey.notes || "",
      });
    } else if (r.appointment) {
      // Editing an auto row → create override
      setEditingJourney(null);
      setEditingApptKey(r.appointment.id);
      setJourneyForm({
        journey_date: r.date,
        from_place_id: "",
        to_place_id: "",
        from_label: r.from,
        to_label: r.to,
        from_postcode: "",
        to_postcode: r.appointment.postcode || "",
        miles: String(r.miles),
        purpose: r.purpose,
        notes: "",
      });
    }
    setJourneyDialogOpen(true);
  }

  function applyPlace(side: "from" | "to", placeId: string) {
    const p = places.find(x => x.id === placeId);
    if (!p) return;
    setJourneyForm(prev => ({
      ...prev,
      [`${side}_place_id`]: placeId,
      [`${side}_label`]: p.name,
      [`${side}_postcode`]: p.postcode,
    }));
  }

  async function calculateMiles() {
    if (!journeyForm.from_postcode || !journeyForm.to_postcode) {
      toast.error("Need both postcodes");
      return;
    }
    setCalcing(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-drive-time", {
        body: { origin: journeyForm.from_postcode, destination: journeyForm.to_postcode },
      });
      if (error) throw error;
      const miles = data?.distance_miles;
      if (miles) {
        setJourneyForm(prev => ({ ...prev, miles: String(miles) }));
        toast.success(`Distance: ${miles} miles`);
      } else {
        toast.error("Couldn't calculate");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setCalcing(false);
    }
  }

  async function saveJourney() {
    const milesNum = parseFloat(journeyForm.miles);
    if (!journeyForm.journey_date || !milesNum || milesNum <= 0) {
      toast.error("Date and miles required");
      return;
    }
    const payload: any = {
      journey_date: journeyForm.journey_date,
      from_label: journeyForm.from_label || null,
      to_label: journeyForm.to_label || null,
      from_postcode: journeyForm.from_postcode?.toUpperCase() || null,
      to_postcode: journeyForm.to_postcode?.toUpperCase() || null,
      miles: milesNum,
      purpose: journeyForm.purpose || null,
      notes: journeyForm.notes || null,
    };
    let error;
    if (editingJourney) {
      ({ error } = await supabase.from("mileage_journeys").update(payload).eq("id", editingJourney.id));
    } else {
      payload.appointment_id = editingApptKey;
      payload.source = editingApptKey ? "auto" : "manual";
      ({ error } = await supabase.from("mileage_journeys").insert(payload));
    }
    if (error) { toast.error(error.message); return; }
    toast.success("Journey saved");
    setJourneyDialogOpen(false);
    loadAll();
  }

  async function deleteRow(r: Row) {
    if (r.journey) {
      if (!confirm("Delete this journey?")) return;
      const { error } = await supabase.from("mileage_journeys").delete().eq("id", r.journey.id);
      if (error) { toast.error(error.message); return; }
    } else if (r.appointment) {
      if (!confirm("Hide this auto-tracked journey from your mileage log?")) return;
      const { error } = await supabase.from("mileage_journeys").insert({
        journey_date: r.date,
        miles: 0,
        appointment_id: r.appointment.id,
        source: "auto",
        hidden: true,
        from_label: r.from,
        to_label: r.to,
      });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Removed");
    loadAll();
  }

  function downloadPdf() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Mileage Log — ${monthLabel}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`HMRC rates: 45p/mile up to 10,000 miles, then 25p/mile`, 14, 23);
    doc.text(`Tax-year miles before this month: ${priorMiles.toFixed(1)}`, 14, 28);

    const body = rows.map(r => [
      fmtDate(r.date),
      r.from,
      r.to,
      r.miles.toFixed(1),
      r.purpose,
      r.source === "auto" ? "Auto" : r.source === "return" ? "Return" : "Manual",
    ]);
    autoTable(doc, {
      startY: 34,
      head: [["Date", "From", "To", "Miles", "Purpose", "Source"]],
      body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [212, 145, 42] },
    });
    const finalY = (doc as any).lastAutoTable?.finalY || 40;
    doc.setFontSize(11);
    doc.text(`Total miles: ${monthMiles.toFixed(1)}`, 14, finalY + 10);
    doc.text(`Reclaimable expense: £${monthCost.toFixed(2)}`, 14, finalY + 16);
    doc.save(`mileage-${ymKey(month)}.pdf`);
  }

  return (
    <div className="space-y-4">
      {/* Month navigator + summary */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="outline" onClick={() => { const d = new Date(month); d.setMonth(d.getMonth() - 1); setMonth(d); }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-bold">{monthLabel}</h3>
              <button className="text-xs text-muted-foreground underline" onClick={() => { const d = new Date(); d.setDate(1); setMonth(d); }}>Today</button>
            </div>
            <Button size="sm" variant="outline" onClick={() => { const d = new Date(month); d.setMonth(d.getMonth() + 1); setMonth(d); }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-border bg-muted/40 p-2">
              <div className="text-xs text-muted-foreground">Trips</div>
              <div className="text-lg font-bold">{rows.length}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-2">
              <div className="text-xs text-muted-foreground">Miles</div>
              <div className="text-lg font-bold">{monthMiles.toFixed(1)}</div>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-950/30 p-2">
              <div className="text-xs text-amber-200/80">Expense</div>
              <div className="text-lg font-bold text-amber-300">£{monthCost.toFixed(2)}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={openNewJourney}><Plus className="h-4 w-4 mr-1" />Add Journey</Button>
            <Button size="sm" variant="outline" onClick={downloadPdf}><Download className="h-4 w-4 mr-1" />Download PDF</Button>
            <Button size="sm" variant="outline" onClick={emailTestReport} disabled={emailingTest}>
              <Mail className="h-4 w-4 mr-1" />{emailingTest ? "Sending…" : "Email this month"}
            </Button>
            <Button size="sm" variant="outline" onClick={loadAll} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Places */}
      {/* Pending Days — prompt to complete mileage */}
      {pendingDays.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-amber-400" /> Days awaiting mileage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingDays.map(d => (
              <div key={d.date} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/50 p-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{fmtDate(d.date)}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.done}/{d.total} visits done {d.allDone && <span className="text-emerald-400">· ready to submit</span>}
                  </div>
                </div>
                <Button size="sm" onClick={() => setCompleteDialogDate(d.date)} className={d.allDone ? "bg-amber-600 hover:bg-amber-500" : ""}>
                  Complete Day
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Saved Places */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Saved Places</span>
            <Button size="sm" variant="outline" onClick={openNewPlace}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {places.length === 0 ? (
            <div className="text-sm text-muted-foreground">No places yet. Add Base, Tesco Petrol, etc.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {places.map(p => (
                <div key={p.id} className="flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
                  {p.is_base && <Badge variant="secondary" className="text-[10px]">Base</Badge>}
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">· {p.postcode}</span>
                  <button onClick={() => openEditPlace(p)} className="ml-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                  <button onClick={() => deletePlace(p)} className="text-destructive hover:opacity-80"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journeys table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Journeys</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No journeys this month.</div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map(r => (
                <div key={r.key} className="p-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex-shrink-0 w-20 text-xs text-muted-foreground">{fmtDate(r.date)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate"><span className="text-muted-foreground">{r.from}</span> → <span className="font-medium">{r.to}</span></div>
                    {r.purpose && <div className="text-xs text-muted-foreground truncate">{r.purpose}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.source === "auto" ? "secondary" : "outline"} className="text-[10px]">{r.source}</Badge>
                    <span className="text-sm font-bold w-14 text-right">{r.miles.toFixed(1)} mi</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditRow(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteRow(r)}>
                      {r.source === "auto" && !r.journey ? <EyeOff className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Place dialog */}
      <Dialog open={placeDialogOpen} onOpenChange={setPlaceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPlace ? "Edit Place" : "New Place"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={placeForm.name} onChange={e => setPlaceForm({ ...placeForm, name: e.target.value })} placeholder="e.g. Tesco Petrol" /></div>
            <div><Label>Postcode</Label><Input value={placeForm.postcode} onChange={e => setPlaceForm({ ...placeForm, postcode: e.target.value })} placeholder="DT1 1AA" /></div>
            <div><Label>Address (optional)</Label><Input value={placeForm.address} onChange={e => setPlaceForm({ ...placeForm, address: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={placeForm.is_base} onChange={e => setPlaceForm({ ...placeForm, is_base: e.target.checked })} />
              Set as Base location
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlaceDialogOpen(false)}>Cancel</Button>
            <Button onClick={savePlace}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Journey dialog */}
      <Dialog open={journeyDialogOpen} onOpenChange={setJourneyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingJourney || editingApptKey ? "Edit Journey" : "New Journey"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div><Label>Date</Label><Input type="date" value={journeyForm.journey_date} onChange={e => setJourneyForm({ ...journeyForm, journey_date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>From (saved place)</Label>
                <Select value={journeyForm.from_place_id} onValueChange={v => applyPlace("from", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{places.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>To (saved place)</Label>
                <Select value={journeyForm.to_place_id} onValueChange={v => applyPlace("to", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{places.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>From label</Label><Input value={journeyForm.from_label} onChange={e => setJourneyForm({ ...journeyForm, from_label: e.target.value })} /></div>
              <div><Label>To label</Label><Input value={journeyForm.to_label} onChange={e => setJourneyForm({ ...journeyForm, to_label: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>From postcode</Label><Input value={journeyForm.from_postcode} onChange={e => setJourneyForm({ ...journeyForm, from_postcode: e.target.value })} /></div>
              <div><Label>To postcode</Label><Input value={journeyForm.to_postcode} onChange={e => setJourneyForm({ ...journeyForm, to_postcode: e.target.value })} /></div>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Miles</Label>
                <Input type="number" step="0.1" value={journeyForm.miles} onChange={e => setJourneyForm({ ...journeyForm, miles: e.target.value })} />
              </div>
              <Button type="button" variant="outline" onClick={calculateMiles} disabled={calcing}>
                {calcing ? "…" : "Calc"}
              </Button>
            </div>
            <div><Label>Purpose</Label><Input value={journeyForm.purpose} onChange={e => setJourneyForm({ ...journeyForm, purpose: e.target.value })} placeholder="e.g. Fuel, Patient visit" /></div>
            <div><Label>Notes</Label><Textarea value={journeyForm.notes} onChange={e => setJourneyForm({ ...journeyForm, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJourneyDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveJourney}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {completeDialogDate && (
        <CompleteDayMileageDialog
          open={!!completeDialogDate}
          onOpenChange={(v) => { if (!v) setCompleteDialogDate(null); }}
          date={completeDialogDate}
          onSubmitted={() => { setCompleteDialogDate(null); loadAll(); }}
        />
      )}
    </div>
  );
}