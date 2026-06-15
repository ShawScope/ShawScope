import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, subMonths, isSameMonth } from "date-fns";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, BarChart3, Save, Plus, Trash2, ListTodo, ArrowLeft, ArrowRight, Copy, Pencil, BookOpen } from "lucide-react";

interface AuditEntry {
  id: string;
  entry_date: string;
  category: string;
  severity: string;
  status: string;
  cpd_hours: number | null;
}

interface MonthlyReview {
  id: string;
  review_month: string;
  review_text: string | null;
  governance_score: number | null;
}

interface ActionItem {
  id: string;
  review_id: string;
  action_text: string;
  deadline: string | null;
  todo_id: string | null;
  completed: boolean;
}

interface Reflection {
  id: string;
  review_id: string;
  description: string | null;
  feelings: string | null;
  evaluation: string | null;
  analysis: string | null;
  conclusion: string | null;
  action_plan: string | null;
}

interface MonthStats {
  totalEntries: number;
  incidents: number;
  resolved: number;
  openCases: number;
  cpdHours: number;
  highSeverity: number;
  complaints: number;
  resolutionRate: number;
  categories: Record<string, number>;
}

function calcStats(entries: AuditEntry[], month: Date): MonthStats {
  const monthEntries = entries.filter(e => isSameMonth(parseISO(e.entry_date), month));
  const incidents = monthEntries.filter(e => e.category === "incident" || e.category === "near_miss" || e.category === "safeguarding");
  const complaints = monthEntries.filter(e => e.category === "complaint");
  const allNeg = [...incidents, ...complaints];
  const resolved = allNeg.filter(e => e.status === "resolved").length;
  const open = allNeg.filter(e => e.status === "open" || e.status === "in_progress").length;
  const high = allNeg.filter(e => e.severity === "high").length;
  const cpdHours = monthEntries.filter(e => e.category === "cpd").reduce((s, e) => s + (e.cpd_hours || 0), 0);
  const categories: Record<string, number> = {};
  monthEntries.forEach(e => { categories[e.category] = (categories[e.category] || 0) + 1; });

  return {
    totalEntries: monthEntries.length,
    incidents: incidents.length,
    resolved,
    openCases: open,
    cpdHours,
    highSeverity: high,
    complaints: complaints.length,
    resolutionRate: allNeg.length > 0 ? Math.round((resolved / allNeg.length) * 100) : 100,
    categories,
  };
}

interface Props {
  entries: AuditEntry[];
  governanceScore?: number;
}

const GIBBS_FIELDS = [
  { key: "description", label: "Description", hint: "What happened? Describe the situation or experience." },
  { key: "feelings", label: "Feelings", hint: "What were you thinking and feeling at the time?" },
  { key: "evaluation", label: "Evaluation", hint: "What was good and bad about the experience?" },
  { key: "analysis", label: "Analysis", hint: "What sense can you make of the situation? What knowledge/theories apply?" },
  { key: "conclusion", label: "Conclusion", hint: "What else could you have done? What have you learned?" },
  { key: "action_plan", label: "Action Plan", hint: "If it arose again, what would you do differently? What steps will you take?" },
] as const;

const AuditMonthlyReport: React.FC<Props> = ({ entries, governanceScore }) => {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const [review, setReview] = useState<MonthlyReview | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [newAction, setNewAction] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [reflectionDialog, setReflectionDialog] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(null);
  const [reflForm, setReflForm] = useState({ description: "", feelings: "", evaluation: "", analysis: "", conclusion: "", action_plan: "" });

  const prevMonth = subMonths(selectedMonth, 1);
  const currentStats = useMemo(() => calcStats(entries, selectedMonth), [entries, selectedMonth]);
  const prevStats = useMemo(() => calcStats(entries, prevMonth), [entries, prevMonth]);

  const fetchReview = useCallback(async () => {
    const monthStr = format(selectedMonth, "yyyy-MM-dd");
    const { data } = await supabase
      .from("clinical_audit_monthly_reviews")
      .select("*")
      .eq("review_month", monthStr)
      .maybeSingle();
    if (data) {
      setReview(data as MonthlyReview);
      setReviewText(data.review_text || "");
      const { data: actionsData } = await supabase.from("clinical_audit_actions").select("*").eq("review_id", data.id).order("created_at");
      if (actionsData) setActions(actionsData as ActionItem[]);
      const { data: reflData } = await supabase.from("clinical_audit_reflections" as any).select("*").eq("review_id", data.id).order("created_at");
      if (reflData) setReflections(reflData as unknown as Reflection[]);
    } else {
      setReview(null);
      setReviewText("");
      setActions([]);
      setReflections([]);
    }
  }, [selectedMonth]);

  useEffect(() => { if (open) fetchReview(); }, [open, fetchReview]);

  const ensureReview = async (): Promise<string | null> => {
    if (review?.id) return review.id;
    const monthStr = format(selectedMonth, "yyyy-MM-dd");
    const score = governanceScore ?? currentStats.resolutionRate;
    const { data } = await supabase.from("clinical_audit_monthly_reviews")
      .insert({ review_month: monthStr, review_text: reviewText.trim() || null, governance_score: score })
      .select().single();
    if (data) { setReview(data as MonthlyReview); return data.id; }
    return null;
  };

  const handleSaveReview = async () => {
    setSaving(true);
    const monthStr = format(selectedMonth, "yyyy-MM-dd");
    const score = governanceScore ?? currentStats.resolutionRate;
    if (review) {
      await supabase.from("clinical_audit_monthly_reviews")
        .update({ review_text: reviewText.trim() || null, governance_score: score })
        .eq("id", review.id);
    } else {
      await ensureReview();
    }
    toast.success("Monthly review saved");
    setSaving(false);
    fetchReview();
  };

  const handleAddAction = async () => {
    if (!newAction.trim()) return;
    const reviewId = await ensureReview();
    if (!reviewId) return;

    const { data: todo } = await supabase.from("admin_todos").insert({
      title: newAction.trim(),
      description: `Audit action from ${format(selectedMonth, "MMMM yyyy")} governance review`,
      due_date: newDeadline || null,
      priority: 1,
      todo_category: "admin",
    } as any).select("id").single();

    await supabase.from("clinical_audit_actions").insert({
      review_id: reviewId,
      action_text: newAction.trim(),
      deadline: newDeadline || null,
      todo_id: todo?.id || null,
    });

    toast.success("Action added to your Todo list");
    setNewAction("");
    setNewDeadline("");
    fetchReview();
  };

  const handleDeleteAction = async (a: ActionItem) => {
    if (a.todo_id) await supabase.from("admin_todos").delete().eq("id", a.todo_id);
    await supabase.from("clinical_audit_actions").delete().eq("id", a.id);
    toast.success("Action removed");
    fetchReview();
  };

  // Reflection CRUD
  const openNewReflection = () => {
    setEditingReflection(null);
    setReflForm({ description: "", feelings: "", evaluation: "", analysis: "", conclusion: "", action_plan: "" });
    setReflectionDialog(true);
  };

  const openEditReflection = (r: Reflection) => {
    setEditingReflection(r);
    setReflForm({
      description: r.description || "",
      feelings: r.feelings || "",
      evaluation: r.evaluation || "",
      analysis: r.analysis || "",
      conclusion: r.conclusion || "",
      action_plan: r.action_plan || "",
    });
    setReflectionDialog(true);
  };

  const handleSaveReflection = async () => {
    const reviewId = await ensureReview();
    if (!reviewId) return;
    const payload = { review_id: reviewId, ...reflForm };
    if (editingReflection) {
      await supabase.from("clinical_audit_reflections" as any).update(payload).eq("id", editingReflection.id);
      toast.success("Reflection updated");
    } else {
      await supabase.from("clinical_audit_reflections" as any).insert(payload);
      toast.success("Reflection added");
    }
    setReflectionDialog(false);
    fetchReview();
  };

  const handleDeleteReflection = async (id: string) => {
    await supabase.from("clinical_audit_reflections" as any).delete().eq("id", id);
    toast.success("Reflection removed");
    fetchReview();
  };

  const copyReflection = (r: Reflection) => {
    const text = GIBBS_FIELDS.map(f => `**${f.label}**\n${(r as any)[f.key] || "N/A"}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Reflection copied to clipboard");
  };

  const TrendIcon = ({ current, previous }: { current: number; previous: number }) => {
    if (current > previous) return <TrendingUp className="h-3 w-3 text-emerald-400" />;
    if (current < previous) return <TrendingDown className="h-3 w-3 text-red-400" />;
    return <Minus className="h-3 w-3 text-muted-foreground/70" />;
  };

  const diff = (current: number, previous: number) => {
    const d = current - previous;
    if (d === 0) return null;
    return <span className={`text-[10px] ${d > 0 ? "text-emerald-400" : "text-red-400"}`}>{d > 0 ? "+" : ""}{d}</span>;
  };

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 bg-muted/60 rounded-lg border border-border/60">
          <BarChart3 className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-white flex-1">Monthly Governance Report</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          {/* Month Navigator */}
          <div className="flex items-center justify-center gap-3">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </Button>
            <span className="text-sm font-semibold text-white min-w-[120px] text-center">
              {format(selectedMonth, "MMMM yyyy")}
            </span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
              const next = new Date(selectedMonth);
              next.setMonth(next.getMonth() + 1);
              if (next <= startOfMonth(new Date())) setSelectedMonth(next);
            }}>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
            {[
              { label: "Entries", current: currentStats.totalEntries, prev: prevStats.totalEntries, color: "text-foreground" },
              { label: "Incidents", current: currentStats.incidents, prev: prevStats.incidents, color: "text-red-400" },
              { label: "Complaints", current: currentStats.complaints, prev: prevStats.complaints, color: "text-orange-400" },
              { label: "Resolved", current: currentStats.resolved, prev: prevStats.resolved, color: "text-emerald-400" },
              { label: "Open", current: currentStats.openCases, prev: prevStats.openCases, color: "text-red-400" },
              { label: "CPD Hrs", current: currentStats.cpdHours, prev: prevStats.cpdHours, color: "text-blue-400" },
              { label: "Governance", current: governanceScore ?? currentStats.resolutionRate, prev: prevStats.resolutionRate, color: (governanceScore ?? 100) >= 80 ? "text-emerald-400" : "text-amber-400" },
            ].map(s => (
              <Card key={s.label} className="bg-card/60 border-border/60">
                <CardContent className="p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-lg font-bold ${s.color}`}>{s.label === "CPD Hrs" ? s.current.toFixed(1) : s.current}{s.label === "Governance" ? "%" : ""}</span>
                    <TrendIcon current={s.current} previous={s.prev} />
                  </div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    prev: {s.label === "CPD Hrs" ? s.prev.toFixed(1) : s.prev}{s.label === "Governance" ? "%" : ""} {diff(s.current, s.prev)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Category Breakdown */}
          {Object.keys(currentStats.categories).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(currentStats.categories).map(([cat, count]) => (
                <Badge key={cat} variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground border-border/40">
                  {cat.replace(/_/g, " ")}: {count}
                </Badge>
              ))}
            </div>
          )}

          {/* Monthly Review */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Monthly Review & Notes</Label>
            <Textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="Write your governance review for this month..."
              rows={3}
              className="bg-card border-border text-white text-xs"
            />
            <Button size="sm" onClick={handleSaveReview} disabled={saving} className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs h-8">
              <Save className="h-3 w-3 mr-1" /> Save Review
            </Button>
          </div>

          {/* NMC Gibbs Reflections */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Reflections (Gibbs Reflective Cycle)
              </Label>
              <Button size="sm" variant="outline" className="text-xs h-7 border-border" onClick={openNewReflection}>
                <Plus className="h-3 w-3 mr-1" /> Add Reflection
              </Button>
            </div>
            {reflections.length > 0 && (
              <div className="space-y-2">
                {reflections.map(r => (
                  <Card key={r.id} className="bg-card/50 border-border/40">
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-start justify-between">
                        <p className="text-xs font-medium text-white line-clamp-2">{r.description || "Untitled reflection"}</p>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => copyReflection(r)} title="Copy">
                            <Copy className="h-3 w-3 text-cyan-400" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => openEditReflection(r)}>
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleDeleteReflection(r.id)}>
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </Button>
                        </div>
                      </div>
                      {r.conclusion && <p className="text-[11px] text-muted-foreground line-clamp-1"><span className="font-medium">Conclusion:</span> {r.conclusion}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Action Items */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <ListTodo className="h-3 w-3" /> Action Items (auto-added to Todo)
            </Label>
            <div className="flex gap-2">
              <Input
                value={newAction}
                onChange={e => setNewAction(e.target.value)}
                placeholder="e.g. Review infection control SOP"
                className="bg-card border-border text-white text-xs h-8 flex-1"
              />
              <Input
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="bg-card border-border text-white text-xs h-8 w-[130px]"
              />
              <Button size="sm" onClick={handleAddAction} disabled={!newAction.trim()} className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs h-8">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {actions.length > 0 && (
              <div className="space-y-1">
                {actions.map(a => (
                  <div key={a.id} className="flex items-center gap-2 bg-card/50 border border-border/40 rounded p-2">
                    <ListTodo className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                    <span className="text-xs text-white flex-1">{a.action_text}</span>
                    {a.deadline && (
                      <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground border-border/40">
                        Due: {format(parseISO(a.deadline), "dd MMM")}
                      </Badge>
                    )}
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleDeleteAction(a)}>
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Governance Trend */}
          <Card className={`border-border/60 ${(governanceScore ?? 100) >= 80 ? 'bg-emerald-950/20' : 'bg-red-950/20'}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                {(governanceScore ?? 100) >= 80 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-xs font-medium text-emerald-400">Governance On Track</p>
                      <p className="text-[11px] text-muted-foreground">Score: {governanceScore ?? currentStats.resolutionRate}% — Keep up the good work</p>
                    </div>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="text-xs font-medium text-red-400">Governance Needs Attention</p>
                      <p className="text-[11px] text-muted-foreground">Score: {governanceScore ?? currentStats.resolutionRate}% — Open incidents/complaints are lowering your score</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Gibbs Reflection Dialog */}
      <Dialog open={reflectionDialog} onOpenChange={setReflectionDialog}>
        <DialogContent className="bg-background border-border text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-400" />
              {editingReflection ? "Edit" : "New"} Reflection — Gibbs Cycle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {GIBBS_FIELDS.map(f => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Textarea
                  value={(reflForm as any)[f.key]}
                  onChange={e => setReflForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.hint}
                  rows={2}
                  className="bg-card border-border text-white text-xs"
                />
              </div>
            ))}
            <Button onClick={handleSaveReflection} className="w-full bg-cyan-700 hover:bg-cyan-600 text-white">
              {editingReflection ? "Update" : "Save"} Reflection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AuditMonthlyReport;
