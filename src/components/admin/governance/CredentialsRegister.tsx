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
import { format, parseISO, differenceInDays } from "date-fns";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { RegisterShell, statusTone, logAccess } from "./RegisterShell";
import AttachmentsList from "./AttachmentsList";

interface Row {
  id: string; type: string; holder: string; reference: string | null;
  issuer: string | null; issue_date: string | null; expiry_date: string | null;
  status: string; notes: string | null;
}

const TYPES = ["DBS", "Professional registration", "Indemnity insurance", "Public liability", "Qualification", "ID badge", "Other"];
const STATUSES = ["active", "expiring", "expired", "renewed"];

const blank = {
  type: "DBS", holder: "", reference: "", issuer: "",
  issue_date: "", expiry_date: "", status: "active", notes: "",
};

const expiryTone = (date: string | null) => {
  if (!date) return "border-slate-700 text-slate-400";
  const d = differenceInDays(parseISO(date), new Date());
  if (d < 0) return "border-rose-500/40 text-rose-300 bg-rose-500/10";
  if (d <= 60) return "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
};

const CredentialsRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_credentials").select("*").order("expiry_date", { ascending: true, nullsFirst: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      type: r.type, holder: r.holder, reference: r.reference ?? "",
      issuer: r.issuer ?? "", issue_date: r.issue_date ?? "",
      expiry_date: r.expiry_date ?? "", status: r.status, notes: r.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.holder.trim()) { toast.error("Holder is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        type: form.type, holder: form.holder.trim(),
        reference: form.reference.trim() || null, issuer: form.issuer.trim() || null,
        issue_date: form.issue_date || null, expiry_date: form.expiry_date || null,
        status: form.status, notes: form.notes.trim() || null,
      };
      if (editId) {
        const { error } = await supabase.from("gov_credentials").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_credentials", { id: editId });
        toast.success("Credential updated");
      } else {
        const { error } = await supabase.from("gov_credentials").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_credentials", { type: form.type });
        toast.success("Credential added");
      }
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this credential record?")) return;
    const { error } = await supabase.from("gov_credentials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_credentials", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="DBS, insurance & registration"
      description="Expiry tracker for DBS, professional registration, indemnity, public liability and qualifications."
      count={rows.length} onNew={openNew} newLabel="Add credential"
      isEmpty={rows.length === 0}
      empty={{ title: "No credentials registered", hint: "Add DBS certificate, HCPC/NMC registration, indemnity and public liability policies." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-medium text-sm">{r.type}</span>
                  <span className="text-xs text-muted-foreground">· {r.holder}</span>
                  <Badge variant="outline" className={`text-[10px] ${statusTone(r.status)}`}>{r.status}</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                  {r.reference && <span>Ref: {r.reference}</span>}
                  {r.issuer && <span>{r.issuer}</span>}
                  {r.issue_date && <span>Issued {format(parseISO(r.issue_date), "dd/MM/yyyy")}</span>}
                </div>
                {r.expiry_date && (
                  <div className="mt-1.5">
                    <Badge variant="outline" className={`text-[10px] ${expiryTone(r.expiry_date)}`}>
                      Expires {format(parseISO(r.expiry_date), "dd/MM/yyyy")}
                    </Badge>
                  </div>
                )}
                {r.notes && <div className="text-[11px] text-muted-foreground mt-1">{r.notes}</div>}
                <div className="mt-2"><AttachmentsList recordType="gov_credentials" recordId={r.id} compact /></div>
              </div>
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
          <DialogHeader><DialogTitle>{editId ? "Edit credential" : "Add credential"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Type *</Label>
              <Select value={form.type} onValueChange={v=>setForm({...form,type:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Holder *</Label><Input value={form.holder} onChange={e=>setForm({...form,holder:e.target.value})} placeholder="Matt Shaw" /></div>
            <div><Label>Reference / Number</Label><Input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})} /></div>
            <div><Label>Issuer</Label><Input value={form.issuer} onChange={e=>setForm({...form,issuer:e.target.value})} placeholder="DBS, HCPC, Balens..." /></div>
            <div><Label>Issue date</Label><Input type="date" value={form.issue_date} onChange={e=>setForm({...form,issue_date:e.target.value})} /></div>
            <div><Label>Expiry date</Label><Input type="date" value={form.expiry_date} onChange={e=>setForm({...form,expiry_date:e.target.value})} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v=>setForm({...form,status:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            {editId && <div className="sm:col-span-2"><Label className="mb-2 block">Certificate / documents</Label><AttachmentsList recordType="gov_credentials" recordId={editId} /></div>}
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

export default CredentialsRegister;