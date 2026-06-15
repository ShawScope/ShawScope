import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Heart, Trash2, Pencil } from "lucide-react";
import { RegisterShell, logAccess } from "./RegisterShell";

interface Row { id: string; received_date: string; source: string | null; summary: string; patient_ref: string | null; }
const blank = { received_date: format(new Date(),"yyyy-MM-dd"), source: "", summary: "", patient_ref: "" };

const ComplimentsRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_compliments").select("*").order("received_date", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({ received_date: r.received_date, source: r.source ?? "", summary: r.summary, patient_ref: r.patient_ref ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.summary.trim()) { toast.error("Summary is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        received_date: form.received_date,
        source: form.source.trim() || null,
        summary: form.summary.trim(),
        patient_ref: form.patient_ref.trim() || null,
      };
      if (editId) {
        const { error } = await supabase.from("gov_compliments").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_compliments", { id: editId });
      } else {
        const { error } = await supabase.from("gov_compliments").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_compliments", {});
      }
      toast.success("Saved"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this compliment?")) return;
    const { error } = await supabase.from("gov_compliments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_compliments", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Compliments"
      description="Capture positive feedback from patients, families and referrers — useful CQC evidence of the Caring domain."
      count={rows.length} onNew={openNew} newLabel="Log compliment"
      isEmpty={rows.length === 0}
      empty={{ title: "No compliments logged yet", hint: "Add Google reviews, thank-you cards, verbal thanks and referrer praise." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Heart className="h-4 w-4 text-pink-400 shrink-0" />
                  <span className="font-medium text-sm">{format(parseISO(r.received_date),"dd/MM/yyyy")}</span>
                  {r.source && <span className="text-[11px] text-muted-foreground">via {r.source}</span>}
                  {r.patient_ref && <span className="text-[11px] text-muted-foreground">· {r.patient_ref}</span>}
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{r.summary}</p>
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
          <DialogHeader><DialogTitle>{editId ? "Edit compliment" : "Log compliment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Received</Label><Input type="date" value={form.received_date} onChange={e=>setForm({...form,received_date:e.target.value})} /></div>
            <div><Label>Source</Label><Input value={form.source} onChange={e=>setForm({...form,source:e.target.value})} placeholder="Google, card, in-person..." /></div>
            <div className="sm:col-span-2"><Label>Patient reference</Label><Input value={form.patient_ref} onChange={e=>setForm({...form,patient_ref:e.target.value})} placeholder="Initials (optional)" /></div>
            <div className="sm:col-span-2"><Label>Summary *</Label><Textarea rows={4} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} /></div>
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

export default ComplimentsRegister;