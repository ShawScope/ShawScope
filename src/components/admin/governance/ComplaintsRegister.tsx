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
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { RegisterShell, statusTone, logAccess } from "./RegisterShell";
import AttachmentsList from "./AttachmentsList";

interface Row {
  id: string; received_date: string; complainant: string | null; channel: string | null;
  summary: string; investigation: string | null; response: string | null;
  resolved_date: string | null; outcome: string | null; status: string;
}

const CHANNELS = ["email", "phone", "letter", "in_person", "review", "other"];
const STATUSES = ["open", "investigating", "resolved", "closed"];
const blank = {
  received_date: format(new Date(),"yyyy-MM-dd"), complainant: "", channel: "email",
  summary: "", investigation: "", response: "", resolved_date: "", outcome: "", status: "open",
};

const ComplaintsRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_complaints").select("*").order("received_date", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      received_date: r.received_date, complainant: r.complainant ?? "",
      channel: r.channel ?? "email", summary: r.summary,
      investigation: r.investigation ?? "", response: r.response ?? "",
      resolved_date: r.resolved_date ?? "", outcome: r.outcome ?? "", status: r.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.summary.trim()) { toast.error("Summary is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        received_date: form.received_date,
        complainant: form.complainant.trim() || null,
        channel: form.channel || null, summary: form.summary.trim(),
        investigation: form.investigation.trim() || null,
        response: form.response.trim() || null,
        resolved_date: form.resolved_date || null,
        outcome: form.outcome.trim() || null, status: form.status,
      };
      if (editId) {
        const { error } = await supabase.from("gov_complaints").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_complaints", { id: editId });
        toast.success("Complaint updated");
      } else {
        const { error } = await supabase.from("gov_complaints").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_complaints", { channel: form.channel });
        toast.success("Complaint logged");
      }
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this complaint?")) return;
    const { error } = await supabase.from("gov_complaints").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_complaints", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Complaints management"
      description="Track complaints through receipt, investigation, response, resolution and learning."
      count={rows.length} onNew={openNew} newLabel="Log complaint"
      isEmpty={rows.length === 0}
      empty={{ title: "No complaints", hint: "Complaints (and the way they're resolved) are key CQC evidence — log every formal concern here." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <MessageSquare className="h-4 w-4 text-sky-400 shrink-0" />
                  <span className="font-medium text-sm">{format(parseISO(r.received_date),"dd/MM/yyyy")}</span>
                  <Badge variant="outline" className={`text-[10px] ${statusTone(r.status)}`}>{r.status}</Badge>
                  {r.channel && <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">{r.channel.replace("_"," ")}</Badge>}
                  {r.complainant && <span className="text-[11px] text-muted-foreground">{r.complainant}</span>}
                </div>
                <p className="text-sm text-slate-200 line-clamp-2">{r.summary}</p>
                {r.outcome && <p className="text-[11px] text-emerald-300 mt-1">✓ {r.outcome}</p>}
              </div>
              <div className="mt-2"><AttachmentsList recordType="gov_complaints" recordId={r.id} compact /></div>
                <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={()=>openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400" onClick={()=>remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit complaint" : "Log complaint"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Received</Label><Input type="date" value={form.received_date} onChange={e=>setForm({...form,received_date:e.target.value})} /></div>
            <div><Label>Channel</Label>
              <Select value={form.channel} onValueChange={v=>setForm({...form,channel:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c=><SelectItem key={c} value={c}>{c.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Complainant</Label><Input value={form.complainant} onChange={e=>setForm({...form,complainant:e.target.value})} placeholder="Name or initials" /></div>
            <div className="sm:col-span-2"><Label>Summary *</Label><Textarea rows={3} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Investigation</Label><Textarea rows={2} value={form.investigation} onChange={e=>setForm({...form,investigation:e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Response to complainant</Label><Textarea rows={2} value={form.response} onChange={e=>setForm({...form,response:e.target.value})} /></div>
            <div><Label>Resolved date</Label><Input type="date" value={form.resolved_date} onChange={e=>setForm({...form,resolved_date:e.target.value})} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v=>setForm({...form,status:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Outcome / learning</Label><Textarea rows={2} value={form.outcome} onChange={e=>setForm({...form,outcome:e.target.value})} /></div>
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

export default ComplaintsRegister;