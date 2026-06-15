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
import { format, parseISO } from "date-fns";
import { Lightbulb, Trash2, Pencil } from "lucide-react";
import { RegisterShell, statusTone, logAccess } from "./RegisterShell";
import AttachmentsList from "./AttachmentsList";

interface Row {
  id: string; event_date: string; title: string; summary: string;
  learning: string | null; actions: string | null; status: string;
}

const STATUSES = ["open", "in_progress", "closed"];

const blank = {
  event_date: format(new Date(), "yyyy-MM-dd"),
  title: "", summary: "", learning: "", actions: "", status: "open",
};

const SignificantEventsRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_significant_events").select("*").order("event_date", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      event_date: r.event_date, title: r.title, summary: r.summary,
      learning: r.learning ?? "", actions: r.actions ?? "", status: r.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.summary.trim()) { toast.error("Title and summary required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        event_date: form.event_date, title: form.title.trim(), summary: form.summary.trim(),
        learning: form.learning.trim() || null, actions: form.actions.trim() || null,
        status: form.status,
      };
      if (editId) {
        const { error } = await supabase.from("gov_significant_events").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_significant_events", { id: editId });
        toast.success("Event updated");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("gov_significant_events").insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
        await logAccess(supabase, "create", "gov_significant_events", { title: form.title });
        toast.success("Event recorded");
      }
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this significant event?")) return;
    const { error } = await supabase.from("gov_significant_events").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_significant_events", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Significant events"
      description="Capture events that significantly affected care delivery and the learning that came from them."
      count={rows.length}
      onNew={openNew}
      newLabel="New event"
      isEmpty={rows.length === 0}
      empty={{ title: "No significant events recorded", hint: "Significant Event Analysis (SEA) captures notable positive or negative events and the reflective learning that follows." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Lightbulb className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-medium text-sm">{r.title}</span>
                  <Badge variant="outline" className={`text-[10px] ${statusTone(r.status)}`}>{r.status.replace("_"," ")}</Badge>
                  <span className="text-[11px] text-muted-foreground">{format(parseISO(r.event_date), "dd/MM/yyyy")}</span>
                </div>
                <p className="text-sm text-slate-200 line-clamp-2">{r.summary}</p>
                {r.learning && <p className="text-[11px] text-emerald-300/80 mt-1">💡 {r.learning}</p>}
              </div>
              <div className="mt-2"><AttachmentsList recordType="gov_significant_events" recordId={r.id} compact /></div>
                <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit significant event" : "New significant event"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>What happened *</Label><Textarea rows={3} value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Learning</Label><Textarea rows={3} value={form.learning} onChange={e => setForm({...form, learning: e.target.value})} placeholder="What did we learn and what would we change?" /></div>
            <div className="sm:col-span-2"><Label>Actions taken</Label><Textarea rows={2} value={form.actions} onChange={e => setForm({...form, actions: e.target.value})} /></div>
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

export default SignificantEventsRegister;