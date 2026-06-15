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
import { Sparkles, Trash2, Pencil } from "lucide-react";
import { RegisterShell, logAccess } from "./RegisterShell";
import { ragForDays, ragTone } from "./types";
import AttachmentsList from "./AttachmentsList";

const CHECKLIST_TEMPLATE: { id: string; label: string }[] = [
  { id: "hand_hygiene", label: "Hand hygiene products available & in date" },
  { id: "ppe", label: "Adequate PPE stock (gloves, aprons, masks) correctly worn" },
  { id: "decontamination", label: "Equipment decontaminated between patients per SOP" },
  { id: "single_use", label: "Single-use items disposed of correctly" },
  { id: "sharps", label: "Sharps bin signed, dated, not >2/3 full, within 3-month window" },
  { id: "waste", label: "Clinical waste segregated (orange/yellow)" },
  { id: "surfaces", label: "Work surfaces cleaned before / after each appointment" },
  { id: "vaccination", label: "Practitioner vaccinations up to date (Hep B etc.)" },
  { id: "spillage", label: "Spillage kit accessible & in date" },
  { id: "training", label: "IPC training/CPD completed in last 12 months" },
  { id: "documentation", label: "Cleaning & decontamination log up to date" },
];

type CheckValue = "yes" | "no" | "na" | "";
interface ChecklistItem { id: string; label: string; value: CheckValue; note?: string }

const computeScore = (items: ChecklistItem[]): number | null => {
  const counted = items.filter(i => i.value === "yes" || i.value === "no");
  if (counted.length === 0) return null;
  return Math.round((counted.filter(i => i.value === "yes").length / counted.length) * 100);
};

const collateFindings = (items: ChecklistItem[]) => {
  const noItems = items.filter(i => i.value === "no");
  return {
    findings: noItems.length ? noItems.map(i => `• ${i.label}${i.note ? ` — ${i.note}` : ""}`).join("\n") : "",
    actions: noItems.length ? noItems.map(i => `• Address: ${i.label}`).join("\n") : "",
  };
};

interface Row {
  id: string; audit_date: string; score: number | null; findings: string | null;
  actions: string | null; next_due: string | null;
  checklist?: any;
}

const blank = {
  audit_date: format(new Date(), "yyyy-MM-dd"), score: "",
  findings: "", actions: "", next_due: "",
};

const scoreTone = (s: number | null) => {
  if (s == null) return "border-slate-700 text-slate-300";
  if (s >= 90) return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
  if (s >= 75) return "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return "border-rose-500/40 text-rose-300 bg-rose-500/10";
};

const IPCAuditsRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    CHECKLIST_TEMPLATE.map(t => ({ id: t.id, label: t.label, value: "" as CheckValue, note: "" })),
  );

  const load = async () => {
    const { data } = await supabase.from("gov_ipc_audits").select("*").order("audit_date", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm({ ...blank });
    setChecklist(CHECKLIST_TEMPLATE.map(t => ({ id: t.id, label: t.label, value: "" as CheckValue, note: "" })));
    setOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      audit_date: r.audit_date, score: r.score?.toString() ?? "",
      findings: r.findings ?? "", actions: r.actions ?? "", next_due: r.next_due ?? "",
    });
    const existing: ChecklistItem[] = Array.isArray(r.checklist) ? r.checklist : [];
    const merged = CHECKLIST_TEMPLATE.map(t =>
      existing.find(e => e.id === t.id) ?? { id: t.id, label: t.label, value: "" as CheckValue, note: "" },
    );
    setChecklist(merged);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const autoScore = computeScore(checklist);
      const auto = collateFindings(checklist);
      const payload: any = {
        audit_date: form.audit_date,
        score: form.score ? Number(form.score) : autoScore,
        findings: form.findings.trim() || auto.findings || null,
        actions: form.actions.trim() || auto.actions || null,
        next_due: form.next_due || null,
        checklist,
      };
      if (editId) {
        const { error } = await supabase.from("gov_ipc_audits").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_ipc_audits", { id: editId });
        toast.success("Audit updated");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("gov_ipc_audits").insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
        await logAccess(supabase, "create", "gov_ipc_audits", { score: payload.score });
        toast.success("Audit logged");
      }
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this IPC audit?")) return;
    const { error } = await supabase.from("gov_ipc_audits").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_ipc_audits", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Infection prevention & control"
      description="Periodic IPC audits with scoring, findings, corrective actions and next-due date."
      count={rows.length}
      onNew={openNew}
      newLabel="New IPC audit"
      isEmpty={rows.length === 0}
      empty={{ title: "No IPC audits recorded", hint: "Run an IPC self-audit at least every 6 months covering hand hygiene, decontamination, PPE, sharps and waste." }}
    >
      <div className="space-y-2">
        {rows.map(r => {
          const dueDays = r.next_due ? differenceInDays(parseISO(r.next_due), new Date()) : null;
          return (
            <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="font-medium text-sm">Audit · {format(parseISO(r.audit_date), "dd/MM/yyyy")}</span>
                    {r.score != null && <Badge variant="outline" className={`text-[10px] ${scoreTone(r.score)}`}>Score {r.score}%</Badge>}
                    {dueDays != null && (
                      <Badge variant="outline" className={`text-[10px] ${ragTone[ragForDays(dueDays)]}`}>
                        Next due {format(parseISO(r.next_due!), "dd/MM/yyyy")}
                      </Badge>
                    )}
                  </div>
                  {r.findings && <p className="text-sm text-slate-200 whitespace-pre-line line-clamp-3">{r.findings}</p>}
                  {r.actions && <p className="text-[11px] text-amber-300/80 mt-1 whitespace-pre-line">Actions: {r.actions}</p>}
                  <div className="mt-2"><AttachmentsList recordType="gov_ipc_audits" recordId={r.id} compact /></div>
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit IPC audit" : "New IPC audit"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Audit date</Label><Input type="date" value={form.audit_date} onChange={e => setForm({...form, audit_date: e.target.value})} /></div>
            <div><Label>Next due</Label><Input type="date" value={form.next_due} onChange={e => setForm({...form, next_due: e.target.value})} /></div>
            <div><Label>Score override (%)</Label><Input type="number" min={0} max={100} value={form.score} placeholder={`Auto: ${computeScore(checklist) ?? "—"}`} onChange={e => setForm({...form, score: e.target.value})} /></div>
            <div className="sm:col-span-2 mt-2">
              <Label className="mb-2 block">Checklist</Label>
              <div className="space-y-1.5">
                {checklist.map((item, idx) => (
                  <div key={item.id} className="p-2 rounded border border-slate-800 bg-slate-900/40">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs flex-1 min-w-0">{item.label}</span>
                      <div className="flex gap-1 shrink-0">
                        {(["yes","no","na"] as CheckValue[]).map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setChecklist(checklist.map((c,i) => i === idx ? { ...c, value: v } : c))}
                            className={`text-[10px] px-2 py-0.5 rounded border ${
                              item.value === v
                                ? v === "yes" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-200"
                                : v === "no"  ? "bg-rose-500/20 border-rose-500/50 text-rose-200"
                                : "bg-slate-700/40 border-slate-600 text-slate-200"
                                : "bg-transparent border-slate-700 text-muted-foreground hover:bg-slate-800"
                            }`}
                          >{v.toUpperCase()}</button>
                        ))}
                      </div>
                    </div>
                    {item.value === "no" && (
                      <Input
                        className="mt-1.5 h-7 text-xs"
                        placeholder="Note / what to address"
                        value={item.note ?? ""}
                        onChange={e => setChecklist(checklist.map((c,i) => i === idx ? { ...c, note: e.target.value } : c))}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Findings & corrective actions auto-fill from "No" items on save (override below).</p>
            </div>
            <div className="sm:col-span-2"><Label>Findings (override)</Label><Textarea rows={2} value={form.findings} onChange={e => setForm({...form, findings: e.target.value})} placeholder="Leave blank to auto-fill from checklist" /></div>
            <div className="sm:col-span-2"><Label>Corrective actions (override)</Label><Textarea rows={2} value={form.actions} onChange={e => setForm({...form, actions: e.target.value})} placeholder="Leave blank to auto-fill from checklist" /></div>
            {editId && <div className="sm:col-span-2"><Label className="mb-2 block">Evidence</Label><AttachmentsList recordType="gov_ipc_audits" recordId={editId} /></div>}
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

export default IPCAuditsRegister;