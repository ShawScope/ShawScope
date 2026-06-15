import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Plus, Shield, BookOpen, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Trash2, Pencil, GraduationCap, FileWarning, Eye, Info, Upload } from "lucide-react";
import AuditEntryDetail from "./AuditEntryDetail";
import AuditMonthlyReport from "./AuditMonthlyReport";
import BusinessPoliciesSection from "./BusinessPoliciesSection";

interface AuditEntry {
  id: string;
  created_at: string;
  entry_date: string;
  category: string;
  title: string;
  description: string | null;
  patient_name: string | null;
  severity: string;
  status: string;
  resolution: string | null;
  resolved_at: string | null;
  cpd_hours: number | null;
  cpd_provider: string | null;
  cpd_certificate_path: string | null;
  tags: string[];
}

export const CATEGORIES = [
  {
    value: "incident",
    label: "Incident",
    icon: AlertTriangle,
    color: "text-red-400",
    description: "Any unplanned event causing or risking harm to a patient, staff, or property.",
    fields: ["patient_name", "severity", "resolution"],
    titleHint: "e.g. 'Sharps disposal near-miss in treatment room'",
    descHint: "What happened? When, where, and who was involved?",
  },
  {
    value: "near_miss",
    label: "Near Miss",
    icon: FileWarning,
    color: "text-amber-400",
    description: "An event that could have resulted in harm but was caught in time.",
    fields: ["patient_name", "severity", "resolution"],
    titleHint: "e.g. 'Incorrect patient notes nearly used'",
    descHint: "Describe what nearly happened and how it was caught.",
  },
  {
    value: "complaint",
    label: "Complaint",
    icon: Shield,
    color: "text-orange-400",
    description: "Any formal or informal complaint from a patient, carer, or third party.",
    fields: ["patient_name", "severity", "resolution"],
    titleHint: "e.g. 'Patient unhappy with waiting time'",
    descHint: "What was the complaint? How was it communicated?",
  },
  {
    value: "cpd",
    label: "CPD / Training",
    icon: GraduationCap,
    color: "text-blue-400",
    description: "Continuing Professional Development activities. Log hours and provider for your portfolio.",
    fields: ["cpd_hours", "cpd_provider"],
    titleHint: "e.g. 'Cryotherapy refresher — SMAE Institute'",
    descHint: "What did you learn? How will it improve practice?",
  },
  {
    value: "policy_review",
    label: "Policy Review",
    icon: BookOpen,
    color: "text-violet-400",
    description: "Scheduled or ad-hoc review of a clinical policy, SOP, or guideline.",
    fields: ["resolution"],
    titleHint: "e.g. 'Annual infection control policy review'",
    descHint: "Which policy? What changes were needed?",
  },
  {
    value: "equipment_check",
    label: "Equipment Check",
    icon: CheckCircle,
    color: "text-emerald-400",
    description: "Routine or one-off inspection, calibration, or maintenance of clinical equipment.",
    fields: ["resolution"],
    titleHint: "e.g. 'CryoPen pressure gauge calibration'",
    descHint: "Equipment tested, method used, and result (pass/fail).",
  },
  {
    value: "infection_control",
    label: "Infection Control",
    icon: Shield,
    color: "text-cyan-400",
    description: "Infection prevention and control audits, breaches, or observations.",
    fields: ["severity", "resolution"],
    titleHint: "e.g. 'Monthly hand hygiene audit'",
    descHint: "Area audited, findings, and compliance score if applicable.",
  },
  {
    value: "insurance",
    label: "Insurance",
    icon: Shield,
    color: "text-indigo-400",
    description: "Upload and track insurance documents, certificates, and renewal dates.",
    fields: ["resolution"],
    titleHint: "e.g. 'Professional Indemnity Insurance 2026-2027'",
    descHint: "Policy number, provider, coverage details, and expiry date.",
  },
  {
    value: "safeguarding",
    label: "Safeguarding",
    icon: Shield,
    color: "text-pink-400",
    description: "Any safeguarding concern relating to a child or vulnerable adult.",
    fields: ["patient_name", "severity", "resolution"],
    titleHint: "e.g. 'Concern raised regarding elderly patient welfare'",
    descHint: "What was observed? What actions/referrals were made?",
  },
];

const SEVERITIES = [
  { value: "low", label: "Low", className: "bg-green-900/50 text-green-300 border-green-600/40" },
  { value: "medium", label: "Medium", className: "bg-amber-900/50 text-amber-300 border-amber-600/40" },
  { value: "high", label: "High", className: "bg-red-900/50 text-red-300 border-red-600/40" },
];

const ClinicalAuditTab: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    entry_date: format(new Date(), "yyyy-MM-dd"),
    category: "incident",
    title: "",
    description: "",
    patient_name: "",
    severity: "low",
    status: "open",
    resolution: "",
    cpd_hours: "",
    cpd_provider: "",
  });

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from("clinical_audit_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) setEntries(data as AuditEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const resetForm = () => {
    setForm({ entry_date: format(new Date(), "yyyy-MM-dd"), category: "incident", title: "", description: "", patient_name: "", severity: "low", status: "open", resolution: "", cpd_hours: "", cpd_provider: "" });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const payload = {
      entry_date: form.entry_date,
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim() || null,
      patient_name: form.patient_name.trim() || null,
      severity: form.severity,
      status: form.status,
      resolution: form.resolution.trim() || null,
      resolved_at: form.status === "resolved" ? new Date().toISOString() : null,
      cpd_hours: form.cpd_hours ? parseFloat(form.cpd_hours) : 0,
      cpd_provider: form.cpd_provider.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from("clinical_audit_entries").update(payload).eq("id", editingId);
      if (error) { toast.error("Update failed"); return; }
      toast.success("Entry updated");
    } else {
      const { data, error } = await supabase.from("clinical_audit_entries").insert(payload).select().single();
      if (error) { toast.error("Save failed"); return; }
      toast.success("Entry added — you can now attach files");
      if (data) setDetailEntry(data as AuditEntry);
    }
    resetForm();
    setDialogOpen(false);
    fetchEntries();
  };

  const handleEdit = (e: AuditEntry) => {
    setForm({
      entry_date: e.entry_date, category: e.category, title: e.title,
      description: e.description || "", patient_name: e.patient_name || "",
      severity: e.severity, status: e.status, resolution: e.resolution || "",
      cpd_hours: e.cpd_hours?.toString() || "", cpd_provider: e.cpd_provider || "",
    });
    setEditingId(e.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("clinical_audit_entries").delete().eq("id", id);
    if (!error) { toast.success("Deleted"); fetchEntries(); }
  };

  // CPD certificate upload
  const handleCertUpload = async (entryId: string, file: File) => {
    setUploadingCert(true);
    const ext = file.name.split('.').pop();
    const path = `cpd-certificates/${entryId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('shawscope').upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed"); setUploadingCert(false); return; }
    await supabase.from("clinical_audit_entries").update({ cpd_certificate_path: path }).eq("id", entryId);
    toast.success("Certificate uploaded");
    setUploadingCert(false);
    fetchEntries();
  };

  const filtered = entries.filter(e => {
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    return true;
  });

  // Per-category stats
  const catStats = CATEGORIES.map(cat => {
    const catEntries = entries.filter(e => e.category === cat.value);
    const open = catEntries.filter(e => e.status === "open" || e.status === "in_progress").length;
    return { ...cat, count: catEntries.length, open };
  });

  const totalCpdHours = entries.filter(e => e.category === "cpd").reduce((s, e) => s + (e.cpd_hours || 0), 0);
  const openIncidents = entries.filter(e => e.category !== "cpd" && (e.status === "open" || e.status === "in_progress")).length;
  const resolvedCount = entries.filter(e => e.status === "resolved").length;

  // Governance score: lower when more complaints/incidents are open or high severity
  const negativeWeight = entries.filter(e => 
    (e.category === "incident" || e.category === "complaint" || e.category === "near_miss" || e.category === "safeguarding") && 
    (e.status === "open" || e.status === "in_progress")
  ).length;
  const highSeverityOpen = entries.filter(e => e.severity === "high" && e.status !== "resolved").length;
  const governanceScore = Math.max(0, Math.min(100, 100 - (negativeWeight * 10) - (highSeverityOpen * 15)));

  const getCatInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];
  const getSevInfo = (sev: string) => SEVERITIES.find(s => s.value === sev) || SEVERITIES[0];
  const activeCat = CATEGORIES.find(c => c.value === form.category) || CATEGORIES[0];

  // Group entries by category for filtered view
  const groupedByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = filtered.filter(e => e.category === cat.value);
    return acc;
  }, {} as Record<string, AuditEntry[]>);

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="font-serif text-2xl font-bold text-foreground">Clinical Audit</h2>
        <p className="text-sm text-muted-foreground">Incidents, CPD, compliance & governance</p>
      </div>

      {/* Per-Category Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {catStats.filter(c => c.count > 0 || c.value === "incident" || c.value === "cpd").map(c => {
          const CatIcon = c.icon;
          return (
            <Card key={c.value} className="bg-card/60 border-border/60 cursor-pointer hover:border-border/60 transition-colors" onClick={() => setFilterCategory(filterCategory === c.value ? "all" : c.value)}>
              <CardContent className="p-2 text-center">
                <CatIcon className={`h-4 w-4 mx-auto mb-0.5 ${c.color}`} />
                <div className={`text-lg font-bold ${c.color}`}>{c.value === "cpd" ? totalCpdHours.toFixed(1) : c.count}</div>
                <div className="text-[9px] text-muted-foreground leading-tight">{c.label}</div>
                {c.open > 0 && c.value !== "cpd" && (
                  <div className="text-[9px] text-red-400">{c.open} open</div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {/* Governance Score Tile */}
        <Card className={`border-border/60 ${governanceScore >= 80 ? 'bg-emerald-950/30' : governanceScore >= 50 ? 'bg-amber-950/30' : 'bg-red-950/30'}`}>
          <CardContent className="p-2 text-center">
            <Shield className={`h-4 w-4 mx-auto mb-0.5 ${governanceScore >= 80 ? 'text-emerald-400' : governanceScore >= 50 ? 'text-amber-400' : 'text-red-400'}`} />
            <div className={`text-lg font-bold ${governanceScore >= 80 ? 'text-emerald-400' : governanceScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{governanceScore}%</div>
            <div className="text-[9px] text-muted-foreground leading-tight">Governance</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[140px] bg-card border-border text-white text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px] bg-card border-border text-white text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="ml-auto bg-cyan-700 hover:bg-cyan-600 text-white text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">{editingId ? "Edit" : "New"} Audit Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} className="bg-card border-border text-white text-xs h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger className="bg-card border-border text-white text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-muted/60 rounded-md p-2 border border-border/60">
                <Info className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">{activeCat.description}</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={activeCat.titleHint} className="bg-card border-border text-white text-xs h-8" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder={activeCat.descHint} className="bg-card border-border text-white text-xs" />
              </div>

              {activeCat.fields.includes("patient_name") && (
                <div>
                  <Label className="text-xs text-muted-foreground">Patient Name (optional)</Label>
                  <Input value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} placeholder="If a specific patient is involved" className="bg-card border-border text-white text-xs h-8" />
                </div>
              )}

              {activeCat.fields.includes("severity") && (
                <div>
                  <Label className="text-xs text-muted-foreground">Severity</Label>
                  <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                    <SelectTrigger className="bg-card border-border text-white text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeCat.fields.includes("resolution") && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {form.category === "policy_review" ? "Changes Made / Outcome" :
                     form.category === "equipment_check" ? "Result & Actions" :
                     "Resolution / Actions Taken"}
                  </Label>
                  <Textarea value={form.resolution} onChange={e => setForm({ ...form, resolution: e.target.value })} rows={2} className="bg-card border-border text-white text-xs" />
                </div>
              )}

              {activeCat.fields.includes("cpd_hours") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">CPD Hours</Label>
                    <Input type="number" step="0.5" value={form.cpd_hours} onChange={e => setForm({ ...form, cpd_hours: e.target.value })} className="bg-card border-border text-white text-xs h-8" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Provider</Label>
                    <Input value={form.cpd_provider} onChange={e => setForm({ ...form, cpd_provider: e.target.value })} placeholder="e.g. SMAE Institute" className="bg-card border-border text-white text-xs h-8" />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-card border-border text-white text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full bg-cyan-700 hover:bg-cyan-600 text-white">
                {editingId ? "Update" : "Save"} Entry
              </Button>
              {!editingId && (
                <p className="text-[10px] text-muted-foreground/70 text-center">After saving, you'll be able to attach photos & files</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Monthly Governance Report */}
      <AuditMonthlyReport entries={entries} governanceScore={governanceScore} />

      {/* Business Policies */}
      <BusinessPoliciesSection />

      {/* Entries grouped by category when filtered, or all when "all" */}
      {filterCategory === "all" ? (
        // Show each category that has entries as a collapsible section
        CATEGORIES.map(cat => {
          const catEntries = groupedByCategory[cat.value] || [];
          if (catEntries.length === 0) return null;
          const CatIcon = cat.icon;
          return (
            <CategorySection
              key={cat.value}
              category={cat}
              entries={catEntries}
              totalCpdHours={cat.value === "cpd" ? totalCpdHours : undefined}
              getCatInfo={getCatInfo}
              getSevInfo={getSevInfo}
              onView={setDetailEntry}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUploadCert={handleCertUpload}
              uploadingCert={uploadingCert}
            />
          );
        })
      ) : (
        // Show only the selected category
        <CategorySection
          category={getCatInfo(filterCategory)}
          entries={filtered}
          totalCpdHours={filterCategory === "cpd" ? totalCpdHours : undefined}
          getCatInfo={getCatInfo}
          getSevInfo={getSevInfo}
          onView={setDetailEntry}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUploadCert={handleCertUpload}
          uploadingCert={uploadingCert}
        />
      )}

      {/* Hidden cert file input */}
      <input ref={certInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" />

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
          onEntryUpdated={fetchEntries}
        />
      )}
    </div>
  );
};

// Extracted category section component
const CategorySection = ({ category, entries, totalCpdHours, getCatInfo, getSevInfo, onView, onEdit, onDelete, onUploadCert, uploadingCert }: {
  category: typeof CATEGORIES[0];
  entries: AuditEntry[];
  totalCpdHours?: number;
  getCatInfo: (cat: string) => typeof CATEGORIES[0];
  getSevInfo: (sev: string) => { value: string; label: string; className: string };
  onView: (e: AuditEntry) => void;
  onEdit: (e: AuditEntry) => void;
  onDelete: (id: string) => void;
  onUploadCert: (entryId: string, file: File) => void;
  uploadingCert: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const CatIcon = category.icon;
  const certInputRef = useRef<HTMLInputElement>(null);
  const [certEntryId, setCertEntryId] = useState<string | null>(null);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 bg-muted/60 rounded-lg border border-border/60">
        <CatIcon className={`h-4 w-4 ${category.color}`} />
        <span className="text-sm font-semibold text-white flex-1">
          {category.label} ({entries.length})
          {totalCpdHours !== undefined && ` — ${totalCpdHours.toFixed(1)} hrs`}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No entries</p>
        ) : (
          <div className="space-y-2">
            {entries.map(e => {
              const cat = getCatInfo(e.category);
              const sev = getSevInfo(e.severity);
              const EntryIcon = cat.icon;
              return (
                <Card key={e.id} className="bg-card/50 border-border/60">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <EntryIcon className={`h-4 w-4 mt-0.5 shrink-0 ${cat.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white break-words">{e.title}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="text-[11px] text-muted-foreground">{format(parseISO(e.entry_date), "dd MMM yy")}</span>
                          {e.category !== "cpd" && <Badge variant="outline" className={`text-[10px] ${sev.className}`}>{sev.label}</Badge>}
                          {e.cpd_hours ? <Badge variant="outline" className="text-[10px] bg-blue-900/40 text-blue-300 border-blue-600/40">{e.cpd_hours} hrs</Badge> : null}
                          {e.cpd_provider && <span className="text-[10px] text-muted-foreground/70">{e.cpd_provider}</span>}
                          <Badge variant="outline" className={`text-[10px] ${
                            e.status === "resolved" ? "bg-green-900/40 text-green-300 border-green-600/40" :
                            e.status === "in_progress" ? "bg-blue-900/40 text-blue-300 border-blue-600/40" :
                            "bg-muted/60 text-muted-foreground border-border/40"
                          }`}>
                            {e.status === "in_progress" ? "In Progress" : e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                          </Badge>
                          {e.cpd_certificate_path && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-900/40 text-emerald-300 border-emerald-600/40">
                              📄 Certificate
                            </Badge>
                          )}
                        </div>
                        {e.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {e.category === "cpd" && !e.cpd_certificate_path && (
                          <>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              ref={certInputRef}
                              onChange={(ev) => {
                                const file = ev.target.files?.[0];
                                if (file && certEntryId) onUploadCert(certEntryId, file);
                                ev.target.value = '';
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                              setCertEntryId(e.id);
                              certInputRef.current?.click();
                            }} disabled={uploadingCert} title="Upload CPD Certificate">
                              <Upload className="h-3 w-3 text-blue-400" />
                            </Button>
                          </>
                        )}
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onView(e)}>
                          <Eye className="h-3 w-3 text-cyan-400" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(e)}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete(e.id)}>
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
  );
};

export default ClinicalAuditTab;
