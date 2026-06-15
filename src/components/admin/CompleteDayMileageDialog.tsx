import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Plus, Trash2, Home, MapPin, Calculator, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Place = { id: string; name: string; postcode: string; is_base: boolean };
type Appt = {
  id: string;
  appointment_time: string;
  client_name: string;
  postcode: string | null;
  travel_distance_miles: number | null;
  come_to_practitioner: boolean;
  status: string;
};

type Stop = {
  uid: string;
  kind: "base" | "appointment" | "place";
  label: string;
  postcode: string;
  appointment_id?: string;
  place_id?: string;
};

type Leg = {
  uid: string;
  from: Stop;
  to: Stop;
  miles: string;
  loadingMiles?: boolean;
  // Carry through appointment association: a leg "to" an appointment counts as that visit.
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string; // YYYY-MM-DD
  onSubmitted?: () => void;
}

function fmtDate(d: string) {
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function legsFromStops(stops: Stop[], existingMiles?: Record<string, number>): Leg[] {
  const out: Leg[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const k = `${stops[i].postcode}|${stops[i + 1].postcode}`.toUpperCase();
    const m = existingMiles?.[k];
    out.push({
      uid: uid(),
      from: stops[i],
      to: stops[i + 1],
      miles: typeof m === "number" ? String(m) : "",
    });
  }
  return out;
}

export default function CompleteDayMileageDialog({ open, onOpenChange, date, onSubmitted }: Props) {
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [insertPlaceId, setInsertPlaceId] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const base = useMemo(() => places.find(p => p.is_base) || null, [places]);
  const totalMiles = useMemo(
    () => legs.reduce((s, l) => s + (parseFloat(l.miles) || 0), 0),
    [legs]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [pl, ap, sub] = await Promise.all([
          supabase.from("mileage_places").select("id,name,postcode,is_base").order("is_base", { ascending: false }).order("name"),
          supabase.from("appointments")
            .select("id, appointment_time, client_name, postcode, travel_distance_miles, come_to_practitioner, status")
            .eq("appointment_date", date)
            .not("status", "in", "(cancelled,rejected,form_only)")
            .order("appointment_time"),
          supabase.from("mileage_day_submissions").select("journey_date").eq("journey_date", date).maybeSingle(),
        ]);
        if (cancelled) return;
        const placesList = (pl.data || []) as Place[];
        const apptsList = ((ap.data || []) as Appt[]).filter(a => !a.come_to_practitioner);
        setPlaces(placesList);
        setAppts(apptsList);
        setAlreadySubmitted(!!sub.data);

        const baseStop: Stop | null = (() => {
          const b = placesList.find(p => p.is_base);
          return b ? { uid: uid(), kind: "base", label: b.name, postcode: b.postcode, place_id: b.id } : null;
        })();

        const apptStops: Stop[] = apptsList.map(a => ({
          uid: uid(),
          kind: "appointment",
          label: a.client_name + (a.postcode ? ` (${a.postcode})` : ""),
          postcode: a.postcode || "",
          appointment_id: a.id,
        }));

        const initialStops: Stop[] =
          baseStop && apptStops.length
            ? [baseStop, ...apptStops, { ...baseStop, uid: uid() }]
            : apptStops;

        setStops(initialStops);

        // Seed miles from appointments' travel_distance_miles for base→first leg, and reuse calculate-drive-time for the rest lazily
        const mileMap: Record<string, number> = {};
        if (baseStop && apptsList[0]?.travel_distance_miles) {
          mileMap[`${baseStop.postcode}|${apptsList[0].postcode || ""}`.toUpperCase()] =
            Number(apptsList[0].travel_distance_miles);
        }
        // For end-of-day return use the last appt's recorded distance as a default
        const lastAppt = apptsList[apptsList.length - 1];
        if (baseStop && lastAppt?.travel_distance_miles) {
          mileMap[`${lastAppt.postcode || ""}|${baseStop.postcode}`.toUpperCase()] =
            Number(lastAppt.travel_distance_miles);
        }
        const initialLegs = legsFromStops(initialStops, mileMap);
        setLegs(initialLegs);

        // Auto-fetch any blank legs in background
        setTimeout(() => fillMissingMiles(initialLegs), 100);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date]);

  async function fillMissingMiles(currentLegs: Leg[]) {
    const updates: Array<{ uid: string; miles: number }> = [];
    for (const l of currentLegs) {
      if (l.miles || !l.from.postcode || !l.to.postcode) continue;
      try {
        const { data } = await supabase.functions.invoke("calculate-drive-time", {
          body: { origin: l.from.postcode, destination: l.to.postcode },
        });
        const m = Number(data?.distance_miles);
        if (m > 0) updates.push({ uid: l.uid, miles: Math.round(m * 10) / 10 });
      } catch { /* ignore */ }
    }
    if (updates.length) {
      setLegs(prev => prev.map(l => {
        const u = updates.find(x => x.uid === l.uid);
        return u ? { ...l, miles: String(u.miles) } : l;
      }));
    }
  }

  function rebuildLegsFromStops(newStops: Stop[]) {
    // Preserve previously-entered miles for unchanged from→to pairs
    const prevMap: Record<string, string> = {};
    for (const l of legs) prevMap[`${l.from.uid}|${l.to.uid}`] = l.miles;
    const next: Leg[] = [];
    for (let i = 0; i < newStops.length - 1; i++) {
      const key = `${newStops[i].uid}|${newStops[i + 1].uid}`;
      next.push({
        uid: uid(),
        from: newStops[i],
        to: newStops[i + 1],
        miles: prevMap[key] || "",
      });
    }
    setLegs(next);
    setTimeout(() => fillMissingMiles(next), 100);
  }

  function moveStop(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= stops.length) return;
    const next = stops.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    setStops(next);
    rebuildLegsFromStops(next);
  }

  function removeStop(idx: number) {
    if (stops.length <= 1) return;
    const next = stops.slice();
    next.splice(idx, 1);
    setStops(next);
    rebuildLegsFromStops(next);
  }

  function insertStopAfter(idx: number, placeId: string) {
    const p = places.find(x => x.id === placeId);
    if (!p) return;
    const newStop: Stop = {
      uid: uid(),
      kind: p.is_base ? "base" : "place",
      label: p.name,
      postcode: p.postcode,
      place_id: p.id,
    };
    const next = stops.slice();
    next.splice(idx + 1, 0, newStop);
    setStops(next);
    rebuildLegsFromStops(next);
    setInsertPlaceId(prev => ({ ...prev, [stops[idx].uid]: "" }));
  }

  async function calcLeg(legUid: string) {
    const l = legs.find(x => x.uid === legUid);
    if (!l || !l.from.postcode || !l.to.postcode) { toast.error("Missing postcode"); return; }
    setLegs(prev => prev.map(x => x.uid === legUid ? { ...x, loadingMiles: true } : x));
    try {
      const { data, error } = await supabase.functions.invoke("calculate-drive-time", {
        body: { origin: l.from.postcode, destination: l.to.postcode },
      });
      if (error) throw error;
      const m = Number(data?.distance_miles);
      if (m > 0) {
        setLegs(prev => prev.map(x => x.uid === legUid ? { ...x, miles: String(Math.round(m * 10) / 10), loadingMiles: false } : x));
      } else {
        toast.error("Couldn't calculate");
        setLegs(prev => prev.map(x => x.uid === legUid ? { ...x, loadingMiles: false } : x));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed");
      setLegs(prev => prev.map(x => x.uid === legUid ? { ...x, loadingMiles: false } : x));
    }
  }

  async function submit() {
    if (alreadySubmitted) { toast.error("Already submitted"); return; }
    if (legs.length === 0) { toast.error("No legs to submit"); return; }
    const bad = legs.find(l => !l.miles || parseFloat(l.miles) < 0);
    if (bad) { toast.error("Each leg needs miles (0 is OK)"); return; }

    setSubmitting(true);
    try {
      const now = new Date();
      const baseTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;

      const rows = legs.map((l, i) => {
        const miles = parseFloat(l.miles) || 0;
        const isReturnToBase = l.to.kind === "base";
        const apptId = l.to.appointment_id || null; // associate the leg with the visit it ENDS at
        return {
          journey_date: date,
          journey_time: baseTime,
          from_label: l.from.label,
          from_postcode: l.from.postcode || null,
          to_label: l.to.label,
          to_postcode: l.to.postcode || null,
          miles,
          purpose: l.to.kind === "appointment"
            ? `Visit · ${l.to.label}`
            : isReturnToBase ? "Return to base" : `Stop · ${l.to.label}`,
          appointment_id: apptId,
          is_return_to_base: isReturnToBase,
          source: apptId ? "auto" : isReturnToBase ? "return" : "manual",
        };
      });

      // Delete any prior auto/return entries for this date so re-submission is idempotent
      await supabase.from("mileage_journeys")
        .delete()
        .eq("journey_date", date)
        .in("source", ["auto", "return"]);

      const { error: insErr } = await supabase.from("mileage_journeys").insert(rows);
      if (insErr) throw insErr;

      const { error: subErr } = await supabase.from("mileage_day_submissions").upsert({
        journey_date: date,
        total_miles: Math.round(totalMiles * 10) / 10,
      });
      if (subErr) throw subErr;

      toast.success(`Day mileage saved · ${totalMiles.toFixed(1)} mi`);
      onSubmitted?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Complete mileage · {fmtDate(date)}</DialogTitle>
          <DialogDescription>
            Review every leg of today's travel, insert detours if needed, then submit to add it all to your mileage log.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {alreadySubmitted && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4 inline mr-1" /> This day has already been submitted.
            </div>
          )}

          {loading ? (
            <div className="text-sm text-muted-foreground p-4">Loading…</div>
          ) : stops.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4">
              No appointments for this date. Add a base location and visits first.
            </div>
          ) : !base ? (
            <div className="text-sm text-amber-400 p-3 rounded-md border border-amber-500/40 bg-amber-500/10">
              No Base location set. Add one in Saved Places before submitting.
            </div>
          ) : null}

          {/* Stop list with legs interleaved */}
          {stops.map((s, idx) => {
            const leg = idx < stops.length - 1 ? legs[idx] : null;
            const Icon = s.kind === "base" ? Home : s.kind === "appointment" ? MapPin : MapPin;
            const tone =
              s.kind === "base" ? "border-amber-500/40 bg-amber-500/5"
              : s.kind === "appointment" ? "border-blue-500/40 bg-blue-500/5"
              : "border-emerald-500/40 bg-emerald-500/5";

            return (
              <div key={s.uid} className="space-y-2">
                <div className={`rounded-lg border ${tone} p-3 flex items-center gap-2`}>
                  <Icon className="h-4 w-4 text-foreground/70 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase">{s.kind}</Badge>
                      <span className="text-sm font-semibold truncate">{s.label}</span>
                    </div>
                    {s.postcode && <div className="text-[11px] text-muted-foreground font-mono">{s.postcode}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === 0} onClick={() => moveStop(idx, -1)} title="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === stops.length - 1} onClick={() => moveStop(idx, 1)} title="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    {s.kind !== "appointment" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeStop(idx)} title="Remove stop">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Insert stop after this stop */}
                {idx < stops.length - 1 && (
                  <div className="flex items-center gap-2 pl-4">
                    <Select
                      value={insertPlaceId[s.uid] || ""}
                      onValueChange={(v) => { setInsertPlaceId(prev => ({ ...prev, [s.uid]: v })); insertStopAfter(idx, v); }}
                    >
                      <SelectTrigger className="h-8 text-xs w-44">
                        <SelectValue placeholder="+ Insert stop" />
                      </SelectTrigger>
                      <SelectContent>
                        {places.length === 0 && <SelectItem value="__none" disabled>No saved places</SelectItem>}
                        {places.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.is_base ? "🏠 " : ""}{p.name} · {p.postcode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {leg && (
                      <div className="flex items-center gap-1 flex-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Miles</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          value={leg.miles}
                          onChange={e => setLegs(prev => prev.map(x => x.uid === leg.uid ? { ...x, miles: e.target.value } : x))}
                          className="h-8 w-20 text-sm"
                          placeholder="0.0"
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => calcLeg(leg.uid)} title="Calculate" disabled={leg.loadingMiles}>
                          <Calculator className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t border-border pt-3 flex-row items-center sm:justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-bold">{totalMiles.toFixed(1)} mi</span>
            <span className="text-muted-foreground"> · {legs.length} legs</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting || alreadySubmitted || legs.length === 0 || !base}>
              {submitting ? "Saving…" : alreadySubmitted ? "Submitted" : "Submit Mileage"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
