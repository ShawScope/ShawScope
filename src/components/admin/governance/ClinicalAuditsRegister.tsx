import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { ClipboardCheck, Pencil, Trash2 } from "lucide-react";
import { RegisterShell, logAccess } from "./RegisterShell";
import AttachmentsList from "./AttachmentsList";
import SuggestedChecklist, { Suggestion } from "./SuggestedChecklist";

interface Row {
  id: string;
  audit_type: string;
  audit_date: string;
  sample_size: number | null;
  score: number | null;
  findings: string | null;
  actions: string | null;
  next_due: string | null;
}

const blank = {
  audit_type: "",
  audit_date: format(new Date(), "yyyy-MM-dd"),
  sample_size: "",
  score: "",
  findings: "",
  actions: "",
  next_due: "",
};

const scoreTone = (s: number | null) => {
  if (s == null) return "border-slate-700 text-slate-300";
  if (s >= 90) return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
  if (s >= 75) return "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return "border-rose-500/40 text-rose-300 bg-rose-500/10";
};

const dueTone = (date: string | null) => {
  if (!date) return "border-slate-700 text-slate-400";
  const d = differenceInDays(parseISO(date), new Date());
  if (d < 0) return "border-rose-500/40 text-rose-300 bg-rose-500/10";
  if (d <= 30) return "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
};

const SUGGESTIONS: Omit<Suggestion<Row>, "matches">[] = [
  { key: "record-keeping", label: "Record-keeping audit", hint: "Sample 10 patient records — completeness, legibility, signed entries." },
  { key: "consent", label: "Consent audit", hint: "Check consent captured before treatment, valid signature, capacity documented." },
  { key: "ipc", label: "Infection prevention & control audit", hint: "Hand hygiene, decontamination, PPE, sharps & waste — covered by the IPC register." },
  { key: "otoscopy", label: "Otoscopy documentation audit", hint: "Otoscopy findings, ear canal/TM described, photo evidence retained." },
  { key: "hand-hygiene", label: "Hand hygiene audit", hint: "WHO 5 moments — observe & record across 10 patient contacts." },
  { key: "decontamination", label: "Equipment decontamination audit", hint: "Speculae, curettes, irrigation tips — process & evidence." },
  { key: "microsuction-technique", label: "Microsuction technique audit", hint: "Self/peer review — suction pressure, tip selection, complications." },
  { key: "outcome", label: "Patient outcome / satisfaction audit", hint: "Outcome of wax removal, follow-up data, NPS or satisfaction score." },
  { key: "reattendance", label: "Re-attendance / failed wax removal audit", hint: "Rate of incomplete removal, reasons, prevention plan." },
  { key: "safeguarding-docs", label: "Safeguarding documentation audit", hint: "Concerns logged, referrals made, training current." },
];

const matchByType = (needle: string) => (rows: Row[]) =>
  rows.find(r => r.audit_type?.toLowerCase().includes(needle.toLowerCase()));

// attach matchers
const ENRICHED: Suggestion<Row>[] = SUGGESTIONS.map(s => ({
  ...s,
  matches: matchByType(
    s.key === "record-keeping" ? "record" :
    s.key === "consent"        ? "consent" :
    s.key === "ipc"            ? "infection" :
    s.key === "otoscopy"       ? "otoscopy" :
    s.key === "hand-hygiene"   ? "hand hygiene" :
    s.key === "decontamination"? "decontam" :
    s.key === "microsuction-technique" ? "microsuction" :
    s.key === "outcome"        ? "outcome" :
    s.key === "reattendance"   ? "re-attend" :
    s.key === "safeguarding-docs" ? "safeguarding" :
    s.label,
  ),
}));

const ClinicalAuditsRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_audits").select("*").order("audit_date", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = (prefill?: Partial<typeof blank>) => {
    setEditId(null);
    setForm({ ...blank, ...(prefill ?? {}) });
    setOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      audit_type: r.audit_type,
      audit_date: r.audit_date,
      sample_size: r.sample_size?.toString() ?? "",
      score: r.score?.toString() ?? "",
      findings: r.findings ?? "",
      actions: r.actions ?? "",
      next_due: r.next_due ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.audit_type.trim()) { toast.error("Audit title / type is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        audit_type: form.audit_type.trim(),
        audit_date: form.audit_date,
        sample_size: form.sample_size ? Number(form.sample_size) : null,
        score: form.score ? Number(form.score) : null,
        findings: form.findings.trim() || null,
        actions: form.actions.trim() || null,
        next_due: form.next_due || null,
      };
      if (editId) {
        const { error } = await supabase.from("gov_audits").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_audits", { id: editId });
        toast.success("Audit updated");
      } else {
        const { error } = await supabase.from("gov_audits").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_audits", { audit_type: payload.audit_type });
        toast.success("Audit logged");
      }
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this audit?")) return;
    const { error } = await supabase.from("gov_audits").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_audits", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Clinical audits"
      description="Periodic clinical audits — record-keeping, consent, IPC, otoscopy, outcomes — with findings, actions and re-audit dates."
      count={rows.length}
      onNew={() => openNew()}
      newLabel="New audit"
      isEmpty={false}
      empty={{ title: "No audits yet", hint: "Use the suggested checklist below to add your first audit." }}
    >
      <SuggestedChecklist
        storageKey="audits"
        suggestions={ENRICHED}
        rows={rows}
        onAdd={(s) => openNew({ audit_type: s.label })}
        onOpenMatch={(matched) => openEdit(matched)}
        matchLabel={(m) => `${m.audit_type} (${format(parseISO(m.audit_date), "dd/MM/yyyy")})`}
      />

      {rows.length === 0 ? (
        <Card className="p-8 bg-slate-950/60 border-slate-800 text-center">
          <ClipboardCheck className="h-8 w-8 mx-auto mb-3 text-slate-500" />
          <h3 className="text-sm font-medium">No audits recorded yet</h3>
          <p className="text-xs text-muted-foreground mt-1">Pick an item from the suggested checklist above or click "New audit".</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map(r => {
            const dueDays = r.next_due ? differenceInDays(parseISO(r.next_due), new Date()) : null;
            return (
              <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <ClipboardCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="font-medium text-sm">{r.audit_type}</span>
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                        {format(parseISO(r.audit_date), "dd/MM/yyyy")}
                      </Badge>
                      {r.score != null && (
                        <Badge variant="outline" className={`text-[10px] ${scoreTone(r.score)}`}>Score {r.score}%</Badge>
                      )}
                      {r.sample_size != null && (
                        <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">n={r.sample_size}</Badge>
                      )}
                      {dueDays != null && (
                        <Badge variant="outline" className={`text-[10px] ${dueTone(r.next_due!)}`}>
                          Re-audit {format(parseISO(r.next_due!), "dd/MM/yyyy")}
                        </Badge>
                      )}
                    </div>
                    {r.findings && <p className="text-sm text-slate-200 whitespace-pre-line line-clamp-3">{r.findings}</p>}
                    {r.actions && <p className="text-[11px] text-amber-300/80 mt-1 whitespace-pre-line">Actions: {r.actions}</p>}
                    <div className="mt-2"><AttachmentsList recordType="gov_audits" recordId={r.id} compact /></div>
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
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit audit" : "New clinical audit"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Audit title / type *</Label><Input value={form.audit_type} onChange={e => setForm({...form, audit_type: e.target.value})} placeholder="e.g. Record-keeping audit Q1" /></div>
            <div><Label>Audit date</Label><Input type="date" value={form.audit_date} onChange={e => setForm({...form, audit_date: e.target.value})} /></div>
            <div><Label>Re-audit due</Label><Input type="date" value={form.next_due} onChange={e => setForm({...form, next_due: e.target.value})} /></div>
            <div><Label>Sample size</Label><Input type="number" min={0} value={form.sample_size} onChange={e => setForm({...form, sample_size: e.target.value})} placeholder="e.g. 10" /></div>
            <div><Label>Compliance score (%)</Label><Input type="number" min={0} max={100} value={form.score} onChange={e => setForm({...form, score: e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Findings</Label><Textarea rows={3} value={form.findings} onChange={e => setForm({...form, findings: e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Corrective actions</Label><Textarea rows={3} value={form.actions} onChange={e => setForm({...form, actions: e.target.value})} /></div>
            {editId && <div className="sm:col-span-2"><Label className="mb-2 block">Evidence</Label><AttachmentsList recordType="gov_audits" recordId={editId} /></div>}
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

export default ClinicalAuditsRegister;