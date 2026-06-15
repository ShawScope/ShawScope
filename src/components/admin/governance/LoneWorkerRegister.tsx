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
import { format, parseISO, formatDistanceStrict } from "date-fns";
import { UserCheck, Trash2, LogOut, AlertOctagon } from "lucide-react";
import { RegisterShell, statusTone, logAccess } from "./RegisterShell";
import StartDayButton from "./StartDayButton";

interface Row {
  id: string; start_time: string; end_time: string | null; expected_end: string | null;
  location: string | null; emergency_contact: string | null; status: string;
  escalated: boolean; notes: string | null;
}

const nowIso = () => new Date().toISOString();
const toLocalInput = (iso: string) => {
  const d = new Date(iso); const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

const LoneWorkerRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    location: "", emergency_contact: "",
    expected_end: toLocalInput(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gov_lone_worker_checkins").select("*").order("start_time", { ascending: false }).limit(50);
    setRows((data as any) ?? []);
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const startCheckin = async () => {
    setSaving(true);
    try {
      const expected = form.expected_end ? new Date(form.expected_end).toISOString() : null;
      const { error } = await supabase.from("gov_lone_worker_checkins").insert({
        start_time: nowIso(),
        expected_end: expected,
        location: form.location.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
        notes: form.notes.trim() || null,
        status: "active",
      });
      if (error) throw error;
      await logAccess(supabase, "create", "gov_lone_worker_checkins", { location: form.location });
      toast.success("Check-in started");
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setSaving(false);
  };

  const checkOut = async (r: Row) => {
    const { error } = await supabase.from("gov_lone_worker_checkins")
      .update({ end_time: nowIso(), status: "completed" })
      .eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await logAccess(supabase, "checkout", "gov_lone_worker_checkins", { id: r.id });
    toast.success("Checked out safely"); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this check-in?")) return;
    const { error } = await supabase.from("gov_lone_worker_checkins").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted"); load();
  };

  const isOverdue = (r: Row) => r.status === "active" && r.expected_end && new Date(r.expected_end) < new Date();

  return (
    <RegisterShell
      title="Lone-worker safety"
      description="Live check-ins with expected return time so you have an auditable trail of safe arrivals and departures."
      count={rows.length}
      onNew={() => setOpen(true)}
      newLabel="Manual check-in"
      isEmpty={rows.length === 0}
      empty={{ title: "No check-ins logged", hint: "Start a check-in before any lone visit. Set an expected return time and an emergency contact." }}
    >
      <StartDayButton variant="full" />

      <div className="space-y-2">
        {rows.map(r => {
          const overdue = isOverdue(r);
          return (
            <Card key={r.id} className={`p-3 bg-slate-950/60 ${overdue ? "border-rose-500/50" : "border-slate-800"}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {overdue ? <AlertOctagon className="h-4 w-4 text-rose-400 shrink-0" /> : <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />}
                    <span className="font-medium text-sm">Start {format(parseISO(r.start_time), "dd/MM/yyyy HH:mm")}</span>
                    <Badge variant="outline" className={`text-[10px] ${overdue ? "bg-rose-500/15 text-rose-300 border-rose-500/40" : statusTone(r.status)}`}>
                      {overdue ? "OVERDUE" : r.status}
                    </Badge>
                    {r.location && <span className="text-[11px] text-muted-foreground">📍 {r.location}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                    {r.expected_end && <span>Expected back {format(parseISO(r.expected_end), "HH:mm")}</span>}
                    {r.end_time && <span>Checked out {format(parseISO(r.end_time), "HH:mm")} ({formatDistanceStrict(parseISO(r.end_time), parseISO(r.start_time))})</span>}
                    {r.emergency_contact && <span>Emergency: {r.emergency_contact}</span>}
                  </div>
                  {r.notes && <p className="text-[12px] text-slate-300 mt-1">{r.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {r.status === "active" && (
                    <Button size="sm" className="h-8 bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25" onClick={() => checkOut(r)}>
                      <LogOut className="h-3.5 w-3.5 mr-1" /> Check out
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Start lone-worker check-in</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Patient name / postcode" /></div>
            <div><Label>Expected back</Label><Input type="datetime-local" value={form.expected_end} onChange={e => setForm({...form, expected_end: e.target.value})} /></div>
            <div><Label>Emergency contact</Label><Input value={form.emergency_contact} onChange={e => setForm({...form, emergency_contact: e.target.value})} placeholder="Name / phone" /></div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={startCheckin} disabled={saving}>{saving ? "Starting..." : "Start check-in"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RegisterShell>
  );
};

export default LoneWorkerRegister;