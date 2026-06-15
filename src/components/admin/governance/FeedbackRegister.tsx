import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Star, Trash2, Pencil } from "lucide-react";
import { RegisterShell, logAccess } from "./RegisterShell";

interface Row {
  id: string; feedback_date: string; score: number | null;
  comment: string | null; source: string | null; patient_name: string | null;
}

const blank = {
  feedback_date: format(new Date(),"yyyy-MM-dd"),
  score: "5", comment: "", source: "", patient_name: "",
};

const FeedbackRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_patient_feedback").select("*").order("feedback_date", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const avg = useMemo(() => {
    const withScore = rows.filter(r => typeof r.score === "number");
    if (!withScore.length) return null;
    return (withScore.reduce((s,r) => s + (r.score ?? 0), 0) / withScore.length).toFixed(1);
  }, [rows]);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      feedback_date: r.feedback_date, score: r.score?.toString() ?? "",
      comment: r.comment ?? "", source: r.source ?? "", patient_name: r.patient_name ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        feedback_date: form.feedback_date,
        score: form.score ? parseInt(form.score) : null,
        comment: form.comment.trim() || null,
        source: form.source.trim() || null,
        patient_name: form.patient_name.trim() || null,
      };
      if (editId) {
        const { error } = await supabase.from("gov_patient_feedback").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_patient_feedback", { id: editId });
      } else {
        const { error } = await supabase.from("gov_patient_feedback").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_patient_feedback", {});
      }
      toast.success("Saved"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this feedback?")) return;
    const { error } = await supabase.from("gov_patient_feedback").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_patient_feedback", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Patient feedback"
      description="Track satisfaction scores (1–5) and free-text feedback to support the Caring & Responsive domains."
      count={rows.length}
      toolbar={avg && <Badge variant="outline" className="border-pink-500/40 text-pink-300 bg-pink-500/10 text-[11px]">Avg {avg} / 5</Badge>}
      onNew={openNew} newLabel="Add feedback"
      isEmpty={rows.length === 0}
      empty={{ title: "No feedback yet", hint: "Log scores and comments from patients, follow-up SMS replies, or in-clinic conversations." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-sm">{format(parseISO(r.feedback_date),"dd/MM/yyyy")}</span>
                  {typeof r.score === "number" && (
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < (r.score ?? 0) ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
                      ))}
                    </span>
                  )}
                  {r.source && <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">{r.source}</Badge>}
                  {r.patient_name && <span className="text-[11px] text-muted-foreground">{r.patient_name}</span>}
                </div>
                {r.comment && <p className="text-sm text-slate-200 whitespace-pre-wrap">{r.comment}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={()=>openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400" onClick={()=>remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editId ? "Edit feedback" : "Add feedback"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.feedback_date} onChange={e=>setForm({...form,feedback_date:e.target.value})} /></div>
            <div><Label>Score (1–5)</Label><Input type="number" min={1} max={5} value={form.score} onChange={e=>setForm({...form,score:e.target.value})} /></div>
            <div><Label>Patient name</Label><Input value={form.patient_name} onChange={e=>setForm({...form,patient_name:e.target.value})} /></div>
            <div><Label>Source</Label><Input value={form.source} onChange={e=>setForm({...form,source:e.target.value})} placeholder="Google, SMS, in-clinic..." /></div>
            <div className="sm:col-span-2"><Label>Comment</Label><Textarea rows={3} value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} /></div>
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

export default FeedbackRegister;