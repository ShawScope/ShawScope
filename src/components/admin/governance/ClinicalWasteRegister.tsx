import React, { useEffect, useState } from "react";
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
import { Trash2, Pencil } from "lucide-react";
import { RegisterShell, logAccess } from "./RegisterShell";

interface Row {
  id: string; collection_date: string; weight_kg: number | null;
  carrier: string | null; consignment_note: string | null; notes: string | null;
}

const blank = {
  collection_date: format(new Date(), "yyyy-MM-dd"),
  weight_kg: "", carrier: "", consignment_note: "", notes: "",
};

const ClinicalWasteRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_clinical_waste").select("*").order("collection_date", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      collection_date: r.collection_date,
      weight_kg: r.weight_kg?.toString() ?? "",
      carrier: r.carrier ?? "", consignment_note: r.consignment_note ?? "",
      notes: r.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        collection_date: form.collection_date,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        carrier: form.carrier.trim() || null,
        consignment_note: form.consignment_note.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editId) {
        const { error } = await supabase.from("gov_clinical_waste").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_clinical_waste", { id: editId });
        toast.success("Record updated");
      } else {
        const { error } = await supabase.from("gov_clinical_waste").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_clinical_waste", { weight: payload.weight_kg });
        toast.success("Collection logged");
      }
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this waste record?")) return;
    const { error } = await supabase.from("gov_clinical_waste").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_clinical_waste", { id });
    toast.success("Deleted"); load();
  };

  const totalKg = rows.reduce((sum, r) => sum + (Number(r.weight_kg) || 0), 0);

  return (
    <RegisterShell
      title="Clinical waste records"
      description="Duty-of-care chain for clinical waste collections: carrier, weight and consignment notes."
      count={rows.length}
      onNew={openNew}
      newLabel="New collection"
      toolbar={<Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[10px]">Total {totalKg.toFixed(1)} kg</Badge>}
      isEmpty={rows.length === 0}
      empty={{ title: "No collections recorded", hint: "Log each clinical waste collection with carrier name, weight and consignment note reference for HSE duty-of-care evidence." }}
    >
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Trash2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-sm">{format(parseISO(r.collection_date), "dd/MM/yyyy")}</span>
                  {r.weight_kg != null && <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-300 bg-emerald-500/10">{r.weight_kg} kg</Badge>}
                  {r.carrier && <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">{r.carrier}</Badge>}
                </div>
                <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                  {r.consignment_note && <span>Consignment: {r.consignment_note}</span>}
                </div>
                {r.notes && <p className="text-[12px] text-slate-300 mt-1">{r.notes}</p>}
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit waste collection" : "New waste collection"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Collection date</Label><Input type="date" value={form.collection_date} onChange={e => setForm({...form, collection_date: e.target.value})} /></div>
            <div><Label>Weight (kg)</Label><Input type="number" step="0.1" value={form.weight_kg} onChange={e => setForm({...form, weight_kg: e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Carrier</Label><Input value={form.carrier} onChange={e => setForm({...form, carrier: e.target.value})} placeholder="Licensed carrier name" /></div>
            <div className="sm:col-span-2"><Label>Consignment note ref</Label><Input value={form.consignment_note} onChange={e => setForm({...form, consignment_note: e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
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

export default ClinicalWasteRegister;