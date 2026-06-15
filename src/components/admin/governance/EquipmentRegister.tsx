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
import { Wrench, Pencil, Trash2 } from "lucide-react";
import { RegisterShell, statusTone, logAccess } from "./RegisterShell";
import AttachmentsList from "./AttachmentsList";

interface Row {
  id: string; name: string; category: string | null; serial_number: string | null;
  supplier: string | null; purchase_date: string | null; service_interval_days: number | null;
  last_service_date: string | null; next_service_date: string | null;
  filter_replacement_due: string | null; status: string; notes: string | null;
}

const STATUSES = ["active", "out_of_service", "retired"];
const blank = {
  name: "", category: "", serial_number: "", supplier: "",
  purchase_date: "", service_interval_days: "",
  last_service_date: "", next_service_date: "",
  filter_replacement_due: "", status: "active", notes: "",
};

const dueTone = (date: string | null) => {
  if (!date) return "border-slate-700 text-slate-400";
  const d = differenceInDays(parseISO(date), new Date());
  if (d < 0) return "border-rose-500/40 text-rose-300 bg-rose-500/10";
  if (d <= 30) return "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
};

const EquipmentRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_equipment").select("*").order("name");
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      name: r.name, category: r.category ?? "", serial_number: r.serial_number ?? "",
      supplier: r.supplier ?? "", purchase_date: r.purchase_date ?? "",
      service_interval_days: r.service_interval_days?.toString() ?? "",
      last_service_date: r.last_service_date ?? "", next_service_date: r.next_service_date ?? "",
      filter_replacement_due: r.filter_replacement_due ?? "", status: r.status, notes: r.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        serial_number: form.serial_number.trim() || null,
        supplier: form.supplier.trim() || null,
        purchase_date: form.purchase_date || null,
        service_interval_days: form.service_interval_days ? parseInt(form.service_interval_days) : null,
        last_service_date: form.last_service_date || null,
        next_service_date: form.next_service_date || null,
        filter_replacement_due: form.filter_replacement_due || null,
        status: form.status, notes: form.notes.trim() || null,
      };
      if (editId) {
        const { error } = await supabase.from("gov_equipment").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_equipment", { id: editId });
        toast.success("Equipment updated");
      } else {
        const { error } = await supabase.from("gov_equipment").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_equipment", { name: form.name });
        toast.success("Equipment added");
      }
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this equipment record?")) return;
    const { error } = await supabase.from("gov_equipment").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_equipment", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Equipment & servicing"
      description="Register equipment with service intervals, next-service dates and microsuction filter reminders."
      count={rows.length} onNew={openNew} newLabel="Add equipment"
      isEmpty={rows.length === 0}
      empty={{ title: "No equipment registered", hint: "Add otoscopes, suction units, audiometers, BP monitors and any clinical equipment." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Wrench className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-sm">{r.name}</span>
                  <Badge variant="outline" className={`text-[10px] ${statusTone(r.status)}`}>{r.status.replace("_"," ")}</Badge>
                  {r.category && <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">{r.category}</Badge>}
                </div>
                <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                  {r.serial_number && <span>S/N: {r.serial_number}</span>}
                  {r.supplier && <span>{r.supplier}</span>}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.next_service_date && (
                    <Badge variant="outline" className={`text-[10px] ${dueTone(r.next_service_date)}`}>
                      Service due {format(parseISO(r.next_service_date), "dd/MM/yyyy")}
                    </Badge>
                  )}
                  {r.filter_replacement_due && (
                    <Badge variant="outline" className={`text-[10px] ${dueTone(r.filter_replacement_due)}`}>
                      Filter due {format(parseISO(r.filter_replacement_due), "dd/MM/yyyy")}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-2"><AttachmentsList recordType="gov_equipment" recordId={r.id} compact /></div>
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
          <DialogHeader><DialogTitle>{editId ? "Edit equipment" : "Add equipment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Welch Allyn otoscope" /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Otoscope, Suction, Audiometer..." /></div>
            <div><Label>Serial number</Label><Input value={form.serial_number} onChange={e=>setForm({...form,serial_number:e.target.value})} /></div>
            <div><Label>Supplier</Label><Input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})} /></div>
            <div><Label>Purchase date</Label><Input type="date" value={form.purchase_date} onChange={e=>setForm({...form,purchase_date:e.target.value})} /></div>
            <div><Label>Service interval (days)</Label><Input type="number" value={form.service_interval_days} onChange={e=>setForm({...form,service_interval_days:e.target.value})} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v=>setForm({...form,status:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Last service</Label><Input type="date" value={form.last_service_date} onChange={e=>setForm({...form,last_service_date:e.target.value})} /></div>
            <div><Label>Next service due</Label><Input type="date" value={form.next_service_date} onChange={e=>setForm({...form,next_service_date:e.target.value})} /></div>
            <div><Label>Filter replacement due</Label><Input type="date" value={form.filter_replacement_due} onChange={e=>setForm({...form,filter_replacement_due:e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
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

export default EquipmentRegister;