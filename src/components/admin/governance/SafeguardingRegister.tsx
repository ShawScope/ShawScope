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
import { ShieldAlert, Trash2, Pencil } from "lucide-react";
import { RegisterShell, statusTone, logAccess } from "./RegisterShell";
import AttachmentsList from "./AttachmentsList";

interface Row {
  id: string; concern_date: string; subject_type: string; subject_ref: string | null;
  description: string; reported_to: string | null; outcome: string | null; status: string;
}

const SUBJECTS = ["adult_at_risk", "child", "carer", "staff", "other"];
const STATUSES = ["open", "investigating", "closed"];

const blank = {
  concern_date: format(new Date(), "yyyy-MM-dd"),
  subject_type: "adult_at_risk", subject_ref: "",
  description: "", reported_to: "", outcome: "", status: "open",
};

const SafeguardingRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_safeguarding").select("*").order("concern_date", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      concern_date: r.concern_date, subject_type: r.subject_type, subject_ref: r.subject_ref ?? "",
      description: r.description, reported_to: r.reported_to ?? "",
      outcome: r.outcome ?? "", status: r.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.description.trim()) { toast.error("Description is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        concern_date: form.concern_date, subject_type: form.subject_type,
        subject_ref: form.subject_ref.trim() || null, description: form.description.trim(),
        reported_to: form.reported_to.trim() || null, outcome: form.outcome.trim() || null,
        status: form.status,
      };
      if (editId) {
        const { error } = await supabase.from("gov_safeguarding").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_safeguarding", { id: editId });
        toast.success("Concern updated");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("gov_safeguarding").insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
        await logAccess(supabase, "create", "gov_safeguarding", { subject_type: form.subject_type });
        toast.success("Concern logged");
      }
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this safeguarding record? This is permanent.")) return;
    const { error } = await supabase.from("gov_safeguarding").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_safeguarding", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Safeguarding concerns"
      description="Confidential record of concerns about adults at risk, children or vulnerable persons, with referrals and outcomes."
      count={rows.length}
      onNew={openNew}
      newLabel="New concern"
      isEmpty={rows.length === 0}
      empty={{ title: "No safeguarding concerns recorded", hint: "Use this to document concerns, referrals to safeguarding teams and outcomes. Treat as strictly confidential." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                  <span className="font-medium text-sm">{format(parseISO(r.concern_date), "dd/MM/yyyy")}</span>
                  <Badge variant="outline" className={`text-[10px] ${statusTone(r.status)}`}>{r.status}</Badge>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">{r.subject_type.replace("_"," ")}</Badge>
                  {r.subject_ref && <span className="text-[11px] text-muted-foreground">Ref: {r.subject_ref}</span>}
                </div>
                <p className="text-sm text-slate-200 line-clamp-2">{r.description}</p>
                <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                  {r.reported_to && <span>Referred to: {r.reported_to}</span>}
                  {r.outcome && <span>Outcome: {r.outcome}</span>}
                </div>
              </div>
              <div className="mt-2"><AttachmentsList recordType="gov_safeguarding" recordId={r.id} compact /></div>
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
          <DialogHeader><DialogTitle>{editId ? "Edit safeguarding concern" : "New safeguarding concern"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.concern_date} onChange={e => setForm({...form, concern_date: e.target.value})} /></div>
            <div><Label>Subject</Label>
              <Select value={form.subject_type} onValueChange={v => setForm({...form, subject_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Subject reference</Label><Input value={form.subject_ref} onChange={e => setForm({...form, subject_ref: e.target.value})} placeholder="Initials / anonymised ID" /></div>
            <div className="sm:col-span-2"><Label>Description of concern *</Label><Textarea rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div><Label>Referred / reported to</Label><Input value={form.reported_to} onChange={e => setForm({...form, reported_to: e.target.value})} placeholder="LA safeguarding, GP..." /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Outcome</Label><Textarea rows={2} value={form.outcome} onChange={e => setForm({...form, outcome: e.target.value})} /></div>
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

export default SafeguardingRegister;