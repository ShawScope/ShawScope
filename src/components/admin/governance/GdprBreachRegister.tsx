import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { FileWarning, Pencil, Trash2 } from "lucide-react";
import { RegisterShell, statusTone, logAccess } from "./RegisterShell";
import AttachmentsList from "./AttachmentsList";

interface Row {
  id: string; breach_date: string; breach_type: string; scope: string | null;
  data_subjects_affected: number | null; ico_reportable: boolean;
  ico_reported_at: string | null; mitigation: string | null; status: string;
}

const TYPES = ["Email misdirection", "Lost/stolen device", "Unauthorised access", "Disclosure error", "System compromise", "Paper records", "Other"];
const STATUSES = ["open", "investigating", "closed"];

const blank = {
  breach_date: format(new Date(), "yyyy-MM-dd"),
  breach_type: TYPES[0], scope: "", data_subjects_affected: "",
  ico_reportable: false, ico_reported_at: "", mitigation: "", status: "open",
};

const GdprBreachRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_gdpr_breaches").select("*").order("breach_date", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      breach_date: r.breach_date, breach_type: r.breach_type,
      scope: r.scope ?? "", data_subjects_affected: r.data_subjects_affected?.toString() ?? "",
      ico_reportable: r.ico_reportable,
      ico_reported_at: r.ico_reported_at ? r.ico_reported_at.slice(0, 16) : "",
      mitigation: r.mitigation ?? "", status: r.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.breach_type) { toast.error("Type is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        breach_date: form.breach_date,
        breach_type: form.breach_type,
        scope: form.scope.trim() || null,
        data_subjects_affected: form.data_subjects_affected ? parseInt(form.data_subjects_affected) : null,
        ico_reportable: form.ico_reportable,
        ico_reported_at: form.ico_reported_at ? new Date(form.ico_reported_at).toISOString() : null,
        mitigation: form.mitigation.trim() || null,
        status: form.status,
      };
      if (editId) {
        const { error } = await supabase.from("gov_gdpr_breaches").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_gdpr_breaches", { id: editId });
        toast.success("Breach updated");
      } else {
        const { error } = await supabase.from("gov_gdpr_breaches").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_gdpr_breaches", { type: form.breach_type });
        toast.success("Breach logged");
      }
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this breach record?")) return;
    const { error } = await supabase.from("gov_gdpr_breaches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_gdpr_breaches", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="GDPR & breach log"
      description="UK GDPR personal data breach register with ICO reportability flag. Reportable breaches must be notified to the ICO within 72 hours."
      count={rows.length} onNew={openNew} newLabel="Log breach"
      isEmpty={rows.length === 0}
      empty={{ title: "No breaches recorded", hint: "Log any actual or near-miss data breach. Most low-risk events are not ICO-reportable but must still be documented." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <FileWarning className="h-4 w-4 text-violet-400 shrink-0" />
                  <span className="font-medium text-sm">{r.breach_type}</span>
                  <Badge variant="outline" className={`text-[10px] ${statusTone(r.status)}`}>{r.status}</Badge>
                  {r.ico_reportable && (
                    <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-300 bg-rose-500/10">ICO reportable</Badge>
                  )}
                  {r.ico_reported_at && (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
                      ICO notified {format(parseISO(r.ico_reported_at), "dd/MM/yyyy")}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                  <span>{format(parseISO(r.breach_date), "dd/MM/yyyy")}</span>
                  {r.data_subjects_affected != null && <span>{r.data_subjects_affected} subject(s) affected</span>}
                </div>
                {r.scope && <div className="text-[11px] text-muted-foreground mt-1"><span className="text-slate-400">Scope:</span> {r.scope}</div>}
                {r.mitigation && <div className="text-[11px] text-muted-foreground mt-1"><span className="text-slate-400">Mitigation:</span> {r.mitigation}</div>}
              </div>
              <div className="mt-2"><AttachmentsList recordType="gov_gdpr_breaches" recordId={r.id} compact /></div>
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
          <DialogHeader><DialogTitle>{editId ? "Edit breach" : "Log breach"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Breach date *</Label><Input type="date" value={form.breach_date} onChange={e=>setForm({...form,breach_date:e.target.value})} /></div>
            <div><Label>Type *</Label>
              <Select value={form.breach_type} onValueChange={v=>setForm({...form,breach_type:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data subjects affected</Label><Input type="number" value={form.data_subjects_affected} onChange={e=>setForm({...form,data_subjects_affected:e.target.value})} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v=>setForm({...form,status:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Scope (what data, how)</Label><Textarea rows={2} value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})} /></div>
            <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-md border border-slate-800 p-3">
              <div>
                <div className="text-sm font-medium">ICO reportable?</div>
                <div className="text-[11px] text-muted-foreground">High risk to rights & freedoms of individuals. 72-hour notification window.</div>
              </div>
              <Switch checked={form.ico_reportable} onCheckedChange={v=>setForm({...form,ico_reportable:v})} />
            </div>
            {form.ico_reportable && (
              <div className="sm:col-span-2"><Label>ICO reported at</Label><Input type="datetime-local" value={form.ico_reported_at} onChange={e=>setForm({...form,ico_reported_at:e.target.value})} /></div>
            )}
            <div className="sm:col-span-2"><Label>Mitigation & learning</Label><Textarea rows={3} value={form.mitigation} onChange={e=>setForm({...form,mitigation:e.target.value})} /></div>
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

export default GdprBreachRegister;