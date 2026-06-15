import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { FileText, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Download, CheckCircle, Clock, Copy, Sparkles, ArrowRight, Check, X, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

interface Policy {
  id: string;
  heading: string;
  description: string | null;
  policy_text: string | null;
  last_reviewed_at: string | null;
  review_notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface AISuggestion {
  type: "addition" | "change" | "removal";
  description: string;
}

interface AIReviewResult {
  suggestions: AISuggestion[];
  updated_policy_text: string;
  review_summary: string;
}

const BusinessPoliciesSection: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState({ heading: "", description: "", policy_text: "" });
  const [saving, setSaving] = useState(false);

  // AI Review state
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [aiReviewPolicy, setAiReviewPolicy] = useState<Policy | null>(null);
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIReviewResult | null>(null);
  const [approvedSuggestions, setApprovedSuggestions] = useState<Set<number>>(new Set());

  // AI Generate state
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [aiGeneratePrompt, setAiGeneratePrompt] = useState("");
  const [aiGenerateLoading, setAiGenerateLoading] = useState(false);
  const [aiGenerateResult, setAiGenerateResult] = useState<{ heading: string; description: string; policy_text: string } | null>(null);

  const fetchPolicies = useCallback(async () => {
    const { data } = await supabase
      .from("business_policies" as any)
      .select("*")
      .order("sort_order")
      .order("created_at");
    if (data) setPolicies(data as unknown as Policy[]);
  }, []);

  useEffect(() => { if (open) fetchPolicies(); }, [open, fetchPolicies]);

  const openNew = () => {
    setEditingPolicy(null);
    setForm({ heading: "", description: "", policy_text: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: Policy) => {
    setEditingPolicy(p);
    setForm({ heading: p.heading, description: p.description || "", policy_text: p.policy_text || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.heading.trim()) { toast.error("Heading required"); return; }
    setSaving(true);
    const payload = {
      heading: form.heading.trim(),
      description: form.description.trim() || null,
      policy_text: form.policy_text.trim() || null,
    };
    if (editingPolicy) {
      await supabase.from("business_policies" as any).update(payload).eq("id", editingPolicy.id);
      toast.success("Policy updated");
    } else {
      await supabase.from("business_policies" as any).insert(payload);
      toast.success("Policy created");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchPolicies();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("business_policies" as any).delete().eq("id", id);
    toast.success("Policy removed");
    fetchPolicies();
  };

  const markReviewed = async (p: Policy) => {
    await supabase.from("business_policies" as any).update({
      last_reviewed_at: new Date().toISOString(),
    }).eq("id", p.id);
    toast.success(`"${p.heading}" marked as reviewed`);
    fetchPolicies();
  };

  const copyPolicy = (p: Policy) => {
    const text = `${p.heading}\n\n${p.description || ""}\n\n${p.policy_text || ""}`.trim();
    navigator.clipboard.writeText(text);
    toast.success("Policy copied to clipboard");
  };

  const exportPDF = (p: Policy) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(p.heading, margin, y);
    y += 10;

    if (p.description) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "italic");
      const descLines = doc.splitTextToSize(p.description, maxWidth);
      doc.text(descLines, margin, y);
      y += descLines.length * 5 + 5;
    }

    if (p.last_reviewed_at) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Last reviewed: ${format(parseISO(p.last_reviewed_at), "dd MMMM yyyy")}`, margin, y);
      y += 8;
    }

    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    if (p.policy_text) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(p.policy_text, maxWidth);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 5.5;
      });
    }

    doc.save(`${p.heading.replace(/\s+/g, "-").toLowerCase()}-policy.pdf`);
    toast.success("PDF exported");
  };

  const exportAllPDF = () => {
    if (policies.length === 0) { toast.error("No policies to export"); return; }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;

    policies.forEach((p, idx) => {
      if (idx > 0) doc.addPage();
      let y = 20;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(p.heading, margin, y);
      y += 10;

      if (p.description) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "italic");
        const descLines = doc.splitTextToSize(p.description, maxWidth);
        doc.text(descLines, margin, y);
        y += descLines.length * 5 + 5;
      }

      if (p.last_reviewed_at) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Last reviewed: ${format(parseISO(p.last_reviewed_at), "dd MMMM yyyy")}`, margin, y);
        y += 8;
      }

      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      if (p.policy_text) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(p.policy_text, maxWidth);
        lines.forEach((line: string) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(line, margin, y);
          y += 5.5;
        });
      }
    });

    doc.save("business-policies.pdf");
    toast.success("All policies exported");
  };

  const needsReview = (p: Policy) => {
    if (!p.last_reviewed_at) return true;
    return differenceInDays(new Date(), parseISO(p.last_reviewed_at)) > 30;
  };

  const reviewDue = policies.filter(needsReview).length;

  // AI Review functions
  const openAIReview = (p: Policy) => {
    setAiReviewPolicy(p);
    setAiInstructions("");
    setAiResult(null);
    setApprovedSuggestions(new Set());
    setAiReviewOpen(true);
  };

  const runAIReview = async () => {
    if (!aiReviewPolicy) return;
    if (!aiReviewPolicy.policy_text?.trim()) {
      toast.error("This policy has no text to review");
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    setApprovedSuggestions(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("review-policy", {
        body: {
          heading: aiReviewPolicy.heading,
          description: aiReviewPolicy.description,
          policy_text: aiReviewPolicy.policy_text,
          user_instructions: aiInstructions.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiResult({
        suggestions: data.suggestions || [],
        updated_policy_text: data.updated_policy_text || "",
        review_summary: data.review_summary || "",
      });
    } catch (err: any) {
      toast.error(err.message || "AI review failed");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleSuggestion = (idx: number) => {
    setApprovedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const applyAIChanges = async () => {
    if (!aiReviewPolicy || !aiResult) return;
    setSaving(true);

    await supabase.from("business_policies" as any).update({
      policy_text: aiResult.updated_policy_text,
      last_reviewed_at: new Date().toISOString(),
      review_notes: `AI Review: ${aiResult.review_summary}`,
    }).eq("id", aiReviewPolicy.id);

    toast.success("Policy updated with AI suggestions");
    setSaving(false);
    setAiReviewOpen(false);
    fetchPolicies();
  };

  const runAIGenerate = async () => {
    setAiGenerateLoading(true);
    setAiGenerateResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("review-policy", {
        body: {
          mode: "generate",
          user_instructions: aiGeneratePrompt.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiGenerateResult({
        heading: data.heading || "New Policy",
        description: data.description || "",
        policy_text: data.policy_text || "",
      });
    } catch (err: any) {
      toast.error(err.message || "AI generation failed");
    } finally {
      setAiGenerateLoading(false);
    }
  };

  const saveGeneratedPolicy = async () => {
    if (!aiGenerateResult) return;
    setSaving(true);
    await supabase.from("business_policies" as any).insert({
      heading: aiGenerateResult.heading,
      description: aiGenerateResult.description || null,
      policy_text: aiGenerateResult.policy_text || null,
      last_reviewed_at: new Date().toISOString(),
      review_notes: "AI Generated",
    });
    toast.success("Policy created");
    setSaving(false);
    setAiGenerateOpen(false);
    setAiGenerateResult(null);
    setAiGeneratePrompt("");
  };

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 bg-muted/60 rounded-lg border border-border/60">
          <FileText className="h-4 w-4 text-teal-400" />
          <span className="text-sm font-semibold text-white flex-1">
            Business Policies
            {reviewDue > 0 && !open && (
              <Badge variant="outline" className="ml-2 text-[10px] bg-amber-900/40 text-amber-300 border-amber-600/40">
                {reviewDue} due review
              </Badge>
            )}
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs h-7 border-border" onClick={openNew}>
              <Plus className="h-3 w-3 mr-1" /> Add Policy
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7 border-violet-600 text-violet-300 hover:bg-violet-950" onClick={() => { setAiGeneratePrompt(""); setAiGenerateResult(null); setAiGenerateOpen(true); }}>
              <Sparkles className="h-3 w-3 mr-1" /> AI Generate
            </Button>
            {policies.length > 0 && (
              <Button size="sm" variant="outline" className="text-xs h-7 border-border" onClick={exportAllPDF}>
                <Download className="h-3 w-3 mr-1" /> Export All PDF
              </Button>
            )}
          </div>

          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No policies yet — add your first business policy above</p>
          ) : (
            <div className="space-y-2">
              {policies.map(p => {
                const overdue = needsReview(p);
                return (
                  <Card key={p.id} className={`border-border/60 ${overdue ? 'bg-amber-950/10' : 'bg-card/50'}`}>
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">{p.heading}</p>
                            {overdue ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-900/40 text-amber-300 border-amber-600/40 shrink-0">
                                <Clock className="h-2.5 w-2.5 mr-0.5" /> Review due
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-emerald-900/40 text-emerald-300 border-emerald-600/40 shrink-0">
                                <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Reviewed
                              </Badge>
                            )}
                          </div>
                          {p.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>}
                          {p.policy_text && <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2">{p.policy_text}</p>}
                          {p.last_reviewed_at && (
                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                              Last reviewed: {format(parseISO(p.last_reviewed_at), "dd MMM yyyy")}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {p.policy_text && (
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => openAIReview(p)} title="AI Review">
                              <Sparkles className="h-3 w-3 text-violet-400" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => markReviewed(p)} title="Mark as reviewed">
                            <CheckCircle className="h-3 w-3 text-emerald-400" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => copyPolicy(p)} title="Copy">
                            <Copy className="h-3 w-3 text-cyan-400" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => exportPDF(p)} title="Export PDF">
                            <Download className="h-3 w-3 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => openEdit(p)}>
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Policy Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background border-border text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-400" />
              {editingPolicy ? "Edit" : "New"} Business Policy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Heading</Label>
              <Input
                value={form.heading}
                onChange={e => setForm(prev => ({ ...prev, heading: e.target.value }))}
                placeholder="e.g. Infection Control Policy"
                className="bg-card border-border text-white text-xs h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this policy covers..."
                rows={2}
                className="bg-card border-border text-white text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Policy Text</Label>
              <Textarea
                value={form.policy_text}
                onChange={e => setForm(prev => ({ ...prev, policy_text: e.target.value }))}
                placeholder="Enter the full policy text here..."
                rows={10}
                className="bg-card border-border text-white text-xs"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-cyan-700 hover:bg-cyan-600 text-white">
              {editingPolicy ? "Update" : "Create"} Policy
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Review Dialog */}
      <Dialog open={aiReviewOpen} onOpenChange={setAiReviewOpen}>
        <DialogContent className="bg-background border-border text-white max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              AI Policy Review — {aiReviewPolicy?.heading}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="space-y-4">
              {/* Instructions */}
              {!aiResult && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Instructions for AI (optional)</Label>
                    <Textarea
                      value={aiInstructions}
                      onChange={e => setAiInstructions(e.target.value)}
                      placeholder="e.g. 'Add a section about GDPR compliance' or 'Make it more concise' — leave blank for a general review"
                      rows={3}
                      className="bg-card border-border text-white text-xs"
                    />
                  </div>
                  <Button
                    onClick={runAIReview}
                    disabled={aiLoading}
                    className="w-full bg-violet-700 hover:bg-violet-600 text-white"
                  >
                    {aiLoading ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Reviewing policy...</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5 mr-2" /> Review with AI</>
                    )}
                  </Button>
                </div>
              )}

              {/* Results */}
              {aiResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-violet-950/30 border border-violet-700/40 rounded-lg p-3">
                    <p className="text-xs font-semibold text-violet-300 mb-1">📋 Review Summary</p>
                    <p className="text-xs text-muted-foreground">{aiResult.review_summary}</p>
                  </div>

                  {/* Suggestions */}
                  <div>
                    <p className="text-xs font-semibold text-white mb-2">Suggestions ({aiResult.suggestions.length})</p>
                    <div className="space-y-1.5">
                      {aiResult.suggestions.map((s, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            approvedSuggestions.has(i)
                              ? "bg-emerald-950/30 border-emerald-600/40"
                              : "bg-card/50 border-border/60 hover:border-border/60"
                          }`}
                          onClick={() => toggleSuggestion(i)}
                        >
                          <div className={`shrink-0 mt-0.5 h-4 w-4 rounded border flex items-center justify-center ${
                            approvedSuggestions.has(i) ? "bg-emerald-600 border-emerald-500" : "border-border"
                          }`}>
                            {approvedSuggestions.has(i) && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className={`text-[9px] mb-0.5 ${
                              s.type === "addition" ? "bg-emerald-900/40 text-emerald-300 border-emerald-600/40"
                              : s.type === "removal" ? "bg-red-900/40 text-red-300 border-red-600/40"
                              : "bg-amber-900/40 text-amber-300 border-amber-600/40"
                            }`}>
                              {s.type}
                            </Badge>
                            <p className="text-[11px] text-muted-foreground">{s.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Side-by-side diff */}
                  <div>
                    <p className="text-xs font-semibold text-white mb-2">Policy Comparison</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-semibold text-red-400 mb-1">Current</p>
                        <div className="bg-red-950/10 border border-red-900/30 rounded-lg p-2 max-h-60 overflow-y-auto">
                          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-sans">{aiReviewPolicy?.policy_text}</pre>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-400 mb-1">Suggested</p>
                        <div className="bg-emerald-950/10 border border-emerald-900/30 rounded-lg p-2 max-h-60 overflow-y-auto">
                          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-sans">{aiResult.updated_policy_text}</pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={applyAIChanges}
                      disabled={saving}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Apply Updated Policy
                    </Button>
                    <Button
                      onClick={() => { setAiResult(null); setApprovedSuggestions(new Set()); }}
                      variant="outline"
                      className="border-border text-muted-foreground"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" /> Re-review
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generate New Policy Dialog */}
      <Dialog open={aiGenerateOpen} onOpenChange={setAiGenerateOpen}>
        <DialogContent className="bg-background border-border text-white max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              AI Generate New Policy
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="space-y-3">
              {!aiGenerateResult ? (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">What policy do you need?</Label>
                    <Textarea
                      value={aiGeneratePrompt}
                      onChange={e => setAiGeneratePrompt(e.target.value)}
                      placeholder="e.g. 'Create an infection control policy for mobile earwax removal services' or 'GDPR data protection policy for a sole practitioner'"
                      rows={4}
                      className="bg-card border-border text-white text-xs"
                    />
                  </div>
                  <Button
                    onClick={runAIGenerate}
                    disabled={aiGenerateLoading || !aiGeneratePrompt.trim()}
                    className="w-full bg-violet-700 hover:bg-violet-600 text-white"
                  >
                    {aiGenerateLoading ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Generating policy...</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5 mr-2" /> Generate Policy</>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Heading</Label>
                    <Input
                      value={aiGenerateResult.heading}
                      onChange={e => setAiGenerateResult(prev => prev ? { ...prev, heading: e.target.value } : prev)}
                      className="bg-card border-border text-white text-xs h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Textarea
                      value={aiGenerateResult.description}
                      onChange={e => setAiGenerateResult(prev => prev ? { ...prev, description: e.target.value } : prev)}
                      rows={2}
                      className="bg-card border-border text-white text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Policy Text</Label>
                    <Textarea
                      value={aiGenerateResult.policy_text}
                      onChange={e => setAiGenerateResult(prev => prev ? { ...prev, policy_text: e.target.value } : prev)}
                      rows={12}
                      className="bg-card border-border text-white text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={saveGeneratedPolicy}
                      disabled={saving}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Save Policy
                    </Button>
                    <Button
                      onClick={() => setAiGenerateResult(null)}
                      variant="outline"
                      className="border-border text-muted-foreground"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" /> Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BusinessPoliciesSection;
