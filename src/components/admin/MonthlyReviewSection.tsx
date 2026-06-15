import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from "date-fns";
import {
  ArrowLeft, ArrowRight, Lock, Unlock, CheckCircle2, Circle, Plus, Trash2, Pencil, Eye,
  Shield, ClipboardList, FileText, Printer, AlertTriangle, GraduationCap, Activity,
  CalendarCheck, Sparkles, History, Download, ChevronDown, ChevronUp, BookOpen, ListTodo,
} from "lucide-react";
import AuditEntryDetail from "./AuditEntryDetail";
import BusinessPoliciesSection from "./BusinessPoliciesSection";
import { CATEGORIES } from "./ClinicalAuditTab";

// ---------- types ----------
interface AuditEntry {
  id: string; created_at: string; entry_date: string; category: string;
  title: string; description: string | null; patient_name: string | null;
  severity: string; status: string; resolution: string | null; resolved_at: string | null;
  cpd_hours: number | null; cpd_provider: string | null; cpd_certificate_path: string | null;
  tags: string[];
}
interface ChecklistItem { id: string; label: string; done: boolean; done_at?: string | null; notes?: string; }
interface ManualMetric { id: string; label: string; value: string; category: string; notes?: string; date?: string; }
interface MonthlyReview {
  id: string;
  review_month: string;
  review_text: string | null;
  governance_score: number | null;
  status: "draft" | "completed";
  completed_at: string | null;
  checklist: ChecklistItem[];
  manual_metrics: ManualMetric[];
}
interface Appointment {
  id: string; appointment_date: string; appointment_time: string;
  status: string; price: number | null; client_name: string;
}
interface Reflection {
  id: string; review_id: string;
  description: string | null; feelings: string | null; evaluation: string | null;
  analysis: string | null; conclusion: string | null; action_plan: string | null;
}
interface ActionItem { id: string; review_id: string; action_text: string; deadline: string | null; todo_id: string | null; completed: boolean; }

// ---------- defaults ----------
const DEFAULT_CHECKLIST: Omit<ChecklistItem, "done" | "done_at">[] = [
  { id: "gov_meeting", label: "Governance review meeting (review last period's data)" },
  { id: "equipment", label: "Equipment & calibration checks" },
  { id: "cleaning", label: "Deep clean & infection-control audit" },
  { id: "policy", label: "Policy & SOP review" },
  { id: "insurance", label: "Insurance, registration & DBS check" },
  { id: "stock", label: "Stock & consumables review" },
  { id: "complaints", label: "Complaints log reviewed & responded to" },
  { id: "training", label: "CPD / training plan reviewed" },
];

const MANUAL_CATEGORIES = [
  { value: "training", label: "Training attended", icon: GraduationCap, color: "text-blue-400" },
  { value: "meeting", label: "Meeting / discussion", icon: ClipboardList, color: "text-violet-400" },
  { value: "audit", label: "Audit / inspection", icon: Shield, color: "text-cyan-400" },
  { value: "improvement", label: "Improvement / change", icon: Sparkles, color: "text-amber-400" },
  { value: "other", label: "Other", icon: FileText, color: "text-muted-foreground" },
];

const newId = () => Math.random().toString(36).slice(2, 10);

// =========================================================
const MonthlyReviewSection: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const [review, setReview] = useState<MonthlyReview | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pastReviews, setPastReviews] = useState<MonthlyReview[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);
  const [reflectionDialog, setReflectionDialog] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(null);
  const [newAction, setNewAction] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  const isCurrent = isSameMonth(selectedMonth, new Date());
  const isFuture = selectedMonth > startOfMonth(new Date());
  const locked = review?.status === "completed";
  const monthStr = format(selectedMonth, "yyyy-MM-dd");
  const monthLabel = format(selectedMonth, "MMMM yyyy");

  const [entryForm, setEntryForm] = useState({
    entry_date: format(new Date(), "yyyy-MM-dd"),
    category: "incident",
    title: "", description: "", patient_name: "",
    severity: "low", status: "open", resolution: "",
    cpd_hours: "", cpd_provider: "",
  });

  const [reflForm, setReflForm] = useState({
    description: "", feelings: "", evaluation: "",
    analysis: "", conclusion: "", action_plan: "",
  });

  // ---------- fetchers ----------
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const start = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

    const [revRes, entRes, aptRes, pastRes] = await Promise.all([
      supabase.from("clinical_audit_monthly_reviews").select("*").eq("review_month", monthStr).maybeSingle(),
      supabase.from("clinical_audit_entries").select("*").gte("entry_date", start).lte("entry_date", end).order("entry_date", { ascending: false }),
      supabase.from("appointments").select("id, appointment_date, appointment_time, status, price, client_name").gte("appointment_date", start).lte("appointment_date", end),
      supabase.from("clinical_audit_monthly_reviews").select("*").order("review_month", { ascending: false }).limit(24),
    ]);

    if (entRes.data) setEntries(entRes.data as AuditEntry[]);
    if (aptRes.data) setAppointments(aptRes.data as Appointment[]);
    if (pastRes.data) setPastReviews(pastRes.data as unknown as MonthlyReview[]);

    if (revRes.data) {
      const r = revRes.data as any;
      const normalised: MonthlyReview = {
        ...r,
        checklist: Array.isArray(r.checklist) && r.checklist.length > 0 ? r.checklist : DEFAULT_CHECKLIST.map(c => ({ ...c, done: false, done_at: null })),
        manual_metrics: Array.isArray(r.manual_metrics) ? r.manual_metrics : [],
      };
      setReview(normalised);
      setReviewText(r.review_text || "");
      const [refRes, actRes] = await Promise.all([
        supabase.from("clinical_audit_reflections" as any).select("*").eq("review_id", r.id).order("created_at"),
        supabase.from("clinical_audit_actions").select("*").eq("review_id", r.id).order("created_at"),
      ]);
      if (refRes.data) setReflections(refRes.data as unknown as Reflection[]);
      if (actRes.data) setActions(actRes.data as ActionItem[]);
    } else {
      setReview(null);
      setReviewText("");
      setReflections([]);
      setActions([]);
    }
    setLoading(false);
  }, [selectedMonth, monthStr]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ---------- metrics ----------
  const metrics = useMemo(() => {
    const total = appointments.length;
    const cancelled = appointments.filter(a => a.status === "cancelled").length;
    const rejected = appointments.filter(a => a.status === "rejected").length;
    const noShow = appointments.filter(a => a.status === "no_show" || a.status === "no-show").length;
    const completed = appointments.filter(a => a.status === "completed").length;
    const confirmed = appointments.filter(a => a.status === "confirmed").length;
    const revenue = appointments
      .filter(a => a.status !== "cancelled" && a.status !== "rejected")
      .reduce((s, a) => s + (Number(a.price) || 0), 0);

    const incidents = entries.filter(e => e.category === "incident").length;
    const nearMiss = entries.filter(e => e.category === "near_miss").length;
    const complaints = entries.filter(e => e.category === "complaint").length;
    const safeguarding = entries.filter(e => e.category === "safeguarding").length;
    const cpdHours = entries.filter(e => e.category === "cpd").reduce((s, e) => s + (Number(e.cpd_hours) || 0), 0);

    const allNeg = entries.filter(e => ["incident", "near_miss", "complaint", "safeguarding"].includes(e.category));
    const resolved = allNeg.filter(e => e.status === "resolved").length;
    const open = allNeg.filter(e => e.status !== "resolved").length;
    const highOpen = allNeg.filter(e => e.severity === "high" && e.status !== "resolved").length;
    const score = Math.max(0, Math.min(100, 100 - (open * 10) - (highOpen * 15)));

    return { total, cancelled, rejected, noShow, completed, confirmed, revenue,
      incidents, nearMiss, complaints, safeguarding, cpdHours,
      negResolved: resolved, negOpen: open, score };
  }, [appointments, entries]);

  // ---------- review helpers ----------
  const ensureReview = async (): Promise<MonthlyReview | null> => {
    if (review?.id) return review;
    const { data, error } = await supabase
      .from("clinical_audit_monthly_reviews")
      .insert({
        review_month: monthStr,
        review_text: null,
        governance_score: metrics.score,
        checklist: DEFAULT_CHECKLIST.map(c => ({ ...c, done: false, done_at: null })) as any,
        manual_metrics: [] as any,
      } as any)
      .select()
      .single();
    if (error || !data) { toast.error("Could not start period"); return null; }
    const r = data as any;
    const m: MonthlyReview = { ...r, checklist: r.checklist || [], manual_metrics: r.manual_metrics || [] };
    setReview(m);
    return m;
  };

  const patchReview = async (patch: Partial<MonthlyReview>) => {
    const r = await ensureReview();
    if (!r) return;
    const { error } = await supabase.from("clinical_audit_monthly_reviews").update(patch as any).eq("id", r.id);
    if (error) { toast.error("Save failed"); return; }
    setReview({ ...r, ...patch });
  };

  // ---------- checklist ----------
  const toggleChecklist = async (id: string) => {
    if (locked) return;
    const r = await ensureReview();
    if (!r) return;
    const updated = (r.checklist || []).map(c =>
      c.id === id ? { ...c, done: !c.done, done_at: !c.done ? new Date().toISOString() : null } : c
    );
    await patchReview({ checklist: updated });
  };

  const addChecklistItem = async (label: string) => {
    if (!label.trim() || locked) return;
    const r = await ensureReview();
    if (!r) return;
    const updated = [...(r.checklist || []), { id: newId(), label: label.trim(), done: false, done_at: null }];
    await patchReview({ checklist: updated });
  };

  const removeChecklistItem = async (id: string) => {
    if (locked) return;
    const r = review;
    if (!r) return;
    await patchReview({ checklist: (r.checklist || []).filter(c => c.id !== id) });
  };

  // ---------- manual metrics ----------
  const addManual = async (m: Omit<ManualMetric, "id">) => {
    if (locked) return;
    const r = await ensureReview();
    if (!r) return;
    const updated = [...(r.manual_metrics || []), { ...m, id: newId() }];
    await patchReview({ manual_metrics: updated });
  };
  const removeManual = async (id: string) => {
    if (locked) return;
    const r = review;
    if (!r) return;
    await patchReview({ manual_metrics: (r.manual_metrics || []).filter(m => m.id !== id) });
  };

  // ---------- review text ----------
  const saveReviewText = async () => {
    const r = await ensureReview();
    if (!r) return;
    await supabase.from("clinical_audit_monthly_reviews")
      .update({ review_text: reviewText.trim() || null, governance_score: metrics.score })
      .eq("id", r.id);
    toast.success("Review notes saved");
    setReview({ ...r, review_text: reviewText.trim() || null });
  };

  // ---------- complete / reopen ----------
  const completePeriod = async () => {
    const r = await ensureReview();
    if (!r) return;
    await supabase.from("clinical_audit_monthly_reviews")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        review_text: reviewText.trim() || null,
        governance_score: metrics.score,
      } as any)
      .eq("id", r.id);
    toast.success(`${monthLabel} period marked complete`);
    fetchAll();
  };
  const reopenPeriod = async () => {
    if (!review) return;
    await supabase.from("clinical_audit_monthly_reviews")
      .update({ status: "draft", completed_at: null } as any)
      .eq("id", review.id);
    toast.success("Period reopened");
    fetchAll();
  };

  // ---------- entries (incidents etc) ----------
  const resetEntryForm = () => {
    setEntryForm({
      entry_date: format(selectedMonth > new Date() ? new Date() : selectedMonth, "yyyy-MM-dd"),
      category: "incident", title: "", description: "", patient_name: "",
      severity: "low", status: "open", resolution: "", cpd_hours: "", cpd_provider: "",
    });
    setEditingId(null);
  };
  const openEntryDialog = (preset?: string) => {
    resetEntryForm();
    if (preset) setEntryForm(f => ({ ...f, category: preset }));
    setEntryDialogOpen(true);
  };
  const saveEntry = async () => {
    if (!entryForm.title.trim()) { toast.error("Title required"); return; }
    const payload = {
      entry_date: entryForm.entry_date,
      category: entryForm.category,
      title: entryForm.title.trim(),
      description: entryForm.description.trim() || null,
      patient_name: entryForm.patient_name.trim() || null,
      severity: entryForm.severity,
      status: entryForm.status,
      resolution: entryForm.resolution.trim() || null,
      resolved_at: entryForm.status === "resolved" ? new Date().toISOString() : null,
      cpd_hours: entryForm.cpd_hours ? parseFloat(entryForm.cpd_hours) : 0,
      cpd_provider: entryForm.cpd_provider.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from("clinical_audit_entries").update(payload).eq("id", editingId);
      if (error) { toast.error("Update failed"); return; }
      toast.success("Entry updated");
    } else {
      const { error } = await supabase.from("clinical_audit_entries").insert(payload);
      if (error) { toast.error("Save failed"); return; }
      toast.success("Entry added");
    }
    setEntryDialogOpen(false);
    resetEntryForm();
    fetchAll();
  };
  const deleteEntry = async (id: string) => {
    await supabase.from("clinical_audit_entries").delete().eq("id", id);
    toast.success("Deleted");
    fetchAll();
  };
  const editEntry = (e: AuditEntry) => {
    setEntryForm({
      entry_date: e.entry_date, category: e.category, title: e.title,
      description: e.description || "", patient_name: e.patient_name || "",
      severity: e.severity, status: e.status, resolution: e.resolution || "",
      cpd_hours: e.cpd_hours?.toString() || "", cpd_provider: e.cpd_provider || "",
    });
    setEditingId(e.id);
    setEntryDialogOpen(true);
  };

  // ---------- reflections ----------
  const openNewReflection = () => {
    setEditingReflection(null);
    setReflForm({ description: "", feelings: "", evaluation: "", analysis: "", conclusion: "", action_plan: "" });
    setReflectionDialog(true);
  };
  const openEditReflection = (r: Reflection) => {
    setEditingReflection(r);
    setReflForm({
      description: r.description || "", feelings: r.feelings || "", evaluation: r.evaluation || "",
      analysis: r.analysis || "", conclusion: r.conclusion || "", action_plan: r.action_plan || "",
    });
    setReflectionDialog(true);
  };
  const saveReflection = async () => {
    const rv = await ensureReview();
    if (!rv) return;
    const payload = { review_id: rv.id, ...reflForm };
    if (editingReflection) {
      await supabase.from("clinical_audit_reflections" as any).update(payload).eq("id", editingReflection.id);
      toast.success("Reflection updated");
    } else {
      await supabase.from("clinical_audit_reflections" as any).insert(payload);
      toast.success("Reflection added");
    }
    setReflectionDialog(false);
    fetchAll();
  };
  const deleteReflection = async (id: string) => {
    await supabase.from("clinical_audit_reflections" as any).delete().eq("id", id);
    fetchAll();
  };

  // ---------- action items ----------
  const addAction = async () => {
    if (!newAction.trim()) return;
    const rv = await ensureReview();
    if (!rv) return;
    const { data: todo } = await supabase.from("admin_todos").insert({
      title: newAction.trim(),
      description: `Governance action from ${monthLabel} review`,
      due_date: newDeadline || null,
      priority: 1,
      todo_category: "admin",
    } as any).select("id").single();
    await supabase.from("clinical_audit_actions").insert({
      review_id: rv.id, action_text: newAction.trim(),
      deadline: newDeadline || null, todo_id: todo?.id || null,
    });
    toast.success("Action added");
    setNewAction(""); setNewDeadline("");
    fetchAll();
  };
  const deleteAction = async (a: ActionItem) => {
    if (a.todo_id) await supabase.from("admin_todos").delete().eq("id", a.todo_id);
    await supabase.from("clinical_audit_actions").delete().eq("id", a.id);
    fetchAll();
  };

  const getCatInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];

  // ---------- UI ----------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="font-serif text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Shield className="h-5 w-5 text-cyan-400" />
          Clinical Governance
        </h2>
        <p className="text-xs text-muted-foreground">CQC-style monthly governance period · review, evidence & sign-off</p>
      </div>

      {/* Period navigator */}
      <Card className="bg-card/60 border-border/60">
        <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center">
              <div className="text-base font-semibold text-white">{monthLabel}</div>
              <div className="text-[11px] text-muted-foreground">
                {format(startOfMonth(selectedMonth), "dd/MM/yyyy")} – {format(endOfMonth(selectedMonth), "dd/MM/yyyy")}
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={isFuture}
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 sm:ml-auto flex-wrap">
            <Badge variant="outline" className={
              locked ? "bg-emerald-900/40 text-emerald-300 border-emerald-600/40"
                     : "bg-amber-900/40 text-amber-300 border-amber-600/40"
            }>
              {locked ? <><Lock className="h-3 w-3 mr-1" />Completed</> : <><Unlock className="h-3 w-3 mr-1" />Draft</>}
            </Badge>
            {locked ? (
              <>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSummaryOpen(true)}>
                  <Eye className="h-3 w-3 mr-1" /> Summary
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={reopenPeriod}>
                  <Unlock className="h-3 w-3 mr-1" /> Reopen
                </Button>
              </>
            ) : (
              <Button size="sm" className="h-8 bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
                onClick={completePeriod} disabled={isFuture}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete Period
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 1. Period at a glance */}
      <SectionHeader icon={Activity} title="Period at a glance" color="text-cyan-400" />
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        <Stat label="Bookings" value={metrics.total} color="text-white" />
        <Stat label="Completed" value={metrics.completed} color="text-emerald-400" />
        <Stat label="Cancelled" value={metrics.cancelled} color="text-amber-400" />
        <Stat label="No-shows" value={metrics.noShow} color="text-red-400" />
        <Stat label="Revenue" value={`£${metrics.revenue.toFixed(0)}`} color="text-emerald-400" />
        <Stat label="CPD hrs" value={metrics.cpdHours.toFixed(1)} color="text-blue-400" />
        <Stat label="Incidents" value={metrics.incidents} color="text-red-400" sub={metrics.incidents ? `${metrics.negOpen} open` : undefined} />
        <Stat label="Near miss" value={metrics.nearMiss} color="text-amber-400" />
        <Stat label="Complaints" value={metrics.complaints} color="text-orange-400" />
        <Stat label="Safeguarding" value={metrics.safeguarding} color="text-pink-400" />
        <Stat label="Resolved" value={metrics.negResolved} color="text-emerald-400" />
        <Stat label="Score" value={`${metrics.score}%`}
          color={metrics.score >= 80 ? "text-emerald-400" : metrics.score >= 50 ? "text-amber-400" : "text-red-400"} />
      </div>

      {/* 2. Monthly checklist */}
      <SectionHeader icon={ClipboardList} title="Monthly checklist" color="text-violet-400" />
      <ChecklistPanel
        items={review?.checklist?.length ? review.checklist : DEFAULT_CHECKLIST.map(c => ({ ...c, done: false, done_at: null }))}
        locked={locked}
        onToggle={toggleChecklist}
        onAdd={addChecklistItem}
        onRemove={removeChecklistItem}
      />

      {/* 3. Manual entries */}
      <SectionHeader icon={ListTodo} title="Manual entries (training, meetings, etc.)" color="text-amber-400" />
      <ManualEntriesPanel
        items={review?.manual_metrics || []}
        locked={locked}
        onAdd={addManual}
        onRemove={removeManual}
      />

      {/* 4. Incidents / complaints / CPD entries */}
      <SectionHeader icon={AlertTriangle} title="Incidents, complaints & CPD (CQC log)" color="text-red-400" />
      <Card className="bg-card/60 border-border/60">
        <CardContent className="p-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="text-xs h-8" disabled={locked} onClick={() => openEntryDialog("incident")}>
              <Plus className="h-3 w-3 mr-1" /> Incident
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" disabled={locked} onClick={() => openEntryDialog("near_miss")}>
              <Plus className="h-3 w-3 mr-1" /> Near miss
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" disabled={locked} onClick={() => openEntryDialog("complaint")}>
              <Plus className="h-3 w-3 mr-1" /> Complaint
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" disabled={locked} onClick={() => openEntryDialog("safeguarding")}>
              <Plus className="h-3 w-3 mr-1" /> Safeguarding
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" disabled={locked} onClick={() => openEntryDialog("cpd")}>
              <Plus className="h-3 w-3 mr-1" /> CPD
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8 ml-auto" disabled={locked} onClick={() => openEntryDialog()}>
              <Plus className="h-3 w-3 mr-1" /> Other entry
            </Button>
          </div>
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No entries logged for {monthLabel}.</p>
          ) : (
            <div className="space-y-1.5">
              {entries.map(e => {
                const cat = getCatInfo(e.category);
                const Icon = cat.icon;
                return (
                  <div key={e.id} className="flex items-start gap-2 bg-card/50 border border-border/40 rounded p-2">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cat.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white break-words">{e.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{format(parseISO(e.entry_date), "dd/MM/yyyy")}</span>
                        <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground border-border/40">{cat.label}</Badge>
                        {e.category !== "cpd" && (
                          <Badge variant="outline" className={`text-[10px] ${
                            e.severity === "high" ? "bg-red-900/40 text-red-300 border-red-600/40" :
                            e.severity === "medium" ? "bg-amber-900/40 text-amber-300 border-amber-600/40" :
                            "bg-green-900/40 text-green-300 border-green-600/40"
                          }`}>{e.severity}</Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] ${
                          e.status === "resolved" ? "bg-emerald-900/40 text-emerald-300 border-emerald-600/40" :
                          "bg-muted/60 text-muted-foreground border-border/40"
                        }`}>{e.status.replace("_", " ")}</Badge>
                        {e.cpd_hours ? <Badge variant="outline" className="text-[10px] bg-blue-900/40 text-blue-300 border-blue-600/40">{e.cpd_hours}h</Badge> : null}
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setDetailEntry(e)}>
                        <Eye className="h-3 w-3 text-cyan-400" />
                      </Button>
                      {!locked && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => editEntry(e)}>
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>}
                      {!locked && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteEntry(e.id)}>
                        <Trash2 className="h-3 w-3 text-red-400" />
                      </Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Reflections + Actions */}
      <SectionHeader icon={BookOpen} title="Reflections & action items" color="text-violet-400" />
      <Card className="bg-card/60 border-border/60">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Gibbs reflections</Label>
            <Button size="sm" variant="outline" className="text-xs h-7" disabled={locked} onClick={openNewReflection}>
              <Plus className="h-3 w-3 mr-1" /> Add reflection
            </Button>
          </div>
          {reflections.length === 0 && <p className="text-[11px] text-muted-foreground">No reflections yet.</p>}
          {reflections.map(r => (
            <Card key={r.id} className="bg-card/50 border-border/40">
              <CardContent className="p-2 space-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-white line-clamp-2">{r.description || "Untitled"}</p>
                  {!locked && (
                    <div className="flex gap-0.5">
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => openEditReflection(r)}>
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => deleteReflection(r.id)}>
                        <Trash2 className="h-3 w-3 text-red-400" />
                      </Button>
                    </div>
                  )}
                </div>
                {r.conclusion && <p className="text-[11px] text-muted-foreground line-clamp-1"><b>Conclusion:</b> {r.conclusion}</p>}
              </CardContent>
            </Card>
          ))}

          <div className="border-t border-border/40 pt-3 space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <ListTodo className="h-3 w-3" /> Action items (auto-added to Todo)
            </Label>
            {!locked && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={newAction} onChange={e => setNewAction(e.target.value)} placeholder="e.g. Review infection control SOP" className="bg-card border-border text-white text-xs h-8 flex-1" />
                <div className="flex gap-2">
                  <Input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} className="bg-card border-border text-white text-xs h-8 sm:w-[130px]" />
                  <Button size="sm" onClick={addAction} disabled={!newAction.trim()} className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs h-8">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {actions.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-card/50 border border-border/40 rounded p-2">
                <ListTodo className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <span className="text-xs text-white flex-1">{a.action_text}</span>
                {a.deadline && <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground border-border/40">Due {format(parseISO(a.deadline), "dd/MM/yyyy")}</Badge>}
                {!locked && <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => deleteAction(a)}>
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 6. Period review notes */}
      <SectionHeader icon={CalendarCheck} title="Period review notes" color="text-emerald-400" />
      <Card className="bg-card/60 border-border/60">
        <CardContent className="p-3 space-y-2">
          <Textarea
            value={reviewText}
            disabled={locked}
            onChange={e => setReviewText(e.target.value)}
            placeholder="Summary of this period's governance review — key learnings, decisions, improvements planned…"
            rows={4}
            className="bg-card border-border text-white text-xs"
          />
          {!locked && (
            <div className="flex gap-2">
              <Button size="sm" onClick={saveReviewText} className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs h-8">
                Save notes
              </Button>
              <Button size="sm" onClick={() => setSummaryOpen(true)} variant="outline" className="text-xs h-8">
                <Eye className="h-3 w-3 mr-1" /> Preview summary
              </Button>
              <Button size="sm" onClick={completePeriod} disabled={isFuture}
                className="ml-auto bg-emerald-700 hover:bg-emerald-600 text-white text-xs h-8">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark period complete
              </Button>
            </div>
          )}
          {locked && review?.completed_at && (
            <p className="text-[11px] text-emerald-300">
              Completed {format(parseISO(review.completed_at), "dd/MM/yyyy 'at' HH:mm")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Past periods */}
      <SectionHeader icon={History} title="Past periods" color="text-muted-foreground" />
      <Card className="bg-card/60 border-border/60">
        <CardContent className="p-3">
          {pastReviews.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No previous periods yet.</p>
          ) : (
            <div className="space-y-1">
              {pastReviews.map(p => (
                <button key={p.id}
                  onClick={() => setSelectedMonth(startOfMonth(parseISO(p.review_month)))}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-muted/60 transition-colors ${
                    p.review_month === monthStr ? "bg-muted/60 border border-border/60" : ""
                  }`}>
                  <Badge variant="outline" className={
                    p.status === "completed"
                      ? "bg-emerald-900/40 text-emerald-300 border-emerald-600/40 text-[10px]"
                      : "bg-amber-900/40 text-amber-300 border-amber-600/40 text-[10px]"
                  }>
                    {p.status === "completed" ? "Done" : "Draft"}
                  </Badge>
                  <span className="text-xs text-white flex-1">{format(parseISO(p.review_month), "MMMM yyyy")}</span>
                  {p.governance_score != null && (
                    <span className="text-[10px] text-muted-foreground">{p.governance_score}%</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business policies */}
      <BusinessPoliciesSection />

      {/* === Dialogs === */}

      {/* Entry dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={(o) => { setEntryDialogOpen(o); if (!o) resetEntryForm(); }}>
        <DialogContent className="bg-background border-border text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? "Edit" : "New"} governance entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={entryForm.entry_date} onChange={e => setEntryForm({ ...entryForm, entry_date: e.target.value })} className="bg-card border-border text-white text-xs h-9" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={entryForm.category} onValueChange={v => setEntryForm({ ...entryForm, category: v })}>
                  <SelectTrigger className="bg-card border-border text-white text-xs h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input value={entryForm.title} onChange={e => setEntryForm({ ...entryForm, title: e.target.value })} className="bg-card border-border text-white text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={entryForm.description} onChange={e => setEntryForm({ ...entryForm, description: e.target.value })} rows={3} className="bg-card border-border text-white text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Severity</Label>
                <Select value={entryForm.severity} onValueChange={v => setEntryForm({ ...entryForm, severity: v })}>
                  <SelectTrigger className="bg-card border-border text-white text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={entryForm.status} onValueChange={v => setEntryForm({ ...entryForm, status: v })}>
                  <SelectTrigger className="bg-card border-border text-white text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Patient name (optional)</Label>
              <Input value={entryForm.patient_name} onChange={e => setEntryForm({ ...entryForm, patient_name: e.target.value })} className="bg-card border-border text-white text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Resolution / actions taken</Label>
              <Textarea value={entryForm.resolution} onChange={e => setEntryForm({ ...entryForm, resolution: e.target.value })} rows={2} className="bg-card border-border text-white text-xs" />
            </div>
            {entryForm.category === "cpd" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">CPD hours</Label>
                  <Input type="number" step="0.5" value={entryForm.cpd_hours} onChange={e => setEntryForm({ ...entryForm, cpd_hours: e.target.value })} className="bg-card border-border text-white text-xs h-8" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Provider</Label>
                  <Input value={entryForm.cpd_provider} onChange={e => setEntryForm({ ...entryForm, cpd_provider: e.target.value })} className="bg-card border-border text-white text-xs h-8" />
                </div>
              </div>
            )}
            <Button onClick={saveEntry} className="w-full bg-cyan-700 hover:bg-cyan-600 text-white">
              {editingId ? "Update" : "Save"} entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reflection dialog */}
      <Dialog open={reflectionDialog} onOpenChange={setReflectionDialog}>
        <DialogContent className="bg-background border-border text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingReflection ? "Edit" : "New"} reflection — Gibbs cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              ["description", "Description", "What happened?"],
              ["feelings", "Feelings", "What were you thinking/feeling?"],
              ["evaluation", "Evaluation", "What was good/bad?"],
              ["analysis", "Analysis", "What sense can you make of it?"],
              ["conclusion", "Conclusion", "What have you learned?"],
              ["action_plan", "Action plan", "What will you do differently?"],
            ].map(([key, label, hint]) => (
              <div key={key as string}>
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Textarea
                  value={(reflForm as any)[key as string]}
                  onChange={e => setReflForm(prev => ({ ...prev, [key as string]: e.target.value }))}
                  placeholder={hint as string}
                  rows={2}
                  className="bg-card border-border text-white text-xs"
                />
              </div>
            ))}
            <Button onClick={saveReflection} className="w-full bg-cyan-700 hover:bg-cyan-600 text-white">
              {editingReflection ? "Update" : "Save"} reflection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Entry detail */}
      {detailEntry && (
        <AuditEntryDetail
          entryId={detailEntry.id}
          entryTitle={detailEntry.title}
          entryStatus={detailEntry.status}
          entryDate={detailEntry.entry_date}
          entryCategory={detailEntry.category}
          entryDescription={detailEntry.description}
          entryPatientName={detailEntry.patient_name}
          entrySeverity={detailEntry.severity}
          entryResolution={detailEntry.resolution}
          open={!!detailEntry}
          onOpenChange={(o) => { if (!o) setDetailEntry(null); }}
          onEntryUpdated={fetchAll}
        />
      )}

      {/* Period summary / print */}
      <PeriodSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        monthLabel={monthLabel}
        review={review}
        reviewText={reviewText}
        metrics={metrics}
        entries={entries}
        reflections={reflections}
        actions={actions}
      />
    </div>
  );
};

// =========================================================
// Helpers

const SectionHeader: React.FC<{ icon: any; title: string; color: string }> = ({ icon: Icon, title, color }) => (
  <div className="flex items-center gap-2 mt-4 mb-1">
    <Icon className={`h-4 w-4 ${color}`} />
    <h3 className="text-sm font-semibold text-white">{title}</h3>
  </div>
);

const Stat: React.FC<{ label: string; value: any; color?: string; sub?: string }> = ({ label, value, color = "text-white", sub }) => (
  <Card className="bg-card/60 border-border/60">
    <CardContent className="p-2 text-center">
      <div className={`text-base sm:text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      {sub && <div className="text-[9px] text-red-400">{sub}</div>}
    </CardContent>
  </Card>
);

const ChecklistPanel: React.FC<{
  items: ChecklistItem[]; locked: boolean;
  onToggle: (id: string) => void;
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
}> = ({ items, locked, onToggle, onAdd, onRemove }) => {
  const [newItem, setNewItem] = useState("");
  const done = items.filter(i => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  return (
    <Card className="bg-card/60 border-border/60">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
            <div className={`h-full ${pct === 100 ? "bg-emerald-500" : "bg-cyan-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] text-muted-foreground">{done}/{items.length}</span>
        </div>
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 bg-card/50 border border-border/40 rounded p-2">
              <Checkbox checked={item.done} disabled={locked} onCheckedChange={() => onToggle(item.id)} />
              <span className={`text-xs flex-1 ${item.done ? "text-muted-foreground line-through" : "text-white"}`}>
                {item.label}
              </span>
              {item.done && item.done_at && (
                <span className="text-[10px] text-emerald-300">{format(parseISO(item.done_at), "dd/MM")}</span>
              )}
              {!locked && (
                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => onRemove(item.id)}>
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {!locked && (
          <div className="flex gap-2">
            <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add custom checklist item…"
              className="bg-card border-border text-white text-xs h-8" />
            <Button size="sm" className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs h-8"
              disabled={!newItem.trim()} onClick={() => { onAdd(newItem); setNewItem(""); }}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ManualEntriesPanel: React.FC<{
  items: ManualMetric[]; locked: boolean;
  onAdd: (m: Omit<ManualMetric, "id">) => void;
  onRemove: (id: string) => void;
}> = ({ items, locked, onAdd, onRemove }) => {
  const [form, setForm] = useState<{ label: string; value: string; category: string; notes: string; date: string }>({
    label: "", value: "", category: "training", notes: "", date: format(new Date(), "yyyy-MM-dd"),
  });
  const reset = () => setForm({ label: "", value: "", category: "training", notes: "", date: format(new Date(), "yyyy-MM-dd") });
  const submit = () => {
    if (!form.label.trim()) return;
    onAdd({ ...form, label: form.label.trim(), value: form.value.trim(), notes: form.notes.trim() || undefined });
    reset();
  };
  return (
    <Card className="bg-card/60 border-border/60">
      <CardContent className="p-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No manual entries yet. Log training attended, internal meetings, audits, improvements…
          </p>
        ) : (
          <div className="space-y-1">
            {items.map(m => {
              const cat = MANUAL_CATEGORIES.find(c => c.value === m.category) || MANUAL_CATEGORIES[4];
              const Icon = cat.icon;
              return (
                <div key={m.id} className="flex items-start gap-2 bg-card/50 border border-border/40 rounded p-2">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cat.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white">{m.label}{m.value ? ` — ${m.value}` : ""}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground border-border/40">{cat.label}</Badge>
                      {m.date && <span className="text-[10px] text-muted-foreground">{format(parseISO(m.date), "dd/MM/yyyy")}</span>}
                    </div>
                    {m.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{m.notes}</p>}
                  </div>
                  {!locked && (
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => onRemove(m.id)}>
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!locked && (
          <div className="border-t border-border/40 pt-2 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-card border-border text-white text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MANUAL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="bg-card border-border text-white text-xs h-8" />
              <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
                placeholder="Title (e.g. Safeguarding training)" className="bg-card border-border text-white text-xs h-8 col-span-2" />
              <Input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                placeholder="Value (e.g. 2 hours, attended)" className="bg-card border-border text-white text-xs h-8 sm:col-span-2" />
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes (optional)" className="bg-card border-border text-white text-xs h-8 col-span-2" />
            </div>
            <Button size="sm" onClick={submit} disabled={!form.label.trim()}
              className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs h-8">
              <Plus className="h-3 w-3 mr-1" /> Add entry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =========================================================
// Print-friendly summary dialog
const PeriodSummaryDialog: React.FC<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  monthLabel: string;
  review: MonthlyReview | null;
  reviewText: string;
  metrics: any;
  entries: AuditEntry[];
  reflections: Reflection[];
  actions: ActionItem[];
}> = ({ open, onOpenChange, monthLabel, review, reviewText, metrics, entries, reflections, actions }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(`<html><head><title>Governance Summary – ${monthLabel}</title>
      <style>
        body{font-family:-apple-system,system-ui,sans-serif;color:#111;padding:24px;line-height:1.45;}
        h1{font-size:22px;margin:0 0 4px;}
        h2{font-size:14px;margin:18px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px;color:#0e7490;}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0;}
        .stat{border:1px solid #ddd;border-radius:6px;padding:8px;text-align:center;}
        .stat b{display:block;font-size:18px;}
        .stat span{font-size:10px;color:#666;}
        ul{margin:4px 0 8px 16px;padding:0;}
        li{font-size:12px;margin:2px 0;}
        .done{color:#0e7490;}
        .note{font-size:12px;white-space:pre-wrap;}
        .meta{color:#666;font-size:11px;}
        @media print { button{display:none;} }
      </style></head><body>${printRef.current.innerHTML}
      <script>setTimeout(()=>window.print(),300);</script>
      </body></html>`);
    w.document.close();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>Governance summary — {monthLabel}</span>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={handlePrint}>
              <Printer className="h-3 w-3 mr-1" /> Print / PDF
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div ref={printRef} className="space-y-3 text-sm">
          <div>
            <h1 style={{ color: "#fff" }}>Clinical Governance Report</h1>
            <p className="meta text-muted-foreground">Period: {monthLabel} · Status: {review?.status || "draft"}{review?.completed_at ? ` · Completed ${format(parseISO(review.completed_at), "dd/MM/yyyy")}` : ""}</p>
          </div>

          <h2 className="text-cyan-400">Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ["Bookings", metrics.total], ["Completed", metrics.completed],
              ["Cancelled", metrics.cancelled], ["No-shows", metrics.noShow],
              ["Revenue", `£${metrics.revenue.toFixed(0)}`], ["CPD hrs", metrics.cpdHours.toFixed(1)],
              ["Incidents", metrics.incidents], ["Near miss", metrics.nearMiss],
              ["Complaints", metrics.complaints], ["Safeguarding", metrics.safeguarding],
              ["Resolved", metrics.negResolved], ["Score", `${metrics.score}%`],
            ].map(([l, v]) => (
              <div key={l as string} className="stat border border-border/60 rounded p-2 text-center">
                <b className="block text-base text-white">{v}</b>
                <span className="text-[10px] text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>

          <h2 className="text-violet-400">Monthly checklist</h2>
          <ul className="text-xs">
            {(review?.checklist || []).map(c => (
              <li key={c.id} className={c.done ? "done text-emerald-300" : "text-muted-foreground"}>
                {c.done ? "✓" : "○"} {c.label}{c.done && c.done_at ? ` (${format(parseISO(c.done_at), "dd/MM/yyyy")})` : ""}
              </li>
            ))}
          </ul>

          <h2 className="text-amber-400">Manual entries</h2>
          {(review?.manual_metrics || []).length === 0 ? <p className="text-xs text-muted-foreground">None</p> : (
            <ul className="text-xs">
              {(review!.manual_metrics).map(m => (
                <li key={m.id} className="text-white">
                  <b>{m.label}</b>{m.value ? ` — ${m.value}` : ""}
                  {m.date ? ` · ${format(parseISO(m.date), "dd/MM/yyyy")}` : ""}
                  {m.notes ? ` · ${m.notes}` : ""}
                </li>
              ))}
            </ul>
          )}

          <h2 className="text-red-400">Incidents / complaints / CPD</h2>
          {entries.length === 0 ? <p className="text-xs text-muted-foreground">None logged</p> : (
            <ul className="text-xs">
              {entries.map(e => (
                <li key={e.id} className="text-white">
                  [{format(parseISO(e.entry_date), "dd/MM/yyyy")}] <b>{e.category}</b> · {e.title}
                  {" · "}severity: {e.severity} · status: {e.status}
                  {e.resolution ? <div className="text-muted-foreground"> ↳ {e.resolution}</div> : null}
                </li>
              ))}
            </ul>
          )}

          <h2 className="text-violet-400">Reflections</h2>
          {reflections.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : (
            reflections.map(r => (
              <div key={r.id} className="border border-border/40 rounded p-2 my-1 text-xs">
                <p className="text-white"><b>Description:</b> {r.description}</p>
                {r.feelings && <p className="text-muted-foreground"><b>Feelings:</b> {r.feelings}</p>}
                {r.evaluation && <p className="text-muted-foreground"><b>Evaluation:</b> {r.evaluation}</p>}
                {r.analysis && <p className="text-muted-foreground"><b>Analysis:</b> {r.analysis}</p>}
                {r.conclusion && <p className="text-muted-foreground"><b>Conclusion:</b> {r.conclusion}</p>}
                {r.action_plan && <p className="text-muted-foreground"><b>Action plan:</b> {r.action_plan}</p>}
              </div>
            ))
          )}

          <h2 className="text-cyan-400">Action items</h2>
          {actions.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : (
            <ul className="text-xs">
              {actions.map(a => (
                <li key={a.id} className="text-white">
                  {a.action_text}{a.deadline ? ` · due ${format(parseISO(a.deadline), "dd/MM/yyyy")}` : ""}
                </li>
              ))}
            </ul>
          )}

          <h2 className="text-emerald-400">Review notes</h2>
          <p className="note text-white whitespace-pre-wrap text-xs">{reviewText || review?.review_text || "—"}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyReviewSection;