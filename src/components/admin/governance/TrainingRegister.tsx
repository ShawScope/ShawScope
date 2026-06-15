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
import { GraduationCap, Pencil, Trash2 } from "lucide-react";
import { RegisterShell, logAccess } from "./RegisterShell";
import AttachmentsList from "./AttachmentsList";

interface Row {
  id: string; training_date: string; topic: string; provider: string | null;
  hours: number | null; evidence: string | null; staff_member: string | null;
  next_due: string | null;
}

const blank = {
  training_date: format(new Date(), "yyyy-MM-dd"),
  topic: "", provider: "", hours: "", evidence: "",
  staff_member: "Matt Shaw", next_due: "",
};

const dueTone = (date: string | null) => {
  if (!date) return "border-slate-700 text-slate-400";
  const d = differenceInDays(parseISO(date), new Date());
  if (d < 0) return "border-rose-500/40 text-rose-300 bg-rose-500/10";
  if (d <= 60) return "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
};

const TrainingRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_training_cpd").select("*").order("training_date", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const totalHours = rows.reduce((s, r) => s + (Number(r.hours) || 0), 0);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      training_date: r.training_date, topic: r.topic,
      provider: r.provider ?? "", hours: r.hours?.toString() ?? "",
      evidence: r.evidence ?? "", staff_member: r.staff_member ?? "",
      next_due: r.next_due ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.topic.trim()) { toast.error("Topic is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        training_date: form.training_date,
        topic: form.topic.trim(),
        provider: form.provider.trim() || null,
        hours: form.hours ? Number(form.hours) : null,
        evidence: form.evidence.trim() || null,
        staff_member: form.staff_member.trim() || null,
        next_due: form.next_due || null,
      };
      if (editId) {
        const { error } = await supabase.from("gov_training_cpd").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_training_cpd", { id: editId });
        toast.success("Training updated");
      } else {
        const { error } = await supabase.from("gov_training_cpd").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_training_cpd", { topic: form.topic });
        toast.success("Training logged");
      }
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this training record?")) return;
    const { error } = await supabase.from("gov_training_cpd").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_training_cpd", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Training & CPD"
      description="Continuing Professional Development log with hours, providers, certificates and next-due renewals."
      count={rows.length} onNew={openNew} newLabel="Log training"
      toolbar={<Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/5 text-[10px] h-7 px-2 flex items-center">Total: {totalHours.toFixed(1)} hrs</Badge>}
      isEmpty={rows.length === 0}
      empty={{ title: "No CPD logged", hint: "Log training courses, online learning, conferences, reflective practice and certificates." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <GraduationCap className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-medium text-sm">{r.topic}</span>
                  {r.hours != null && <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-300 bg-emerald-500/5">{r.hours} hrs</Badge>}
                </div>
                <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                  <span>{format(parseISO(r.training_date), "dd/MM/yyyy")}</span>
                  {r.provider && <span>{r.provider}</span>}
                  {r.staff_member && <span>{r.staff_member}</span>}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.next_due && (
                    <Badge variant="outline" className={`text-[10px] ${dueTone(r.next_due)}`}>
                      Refresh due {format(parseISO(r.next_due), "dd/MM/yyyy")}
                    </Badge>
                  )}
                </div>
                {r.evidence && <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{r.evidence}</div>}
              </div>
              <div className="mt-2"><AttachmentsList recordType="gov_training_cpd" recordId={r.id} compact /></div>
                <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit training" : "Log training"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Training date *</Label><Input type="date" value={form.training_date} onChange={e=>setForm({...form,training_date:e.target.value})} /></div>
            <div><Label>Staff member</Label><Input value={form.staff_member} onChange={e=>setForm({...form,staff_member:e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Topic *</Label><Input value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="e.g. Safeguarding Adults Level 3" /></div>
            <div><Label>Provider</Label><Input value={form.provider} onChange={e=>setForm({...form,provider:e.target.value})} /></div>
            <div><Label>Hours</Label><Input type="number" step="0.25" value={form.hours} onChange={e=>setForm({...form,hours:e.target.value})} /></div>
            <div><Label>Next refresh due</Label><Input type="date" value={form.next_due} onChange={e=>setForm({...form,next_due:e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Evidence / Reflection</Label><Textarea rows={3} value={form.evidence} onChange={e=>setForm({...form,evidence:e.target.value})} placeholder="Key learning, reflections, certificate reference..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving?"Saving...":"Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RegisterShell>
  );
};

export default TrainingRegister;