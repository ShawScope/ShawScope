import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreVertical, FileDown, Send, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, ChevronDown, ChevronUp, ShieldCheck, Stethoscope, Ear, ClipboardList, Camera, User, Zap } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import jsPDF from "jspdf";

interface Referral {
  id: string;
  patient_id: string | null;
  patient_name: string;
  patient_email: string;
  referral_type: string;
  recipient_name: string | null;
  recipient_organisation: string | null;
  recipient_email: string | null;
  reason: string | null;
  letter_content: string | null;
  letter_pdf_path: string | null;
  status: string;
  sent_at: string | null;
  sent_via: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const referralTypeLabels: Record<string, string> = {
  gp: "GP",
  audiologist: "Audiologist",
  amplifon: "Amplifon",
  specialist: "Specialist",
  nhs: "NHS Service",
  private: "Private Provider",
  other: "Other",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  acknowledged: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const ReferralsTab = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<"created_at" | "patient_name" | "status">("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);
  const [saving, setSaving] = useState(false);

  // Quick add dialog
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [qaName, setQaName] = useState("");
  const [qaEmail, setQaEmail] = useState("");
  const [qaType, setQaType] = useState("gp");
  const [qaRecipient, setQaRecipient] = useState("");
  const [qaReason, setQaReason] = useState("");
  const [qaStatus, setQaStatus] = useState("draft");
  const [qaSaving, setQaSaving] = useState(false);
  const [qaPatientSuggestions, setQaPatientSuggestions] = useState<{ id: string; client_name: string; client_email: string }[]>([]);
  const [qaShowSuggestions, setQaShowSuggestions] = useState(false);
  const [qaPatientId, setQaPatientId] = useState<string | null>(null);

  // Form fields
  const [formPatientName, setFormPatientName] = useState("");
  const [formPatientEmail, setFormPatientEmail] = useState("");
  const [formType, setFormType] = useState("gp");
  const [formRecipientName, setFormRecipientName] = useState("");
  const [formRecipientOrg, setFormRecipientOrg] = useState("");
  const [formRecipientEmail, setFormRecipientEmail] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formLetterContent, setFormLetterContent] = useState("");
  const [formStatus, setFormStatus] = useState("draft");
  const [formNotes, setFormNotes] = useState("");

  // Patient info sharing toggles
  const [shareName, setShareName] = useState(true);
  const [shareDob, setShareDob] = useState(true);
  const [shareAddress, setShareAddress] = useState(true);
  const [sharePhone, setSharePhone] = useState(true);
  const [shareEmail, setShareEmail] = useState(false);

  // Consent disclaimer
  const [patientConsented, setPatientConsented] = useState(false);

  // Clinical data selection
  const [consultNotes, setConsultNotes] = useState<any[]>([]);
  const [consentResponses, setConsentResponses] = useState<any[]>([]);
  const [hearingScreenings, setHearingScreenings] = useState<any[]>([]);
  const [patientFiles, setPatientFiles] = useState<any[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [selectedConsultIds, setSelectedConsultIds] = useState<string[]>([]);
  const [selectedConsentIds, setSelectedConsentIds] = useState<string[]>([]);
  const [selectedScreeningIds, setSelectedScreeningIds] = useState<string[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [includeObservations, setIncludeObservations] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [clinicalDataOpen, setClinicalDataOpen] = useState(false);
  const [patientInfoOpen, setPatientInfoOpen] = useState(false);
  const [loadingClinical, setLoadingClinical] = useState(false);

  // Full patient data for info sharing
  const [selectedPatientFull, setSelectedPatientFull] = useState<any>(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingReferral, setDeletingReferral] = useState<Referral | null>(null);

  // Patient suggestions
  const [patientSuggestions, setPatientSuggestions] = useState<{ id: string; client_name: string; client_email: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Resend state
  const [resending, setResending] = useState<string | null>(null);

  const fetchReferrals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load referrals");
    } else {
      setReferrals(data as Referral[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReferrals(); }, []);

  // Quick-add patient search
  const searchQaPatients = async (query: string) => {
    if (query.length < 2) { setQaPatientSuggestions([]); setQaShowSuggestions(false); return; }
    const { data } = await supabase
      .from("patients")
      .select("id, client_name, client_email")
      .or(`client_name.ilike.%${query}%,client_email.ilike.%${query}%`)
      .limit(5);
    if (data) { setQaPatientSuggestions(data); setQaShowSuggestions(data.length > 0); }
  };

  const handleQuickAdd = async () => {
    if (!qaName.trim() || !qaEmail.trim()) { toast.error("Patient name and email are required"); return; }
    setQaSaving(true);
    const { error } = await supabase.from("referrals").insert({
      patient_id: qaPatientId,
      patient_name: qaName.trim(),
      patient_email: qaEmail.trim().toLowerCase(),
      referral_type: qaType,
      recipient_organisation: qaRecipient.trim() || null,
      reason: qaReason.trim() || null,
      status: qaStatus,
    });
    if (error) { toast.error("Failed to create referral"); setQaSaving(false); return; }
    toast.success("Referral added");
    setQaSaving(false);
    setQuickAddOpen(false);
    setQaName(""); setQaEmail(""); setQaType("gp"); setQaRecipient(""); setQaReason(""); setQaStatus("draft"); setQaPatientId(null);
    fetchReferrals();
  };

  // Tracker grouping
  const trackerStatuses = ["draft", "sent", "acknowledged", "completed"] as const;
  const referralsByStatus = useMemo(() => {
    const grouped: Record<string, Referral[]> = { draft: [], sent: [], acknowledged: [], completed: [] };
    for (const r of referrals) { if (grouped[r.status]) grouped[r.status].push(r); }
    return grouped;
  }, [referrals]);

  // Patient search
  const searchPatients = async (query: string) => {
    if (query.length < 2) { setPatientSuggestions([]); setShowSuggestions(false); return; }
    const { data } = await supabase
      .from("patients")
      .select("id, client_name, client_email")
      .or(`client_name.ilike.%${query}%,client_email.ilike.%${query}%`)
      .limit(5);
    if (data) {
      setPatientSuggestions(data);
      setShowSuggestions(data.length > 0);
    }
  };

  // Load clinical data when patient selected
  const loadClinicalData = async (patientEmail: string, patientId: string) => {
    setLoadingClinical(true);
    try {
      // Fetch full patient record
      const { data: patient } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .maybeSingle();
      if (patient) setSelectedPatientFull(patient);

      // Fetch appointments
      const { data: apts } = await supabase
        .from("appointments")
        .select("*, services(name)")
        .eq("client_email", patientEmail)
        .order("appointment_date", { ascending: false })
        .limit(20);
      if (apts) setPatientAppointments(apts);

      if (apts && apts.length > 0) {
        const aptIds = apts.map((a: any) => a.id);

        // Consultation notes
        const { data: notes } = await supabase
          .from("consultation_notes")
          .select("*")
          .in("appointment_id", aptIds)
          .order("created_at", { ascending: false });
        if (notes) setConsultNotes(notes);

        // Consent form responses
        const { data: consents } = await supabase
          .from("consent_form_responses")
          .select("*, consent_form_templates(title, form_type)")
          .in("appointment_id", aptIds)
          .order("created_at", { ascending: false });
        if (consents) setConsentResponses(consents);
      }

      // Hearing screenings
      const { data: screenings } = await supabase
        .from("hearing_screenings")
        .select("*, hearing_screening_points(*)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (screenings) setHearingScreenings(screenings);

      // Patient files (photos, documents)
      const { data: files } = await supabase
        .from("patient_files")
        .select("*")
        .eq("client_email", patientEmail)
        .order("created_at", { ascending: false });
      if (files) setPatientFiles(files);
    } catch (err) {
      console.error("Error loading clinical data:", err);
    } finally {
      setLoadingClinical(false);
    }
  };

  const clearClinicalData = () => {
    setConsultNotes([]);
    setConsentResponses([]);
    setHearingScreenings([]);
    setPatientFiles([]);
    setPatientAppointments([]);
    setSelectedConsultIds([]);
    setSelectedConsentIds([]);
    setSelectedScreeningIds([]);
    setSelectedFileIds([]);
    setSelectedPatientFull(null);
  };

  const toggleId = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, id: string) => {
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getAptForId = (aptId: string) => patientAppointments.find((a: any) => a.id === aptId);

  // Build a clinical summary string from selected data
  const buildClinicalSummary = (): string => {
    const lines: string[] = [];

    // Patient info
    if (selectedPatientFull) {
      lines.push("=== PATIENT INFORMATION ===");
      if (shareName) lines.push(`Name: ${selectedPatientFull.client_name}`);
      if (shareDob && selectedPatientFull.date_of_birth) lines.push(`Date of Birth: ${format(new Date(selectedPatientFull.date_of_birth), "dd/MM/yyyy")}`);
      if (shareAddress && selectedPatientFull.address) lines.push(`Address: ${selectedPatientFull.address}`);
      if (sharePhone && selectedPatientFull.client_phone) lines.push(`Phone: ${selectedPatientFull.client_phone}`);
      if (shareEmail) lines.push(`Email: ${selectedPatientFull.client_email}`);
      if (selectedPatientFull.alert_note) lines.push(`Clinical Alert: ${selectedPatientFull.alert_note}`);
      lines.push("");
    }

    // Appointment history
    if (includeHistory && patientAppointments.length > 0) {
      lines.push("=== APPOINTMENT HISTORY ===");
      for (const apt of patientAppointments.slice(0, 10)) {
        const svc = (apt.services as any)?.name || "Unknown";
        lines.push(`- ${format(new Date(apt.appointment_date), "dd/MM/yyyy")} — ${svc} (${apt.status})`);
        if (apt.admin_notes) lines.push(`  Notes: ${apt.admin_notes}`);
      }
      lines.push("");
    }

    // Selected consultation notes
    if (selectedConsultIds.length > 0) {
      lines.push("=== CONSULTATION NOTES ===");
      for (const noteId of selectedConsultIds) {
        const note = consultNotes.find((n: any) => n.id === noteId);
        if (!note) continue;
        const apt = getAptForId(note.appointment_id);
        const dateStr = apt ? format(new Date(apt.appointment_date), "dd/MM/yyyy") : "Unknown date";
        const svcName = apt?.services?.name || "";
        lines.push(`\n--- ${dateStr} ${svcName} ---`);
        if (note.presenting_complaint) lines.push(`Presenting Complaint: ${note.presenting_complaint}`);
        if (note.medical_history) lines.push(`Medical History: ${note.medical_history}`);
        if (note.current_medications) lines.push(`Current Medications: ${note.current_medications}`);
        if (note.allergies) lines.push(`Allergies: ${note.allergies}`);
        if (note.examination_findings) lines.push(`Examination Findings: ${note.examination_findings}`);
        if (note.procedure_performed) lines.push(`Procedure Performed: ${note.procedure_performed}`);
        if (note.procedure_notes) lines.push(`Procedure Notes: ${note.procedure_notes}`);
        if (note.outcome) lines.push(`Outcome: ${note.outcome}`);
        if (note.complications) lines.push(`Complications: ${note.complications}`);
        if (note.aftercare_advice) lines.push(`Aftercare: ${note.aftercare_advice}`);
        if (note.follow_up_notes) lines.push(`Follow-up: ${note.follow_up_notes}`);

        if (includeObservations && note.news_observations) {
          const obs = Array.isArray(note.news_observations) ? note.news_observations : [];
          if (obs.length > 0) {
            lines.push(`\nClinical Observations (NEWS2):`);
            for (const o of obs as any[]) {
              const parts: string[] = [];
              if (o.respRate) parts.push(`RR: ${o.respRate}`);
              if (o.spo2) parts.push(`SpO2: ${o.spo2}%`);
              if (o.systolic) parts.push(`BP: ${o.systolic}/${o.diastolic || "?"}`);
              if (o.pulse) parts.push(`HR: ${o.pulse}`);
              if (o.temperature) parts.push(`Temp: ${o.temperature}°C`);
              if (o.totalScore !== undefined) parts.push(`NEWS: ${o.totalScore}`);
              lines.push(`  ${parts.join(" | ")}`);
            }
          }
        }
      }
      lines.push("");
    }

    // Selected consent/consultation form responses
    if (selectedConsentIds.length > 0) {
      lines.push("=== FORM RESPONSES ===");
      for (const respId of selectedConsentIds) {
        const resp = consentResponses.find((r: any) => r.id === respId);
        if (!resp) continue;
        const apt = getAptForId(resp.appointment_id);
        const dateStr = apt ? format(new Date(apt.appointment_date), "dd/MM/yyyy") : "Unknown date";
        const templateTitle = resp.consent_form_templates?.title || "Form";
        lines.push(`\n--- ${templateTitle}: ${dateStr} ---`);
        if (resp.submitter_name) lines.push(`Completed by: ${resp.submitter_name}`);
        const responses = resp.responses as Record<string, any>;
        if (responses && typeof responses === "object") {
          for (const [key, value] of Object.entries(responses)) {
            if (!value || (typeof value === "string" && !value.trim())) continue;
            if (key.startsWith("──")) continue;
            if (Array.isArray(value)) {
              const nonPhoto = value.filter((v: any) => typeof v === "string" && !v.startsWith("http"));
              if (nonPhoto.length > 0) lines.push(`${key}: ${nonPhoto.join(", ")}`);
              else if (value.length > 0) lines.push(`${key}: [${value.length} photo(s)]`);
            } else if (typeof value === "boolean") {
              lines.push(`${key}: ${value ? "Yes" : "No"}`);
            } else {
              lines.push(`${key}: ${value}`);
            }
          }
        }
      }
      lines.push("");
    }

    // Selected hearing screenings
    if (selectedScreeningIds.length > 0) {
      lines.push("=== HEARING SCREENING RESULTS ===");
      for (const screenId of selectedScreeningIds) {
        const screening = hearingScreenings.find((s: any) => s.id === screenId);
        if (!screening) continue;
        lines.push(`\n--- ${format(new Date(screening.created_at), "dd/MM/yyyy")} ---`);
        lines.push(`Method: ${screening.screening_method}`);
        if (screening.left_classification) lines.push(`Left Ear: ${screening.left_classification}`);
        if (screening.right_classification) lines.push(`Right Ear: ${screening.right_classification}`);
        if (screening.overall_recommendation) lines.push(`Recommendation: ${screening.overall_recommendation}`);
        if (screening.clinical_summary) lines.push(`Clinical Summary: ${screening.clinical_summary}`);
        const points = screening.hearing_screening_points || [];
        const leftPts = points.filter((p: any) => p.ear === 'left').sort((a: any, b: any) => a.frequency_hz - b.frequency_hz);
        const rightPts = points.filter((p: any) => p.ear === 'right').sort((a: any, b: any) => a.frequency_hz - b.frequency_hz);
        if (leftPts.length > 0) lines.push(`Left Thresholds: ${leftPts.map((p: any) => `${p.frequency_hz}Hz=${p.estimated_dbhl}dB`).join(', ')}`);
        if (rightPts.length > 0) lines.push(`Right Thresholds: ${rightPts.map((p: any) => `${p.frequency_hz}Hz=${p.estimated_dbhl}dB`).join(', ')}`);
      }
      lines.push("");
    }

    // Selected files
    if (selectedFileIds.length > 0) {
      lines.push("=== ATTACHED FILES ===");
      for (const fileId of selectedFileIds) {
        const file = patientFiles.find((f: any) => f.id === fileId);
        if (!file) continue;
        lines.push(`- ${file.file_name}${file.description ? ` (${file.description})` : ""} — ${format(new Date(file.created_at), "dd/MM/yyyy")}`);
      }
      lines.push("");
    }

    // Consent disclaimer
    if (patientConsented) {
      lines.push("=== PATIENT CONSENT ===");
      lines.push("The patient has given verbal consent for this referral and the sharing of the above clinical information.");
    }

    return lines.join("\n");
  };

  const filtered = useMemo(() => {
    let list = [...referrals];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.patient_name.toLowerCase().includes(q) ||
        r.patient_email.toLowerCase().includes(q) ||
        r.recipient_name?.toLowerCase().includes(q) ||
        r.recipient_organisation?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q)
      );
    }
    if (filterType !== "all") list = list.filter(r => r.referral_type === filterType);
    if (filterStatus !== "all") list = list.filter(r => r.status === filterStatus);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "created_at") cmp = a.created_at.localeCompare(b.created_at);
      else if (sortField === "patient_name") cmp = a.patient_name.localeCompare(b.patient_name);
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [referrals, searchQuery, filterType, filterStatus, sortField, sortAsc]);

  const openCreate = () => {
    setEditingReferral(null);
    setFormPatientName(""); setFormPatientEmail(""); setFormType("gp");
    setFormRecipientName(""); setFormRecipientOrg(""); setFormRecipientEmail("");
    setFormReason(""); setFormLetterContent(""); setFormStatus("draft"); setFormNotes("");
    setSelectedPatientId(null);
    setShareName(true); setShareDob(true); setShareAddress(true); setSharePhone(true); setShareEmail(false);
    setPatientConsented(false);
    setIncludeHistory(true); setIncludeObservations(true);
    clearClinicalData();
    setClinicalDataOpen(false);
    setPatientInfoOpen(false);
    setDialogOpen(true);
  };

  const openEdit = (r: Referral) => {
    setEditingReferral(r);
    setFormPatientName(r.patient_name); setFormPatientEmail(r.patient_email);
    setFormType(r.referral_type); setFormRecipientName(r.recipient_name || "");
    setFormRecipientOrg(r.recipient_organisation || "");
    setFormRecipientEmail(r.recipient_email || "");
    setFormReason(r.reason || ""); setFormLetterContent(r.letter_content || "");
    setFormStatus(r.status); setFormNotes(r.notes || "");
    setSelectedPatientId(r.patient_id);
    setShareName(true); setShareDob(true); setShareAddress(true); setSharePhone(true); setShareEmail(false);
    setPatientConsented(false);
    setIncludeHistory(true); setIncludeObservations(true);
    clearClinicalData();
    setClinicalDataOpen(false);
    setPatientInfoOpen(false);
    if (r.patient_id && r.patient_email) {
      loadClinicalData(r.patient_email, r.patient_id);
    }
    setDialogOpen(true);
  };

  const handleSelectPatient = (p: { id: string; client_name: string; client_email: string }) => {
    setFormPatientName(p.client_name);
    setFormPatientEmail(p.client_email);
    setSelectedPatientId(p.id);
    setShowSuggestions(false);
    clearClinicalData();
    loadClinicalData(p.client_email, p.id);
  };

  const handleAppendClinicalData = () => {
    const summary = buildClinicalSummary();
    if (!summary.trim()) {
      toast.error("No clinical data selected");
      return;
    }
    const existing = formLetterContent.trim();
    setFormLetterContent(existing ? `${existing}\n\n${summary}` : summary);
    toast.success("Clinical data appended to letter content");
  };

  const handleSave = async () => {
    if (!formPatientName.trim() || !formPatientEmail.trim()) {
      toast.error("Patient name and email are required");
      return;
    }
    setSaving(true);
    const payload = {
      patient_id: selectedPatientId,
      patient_name: formPatientName.trim(),
      patient_email: formPatientEmail.trim().toLowerCase(),
      referral_type: formType,
      recipient_name: formRecipientName.trim() || null,
      recipient_organisation: formRecipientOrg.trim() || null,
      recipient_email: formRecipientEmail.trim() || null,
      reason: formReason.trim() || null,
      letter_content: formLetterContent.trim() || null,
      status: formStatus,
      notes: formNotes.trim() || null,
    };

    if (editingReferral) {
      const { error } = await supabase.from("referrals").update(payload).eq("id", editingReferral.id);
      if (error) { toast.error("Failed to update referral"); setSaving(false); return; }
      toast.success("Referral updated");
    } else {
      const { error } = await supabase.from("referrals").insert(payload);
      if (error) { toast.error("Failed to create referral"); setSaving(false); return; }
      toast.success("Referral created");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchReferrals();
  };

  const handleDelete = async () => {
    if (!deletingReferral) return;
    const { error } = await supabase.from("referrals").delete().eq("id", deletingReferral.id);
    if (error) { toast.error("Failed to delete referral"); return; }
    toast.success("Referral deleted");
    setDeleteDialogOpen(false);
    setDeletingReferral(null);
    fetchReferrals();
  };

  const downloadPdf = async (r: Referral) => {
    // Fetch latest appointment for this patient to get date/time
    let appointmentDate = "", appointmentTime = "";
    if (r.patient_email) {
      const { data: apt } = await supabase.from("appointments")
        .select("appointment_date, appointment_time")
        .eq("client_email", r.patient_email)
        .order("appointment_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (apt) {
        if (apt.appointment_date) appointmentDate = format(new Date(apt.appointment_date), "dd MMMM yyyy");
        if (apt.appointment_time) appointmentTime = (apt.appointment_time as string).substring(0, 5);
      }
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 16;

    // ShawScope branded header
    const centerX = pageWidth / 2;
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    const shawW = doc.getTextWidth("Shaw");
    const scopeW = doc.getTextWidth("Scope");
    const totalW = shawW + scopeW;
    doc.setTextColor(14, 20, 32);
    doc.text("Shaw", centerX - totalW / 2, y);
    doc.setTextColor(212, 145, 42);
    doc.text("Scope", centerX - totalW / 2 + shawW, y);
    doc.setTextColor(0);
    y += 6;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text("A Home Visiting Service", centerX, y, { align: "center" });
    doc.setTextColor(0);
    y += 4;
    doc.setDrawColor(212, 145, 42);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Patient Referral", margin, y); y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${format(parseISO(r.created_at), "dd MMM yyyy")}`, margin, y); y += 7;
    doc.text(`Patient: ${r.patient_name}`, margin, y); y += 7;
    if (appointmentDate) {
      doc.text(`Appointment: ${appointmentDate}${appointmentTime ? ` at ${appointmentTime}` : ""}`, margin, y); y += 7;
    }
    doc.text(`Type: ${referralTypeLabels[r.referral_type] || r.referral_type}`, margin, y); y += 7;
    if (r.recipient_name) { doc.text(`To: ${r.recipient_name}`, margin, y); y += 7; }
    if (r.recipient_organisation) { doc.text(`Organisation: ${r.recipient_organisation}`, margin, y); y += 7; }
    if (r.reason) { doc.text(`Reason: ${r.reason}`, margin, y); y += 10; }
    if (r.letter_content) {
      y += 3;
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(r.letter_content, pageWidth - margin * 2);
      for (const line of lines) {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 5.5;
      }
    }

    // Ear referral disclaimer
    const isEarRelated = (r.referral_type || "").toLowerCase().includes("ear") ||
      (r.reason || "").toLowerCase().match(/ear|wax|hearing|tinnitus|otitis|otoscop/);
    if (isEarRelated) {
      if (y > 230) { doc.addPage(); y = 20; }
      y += 8;
      doc.setDrawColor(200);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100);
      const disclaimer = "Disclaimer: Matt at ShawScope is not able to medically diagnose; however, his training was completed with the only accredited earwax removal training programme endorsed by ENT UK. He is an accredited practitioner and has been trained to identify abnormalities and to escalate concerns to the GP or patient directly. We kindly ask that you review this patient at your earliest convenience.";
      const dLines = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
      doc.text(dLines, margin, y);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
    }

    // Footer with contact
    const lastPageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("matt@shawscope.co.uk  |  01305 340194", centerX, lastPageH - 12, { align: "center" });
    doc.setTextColor(0);

    doc.save(`Referral-${r.patient_name.replace(/\s+/g, "-")}-${format(parseISO(r.created_at), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF downloaded");
  };

  const handleResend = async (r: Referral) => {
    if (!r.recipient_email) { toast.error("No recipient email address set"); return; }
    if (!r.letter_content) { toast.error("No letter content to send"); return; }
    setResending(r.id);
    try {
      const { error } = await supabase.functions.invoke("send-form-email", {
        body: {
          to: r.recipient_email,
          subject: `Patient Referral: ${r.patient_name}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">
            <h2>Patient Referral</h2>
            <p><strong>Patient:</strong> ${r.patient_name}</p>
            <p><strong>Type:</strong> ${referralTypeLabels[r.referral_type] || r.referral_type}</p>
            ${r.reason ? `<p><strong>Reason:</strong> ${r.reason}</p>` : ""}
            <hr style="margin:16px 0"/>
            <div style="white-space:pre-wrap">${r.letter_content}</div>
          </div>`,
        },
      });
      if (error) throw error;
      await supabase.from("referrals").update({
        status: "sent", sent_at: new Date().toISOString(), sent_via: "email",
      }).eq("id", r.id);
      toast.success("Referral sent via email");
      fetchReferrals();
    } catch (err: any) {
      toast.error("Failed to send: " + (err.message || "Unknown error"));
    } finally {
      setResending(null);
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };

  const hasClinicalData = consultNotes.length > 0 || consentResponses.length > 0 || hearingScreenings.length > 0 || patientFiles.length > 0;
  const selectedClinicalCount = selectedConsultIds.length + selectedConsentIds.length + selectedScreeningIds.length + selectedFileIds.length;

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="font-serif text-2xl font-bold text-foreground">Referrals</h2>
        <p className="text-sm text-muted-foreground mt-1">Track and manage patient referrals to GPs, audiologists, and specialists</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search referrals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(referralTypeLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> New Referral
        </Button>
        <Button variant="outline" onClick={() => setQuickAddOpen(true)} className="w-full sm:w-auto">
          <Zap className="h-4 w-4 mr-2" /> Quick Add
        </Button>
      </div>

      {/* Referral Tracker Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {trackerStatuses.map((status) => {
          const items = referralsByStatus[status];
          const labels: Record<string, string> = { draft: "Draft", sent: "Sent", acknowledged: "Acknowledged", completed: "Completed" };
          const colors: Record<string, string> = {
            draft: "border-l-muted-foreground",
            sent: "border-l-blue-400",
            acknowledged: "border-l-amber-400",
            completed: "border-l-emerald-400",
          };
          return (
            <Card key={status} className={`border-l-4 ${colors[status]}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{labels[status]}</span>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">None</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {items.slice(0, 8).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => openEdit(r)}
                        className="w-full text-left text-xs p-1.5 rounded hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium block truncate">{r.patient_name}</span>
                        <span className="text-muted-foreground truncate block">
                          {referralTypeLabels[r.referral_type] || r.referral_type}
                          {r.recipient_organisation ? ` → ${r.recipient_organisation}` : r.recipient_name ? ` → ${r.recipient_name}` : ""}
                        </span>
                      </button>
                    ))}
                    {items.length > 8 && (
                      <p className="text-xs text-muted-foreground text-center">+{items.length - 8} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            {referrals.length === 0 ? "No referrals yet. Create one to get started." : "No referrals match your search/filters."}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-card/60">
                <TableHead className="cursor-pointer text-white hover:text-white/80" onClick={() => toggleSort("patient_name")}>Patient <SortIcon field="patient_name" /></TableHead>
                <TableHead className="text-white">Type</TableHead>
                <TableHead className="text-white hidden sm:table-cell">Recipient</TableHead>
                <TableHead className="text-white hidden md:table-cell">Reason</TableHead>
                <TableHead className="cursor-pointer text-white hover:text-white/80" onClick={() => toggleSort("status")}>Status <SortIcon field="status" /></TableHead>
                <TableHead className="cursor-pointer text-white hover:text-white/80" onClick={() => toggleSort("created_at")}>Date <SortIcon field="created_at" /></TableHead>
                <TableHead className="text-white w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openEdit(r)}>
                  <TableCell className="font-medium">{r.patient_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{referralTypeLabels[r.referral_type] || r.referral_type}</Badge></TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{r.recipient_name || r.recipient_organisation || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[200px] truncate">{r.reason || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColors[r.status] || ""}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{format(parseISO(r.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadPdf(r)}><FileDown className="h-4 w-4 mr-2" /> Download PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResend(r)} disabled={resending === r.id}>
                          {resending === r.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                          {r.sent_at ? "Resend" : "Send"} Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setDeletingReferral(r); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingReferral ? "Edit Referral" : "New Referral"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Patient */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Label>Patient Name *</Label>
                <Input
                  value={formPatientName}
                  onChange={(e) => { setFormPatientName(e.target.value); searchPatients(e.target.value); }}
                  onFocus={() => { if (patientSuggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search patient..."
                />
                {showSuggestions && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-40 overflow-y-auto">
                    {patientSuggestions.map((p) => (
                      <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm" onMouseDown={() => handleSelectPatient(p)}>
                        <span className="font-medium">{p.client_name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{p.client_email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Patient Email *</Label>
                <Input value={formPatientEmail} onChange={(e) => setFormPatientEmail(e.target.value)} placeholder="patient@email.com" />
              </div>
            </div>

            {/* Referral details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Referral Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(referralTypeLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recipient */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><Label>Recipient Name</Label><Input value={formRecipientName} onChange={(e) => setFormRecipientName(e.target.value)} placeholder="Dr Smith" /></div>
              <div><Label>Organisation</Label><Input value={formRecipientOrg} onChange={(e) => setFormRecipientOrg(e.target.value)} placeholder="Hospital / Practice" /></div>
              <div><Label>Recipient Email</Label><Input value={formRecipientEmail} onChange={(e) => setFormRecipientEmail(e.target.value)} placeholder="doctor@nhs.net" /></div>
            </div>

            <div>
              <Label>Reason for Referral</Label>
              <Textarea value={formReason} onChange={(e) => setFormReason(e.target.value)} placeholder="Brief reason for the referral..." rows={2} />
            </div>

            {/* Patient Info Sharing */}
            {selectedPatientId && (
              <Collapsible open={patientInfoOpen} onOpenChange={setPatientInfoOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full text-left text-sm font-medium py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                    <User className="h-4 w-4 text-primary" />
                    <span>Patient Information to Share</span>
                    {patientInfoOpen ? <ChevronUp className="h-3.5 w-3.5 ml-auto text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-md border bg-muted/10">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={shareName} onCheckedChange={(v) => setShareName(!!v)} /> Name
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={shareDob} onCheckedChange={(v) => setShareDob(!!v)} /> Date of Birth
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={shareAddress} onCheckedChange={(v) => setShareAddress(!!v)} /> Address
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={sharePhone} onCheckedChange={(v) => setSharePhone(!!v)} /> Phone
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={shareEmail} onCheckedChange={(v) => setShareEmail(!!v)} /> Email
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={includeHistory} onCheckedChange={(v) => setIncludeHistory(!!v)} /> Appointment History
                    </label>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Clinical Data Selection */}
            {selectedPatientId && (
              <Collapsible open={clinicalDataOpen} onOpenChange={setClinicalDataOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full text-left text-sm font-medium py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <span>Include Clinical Data</span>
                    {selectedClinicalCount > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">{selectedClinicalCount} selected</Badge>
                    )}
                    {loadingClinical && <Loader2 className="h-3.5 w-3.5 animate-spin ml-2" />}
                    {clinicalDataOpen ? <ChevronUp className="h-3.5 w-3.5 ml-auto text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-3">
                  {!hasClinicalData && !loadingClinical && (
                    <p className="text-xs text-muted-foreground p-3 border rounded-md bg-muted/10">No clinical data found for this patient.</p>
                  )}

                  {/* Consultation Notes */}
                  {consultNotes.length > 0 && (
                    <div className="p-3 rounded-md border bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Consultation Notes ({consultNotes.length})</span>
                        <button className="text-xs text-primary hover:underline" onClick={() => setSelectedConsultIds(selectedConsultIds.length === consultNotes.length ? [] : consultNotes.map((n: any) => n.id))}>
                          {selectedConsultIds.length === consultNotes.length ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <Checkbox checked={includeObservations} onCheckedChange={(v) => setIncludeObservations(!!v)} /> Include NEWS2 observations
                      </label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {consultNotes.map((note: any) => {
                          const apt = getAptForId(note.appointment_id);
                          const dateStr = apt ? format(new Date(apt.appointment_date), "dd/MM/yyyy") : "Unknown";
                          const svcName = apt?.services?.name || "";
                          return (
                            <label key={note.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                              <Checkbox checked={selectedConsultIds.includes(note.id)} onCheckedChange={() => toggleId(selectedConsultIds, setSelectedConsultIds, note.id)} />
                              <span>{dateStr} — {svcName} {note.presenting_complaint ? `(${note.presenting_complaint.substring(0, 40)}...)` : ""}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Consent/Consultation Form Responses */}
                  {consentResponses.length > 0 && (
                    <div className="p-3 rounded-md border bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Form Responses ({consentResponses.length})</span>
                        <button className="text-xs text-primary hover:underline" onClick={() => setSelectedConsentIds(selectedConsentIds.length === consentResponses.length ? [] : consentResponses.map((r: any) => r.id))}>
                          {selectedConsentIds.length === consentResponses.length ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {consentResponses.map((resp: any) => {
                          const apt = getAptForId(resp.appointment_id);
                          const dateStr = apt ? format(new Date(apt.appointment_date), "dd/MM/yyyy") : "Unknown";
                          const title = resp.consent_form_templates?.title || "Form";
                          return (
                            <label key={resp.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                              <Checkbox checked={selectedConsentIds.includes(resp.id)} onCheckedChange={() => toggleId(selectedConsentIds, setSelectedConsentIds, resp.id)} />
                              <span>{dateStr} — {title} {resp.submitter_name ? `(${resp.submitter_name})` : ""}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Hearing Screenings */}
                  {hearingScreenings.length > 0 && (
                    <div className="p-3 rounded-md border bg-muted/10 space-y-2">
                      <span className="text-sm font-medium flex items-center gap-1.5"><Ear className="h-3.5 w-3.5" /> Hearing Screenings ({hearingScreenings.length})</span>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {hearingScreenings.map((s: any) => (
                          <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                            <Checkbox checked={selectedScreeningIds.includes(s.id)} onCheckedChange={() => toggleId(selectedScreeningIds, setSelectedScreeningIds, s.id)} />
                            <span>{format(new Date(s.created_at), "dd/MM/yyyy")} — {s.screening_method} {s.overall_recommendation ? `(${s.overall_recommendation})` : ""}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patient Files / Photos */}
                  {patientFiles.length > 0 && (
                    <div className="p-3 rounded-md border bg-muted/10 space-y-2">
                      <span className="text-sm font-medium flex items-center gap-1.5"><Camera className="h-3.5 w-3.5" /> Files & Photos ({patientFiles.length})</span>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {patientFiles.map((f: any) => (
                          <label key={f.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                            <Checkbox checked={selectedFileIds.includes(f.id)} onCheckedChange={() => toggleId(selectedFileIds, setSelectedFileIds, f.id)} />
                            <span>{f.file_name} {f.description ? `— ${f.description}` : ""} ({format(new Date(f.created_at), "dd/MM/yyyy")})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Append button */}
                  {hasClinicalData && (
                    <Button variant="outline" size="sm" onClick={handleAppendClinicalData} disabled={selectedClinicalCount === 0 && !includeHistory}>
                      <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                      Append Selected Data to Letter
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Letter content */}
            <div>
              <Label>Letter / Notes Content</Label>
              <Textarea value={formLetterContent} onChange={(e) => setFormLetterContent(e.target.value)} placeholder="Full referral letter or notes content..." rows={8} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground mt-1">Tip: Use the Refer Patient tool from a patient's profile to AI-generate a letter, or use "Include Clinical Data" above to append records.</p>
            </div>

            {/* Consent Disclaimer */}
            <div className="p-3 rounded-md border border-primary/30 bg-primary/5">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={patientConsented} onCheckedChange={(v) => setPatientConsented(!!v)} className="mt-0.5" />
                <div>
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Patient Consent
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    I confirm that the patient has given verbal consent for this referral and agrees to the sharing of the selected clinical information with the recipient.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <Label>Internal Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Private notes (not included in referral)..." rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingReferral ? "Save Changes" : "Create Referral"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Referral</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the referral for <strong>{deletingReferral?.patient_name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Add Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Quick Add Referral</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Label>Patient Name *</Label>
              <Input
                value={qaName}
                onChange={(e) => { setQaName(e.target.value); searchQaPatients(e.target.value); }}
                onFocus={() => { if (qaPatientSuggestions.length > 0) setQaShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setQaShowSuggestions(false), 200)}
                placeholder="Search or type patient name..."
              />
              {qaShowSuggestions && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-40 overflow-y-auto">
                  {qaPatientSuggestions.map((p) => (
                    <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm" onMouseDown={() => {
                      setQaName(p.client_name); setQaEmail(p.client_email); setQaPatientId(p.id); setQaShowSuggestions(false);
                    }}>
                      <span className="font-medium">{p.client_name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{p.client_email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Patient Email *</Label>
              <Input value={qaEmail} onChange={(e) => setQaEmail(e.target.value)} placeholder="patient@email.com" />
            </div>
            <div>
              <Label>Referral Type</Label>
              <Select value={qaType} onValueChange={setQaType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(referralTypeLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipient / Organisation</Label>
              <Input value={qaRecipient} onChange={(e) => setQaRecipient(e.target.value)} placeholder="e.g. Amplifon, GP Surgery..." />
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={qaReason} onChange={(e) => setQaReason(e.target.value)} placeholder="Brief reason..." />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={qaStatus} onValueChange={setQaStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setQuickAddOpen(false)}>Cancel</Button>
              <Button onClick={handleQuickAdd} disabled={qaSaving}>
                {qaSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Referral
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferralsTab;
