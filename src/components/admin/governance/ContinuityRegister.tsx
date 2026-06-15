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
import { format, parseISO, differenceInDays } from "date-fns";
import { LifeBuoy, Pencil, Trash2 } from "lucide-react";
import { RegisterShell, logAccess } from "./RegisterShell";
import AttachmentsList from "./AttachmentsList";
import AIDraftButton from "./AIDraftButton";
import SuggestedChecklist, { Suggestion } from "./SuggestedChecklist";

interface Row {
  id: string; title: string; scenario: string | null; version: string | null;
  file_path: string | null; last_tested: string | null; next_test_due: string | null;
}

const blank = {
  title: "", scenario: "", version: "1.0",
  last_tested: "", next_test_due: "",
};

const dueTone = (date: string | null) => {
  if (!date) return "border-slate-700 text-slate-400";
  const d = differenceInDays(parseISO(date), new Date());
  if (d < 0) return "border-rose-500/40 text-rose-300 bg-rose-500/10";
  if (d <= 30) return "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
};

const ContinuityRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_continuity_plans").select("*").order("title");
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      title: r.title, scenario: r.scenario ?? "", version: r.version ?? "",
      last_tested: r.last_tested ?? "", next_test_due: r.next_test_due ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        scenario: form.scenario.trim() || null,
        version: form.version.trim() || null,
        last_tested: form.last_tested || null,
        next_test_due: form.next_test_due || null,
      };
      if (editId) {
        const { error } = await supabase.from("gov_continuity_plans").update(payload).eq("id", editId);
        if (error) throw error;
        await logAccess(supabase, "update", "gov_continuity_plans", { id: editId });
      } else {
        const { error } = await supabase.from("gov_continuity_plans").insert(payload);
        if (error) throw error;
        await logAccess(supabase, "create", "gov_continuity_plans", { title: form.title });
      }
      toast.success("Saved"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.from("gov_continuity_plans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "delete", "gov_continuity_plans", { id });
    toast.success("Deleted"); load();
  };

  const matchTitle = (needle: string) => (rs: Row[]) =>
    rs.find(r => r.title?.toLowerCase().includes(needle.toLowerCase()));

  const SUGGESTIONS: Suggestion<Row>[] = [
    { key: "equipment-failure", label: "Equipment failure (microsuction / otoscope)", hint: "Backup unit, repair contact, loaner.", matches: matchTitle("equipment") },
    { key: "illness", label: "Practitioner illness / cover", hint: "Cancellation script, locum cover, refund policy.", matches: matchTitle("illness") },
    { key: "it-data", label: "IT / data loss & cloud backup", hint: "Monthly encrypted backup of ShawScope data.", matches: matchTitle("data") },
    { key: "vehicle", label: "Vehicle breakdown contingency", hint: "Breakdown cover, taxi/public-transport fallback.", matches: matchTitle("vehicle") },
    { key: "lone-emergency", label: "Lone-worker emergency procedure", hint: "Trigger emergency contact, escalation chain.", matches: matchTitle("lone") },
    { key: "premises", label: "Loss of clinic premises", hint: "Mobile-only operation, alternate venue.", matches: matchTitle("premises") },
    { key: "power", label: "Power outage at patient home", hint: "Battery devices, reschedule policy.", matches: matchTitle("power") },
    { key: "supplier", label: "Supplier / consumables shortage", hint: "Secondary suppliers, minimum stock levels.", matches: matchTitle("supplier") },
    { key: "cyber", label: "Cyber incident / ransomware", hint: "Password manager, MFA, reporting to ICO.", matches: matchTitle("cyber") },
    { key: "comms", label: "Communications outage (phone/email)", hint: "Backup mobile number, manual notification.", matches: matchTitle("communications") },
  ];

  return (
    <RegisterShell
      title="Business continuity"
      description="Document plans for service disruption — system outage, illness, vehicle failure, supply chain issues — with regular tests."
      count={rows.length} onNew={openNew} newLabel="New plan"
      toolbar={
        <AIDraftButton
          kind="continuity"
          onDraft={(d) => {
            setEditId(null);
            setForm({
              ...blank,
              title: d.title,
              scenario: d.body,
              next_test_due: d.meta?.next_test_in_months
                ? format(new Date(Date.now() + d.meta.next_test_in_months * 30 * 24 * 3600 * 1000), "yyyy-MM-dd")
                : "",
            });
            setOpen(true);
          }}
        />
      }
      isEmpty={rows.length === 0}
      empty={{ title: "No continuity plans", hint: "Add plans for unplanned absence, IT outage, equipment failure and supplier disruption." }}
    >
      <SuggestedChecklist
        storageKey="continuity"
        suggestions={SUGGESTIONS}
        rows={rows}
        onAdd={(s) => {
          setEditId(null);
          setForm({ ...blank, title: s.label });
          setOpen(true);
        }}
        onOpenMatch={(matched) => openEdit(matched)}
        matchLabel={(m) => m.title}
      />
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <LifeBuoy className="h-4 w-4 text-sky-400 shrink-0" />
                  <span className="font-medium text-sm">{r.title}</span>
                  {r.version && <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">v{r.version}</Badge>}
                </div>
                {r.scenario && <p className="text-sm text-slate-200 line-clamp-2">{r.scenario}</p>}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.last_tested && (
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                      Last tested {format(parseISO(r.last_tested),"dd/MM/yyyy")}
                    </Badge>
                  )}
                  {r.next_test_due && (
                    <Badge variant="outline" className={`text-[10px] ${dueTone(r.next_test_due)}`}>
                      Next test {format(parseISO(r.next_test_due),"dd/MM/yyyy")}
                    </Badge>
                  )}
                </div>
                <div className="mt-2"><AttachmentsList recordType="gov_continuity_plans" recordId={r.id} compact /></div>
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit plan" : "New continuity plan"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. IT system outage" /></div>
            <div className="sm:col-span-2"><Label>Scenario & response</Label><Textarea rows={4} value={form.scenario} onChange={e=>setForm({...form,scenario:e.target.value})} /></div>
            <div><Label>Version</Label><Input value={form.version} onChange={e=>setForm({...form,version:e.target.value})} placeholder="1.0" /></div>
            <div><Label>Last tested</Label><Input type="date" value={form.last_tested} onChange={e=>setForm({...form,last_tested:e.target.value})} /></div>
            <div><Label>Next test due</Label><Input type="date" value={form.next_test_due} onChange={e=>setForm({...form,next_test_due:e.target.value})} /></div>
            {editId && <div className="sm:col-span-2"><Label className="mb-2 block">Attachments</Label><AttachmentsList recordType="gov_continuity_plans" recordId={editId} /></div>}
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

export default ContinuityRegister;