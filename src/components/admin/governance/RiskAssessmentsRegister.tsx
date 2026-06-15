import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { HardHat, Trash2, Pencil } from "lucide-react";
import { RegisterShell, logAccess, statusTone } from "./RegisterShell";
import { ragForDays, ragTone } from "./types";
import AttachmentsList from "./AttachmentsList";
import AIDraftButton from "./AIDraftButton";
import SuggestedChecklist, { Suggestion } from "./SuggestedChecklist";

interface Row {
  id: string; title: string; category: string | null; hazards: string | null;
  controls: string | null; risk_rating: string | null;
  last_reviewed: string | null; next_review: string | null; status: string;
}

const CATEGORIES = ["clinical", "lone_working", "infection", "fire", "manual_handling", "equipment", "travel", "other"];
const RATINGS = ["low", "medium", "high", "very_high"];
const STATUSES = ["current", "under_review", "retired"];

const matchTitle = (needle: string) => (rows: Row[]) =>
  rows.find(r => r.title?.toLowerCase().includes(needle.toLowerCase()));

const SUGGESTIONS: Suggestion<Row>[] = [
  { key: "lone-working", label: "Lone working (home visits)", hint: "Travel HUD, check-in, emergency contact, escalation.", matches: matchTitle("lone") },
  { key: "sharps", label: "Sharps & instruments", hint: "Curettes, sharps bin, needle-stick procedure.", matches: matchTitle("sharps") },
  { key: "ipc", label: "Infection prevention & control", hint: "Hand hygiene, PPE, decontamination, BBV exposure.", matches: matchTitle("infection") },
  { key: "noise", label: "Microsuction noise exposure", hint: "Suction noise levels, hearing protection if needed.", matches: matchTitle("noise") },
  { key: "slips", label: "Slips, trips & falls (patient homes)", hint: "Lighting, clutter, pets, stairs, rugs.", matches: matchTitle("slips") },
  { key: "coshh", label: "COSHH (chemicals & wipes)", hint: "Alcohol wipes, disinfectants, MSDS sheets.", matches: matchTitle("coshh") },
  { key: "fire", label: "Fire safety (mobile setup)", hint: "Battery devices, escape route in patient home.", matches: matchTitle("fire") },
  { key: "manual-handling", label: "Manual handling (equipment cases)", hint: "Lifting kit bags, carrying chairs, posture.", matches: matchTitle("manual") },
  { key: "vehicle", label: "Vehicle / driving safety", hint: "Tyres, lights, mileage logs, breakdown cover.", matches: matchTitle("vehicle") },
  { key: "vasovagal", label: "Patient fainting / vasovagal", hint: "Recognising, positioning, recovery, escalation.", matches: matchTitle("faint") },
];

const blank = {
  title: "", category: "clinical", hazards: "", controls: "",
  risk_rating: "low", last_reviewed: format(new Date(), "yyyy-MM-dd"),
  next_review: "", status: "current",
};

const ratingTone = (r: string | null) => {
  switch (r) {
    case "very_high": return "bg-rose-500/15 text-rose-300 border-rose-500/40";
    case "high": return "bg-orange-500/15 text-orange-300 border-orange-500/40";
    case "medium": return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    case "low": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    default: return "bg-slate-500/15 text-slate-300 border-slate-500/40";
  }
};

const RiskAssessmentsRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_risk_assessments").select("*").order("next_review", { ascending: true, nullsFirst: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      title: r.title, category: r.category ?? "clinical",
      hazards: r.hazards ?? "", controls: r.controls ?? "",
      risk_rating: r.risk_rating ?? "low",
      last_reviewed: r.last_reviewed ?? format(new Date(), "yyyy-MM-dd"),
      next_review: r.next_review ?? "", status: r.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(), category: form.category,
        hazards: form.hazards.trim() || null, controls: form.controls.trim() || null,
        risk_rating: form.risk_rating,
        last_reviewed: form.last_reviewed || null,
        next_review: form.next_review || null,
        status: form.status,
      };
      if (editId) {
        const { error } = await supabase.from("gov_risk_assessments").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_risk_assessments", { id: editId });
        toast.success("Risk assessment updated");
      } else {
        const { error } = await supabase.from("gov_risk_assessments").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_risk_assessments", { title: form.title });
        toast.success("Risk assessment added");
      }
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this risk assessment?")) return;
    const { error } = await supabase.from("gov_risk_assessments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_risk_assessments", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Risk assessments"
      description="Operational risk register with hazards, controls, ratings and review dates."
      count={rows.length}
      onNew={openNew}
      newLabel="New assessment"
      toolbar={
        <AIDraftButton
          kind="risk_assessment"
          onDraft={(d) => {
            setEditId(null);
            setForm({
              ...blank,
              title: d.title,
              hazards: d.meta?.hazards || d.body,
              controls: d.meta?.controls || "",
              category: d.meta?.category || "clinical",
              risk_rating: d.meta?.risk_rating || "low",
            });
            setOpen(true);
          }}
        />
      }
      isEmpty={rows.length === 0}
      empty={{ title: "No risk assessments yet", hint: "Add assessments for lone working, infection control, manual handling, fire safety and clinical procedures." }}
    >
      <SuggestedChecklist
        storageKey="risk"
        suggestions={SUGGESTIONS}
        rows={rows}
        onAdd={(s) => {
          setEditId(null);
          setForm({ ...blank, title: s.label });
          setOpen(true);
        }}
        onOpenMatch={(matched) => openEdit(matched)}
        matchLabel={(m) => m.title}
      />
      <div className="space-y-2">
        {rows.map(r => {
          const dueDays = r.next_review ? differenceInDays(parseISO(r.next_review), new Date()) : null;
          return (
            <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <HardHat className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="font-medium text-sm">{r.title}</span>
                    {r.risk_rating && <Badge variant="outline" className={`text-[10px] ${ratingTone(r.risk_rating)}`}>{r.risk_rating.replace("_"," ")}</Badge>}
                    {r.category && <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">{r.category.replace("_"," ")}</Badge>}
                    <Badge variant="outline" className={`text-[10px] ${statusTone(r.status)}`}>{r.status.replace("_"," ")}</Badge>
                  </div>
                  {r.hazards && <p className="text-[12px] text-slate-300 line-clamp-1"><strong>Hazards:</strong> {r.hazards}</p>}
                  {r.controls && <p className="text-[12px] text-slate-300 line-clamp-1"><strong>Controls:</strong> {r.controls}</p>}
                  <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                    {r.last_reviewed && <span>Last reviewed {format(parseISO(r.last_reviewed), "dd/MM/yyyy")}</span>}
                    {dueDays != null && (
                      <span className={`px-1.5 rounded ${ragTone[ragForDays(dueDays)]}`}>
                        Next review {format(parseISO(r.next_review!), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                  <div className="mt-2"><AttachmentsList recordType="gov_risk_assessments" recordId={r.id} compact /></div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit risk assessment" : "New risk assessment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Risk rating</Label>
              <Select value={form.risk_rating} onValueChange={v => setForm({...form, risk_rating: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RATINGS.map(r => <SelectItem key={r} value={r}>{r.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Hazards</Label><Textarea rows={3} value={form.hazards} onChange={e => setForm({...form, hazards: e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Control measures</Label><Textarea rows={3} value={form.controls} onChange={e => setForm({...form, controls: e.target.value})} /></div>
            <div><Label>Last reviewed</Label><Input type="date" value={form.last_reviewed} onChange={e => setForm({...form, last_reviewed: e.target.value})} /></div>
            <div><Label>Next review</Label><Input type="date" value={form.next_review} onChange={e => setForm({...form, next_review: e.target.value})} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {editId && <div className="sm:col-span-2"><Label className="mb-2 block">Attachments</Label><AttachmentsList recordType="gov_risk_assessments" recordId={editId} /></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RegisterShell>
  );
};

export default RiskAssessmentsRegister;