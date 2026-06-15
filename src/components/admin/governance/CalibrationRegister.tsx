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
import { Activity, Pencil, Trash2 } from "lucide-react";
import { RegisterShell, logAccess } from "./RegisterShell";
import AttachmentsList from "./AttachmentsList";

interface Row {
  id: string; equipment_id: string | null; equipment_name: string | null;
  check_date: string; result: string; notes: string | null; next_due: string | null;
}
interface Equip { id: string; name: string; }

const RESULTS = ["pass", "fail", "adjusted"];
const blank = {
  equipment_id: "", equipment_name: "", check_date: format(new Date(),"yyyy-MM-dd"),
  result: "pass", notes: "", next_due: "",
};

const resultTone = (r: string) => r === "pass" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
  : r === "fail" ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
  : "bg-amber-500/15 text-amber-300 border-amber-500/40";

const dueTone = (date: string | null) => {
  if (!date) return "border-slate-700 text-slate-400";
  const d = differenceInDays(parseISO(date), new Date());
  if (d < 0) return "border-rose-500/40 text-rose-300 bg-rose-500/10";
  if (d <= 30) return "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
};

const CalibrationRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [equip, setEquip] = useState<Equip[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: rs }, { data: es }] = await Promise.all([
      supabase.from("gov_calibration_checks").select("*").order("check_date", { ascending: false }),
      supabase.from("gov_equipment").select("id,name").order("name"),
    ]);
    setRows((rs as any) ?? []);
    setEquip((es as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      equipment_id: r.equipment_id ?? "", equipment_name: r.equipment_name ?? "",
      check_date: r.check_date, result: r.result, notes: r.notes ?? "",
      next_due: r.next_due ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.equipment_id && !form.equipment_name.trim()) { toast.error("Pick equipment or enter a name"); return; }
    setSaving(true);
    try {
      const payload: any = {
        equipment_id: form.equipment_id || null,
        equipment_name: form.equipment_name.trim() || (equip.find(e=>e.id===form.equipment_id)?.name ?? null),
        check_date: form.check_date, result: form.result,
        notes: form.notes.trim() || null, next_due: form.next_due || null,
      };
      if (editId) {
        const { error } = await supabase.from("gov_calibration_checks").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_calibration_checks", { id: editId });
        toast.success("Check updated");
      } else {
        const { error } = await supabase.from("gov_calibration_checks").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_calibration_checks", { result: form.result });
        toast.success("Calibration check logged");
      }
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this check?")) return;
    const { error } = await supabase.from("gov_calibration_checks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_calibration_checks", { id });
    toast.success("Deleted"); load();
  };

  return (
    <RegisterShell
      title="Calibration & checks"
      description="Log calibration and routine equipment checks with pass/fail results and next-due dates."
      count={rows.length} onNew={openNew} newLabel="New check"
      isEmpty={rows.length === 0}
      empty={{ title: "No calibration checks", hint: "Log audiometer biological checks, BP monitor verifications, otoscope light checks, etc." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Activity className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-sm">{r.equipment_name ?? "Equipment"}</span>
                  <Badge variant="outline" className={`text-[10px] ${resultTone(r.result)}`}>{r.result}</Badge>
                  <span className="text-[11px] text-muted-foreground">{format(parseISO(r.check_date),"dd/MM/yyyy")}</span>
                </div>
                {r.notes && <p className="text-sm text-slate-200 line-clamp-2">{r.notes}</p>}
                {r.next_due && (
                  <Badge variant="outline" className={`mt-1 text-[10px] ${dueTone(r.next_due)}`}>
                    Next due {format(parseISO(r.next_due),"dd/MM/yyyy")}
                  </Badge>
                )}
              </div>
              <div className="mt-2"><AttachmentsList recordType="gov_calibration_checks" recordId={r.id} compact /></div>
                <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={()=>openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400" onClick={()=>remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit check" : "Log calibration check"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Equipment</Label>
              <Select value={form.equipment_id || "__free__"} onValueChange={v=>setForm({...form, equipment_id: v==="__free__"?"":v})}>
                <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__free__">— Enter manually —</SelectItem>
                  {equip.map(e=><SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!form.equipment_id && (
              <div className="sm:col-span-2"><Label>Equipment name</Label><Input value={form.equipment_name} onChange={e=>setForm({...form,equipment_name:e.target.value})} /></div>
            )}
            <div><Label>Check date</Label><Input type="date" value={form.check_date} onChange={e=>setForm({...form,check_date:e.target.value})} /></div>
            <div><Label>Result</Label>
              <Select value={form.result} onValueChange={v=>setForm({...form,result:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RESULTS.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            <div><Label>Next due</Label><Input type="date" value={form.next_due} onChange={e=>setForm({...form,next_due:e.target.value})} /></div>
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

export default CalibrationRegister;