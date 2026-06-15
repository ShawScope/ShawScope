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
import { AlertTriangle, Trash2, Pencil } from "lucide-react";
import { RegisterShell, severityTone, statusTone, logAccess } from "./RegisterShell";
import AttachmentsList from "./AttachmentsList";

interface Row {
  id: string; incident_date: string; incident_time: string | null;
  type: string; severity: string; description: string; patient_ref: string | null;
  location: string | null; immediate_actions: string | null; lessons_learned: string | null;
  reported_to: string | null; status: string; created_at: string;
}

const TYPES = ["clinical", "near_miss", "equipment", "medication", "patient_safety", "data", "other"];
const SEVS = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "investigating", "closed"];

const blank = {
  incident_date: format(new Date(), "yyyy-MM-dd"), incident_time: "",
  type: "clinical", severity: "low", description: "",
  patient_ref: "", location: "", immediate_actions: "",
  lessons_learned: "", reported_to: "", status: "open",
};

const IncidentsRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_incidents").select("*").order("incident_date", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      incident_date: r.incident_date, incident_time: r.incident_time ?? "",
      type: r.type, severity: r.severity, description: r.description,
      patient_ref: r.patient_ref ?? "", location: r.location ?? "",
      immediate_actions: r.immediate_actions ?? "", lessons_learned: r.lessons_learned ?? "",
      reported_to: r.reported_to ?? "", status: r.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.description.trim()) { toast.error("Description is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        incident_date: form.incident_date,
        incident_time: form.incident_time || null,
        type: form.type, severity: form.severity, description: form.description.trim(),
        patient_ref: form.patient_ref.trim() || null, location: form.location.trim() || null,
        immediate_actions: form.immediate_actions.trim() || null,
        lessons_learned: form.lessons_learned.trim() || null,
        reported_to: form.reported_to.trim() || null, status: form.status,
      };
      if (editId) {
        const { error } = await supabase.from("gov_incidents").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_incidents", { id: editId });
        toast.success("Incident updated");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("gov_incidents").insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
        await logAccess(supabase, "create", "gov_incidents", { type: form.type, severity: form.severity });
        toast.success("Incident logged");
      }
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this incident record? This is permanent.")) return;
    const { error } = await supabase.from("gov_incidents").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_incidents", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Incident & near-miss log"
      description="Log clinical incidents and near-misses with severity, immediate actions, lessons learned and status."
      count={rows.length}
      onNew={openNew}
      newLabel="New incident"
      isEmpty={rows.length === 0}
      empty={{ title: "No incidents logged", hint: "Use 'New incident' to record any clinical incident, near-miss, equipment fault or patient-safety concern." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span className="font-medium text-sm">{format(parseISO(r.incident_date), "dd/MM/yyyy")}{r.incident_time ? ` · ${r.incident_time.slice(0,5)}` : ""}</span>
                  <Badge variant="outline" className={`text-[10px] ${severityTone(r.severity)}`}>{r.severity}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${statusTone(r.status)}`}>{r.status}</Badge>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">{r.type.replace("_", " ")}</Badge>
                </div>
                <p className="text-sm text-slate-200 line-clamp-2">{r.description}</p>
                <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                  {r.location && <span>📍 {r.location}</span>}
                  {r.patient_ref && <span>Patient: {r.patient_ref}</span>}
                  {r.reported_to && <span>Reported to: {r.reported_to}</span>}
                </div>
                <div className="mt-2"><AttachmentsList recordType="gov_incidents" recordId={r.id} compact /></div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit incident" : "Log new incident"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.incident_date} onChange={e => setForm({...form, incident_date: e.target.value})} /></div>
            <div><Label>Time</Label><Input type="time" value={form.incident_time} onChange={e => setForm({...form, incident_time: e.target.value})} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Severity</Label>
              <Select value={form.severity} onValueChange={v => setForm({...form, severity: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Description *</Label><Textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
            <div><Label>Patient reference</Label><Input value={form.patient_ref} onChange={e => setForm({...form, patient_ref: e.target.value})} placeholder="Initials or anonymised ID" /></div>
            <div className="sm:col-span-2"><Label>Immediate actions taken</Label><Textarea rows={2} value={form.immediate_actions} onChange={e => setForm({...form, immediate_actions: e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Lessons learned</Label><Textarea rows={2} value={form.lessons_learned} onChange={e => setForm({...form, lessons_learned: e.target.value})} /></div>
            <div><Label>Reported to</Label><Input value={form.reported_to} onChange={e => setForm({...form, reported_to: e.target.value})} placeholder="CQC, GP, indemnity..." /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {editId && <div className="sm:col-span-2"><Label className="mb-2 block">Evidence / correspondence</Label><AttachmentsList recordType="gov_incidents" recordId={editId} /></div>}
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

export default IncidentsRegister;