import { useState, useEffect, useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Customized } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { Users, Search, FileText, CalendarDays, ChevronRight, Upload, Trash2, Download, Paperclip, FileDown, ClipboardList, Pencil, Stethoscope, Plus, GitMerge, AlertTriangle, ScrollText, Send, Save, ArrowUpDown, Sparkles, Loader2, Activity, Mail, Eye, X as XIcon, RefreshCw, Phone, Snowflake, Copy, MoreVertical, CalendarX, ArrowRightLeft, Camera, Cake, Mic, MicOff, Link2, Timer } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import ConsultationFormDialog from "@/components/admin/ConsultationFormDialog";
import ConsultationNoteDialog from "@/components/admin/ConsultationNoteDialog";
import NEWSScorePanel, { type NEWSObservation, getScoreColor, getScoreLabel } from "@/components/admin/NEWSScorePanel";
import BookNextAppointment from "@/components/admin/BookNextAppointment";
import ViewConsentResponseContent from "@/components/admin/ViewConsentResponseContent";
import type { Database } from "@/integrations/supabase/types";
import { ShieldCheck, Database as DatabaseIcon, ChevronDown } from "lucide-react";

function CompliancePanel() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<{ id: string; data_retention_statement: string; ai_usage_statement: string; data_storage_statement: string } | null>(null);
  const [draft, setDraft] = useState({ retention: "", ai: "", storage: "" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("id, data_retention_statement, ai_usage_statement, data_storage_statement")
        .limit(1)
        .single();
      if (data) {
        setRow(data as any);
        setDraft({
          retention: (data as any).data_retention_statement || "",
          ai: (data as any).ai_usage_statement || "",
          storage: (data as any).data_storage_statement || "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase
      .from("business_settings")
      .update({
        data_retention_statement: draft.retention,
        ai_usage_statement: draft.ai,
        data_storage_statement: draft.storage,
      } as any)
      .eq("id", row.id);
    setSaving(false);
    if (error) { toast.error("Failed to save: " + error.message); return; }
    setRow({ ...row, data_retention_statement: draft.retention, ai_usage_statement: draft.ai, data_storage_statement: draft.storage });
    setEditing(false);
    toast.success("Compliance statements updated");
  };

  return (
    <div className="mb-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-muted bg-muted/30 px-3 py-2.5 text-left text-xs hover:bg-muted/50 transition"
          >
            <span className="flex items-center gap-2 text-foreground font-medium">
              <ShieldCheck className="h-4 w-4 text-secondary" />
              Data Retention, AI & Storage Policy
            </span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-lg border border-muted bg-muted/20 p-3 text-xs text-muted-foreground space-y-3">
          {loading ? (
            <div className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>
          ) : editing ? (
            <>
              <div>
                <Label className="text-foreground text-xs mb-1 block">Data Retention</Label>
                <Textarea rows={4} value={draft.retention} onChange={(e) => setDraft({ ...draft, retention: e.target.value })} />
              </div>
              <div>
                <Label className="text-foreground text-xs mb-1 block">AI & Data Protection</Label>
                <Textarea rows={4} value={draft.ai} onChange={(e) => setDraft({ ...draft, ai: e.target.value })} />
              </div>
              <div>
                <Label className="text-foreground text-xs mb-1 block">Secure Data Storage</Label>
                <Textarea rows={4} value={draft.storage} onChange={(e) => setDraft({ ...draft, storage: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); if (row) setDraft({ retention: row.data_retention_statement, ai: row.ai_usage_statement, storage: row.data_storage_statement }); }}>Cancel</Button>
                <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1" /> Save</>}</Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <ScrollText className="h-4 w-4 shrink-0 mt-0.5 text-secondary" />
                <p><strong className="text-foreground">Data Retention:</strong> {row?.data_retention_statement}</p>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-secondary" />
                <p><strong className="text-foreground">AI & Data Protection:</strong> {row?.ai_usage_statement}</p>
              </div>
              <div className="flex items-start gap-2">
                <DatabaseIcon className="h-4 w-4 shrink-0 mt-0.5 text-secondary" />
                <p><strong className="text-foreground">Secure Storage:</strong> {row?.data_storage_statement}</p>
              </div>
              <div className="flex justify-end pt-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface PatientSummary {
  id: string;
  client_email: string;
  client_name: string;
  client_phone: string | null;
  address: string | null;
  alert_note: string | null;
  marketing_email: boolean;
  marketing_sms: boolean;
  appointment_count: number;
  last_appointment: string;
  appointments: PatientAppointment[];
  relationship_label?: string | null;
  relationship_to_patient_id?: string | null;
  relationship_to_name?: string | null;
  date_of_birth?: string | null;
  deceased?: boolean;
  deceased_at?: string | null;
}

interface PatientAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_id: string | null;
  notes: string | null;
  price: number | null;
  consent_form_template_id: string | null;
  consent_sent_at: string | null;
  access_token: string;
  media_consent?: boolean;
  dictation_consent?: boolean;
  created_at?: string;
}

interface ConsentFormTemplate {
  id: string;
  title: string;
}

interface ConsentResponse {
  id: string;
  appointment_id: string;
  consent_form_template_id: string;
  responses: any;
  signature: string | null;
  signed_at: string | null;
  created_at: string;
  status?: string;
  template_title?: string;
  submitter_name?: string | null;
  template_snapshot?: any;
}

interface PatientFile {
  id: string;
  appointment_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  created_at: string;
}

interface Service {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  requested: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-primary/10 text-primary border-primary/20",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];

const PatientsTab = ({ initialSearchEmail, onReturnToPreviousTab }: { initialSearchEmail?: string | null; onReturnToPreviousTab?: () => void }) => {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "appointments" | "last_visit">("recent");
  const [serverSearchResults, setServerSearchResults] = useState<PatientSummary[]>([]);
  const [serverSearching, setServerSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [autoOpenedFromOtherTab, setAutoOpenedFromOtherTab] = useState(false);
  const [consentResponses, setConsentResponses] = useState<ConsentResponse[]>([]);
  const [viewingResponse, setViewingResponse] = useState<ConsentResponse | null>(null);
  const [patientFiles, setPatientFiles] = useState<PatientFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileDesc, setFileDesc] = useState("");
  const [selectedAptIdForUpload, setSelectedAptIdForUpload] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add patient dialog
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientAddress, setNewPatientAddress] = useState("");
  const [addingPatient, setAddingPatient] = useState(false);

  // CSV upload
  const [csvUploading, setCsvUploading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [bulkExportProgress, setBulkExportProgress] = useState<{ current: number; total: number } | null>(null);

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileNotes, setProfileNotes] = useState("");
  const [profileAlertNote, setProfileAlertNote] = useState("");
  const [profileDob, setProfileDob] = useState("");
  const [patientDob, setPatientDob] = useState<string | null>(null);
  const [profileMarketingEmail, setProfileMarketingEmail] = useState(false);
  const [profileMarketingSms, setProfileMarketingSms] = useState(false);

  // Consultation form
  const [consultFormOpen, setConsultFormOpen] = useState(false);
  const [consultAptId, setConsultAptId] = useState("");
  const [consultTemplateId, setConsultTemplateId] = useState<string | null>(null);
  const [consultDraftId, setConsultDraftId] = useState<string | null>(null);
  const [pickAptForFormOpen, setPickAptForFormOpen] = useState(false);

  // Consultation notes
  const [consultNoteOpen, setConsultNoteOpen] = useState(false);
  const [consultNoteAptId, setConsultNoteAptId] = useState("");
  const [consultNoteServiceName, setConsultNoteServiceName] = useState<string | undefined>();
  const [consultNoteClientName, setConsultNoteClientName] = useState<string | undefined>();
  const [consultNotes, setConsultNotes] = useState<Record<string, any>>({});

  // Appointment timings (duration recorded via stopwatch on completion)
  const [aptTimings, setAptTimings] = useState<Record<string, { duration_seconds: number | null }>>({});

  // AI Letter Writer

  // Duplicate detection
  const [dupDialogOpen, setDupDialogOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<PatientSummary[][]>([]);
  const [mergingGroup, setMergingGroup] = useState<number | null>(null);
  const [conflictResolver, setConflictResolver] = useState<null | {
    groupIndex: number;
    keep: PatientSummary;
    others: PatientSummary[];
    conflicts: { field: keyof PatientSummary; label: string; options: string[] }[];
    choices: Record<string, string>;
  }>(null);

  // Manual link / merge from patient profile
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState<PatientSummary[]>([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [linkTarget, setLinkTarget] = useState<PatientSummary | null>(null);
  const [linkRelationLabel, setLinkRelationLabel] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  // Activity log
  const [activityLog, setActivityLog] = useState<{ id: string; event_type: string; message: string; created_at: string; created_by: string }[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // AI Patient Summary

  // Send consent form manually
  const [consentTemplates, setConsentTemplates] = useState<ConsentFormTemplate[]>([]);
  const [sendConsentOpen, setSendConsentOpen] = useState(false);
  const [sendConsentAptId, setSendConsentAptId] = useState("");
  const [sendConsentTemplateId, setSendConsentTemplateId] = useState("");
  const [sendingConsent, setSendingConsent] = useState(false);

  const [birthdaysOpen, setBirthdaysOpen] = useState(false);
  const [birthdayPatients, setBirthdayPatients] = useState<PatientSummary[]>([]);
  const [birthdaysLoading, setBirthdaysLoading] = useState(false);
  const [showDeceased, setShowDeceased] = useState(false);
  const [markingDeceased, setMarkingDeceased] = useState(false);

  useEffect(() => {
    fetchPatients();
    supabase.from("services").select("id, name").then(({ data }) => {
      if (data) setServices(data);
    });
    supabase.from("consent_form_templates").select("id, title, form_type").eq("is_active", true).neq("form_type", "consultation").then(({ data }) => {
      if (data) setConsentTemplates(data);
    });
  }, []);

  // Auto-open patient profile when navigated from appointment detail
  useEffect(() => {
    if (initialSearchEmail && patients.length > 0) {
      const match = patients.find(p => p.client_email.toLowerCase() === initialSearchEmail.toLowerCase());
      if (match) {
        setAutoOpenedFromOtherTab(true);
        openPatientDetail(match);
      }
    }
  }, [initialSearchEmail, patients.length]);

  // Debounced server-side search — mirrors the patient lookup used in the
  // Phone Booking Wizard so results aren't limited to whatever is in the
  // local cache. Any matches found server-side are merged into the list.
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setServerSearchResults([]);
      setServerSearching(false);
      return;
    }
    setServerSearching(true);
    const handle = setTimeout(async () => {
      const safe = q.replace(/[%,()]/g, " ").trim();
      const { data } = await supabase
        .from("patients")
        .select("id, client_name, client_email, client_phone, address, alert_note, marketing_email, marketing_sms, updated_at, created_at, relationship_label, relationship_to_patient_id, deceased, deceased_at")
        .or(`client_name.ilike.%${safe}%,client_email.ilike.%${safe}%,client_phone.ilike.%${safe}%,address.ilike.%${safe}%,relationship_label.ilike.%${safe}%`)
        .limit(50);
      // Resolve linked-to names
      const linkedIds = Array.from(new Set((data || []).map((p: any) => p.relationship_to_patient_id).filter(Boolean)));
      const linkedNames: Record<string, string> = {};
      if (linkedIds.length > 0) {
        const { data: linked } = await supabase.from("patients").select("id, client_name").in("id", linkedIds);
        for (const l of linked || []) linkedNames[(l as any).id] = (l as any).client_name;
      }
      const mapped: PatientSummary[] = (data || []).map((p: any) => ({
        id: p.id,
        client_email: p.client_email,
        client_name: p.client_name,
        client_phone: p.client_phone,
        address: p.address,
        alert_note: p.alert_note || null,
        marketing_email: p.marketing_email || false,
        marketing_sms: p.marketing_sms || false,
        appointment_count: 0,
        last_appointment: p.updated_at?.split("T")[0] || p.created_at?.split("T")[0] || "",
        appointments: [],
        relationship_label: p.relationship_label || null,
        relationship_to_patient_id: p.relationship_to_patient_id || null,
        relationship_to_name: p.relationship_to_patient_id ? (linkedNames[p.relationship_to_patient_id] || null) : null,
        deceased: p.deceased || false,
        deceased_at: p.deceased_at || null,
      }));
      setServerSearchResults(mapped);
      setServerSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  const fetchPatients = async () => {
    // Fetch from patients table (raise default 1000-row limit)
    const { data: patientRows } = await supabase
      .from("patients")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(10000);

    // Fetch appointments to enrich patient data (raise default 1000-row limit)
    const { data: aptData } = await supabase
      .from("appointments")
      .select("id, client_name, client_email, client_phone, address, appointment_date, appointment_time, status, service_id, notes, price, consent_form_template_id, consent_sent_at, access_token, admin_notes, media_consent, dictation_consent, created_at")
      .order("appointment_date", { ascending: false })
      .limit(20000);

    if (!aptData) {
      // If no appointments, just show patients from the patients table
      if (patientRows) {
        setPatients(patientRows.map((p: any) => ({
          id: p.id,
          client_email: p.client_email,
          client_name: p.client_name,
          client_phone: p.client_phone,
          address: p.address,
          alert_note: p.alert_note || null,
          marketing_email: p.marketing_email || false,
          marketing_sms: p.marketing_sms || false,
          appointment_count: 0,
          last_appointment: p.updated_at?.split("T")[0] || p.created_at?.split("T")[0] || "",
          appointments: [],
          deceased: p.deceased || false,
          deceased_at: p.deceased_at || null,
        })));
      }
      return;
    }

    // Group appointments by email
    const grouped: Record<string, PatientSummary> = {};

    // First, add all patients from the patients table
    if (patientRows) {
      const nameById: Record<string, string> = {};
      for (const p of patientRows as any[]) nameById[p.id] = p.client_name;
      for (const p of patientRows as any[]) {
        const key = `${p.client_email.toLowerCase()}::${p.client_name.toLowerCase()}`;
        grouped[key] = {
          id: p.id,
          client_email: p.client_email,
          client_name: p.client_name,
          client_phone: p.client_phone,
          address: p.address,
          alert_note: p.alert_note || null,
          marketing_email: p.marketing_email || false,
          marketing_sms: p.marketing_sms || false,
          appointment_count: 0,
          last_appointment: p.updated_at?.split("T")[0] || p.created_at?.split("T")[0] || "",
          appointments: [],
          relationship_label: p.relationship_label || null,
          relationship_to_patient_id: p.relationship_to_patient_id || null,
          relationship_to_name: p.relationship_to_patient_id ? (nameById[p.relationship_to_patient_id] || null) : null,
          date_of_birth: p.date_of_birth || null,
          deceased: p.deceased || false,
          deceased_at: p.deceased_at || null,
        };
      }
    }

    // Then add appointment data — match to patient by email+name
    for (const apt of aptData) {
      const key = `${apt.client_email.toLowerCase()}::${apt.client_name.toLowerCase()}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: `apt-${apt.id}`,
          client_email: apt.client_email,
          client_name: apt.client_name,
          client_phone: apt.client_phone,
          address: apt.address,
          alert_note: null,
          marketing_email: false,
          marketing_sms: false,
          appointment_count: 0,
          last_appointment: apt.appointment_date,
          appointments: [],
        };
      }
      grouped[key].appointment_count++;
      if (apt.appointment_date > grouped[key].last_appointment) {
        grouped[key].last_appointment = apt.appointment_date;
        if (apt.client_phone) grouped[key].client_phone = apt.client_phone;
        if (apt.address) grouped[key].address = apt.address;
      }
      grouped[key].appointments.push(apt);
    }
    setPatients(Object.values(grouped).sort((a, b) => b.last_appointment.localeCompare(a.last_appointment)));
  };

  const fetchBirthdays = async () => {
    setBirthdaysLoading(true);
    const [{ data }, { data: cards }] = await Promise.all([
      supabase
        .from("patients")
        .select("id, client_name, client_email, client_phone, address, date_of_birth, alert_note, marketing_email, marketing_sms")
        .not("date_of_birth", "is", null)
        .eq("deceased", false)
        .order("date_of_birth", { ascending: true })
        .limit(5000),
      supabase
        .from("patient_birthday_cards" as any)
        .select("id, patient_id, sent_at")
        .order("sent_at", { ascending: false }),
    ]);

    const lastSentByPatient: Record<string, string> = {};
    const cardIdByPatient: Record<string, string> = {};
    for (const c of (cards as any[]) || []) {
      if (!lastSentByPatient[c.patient_id]) {
        lastSentByPatient[c.patient_id] = c.sent_at;
        cardIdByPatient[c.patient_id] = c.id;
      }
    }

    const today = new Date();
    const currentYear = today.getFullYear();

    const withNextBirthday = (data || []).map((p: any) => {
      const dob = parseISO(p.date_of_birth);
      const nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());
      if (nextBirthday < today) {
        nextBirthday.setFullYear(currentYear + 1);
      }
      const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const turningAge = nextBirthday.getFullYear() - dob.getFullYear();
      const lastSent = lastSentByPatient[p.id] || null;
      // Card stays marked as sent until ~2 months before the NEXT birthday after it was sent.
      // i.e. resets only when we enter the 60-day window before the following birthday.
      let cardSent = false;
      if (lastSent) {
        const sentAt = new Date(lastSent);
        const daysSinceSent = Math.floor((today.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24));
        // Reset when the next birthday is within 60 days AND the card was sent more than 60 days ago
        // (meaning it was for the previous cycle, not this upcoming one).
        const resetForNextCycle = daysUntil <= 60 && daysSinceSent > 60;
        cardSent = !resetForNextCycle;
      }
      return {
        id: p.id,
        client_email: p.client_email,
        client_name: p.client_name,
        client_phone: p.client_phone,
        address: p.address,
        alert_note: p.alert_note || null,
        marketing_email: p.marketing_email || false,
        marketing_sms: p.marketing_sms || false,
        appointment_count: 0,
        last_appointment: "",
        appointments: [],
        date_of_birth: p.date_of_birth,
        daysUntil,
        turningAge,
        nextBirthdayStr: format(nextBirthday, "dd MMMM"),
        cardSent,
        cardSentAt: lastSent,
        cardId: cardIdByPatient[p.id] || null,
      };
    });

    // Pending birthdays first, then ones already ticked, each sorted by days until.
    withNextBirthday.sort((a: any, b: any) => {
      if (a.cardSent !== b.cardSent) return a.cardSent ? 1 : -1;
      return a.daysUntil - b.daysUntil;
    });
    setBirthdayPatients(withNextBirthday);
    setBirthdaysLoading(false);
    setBirthdaysOpen(true);
  };

  const toggleBirthdayCardSent = async (patient: any) => {
    if (patient.cardSent && patient.cardId) {
      const { error } = await supabase.from("patient_birthday_cards" as any).delete().eq("id", patient.cardId);
      if (error) { toast.error("Failed to update"); return; }
      setBirthdayPatients(prev => prev.map((p: any) => p.id === patient.id ? { ...p, cardSent: false, cardId: null, cardSentAt: null } : p));
    } else {
      const { data, error } = await supabase.from("patient_birthday_cards" as any).insert({ patient_id: patient.id }).select("id, sent_at").single();
      if (error || !data) { toast.error("Failed to mark sent"); return; }
      setBirthdayPatients(prev => prev.map((p: any) => p.id === patient.id ? { ...p, cardSent: true, cardId: (data as any).id, cardSentAt: (data as any).sent_at } : p));
      toast.success("Marked as sent");
    }
  };

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return "—";
    return services.find((s) => s.id === serviceId)?.name || "Unknown";
  };

  const openPatientDetail = async (patient: PatientSummary) => {
    setAutoOpenedFromOtherTab(false);
    setSelectedPatient(patient);
    setDetailOpen(true);
    setFileDesc("");
    setSelectedAptIdForUpload(null);
    setEditingProfile(false);
    setProfileName(patient.client_name);
    setProfileEmail(patient.client_email);
    setProfilePhone(patient.client_phone || "");
    setProfileAddress(patient.address || "");
    setProfileAlertNote(patient.alert_note || "");
    setProfileDob("");
    setPatientDob(null);
    setProfileMarketingEmail(patient.marketing_email);
    setProfileMarketingSms(patient.marketing_sms);
    setNewNote("");

    let aptIds = patient.appointments.map((a) => a.id);
    let hydratedAppointments = patient.appointments;

    // If patient came from the server-side search dropdown, `appointments` is empty.
    // Hydrate appointments for this patient so consent forms / consultation notes load correctly.
    if (aptIds.length === 0 && patient.client_email) {
      const { data: aptRows } = await supabase
        .from("appointments")
        .select("*")
        .eq("client_email", patient.client_email.toLowerCase())
        .order("appointment_date", { ascending: false });
      if (aptRows && aptRows.length > 0) {
        aptIds = aptRows.map((a: any) => a.id);
        hydratedAppointments = aptRows as any;
        setSelectedPatient((current) => current ? {
          ...current,
          appointments: aptRows as any,
          appointment_count: aptRows.length,
          last_appointment: aptRows[0]?.appointment_date || current.last_appointment,
        } : current);
      }
    }

    const [responsesResult, filesResult, notesResult, logResult, patientRecord, timingsResult] = await Promise.all([
      supabase.from("consent_form_responses").select("*").in("appointment_id", aptIds),
      supabase.from("patient_files").select("*").eq("client_email", patient.client_email.toLowerCase()).order("created_at", { ascending: false }),
      supabase.from("consultation_notes").select("*").in("appointment_id", aptIds),
      supabase.from("patient_activity_log").select("*").eq("client_email", patient.client_email.toLowerCase()).order("created_at", { ascending: false }).limit(50),
      supabase
        .from("patients")
        .select("id, client_name, client_email, client_phone, address, alert_note, date_of_birth, marketing_email, marketing_sms")
        .eq("client_email", patient.client_email.toLowerCase())
        .maybeSingle(),
      supabase.from("appointment_timings").select("appointment_id, duration_seconds").in("appointment_id", aptIds),
    ]);

    // Normalize to the real patient record if one exists
    if (patientRecord.data?.id) {
      const realPatient = patientRecord.data;

      setSelectedPatient((current) => current ? {
        ...current,
        id: realPatient.id,
        client_name: realPatient.client_name || current.client_name,
        client_email: realPatient.client_email || current.client_email,
        client_phone: realPatient.client_phone ?? current.client_phone,
        address: realPatient.address ?? current.address,
        alert_note: realPatient.alert_note ?? current.alert_note,
        marketing_email: realPatient.marketing_email ?? current.marketing_email,
        marketing_sms: realPatient.marketing_sms ?? current.marketing_sms,
      } : current);

      setProfileName(realPatient.client_name || patient.client_name);
      setProfileEmail(realPatient.client_email || patient.client_email);
      setProfilePhone(realPatient.client_phone || "");
      setProfileAddress(realPatient.address || "");
      setProfileAlertNote(realPatient.alert_note || "");
      setProfileMarketingEmail(realPatient.marketing_email ?? false);
      setProfileMarketingSms(realPatient.marketing_sms ?? false);

      if (realPatient.date_of_birth) {
        setPatientDob(realPatient.date_of_birth);
        setProfileDob(realPatient.date_of_birth);
      }

      const { data: screenings } = await supabase
        .from("hearing_screenings")
        .select("id, created_at, left_classification, right_classification, overall_recommendation, left_thresholds, right_thresholds, clinical_summary, patient_friendly_summary, pdf_storage_path, frequency_set")
        .eq("patient_id", realPatient.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setHearingScreenings(screenings || []);
    } else {
      setHearingScreenings([]);
    }

    if (responsesResult.data && responsesResult.data.length > 0) {
      const templateIds = [...new Set(responsesResult.data.map((r) => r.consent_form_template_id))];
      const { data: templates } = await supabase.from("consent_form_templates").select("id, title, form_type").in("id", templateIds);
      setConsentResponses(
        responsesResult.data.map((r) => ({
          ...r,
          template_title: templates?.find((t) => t.id === r.consent_form_template_id)?.title || "Unknown Form",
          template_form_type: templates?.find((t) => t.id === r.consent_form_template_id)?.form_type || "consent",
        }))
      );
    } else {
      setConsentResponses([]);
    }

    // Index consultation notes by appointment_id
    const notesMap: Record<string, any> = {};
    if (notesResult.data) {
      for (const note of notesResult.data) {
        notesMap[note.appointment_id] = note;
      }
    }
    setConsultNotes(notesMap);

    // Index appointment timings by appointment_id
    const timingsMap: Record<string, { duration_seconds: number | null }> = {};
    if (timingsResult.data) {
      for (const t of timingsResult.data as any[]) {
        timingsMap[t.appointment_id] = { duration_seconds: t.duration_seconds };
      }
    }
    setAptTimings(timingsMap);

    setPatientFiles((filesResult.data as PatientFile[]) || []);
    setActivityLog((logResult.data as any[]) || []);
  };

  const addManualNote = async () => {
    if (!selectedPatient || !newNote.trim()) return;
    setAddingNote(true);
    const { error } = await supabase.from("patient_activity_log").insert({
      client_email: selectedPatient.client_email.toLowerCase(),
      event_type: "note",
      message: newNote.trim(),
      created_by: "admin",
    });
    if (error) {
      toast.error("Failed to add note");
    } else {
      toast.success("Note added");
      setNewNote("");
      const { data } = await supabase.from("patient_activity_log").select("*").eq("client_email", selectedPatient.client_email.toLowerCase()).order("created_at", { ascending: false }).limit(50);
      setActivityLog((data as any[]) || []);
    }
    setAddingNote(false);
  };

  const deletePatient = async () => {
    if (!selectedPatient) return;
    setDeleting(true);
    const email = selectedPatient.client_email.toLowerCase();

    try {
      // 1. Delete storage files
      const { data: files } = await supabase.from("patient_files").select("file_path").eq("client_email", email);
      if (files && files.length > 0) {
        await supabase.storage.from("shawscope").remove(files.map((f) => f.file_path));
      }

      // 2. Delete patient files from DB
      await supabase.from("patient_files").delete().eq("client_email", email);

      // 3. Delete from patients table (appointments are kept separately)
      await supabase.from("patients").delete().eq("id", selectedPatient.id);

      toast.success("Patient record deleted (appointments preserved)");
      setDetailOpen(false);
      setSelectedPatient(null);
      fetchPatients();
    } catch (err) {
      toast.error("Failed to delete patient records");
    }
    setDeleting(false);
  };

  const toggleDeceased = async () => {
    if (!selectedPatient) return;
    const rawId = typeof selectedPatient.id === "string" ? selectedPatient.id : "";
    if (!rawId || rawId.startsWith("apt-")) {
      toast.error("Patient record must exist before marking deceased. Edit & save profile first.");
      return;
    }
    const markAsDeceased = !selectedPatient.deceased;
    if (markAsDeceased) {
      const confirmed = window.confirm(
        `Mark ${selectedPatient.client_name} as deceased? This archives the record, removes them from marketing and birthday reminders. You can restore later.`
      );
      if (!confirmed) return;
    }
    setMarkingDeceased(true);
    const patch: Record<string, any> = markAsDeceased
      ? {
          deceased: true,
          deceased_at: new Date().toISOString(),
          marketing_email: false,
          marketing_sms: false,
          marketing_opted_in_at: null,
        }
      : { deceased: false, deceased_at: null };
    const { error } = await supabase.from("patients").update(patch).eq("id", rawId);
    if (error) {
      toast.error("Failed to update: " + error.message);
      setMarkingDeceased(false);
      return;
    }
    // Cancel any pending recalls so we don't reach out to family
    if (markAsDeceased) {
      await supabase
        .from("patient_recalls")
        .update({ status: "cancelled" })
        .eq("patient_id", rawId)
        .eq("status", "pending");
    }
    toast.success(markAsDeceased ? "Patient archived as deceased" : "Patient restored");
    setSelectedPatient({
      ...selectedPatient,
      deceased: markAsDeceased,
      deceased_at: markAsDeceased ? new Date().toISOString() : null,
      marketing_email: markAsDeceased ? false : selectedPatient.marketing_email,
      marketing_sms: markAsDeceased ? false : selectedPatient.marketing_sms,
    });
    setMarkingDeceased(false);
    fetchPatients();
  };

  const saveProfile = async () => {
    if (!selectedPatient) return;
    const nextName = profileName.trim() || selectedPatient.client_name;
    const newEmail = profileEmail.trim().toLowerCase();
    const oldEmail = selectedPatient.client_email.toLowerCase();
    const emailChanged = newEmail !== oldEmail;

    if (!newEmail) {
      toast.error("Email is required");
      return;
    }

    const { data: existingPatientRecord } = await supabase
      .from("patients")
      .select("id")
      .eq("client_email", oldEmail)
      .maybeSingle();

    const rawSelectedPatientId = typeof selectedPatient.id === "string" ? selectedPatient.id.trim() : "";
    const selectedPatientDbId = rawSelectedPatientId.startsWith("apt-") ? "" : rawSelectedPatientId;

    let patientRecordId = selectedPatientDbId && UUID_PATTERN.test(selectedPatientDbId)
      ? selectedPatientDbId
      : existingPatientRecord?.id && UUID_PATTERN.test(existingPatientRecord.id)
        ? existingPatientRecord.id
        : null;

    const updatePayload: PatientInsert = {
      client_name: nextName,
      client_email: newEmail,
      client_phone: profilePhone.trim() || null,
      address: profileAddress.trim() || null,
      alert_note: profileAlertNote.trim() || null,
      date_of_birth: profileDob || null,
      marketing_email: profileMarketingEmail,
      marketing_sms: profileMarketingSms,
    };

    if ((profileMarketingEmail || profileMarketingSms) && !(selectedPatient.marketing_email || selectedPatient.marketing_sms)) {
      updatePayload.marketing_opted_in_at = new Date().toISOString();
    } else if (!profileMarketingEmail && !profileMarketingSms) {
      updatePayload.marketing_opted_in_at = null;
    }

    // Update patients table
    if (emailChanged) {
      // Check if new email+name combo already exists
      const { data: existing } = await supabase.from("patients").select("id").eq("client_email", newEmail).ilike("client_name", nextName).maybeSingle();
      if (existing && existing.id !== patientRecordId) {
        toast.error("A patient with this name and email already exists");
        return;
      }

      if (patientRecordId) {
        const { error: updateError } = await supabase
          .from("patients")
          .update(updatePayload)
          .eq("id", patientRecordId);

        if (updateError) {
          toast.error("Failed to update email: " + updateError.message);
          return;
        }
      } else {
        const { data: inserted, error: insertError } = await supabase.from("patients").insert(updatePayload).select("id").single();

        if (insertError) {
          toast.error("Failed to create patient record: " + insertError.message);
          return;
        }

        patientRecordId = inserted.id;
      }

      // Update all appointments and patient files to new email
      await supabase.from("appointments").update({ client_email: newEmail, client_name: nextName, client_phone: profilePhone.trim() || null, address: profileAddress.trim() || null }).eq("client_email", oldEmail).eq("client_name", selectedPatient.client_name);
      await supabase.from("patient_files").update({ client_email: newEmail }).eq("client_email", oldEmail);
    } else {
      if (patientRecordId) {
        const { error: patientError } = await supabase
          .from("patients")
          .update(updatePayload)
          .eq("id", patientRecordId);

        if (patientError) {
          console.error("Patient update error:", patientError);
          toast.error("Failed to update patient info: " + patientError.message);
          return;
        }
      } else {
        const { data: inserted, error: insertError } = await supabase.from("patients").insert(updatePayload).select("id").single();

        if (insertError) {
          toast.error("Failed to create patient record: " + insertError.message);
          return;
        }

        patientRecordId = inserted.id;
      }

      // Also update appointments for consistency
      await supabase
        .from("appointments")
        .update({
          client_name: nextName,
          client_phone: profilePhone.trim() || null,
          address: profileAddress.trim() || null,
        })
        .eq("client_email", oldEmail);
    }

    toast.success("Patient info updated");
    setEditingProfile(false);
    setSelectedPatient({
      ...selectedPatient,
       id: patientRecordId || selectedPatient.id,
       client_name: nextName,
      client_email: newEmail,
      client_phone: profilePhone.trim() || null,
      address: profileAddress.trim() || null,
      alert_note: profileAlertNote.trim() || null,
      marketing_email: profileMarketingEmail,
      marketing_sms: profileMarketingSms,
    });
    fetchPatients();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPatient || !e.target.files?.length) return;
    const file = e.target.files[0];
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File must be under 20MB");
      return;
    }

    setUploading(true);
    const filePath = `patients/${selectedPatient.client_email.toLowerCase()}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage.from("shawscope").upload(filePath, file);
    if (uploadError) { toast.error("Failed to upload file"); setUploading(false); return; }

    const { error: dbError } = await supabase.from("patient_files").insert({
      client_email: selectedPatient.client_email.toLowerCase(),
      appointment_id: selectedAptIdForUpload || null,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      description: fileDesc.trim() || null,
    });

    if (dbError) { toast.error("Failed to save file record"); }
    else {
      toast.success("File uploaded");
      setFileDesc("");
      const { data } = await supabase.from("patient_files").select("*").eq("client_email", selectedPatient.client_email.toLowerCase()).order("created_at", { ascending: false });
      setPatientFiles((data as PatientFile[]) || []);
    }
    setUploading(false);
    e.target.value = "";
  };

  const [viewingFile, setViewingFile] = useState<{ url: string; name: string; type: string | null } | null>(null);

  const downloadFile = async (file: PatientFile) => {
    const { data, error } = await supabase.storage.from("shawscope").createSignedUrl(file.file_path, 60);
    if (error || !data?.signedUrl) { toast.error("Failed to download file"); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = file.file_name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const viewFile = async (file: PatientFile) => {
    const { data, error } = await supabase.storage.from("shawscope").createSignedUrl(file.file_path, 300);
    if (error || !data?.signedUrl) { toast.error("Failed to load file preview"); return; }
    setViewingFile({ url: data.signedUrl, name: file.file_name, type: file.file_type });
  };

  const isImageFile = (file: PatientFile) => {
    const ext = file.file_name.toLowerCase();
    return ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.webp') || ext.endsWith('.gif') ||
      (file.file_type && file.file_type.startsWith('image/'));
  };

  const isPdfFile = (file: PatientFile) => {
    return file.file_name.toLowerCase().endsWith('.pdf') || file.file_type === 'application/pdf';
  };

  const deleteFile = async (file: PatientFile) => {
    const { error: storageError } = await supabase.storage.from("shawscope").remove([file.file_path]);
    if (storageError) { toast.error("Failed to delete file from storage"); return; }
    const { error: dbError } = await supabase.from("patient_files").delete().eq("id", file.id);
    if (dbError) { toast.error("Failed to delete file record"); }
    else { toast.success("File deleted"); setPatientFiles((prev) => prev.filter((f) => f.id !== file.id)); }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredPatients = useMemo(() => {
    const raw = search.trim().toLowerCase();
    const terms = raw ? raw.split(/\s+/).filter(Boolean) : [];
    const digitsOnly = (s: string) => s.replace(/\D+/g, "");

    // The main list shows only the cached patient records. Server-side
    // search results are surfaced in a dropdown next to the search input
    // (mirroring the Phone Booking Wizard) so they don't pollute the list.
    const combined: PatientSummary[] = showDeceased
      ? patients
      : patients.filter((p) => !p.deceased);

    // Pre-compute haystacks once per patient for speed
    const indexed = combined.map((p) => {
      const phoneDigits = p.client_phone ? digitsOnly(p.client_phone) : "";
      const haystack = [
        p.client_name,
        p.client_email,
        p.client_phone || "",
        p.address || "",
      ]
        .join(" ")
        .toLowerCase();
      return { p, haystack, phoneDigits };
    });

    const matched = terms.length === 0
      ? indexed
      : indexed.filter(({ haystack, phoneDigits }) =>
          terms.every((t) => {
            if (haystack.includes(t)) return true;
            const tDigits = digitsOnly(t);
            return tDigits.length >= 3 && phoneDigits.includes(tDigits);
          })
        );

    return matched
      .map(({ p }) => p)
      .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.client_name.localeCompare(b.client_name);
        case "appointments":
          return b.appointment_count - a.appointment_count;
        case "last_visit":
          return b.last_appointment.localeCompare(a.last_appointment);
        case "recent":
        default:
          return 0; // already sorted by updated_at desc from fetch
      }
    });
  }, [patients, search, sortBy, showDeceased]);

  // Hearing screenings for patient
  const [hearingScreenings, setHearingScreenings] = useState<any[]>([]);

  // PDF export dialog state
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfSections, setPdfSections] = useState({
    contactInfo: true,
    alertNotes: true,
    appointments: true,
    consentForms: true,
    consultationNotes: true,
    clinicalObservations: true,
    hearingScreenings: true,
    patientFiles: true,
    activityLog: true,
    marketingPrefs: true,
  });
  const [pdfEncrypt, setPdfEncrypt] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");

  const togglePdfSection = (key: keyof typeof pdfSections) => {
    setPdfSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllSections = (val: boolean) => {
    setPdfSections({
      contactInfo: val, alertNotes: val, appointments: val,
      consentForms: val, consultationNotes: val, clinicalObservations: val,
      hearingScreenings: val, patientFiles: val, activityLog: val, marketingPrefs: val,
    });
  };

  // Bulk export: one PDF per patient (consent forms + consultation notes), bundled into a ZIP.
  const bulkExportPatientPDFs = async () => {
    if (bulkExporting) return;
    const targets = filteredPatients;
    if (targets.length === 0) {
      toast.error("No patients to export");
      return;
    }
    if (!confirm(`Generate a PDF for each of ${targets.length} patient(s) (consent forms + consultation notes) and download as a ZIP?`)) {
      return;
    }

    setBulkExporting(true);
    setBulkExportProgress({ current: 0, total: targets.length });
    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();
      const slugify = (s: string) => {
        const base = (s || "patient").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim() || "patient";
        let name = `${base}.pdf`;
        let i = 2;
        while (usedNames.has(name.toLowerCase())) { name = `${base} (${i++}).pdf`; }
        usedNames.add(name.toLowerCase());
        return name;
      };

      for (let idx = 0; idx < targets.length; idx++) {
        const patient = targets[idx];
        setBulkExportProgress({ current: idx + 1, total: targets.length });

        // Fetch appointments (use existing if loaded, else by email)
        let appointments = patient.appointments || [];
        if (appointments.length === 0 && patient.client_email) {
          const { data: aptRows } = await supabase
            .from("appointments")
            .select("*")
            .eq("client_email", patient.client_email.toLowerCase())
            .order("appointment_date", { ascending: false });
          appointments = (aptRows || []) as any;
        }
        const aptIds = appointments.map((a: any) => a.id);

        let responses: any[] = [];
        let notes: any[] = [];
        if (aptIds.length > 0) {
          const [respRes, notesRes] = await Promise.all([
            supabase.from("consent_form_responses").select("*, consent_form_templates(title, form_type)").in("appointment_id", aptIds),
            supabase.from("consultation_notes").select("*").in("appointment_id", aptIds),
          ]);
          responses = (respRes.data || []).map((r: any) => ({
            ...r,
            template_title: r.consent_form_templates?.title || r.template_snapshot?.title || "Form",
            template_form_type: r.consent_form_templates?.form_type || null,
          }));
          notes = notesRes.data || [];
        }

        // Skip patients with nothing to export
        if (responses.length === 0 && notes.length === 0) continue;

        const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
        let y = 20;
        doc.setFontSize(18);
        doc.text("Patient Record", 14, y);
        doc.setFontSize(10);
        doc.setTextColor(128);
        doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy 'at' HH:mm")}`, 14, y + 7);
        doc.text("CONFIDENTIAL — ShawScope", 14, y + 12);
        doc.setTextColor(0);
        y += 22;

        doc.setFontSize(13);
        doc.text("Patient", 14, y); y += 7;
        doc.setFontSize(10);
        doc.text(`Name: ${patient.client_name}`, 14, y); y += 5;
        doc.text(`Email: ${patient.client_email}`, 14, y); y += 5;
        if (patient.client_phone) { doc.text(`Phone: ${patient.client_phone}`, 14, y); y += 5; }
        if (patient.date_of_birth) { doc.text(`DOB: ${format(parseISO(patient.date_of_birth), "dd/MM/yyyy")}`, 14, y); y += 5; }
        y += 5;

        // Consent forms (non-consultation)
        const consentForms = responses.filter((r) => r.template_form_type !== "consultation");
        if (consentForms.length > 0) {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFontSize(13);
          doc.text(`Consent Forms (${consentForms.length})`, 14, y); y += 7;
          for (const cr of consentForms) {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFontSize(10); doc.setFont("helvetica", "bold");
            doc.text(cr.template_title || "Form", 14, y);
            doc.setFont("helvetica", "normal"); doc.setFontSize(8);
            doc.text(`Completed: ${format(parseISO(cr.created_at), "dd/MM/yyyy")}${cr.signed_at ? ` · Signed: ${format(parseISO(cr.signed_at), "dd/MM/yyyy")}` : ""}${cr.submitter_name ? ` · By: ${cr.submitter_name}` : ""}`, 14, y + 4);
            y += 9;
            const r = cr.responses as Record<string, any>;
            for (const [k, v] of Object.entries(r || {})) {
              if (k.startsWith("__")) continue;
              if (y > 270) { doc.addPage(); y = 20; }
              doc.setFontSize(8); doc.setTextColor(128); doc.text(k, 18, y);
              doc.setTextColor(0);
              const val = typeof v === "boolean" ? (v ? "Yes" : "No") : (v == null ? "—" : String(v));
              doc.text(val, 18, y + 4, { maxWidth: 170 });
              y += 10;
            }
            y += 3;
          }
        }

        // Consultation form responses
        const consultForms = responses.filter((r) => r.template_form_type === "consultation" && r.status !== "draft");
        if (consultForms.length > 0 || notes.length > 0) {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFontSize(13);
          doc.text("Consultation Notes", 14, y); y += 7;

          for (const cr of consultForms) {
            if (y > 260) { doc.addPage(); y = 20; }
            const apt = appointments.find((a: any) => a.id === cr.appointment_id);
            doc.setFontSize(10); doc.setFont("helvetica", "bold");
            doc.text(`${apt ? format(parseISO(apt.appointment_date), "dd/MM/yyyy") : format(parseISO(cr.created_at), "dd/MM/yyyy")} — ${cr.template_title || "Consultation Form"}`, 14, y);
            doc.setFont("helvetica", "normal"); y += 6;
            const r = cr.responses as Record<string, any>;
            for (const [k, v] of Object.entries(r || {})) {
              if (k.startsWith("__")) continue;
              if (y > 270) { doc.addPage(); y = 20; }
              doc.setFontSize(8); doc.setTextColor(128); doc.text(k, 18, y);
              doc.setTextColor(0);
              const val = typeof v === "boolean" ? (v ? "Yes" : "No") : (v == null ? "—" : String(v));
              doc.text(val, 18, y + 4, { maxWidth: 170 });
              y += 10;
            }
            y += 3;
          }

          for (const note of notes) {
            if (y > 260) { doc.addPage(); y = 20; }
            const apt = appointments.find((a: any) => a.id === note.appointment_id);
            doc.setFontSize(10); doc.setFont("helvetica", "bold");
            doc.text(`${apt ? format(parseISO(apt.appointment_date), "dd/MM/yyyy") : "Note"} — ${getServiceName(apt?.service_id || null)}`, 14, y);
            doc.setFont("helvetica", "normal"); y += 6;
            const fields: [string, any][] = [
              ["Other Notes", note.other_notes],
              ["Presenting Complaint", note.presenting_complaint],
              ["Medical History", note.medical_history],
              ["Current Medications", note.current_medications],
              ["Allergies", note.allergies],
              ["Examination Findings", note.examination_findings],
              ["Procedure Performed", note.procedure_performed],
              ["Equipment Used", note.equipment_used?.replace(/\s*\[kit:[^\]]*\]/, "")],
              ["Procedure Notes", note.procedure_notes],
              ["Outcome", note.outcome],
              ["Aftercare Advice", note.aftercare_advice],
              ["Complications", note.complications],
              ["Follow-up Notes", note.follow_up_notes],
            ];
            for (const [label, val] of fields) {
              if (!val) continue;
              if (y > 270) { doc.addPage(); y = 20; }
              doc.setFontSize(8); doc.setTextColor(128); doc.text(label, 18, y);
              doc.setTextColor(0);
              doc.text(String(val), 18, y + 4, { maxWidth: 170 });
              y += 10;
            }
            y += 3;
          }
        }

        const blob = doc.output("blob");
        zip.file(slugify(patient.client_name), blob);
      }

      if (Object.keys(zip.files).length === 0) {
        toast.error("No patients had consent forms or consultation notes to export");
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `patient-records-${format(new Date(), "yyyy-MM-dd")}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${Object.keys(zip.files).length} patient PDF(s)`);
    } catch (e: any) {
      console.error("Bulk export failed", e);
      toast.error(`Bulk export failed: ${e?.message || "Unknown error"}`);
    } finally {
      setBulkExporting(false);
      setBulkExportProgress(null);
    }
  };

  const exportPatientPDF = () => {
    if (!selectedPatient) return;

    const jsPdfOpts: any = { orientation: "p", unit: "mm", format: "a4" };
    if (pdfEncrypt && pdfPassword.trim()) {
      jsPdfOpts.encryption = {
        userPassword: pdfPassword.trim(),
        ownerPassword: pdfPassword.trim(),
        userPermissions: ["print"],
      };
    }

    const doc = new jsPDF(jsPdfOpts);
    const patient = selectedPatient;
    let y = 20;

    doc.setFontSize(18);
    doc.text("Patient Record", 14, y);
    doc.setFontSize(10);
    doc.setTextColor(128);
    doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")}`, 14, y + 7);
    doc.text("CONFIDENTIAL — ShawScope", 14, y + 12);
    doc.setTextColor(0);
    y += 22;

    if (pdfSections.contactInfo) {
      doc.setFontSize(13);
      doc.text("Contact Information", 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.text(`Name: ${patient.client_name}`, 14, y); y += 5;
      doc.text(`Email: ${patient.client_email}`, 14, y); y += 5;
      doc.text(`Phone: ${patient.client_phone || "—"}`, 14, y); y += 5;
      doc.text(`Address: ${patient.address || "—"}`, 14, y); y += 10;
    }

    if (pdfSections.alertNotes && patient.alert_note) {
      doc.setFontSize(13);
      doc.text("Alert / Private Notes", 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.text(patient.alert_note, 14, y, { maxWidth: 180 });
      y += 10;
    }

    if (pdfSections.marketingPrefs) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.text("Marketing Preferences", 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.text(`Email marketing: ${patient.marketing_email ? "Opted in" : "Not opted in"}`, 14, y); y += 5;
      doc.text(`SMS marketing: ${patient.marketing_sms ? "Opted in" : "Not opted in"}`, 14, y); y += 10;
    }

    if (pdfSections.appointments) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.text(`Appointment History (${patient.appointments.length})`, 14, y);
      y += 3;

      const aptRows = patient.appointments.map((apt) => [
        format(parseISO(apt.appointment_date), "MMM d, yyyy"),
        apt.appointment_time.slice(0, 5),
        getServiceName(apt.service_id),
        apt.status,
        apt.price != null ? `£${Number(apt.price).toFixed(2)}` : "—",
        apt.notes || "—",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Date", "Time", "Service", "Status", "Price", "Notes"]],
        body: aptRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 37, 36] },
        margin: { left: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (pdfSections.consentForms) {
      const nonConsultForms = consentResponses.filter((cr: any) => cr.template_form_type !== "consultation");
      if (nonConsultForms.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.text(`Completed Forms (${nonConsultForms.length})`, 14, y);
        y += 7;

        for (const cr of nonConsultForms) {
          if (y > 260) { doc.addPage(); y = 20; }
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(cr.template_title || "Form", 14, y);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(`Completed: ${format(parseISO(cr.created_at), "MMM d, yyyy")}${cr.signed_at ? ` · Signed: ${format(parseISO(cr.signed_at), "MMM d, yyyy")}` : ""}`, 14, y + 4);
          y += 9;

          const responses = cr.responses as Record<string, any>;
          for (const [key, value] of Object.entries(responses)) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(8);
            doc.setTextColor(128);
            doc.text(key, 18, y);
            doc.setTextColor(0);
            const val = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
            doc.text(val, 18, y + 4);
            y += 9;
          }
          y += 3;
        }
      }
    }

    const consultFormResponsesForPdf = consentResponses.filter((cr: any) => cr.template_form_type === "consultation" && cr.status !== "draft");
    const hasConsultContent = Object.keys(consultNotes).length > 0 || consultFormResponsesForPdf.length > 0;

    if (pdfSections.consultationNotes && hasConsultContent) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.text("Consultation Notes", 14, y);
      y += 7;

      // Consultation form responses
      for (const cr of consultFormResponsesForPdf) {
        if (y > 260) { doc.addPage(); y = 20; }
        const apt = patient.appointments.find(a => a.id === cr.appointment_id);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${apt ? format(parseISO(apt.appointment_date), "MMM d, yyyy") : format(parseISO(cr.created_at), "MMM d, yyyy")} — ${cr.template_title || "Consultation Form"}`, 14, y);
        doc.setFont("helvetica", "normal");
        y += 6;
        const responses = cr.responses as Record<string, any>;
        for (const [key, value] of Object.entries(responses)) {
          if (key.startsWith("__")) continue;
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(8);
          doc.setTextColor(128);
          doc.text(key, 18, y);
          doc.setTextColor(0);
          const val = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
          doc.text(val, 18, y + 4, { maxWidth: 170 });
          y += 10;
        }
        y += 3;
      }

      // Standard consultation notes
      for (const [aptId, note] of Object.entries(consultNotes)) {
        if (y > 260) { doc.addPage(); y = 20; }
        const apt = patient.appointments.find(a => a.id === aptId);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${apt ? format(parseISO(apt.appointment_date), "MMM d, yyyy") : "Unknown"} — ${getServiceName(apt?.service_id || null)}`, 14, y);
        doc.setFont("helvetica", "normal");
        y += 6;
        const fields = [
          ["Other Notes", note.other_notes],
          ["Presenting Complaint", note.presenting_complaint],
          ["Medical History", note.medical_history],
          ["Current Medications", note.current_medications],
          ["Allergies", note.allergies],
          ["Examination Findings", note.examination_findings],
          ["Procedure Performed", note.procedure_performed],
          ["Equipment Used", note.equipment_used?.replace(/\s*\[kit:[^\]]*\]/, '')],
          ["Procedure Notes", note.procedure_notes],
          ["Outcome", note.outcome],
          ["Aftercare Advice", note.aftercare_advice],
          ["Complications", note.complications],
          ["Follow-up Notes", note.follow_up_notes],
        ];
        for (const [label, val] of fields) {
          if (val) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(8);
            doc.setTextColor(128);
            doc.text(label, 18, y);
            doc.setTextColor(0);
            doc.text(String(val), 18, y + 4, { maxWidth: 170 });
            y += 10;
          }
        }
        y += 3;
      }
    }

    // Clinical Observations section
    if (pdfSections.clinicalObservations) {
      const allObs: { obs: NEWSObservation; date: string; formTitle: string }[] = [];
      for (const cr of consentResponses) {
        const r = cr.responses as Record<string, any>;
        if (r?.__newsObservations && Array.isArray(r.__newsObservations)) {
          for (const obs of r.__newsObservations as NEWSObservation[]) {
            allObs.push({ obs, date: cr.created_at, formTitle: cr.template_title || "Consultation" });
          }
        }
      }
      for (const [aptId, note] of Object.entries(consultNotes)) {
        if (note && (note as any).news_observations && Array.isArray((note as any).news_observations)) {
          for (const obs of (note as any).news_observations as NEWSObservation[]) {
            allObs.push({ obs, date: (note as any).created_at || obs.timestamp, formTitle: "Consultation Note" });
          }
        }
      }
      allObs.sort((a, b) => new Date(a.obs.timestamp).getTime() - new Date(b.obs.timestamp).getTime());

      if (allObs.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.text(`Clinical Observations (${allObs.length})`, 14, y);
        y += 3;

        const obsRows = allObs.map(item => [
          format(new Date(item.obs.timestamp), "dd/MM/yy HH:mm"),
          item.formTitle,
          String(item.obs.score),
          item.obs.respirationRate || "—",
          item.obs.spo2 ? `${item.obs.spo2}%` : "—",
          item.obs.systolicBP ? (item.obs.diastolicBP ? `${item.obs.systolicBP}/${item.obs.diastolicBP}` : String(item.obs.systolicBP)) : "—",
          item.obs.pulse || "—",
          item.obs.temperature ? `${item.obs.temperature}°C` : "—",
          item.obs.airOrOxygen === "oxygen" ? "O₂" : "Air",
          item.obs.consciousness === "alert" ? "A" : "CVPU",
          item.obs.gpReferred ? "Yes" : "No",
        ]);

        autoTable(doc, {
          startY: y,
          head: [["Date", "Source", "NEWS", "RR", "SpO₂", "BP", "HR", "Temp", "O₂", "ACVPU", "GP Ref"]],
          body: obsRows,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [41, 37, 36] },
          margin: { left: 14 },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 2) {
              const score = parseInt(data.cell.raw);
              if (score >= 7) data.cell.styles.textColor = [220, 38, 38];
              else if (score >= 5) data.cell.styles.textColor = [234, 88, 12];
              else if (score >= 1) data.cell.styles.textColor = [202, 138, 4];
            }
          },
        });

        y = (doc as any).lastAutoTable.finalY + 5;

        // Draw a multi-vital line chart in the PDF
        if (allObs.length >= 2) {
          if (y > 180) { doc.addPage(); y = 20; }
          const chartX = 14;
          const chartY = y + 5;
          const chartW = 180;
          const chartH = 80;

          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text("Clinical Observations Trend", chartX, chartY - 2);
          doc.setTextColor(0);

          // Draw axes
          doc.setDrawColor(200);
          doc.setLineWidth(0.3);
          doc.line(chartX, chartY, chartX, chartY + chartH);
          doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

          // Compute global min/max across all vitals
          const allVals: number[] = [];
          for (const o of allObs) {
            allVals.push(o.obs.score);
            if (o.obs.respirationRate) allVals.push(Number(o.obs.respirationRate));
            if (o.obs.spo2) allVals.push(Number(o.obs.spo2));
            if (o.obs.systolicBP) allVals.push(Number(o.obs.systolicBP));
            if (o.obs.diastolicBP) allVals.push(Number(o.obs.diastolicBP));
            if (o.obs.pulse) allVals.push(Number(o.obs.pulse));
            if (o.obs.temperature) allVals.push(Number(o.obs.temperature));
          }
          const maxVal = Math.max(...allVals, 10);
          const minVal = 0;

          // Y axis labels
          doc.setFontSize(6);
          doc.setTextColor(128);
          const ySteps = 5;
          for (let s = 0; s <= ySteps; s++) {
            const val = Math.round(minVal + (s / ySteps) * (maxVal - minVal));
            const labelY = chartY + chartH - (s / ySteps) * chartH;
            doc.text(String(val), chartX - 4, labelY + 1, { align: "right" });
            doc.setDrawColor(235);
            doc.line(chartX, labelY, chartX + chartW, labelY);
          }

          const getXY = (index: number, val: number) => ({
            x: chartX + (index / (allObs.length - 1)) * chartW,
            y: chartY + chartH - ((val - minVal) / (maxVal - minVal)) * chartH,
          });

          // Helper to draw a line series
          const drawLine = (values: (number | null)[], r: number, g: number, b: number, width: number = 0.6, dashed?: boolean) => {
            doc.setDrawColor(r, g, b);
            doc.setLineWidth(width);
            const pts = values.map((v, i) => v != null ? getXY(i, v) : null);
            for (let i = 1; i < pts.length; i++) {
              if (pts[i - 1] && pts[i]) {
                doc.line(pts[i - 1]!.x, pts[i - 1]!.y, pts[i]!.x, pts[i]!.y);
              }
            }
            doc.setFillColor(r, g, b);
            for (const p of pts) {
              if (p) doc.circle(p.x, p.y, 0.7, "F");
            }
          };

          // Draw all vital lines
          drawLine(allObs.map(o => o.obs.score), 220, 38, 38, 0.8); // NEWS - red
          drawLine(allObs.map(o => o.obs.pulse ? Number(o.obs.pulse) : null), 100, 100, 100, 0.6); // HR - gray
          drawLine(allObs.map(o => o.obs.respirationRate ? Number(o.obs.respirationRate) : null), 59, 130, 246, 0.6); // RR - blue
          drawLine(allObs.map(o => o.obs.spo2 ? Number(o.obs.spo2) : null), 34, 197, 94, 0.6); // SpO2 - green
          drawLine(allObs.map(o => o.obs.temperature ? Number(o.obs.temperature) : null), 139, 92, 246, 0.6); // Temp - purple

          // BP: Draw vertical bars between systolic and diastolic (not horizontal lines)
          doc.setDrawColor(249, 115, 22);
          doc.setFillColor(249, 115, 22);
          doc.setLineWidth(1.2);
          for (let i = 0; i < allObs.length; i++) {
            const sys = allObs[i].obs.systolicBP ? Number(allObs[i].obs.systolicBP) : null;
            const dia = allObs[i].obs.diastolicBP ? Number(allObs[i].obs.diastolicBP) : null;
            if (sys != null) {
              const pSys = getXY(i, sys);
              doc.circle(pSys.x, pSys.y, 0.8, "F");
              if (dia != null) {
                const pDia = getXY(i, dia);
                doc.circle(pDia.x, pDia.y, 0.8, "F");
                doc.line(pSys.x, pSys.y, pDia.x, pDia.y); // vertical bar
              }
            }
          }

          // Legend
          const legendY = chartY + chartH + 8;
          doc.setFontSize(5);
          const legends = [
            { label: "NEWS", r: 220, g: 38, b: 38 },
            { label: "HR", r: 100, g: 100, b: 100 },
            { label: "RR", r: 59, g: 130, b: 246 },
            { label: "SpO₂", r: 34, g: 197, b: 94 },
            { label: "BP", r: 249, g: 115, b: 22 },
            { label: "Temp", r: 139, g: 92, b: 246 },
          ];
          let lx = chartX;
          for (const leg of legends) {
            doc.setFillColor(leg.r, leg.g, leg.b);
            doc.circle(lx, legendY, 1, "F");
            doc.setTextColor(80);
            doc.text(leg.label, lx + 2, legendY + 0.8);
            lx += doc.getTextWidth(leg.label) + 6;
          }

          // X axis labels
          doc.setTextColor(128);
          doc.setFontSize(5);
          const labelInterval = Math.max(1, Math.floor(allObs.length / 6));
          const xPoints = allObs.map((_, i) => getXY(i, 0));
          for (let i = 0; i < allObs.length; i += labelInterval) {
            doc.text(
              format(new Date(allObs[i].obs.timestamp), "dd/MM"),
              xPoints[i].x,
              chartY + chartH + 4,
              { align: "center" }
            );
          }
          if ((allObs.length - 1) % labelInterval !== 0) {
            doc.text(
              format(new Date(allObs[allObs.length - 1].obs.timestamp), "dd/MM"),
              xPoints[xPoints.length - 1].x,
              chartY + chartH + 4,
              { align: "center" }
            );
          }

          doc.setTextColor(0);
          doc.setDrawColor(0);
          y = legendY + 8;
        } else {
          y += 10;
        }
      }
    }

    // Hearing Screenings section
    if (pdfSections.hearingScreenings && hearingScreenings.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.text(`Hearing Screenings (${hearingScreenings.length})`, 14, y);
      y += 3;

      const screeningRows = hearingScreenings.map((s: any) => {
        const leftThresholds = s.left_thresholds && Array.isArray(s.left_thresholds)
          ? (s.left_thresholds as any[]).map((t: any) => `${t.frequency_hz}Hz=${t.estimated_dbhl}dB`).join(', ')
          : '—';
        const rightThresholds = s.right_thresholds && Array.isArray(s.right_thresholds)
          ? (s.right_thresholds as any[]).map((t: any) => `${t.frequency_hz}Hz=${t.estimated_dbhl}dB`).join(', ')
          : '—';
        return [
          format(parseISO(s.created_at), "dd/MM/yy HH:mm"),
          (s.left_classification || '—').replace('_', ' '),
          (s.right_classification || '—').replace('_', ' '),
          (s.overall_recommendation || '—').replace('_', ' '),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["Date", "Left Ear", "Right Ear", "Recommendation"]],
        body: screeningRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 37, 36] },
        margin: { left: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 5;

      // Add detailed thresholds for each screening
      for (const s of hearingScreenings) {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(9); doc.setFont("helvetica", "bold");
        doc.text(`Screening: ${format(parseISO(s.created_at), "dd/MM/yyyy HH:mm")}`, 14, y);
        doc.setFont("helvetica", "normal");
        y += 5;

        if (s.left_thresholds && Array.isArray(s.left_thresholds)) {
          doc.setFontSize(7); doc.setTextColor(59, 130, 246);
          doc.text('Left: ' + (s.left_thresholds as any[]).map((t: any) => `${t.frequency_hz}Hz=${t.estimated_dbhl}dB`).join(', '), 14, y);
          y += 3.5;
        }
        if (s.right_thresholds && Array.isArray(s.right_thresholds)) {
          doc.setTextColor(239, 68, 68);
          doc.text('Right: ' + (s.right_thresholds as any[]).map((t: any) => `${t.frequency_hz}Hz=${t.estimated_dbhl}dB`).join(', '), 14, y);
          y += 3.5;
        }
        doc.setTextColor(0);

        if (s.clinical_summary) {
          doc.setFontSize(8); doc.setTextColor(80);
          const sumLines = doc.splitTextToSize(s.clinical_summary, 180);
          doc.text(sumLines, 14, y);
          y += sumLines.length * 3.5;
        }
        doc.setTextColor(0);
        y += 5;
      }

      y += 5;
    }

    if (pdfSections.patientFiles && patientFiles.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.text(`Patient Files (${patientFiles.length})`, 14, y);
      y += 3;

      const fileRows = patientFiles.map((f) => [
        f.file_name,
        formatFileSize(f.file_size),
        f.description || "—",
        format(parseISO(f.created_at), "MMM d, yyyy"),
      ]);

      autoTable(doc, {
        startY: y,
        head: [["File Name", "Size", "Description", "Uploaded"]],
        body: fileRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 37, 36] },
        margin: { left: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (pdfSections.activityLog && activityLog.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.text(`Activity Log (${activityLog.length})`, 14, y);
      y += 3;

      const logRows = activityLog.map((log) => [
        format(parseISO(log.created_at), "MMM d, yyyy HH:mm"),
        log.event_type,
        log.message,
        log.created_by || "—",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Date", "Type", "Message", "By"]],
        body: logRows,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [41, 37, 36] },
        margin: { left: 14 },
        columnStyles: { 2: { cellWidth: 80 } },
      });
    }

    doc.save(`patient-record-${patient.client_name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    toast.success(pdfEncrypt ? "Encrypted PDF exported" : "PDF exported");
    setPdfDialogOpen(false);
  };

  // --- Google Contacts sync ---
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [syncingSingleContact, setSyncingSingleContact] = useState(false);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [googleSyncDialogOpen, setGoogleSyncDialogOpen] = useState(false);
  const [unsyncedPatients, setUnsyncedPatients] = useState<{ id: string; client_name: string; client_email: string; client_phone?: string | null; address?: string | null; date_of_birth?: string | null; notes?: string | null }[]>([]);
  const [syncProgress, setSyncProgress] = useState<Record<string, "pending" | "syncing" | "done" | "error">>({});
  const [loadingUnsynced, setLoadingUnsynced] = useState(false);

  // Check if Google OAuth tokens exist
  useEffect(() => {
    supabase.from("google_oauth_tokens").select("id").limit(1).then(({ data }) => {
      setGoogleConnected(!!data && data.length > 0);
    });
  }, []);

  const connectGoogle = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("google-oauth-start", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || data?.error) throw new Error(data?.error || "Failed to start OAuth");
      window.open(data.url, "_blank", "width=500,height=700");
      const poll = setInterval(async () => {
        const { data: tokens } = await supabase.from("google_oauth_tokens").select("id").limit(1);
        if (tokens && tokens.length > 0) {
          setGoogleConnected(true);
          clearInterval(poll);
          toast.success("Google Contacts connected!");
        }
      }, 3000);
      setTimeout(() => clearInterval(poll), 120000);
    } catch (e: any) {
      toast.error("Failed to connect: " + (e.message || "Unknown error"));
    }
  };

  const syncPatientToGoogle = async (patient: { client_name: string; client_email: string; client_phone?: string | null; address?: string | null; date_of_birth?: string | null; notes?: string | null }, patientId?: string) => {
    const { data, error } = await supabase.functions.invoke("sync-google-contact", {
      body: { mode: "single", patient, patient_id: patientId },
    });
    if (error) throw error;
    return data;
  };

  const openGoogleSyncDialog = async () => {
    setGoogleSyncDialogOpen(true);
    setLoadingUnsynced(true);
    setSyncProgress({});
    try {
      // Pull all real patients (raise default 1000-row limit), then filter
      // client-side for: never synced OR updated since last sync.
      const { data, error } = await supabase
        .from("patients")
        .select("id, client_name, client_email, client_phone, address, date_of_birth, notes, updated_at, google_contact_synced_at")
        .not("client_email", "like", "%@placeholder.local")
        .not("client_email", "like", "%@noemail.co.uk")
        .order("updated_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      const needsSync = (data || []).filter((p: any) => {
        if (!p.google_contact_synced_at) return true;
        if (!p.updated_at) return false;
        return new Date(p.updated_at).getTime() > new Date(p.google_contact_synced_at).getTime();
      });
      setUnsyncedPatients(needsSync);
      const progress: Record<string, "pending"> = {};
      needsSync.forEach(p => { progress[p.id] = "pending"; });
      setSyncProgress(progress);
    } catch (e: any) {
      toast.error("Failed to load unsynced patients");
    }
    setLoadingUnsynced(false);
  };

  const syncAllUnsynced = async () => {
    setSyncingContacts(true);
    const toSync = [...unsyncedPatients];
    for (const patient of toSync) {
      if (syncProgress[patient.id] === "done") continue;
      setSyncProgress(prev => ({ ...prev, [patient.id]: "syncing" }));
      try {
        const result = await syncPatientToGoogle(patient, patient.id);
        setSyncProgress(prev => ({
          ...prev,
          [patient.id]: result?.action === "failed" ? "error" : "done",
        }));
      } catch {
        setSyncProgress(prev => ({ ...prev, [patient.id]: "error" }));
        // Mark as synced in DB even on transport error so it doesn't reappear endlessly
        try {
          await supabase.from("patients").update({ google_contact_synced_at: new Date().toISOString() } as any).eq("id", patient.id);
        } catch {}
      }
      await new Promise(r => setTimeout(r, 200));
    }
    setSyncingContacts(false);
    toast.success("Google Contacts sync complete");
    // Clear ALL from list after a short delay so user sees final state
    setTimeout(() => {
      setUnsyncedPatients([]);
      setSyncProgress({});
    }, 1500);
  };

  const bulkSyncGoogleContacts = async () => {
    setSyncingContacts(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-contact", {
        body: { mode: "bulk" },
      });
      if (error) throw error;
      toast.success(`Google Contacts synced: ${data.created} created, ${data.updated} updated${data.failed > 0 ? `, ${data.failed} failed` : ""}`);
    } catch (e: any) {
      toast.error("Sync failed: " + (e.message || "Unknown error"));
    }
    setSyncingContacts(false);
  };

  const addPatientManually = async () => {
    if (!newPatientName.trim() || !newPatientEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setAddingPatient(true);
    const patientData = {
      client_name: newPatientName.trim(),
      client_email: newPatientEmail.trim().toLowerCase(),
      client_phone: newPatientPhone.trim() || null,
      address: newPatientAddress.trim() || null,
    };
    const { error } = await supabase.from("patients").upsert(patientData, { onConflict: "client_email,client_name", ignoreDuplicates: false });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "A patient with this name and email already exists" : "Failed to add patient");
    } else {
      toast.success("Patient added successfully");
      // Auto-sync to Google Contacts
      syncPatientToGoogle(patientData).catch(() => {});
      setAddPatientOpen(false);
      setNewPatientName("");
      setNewPatientEmail("");
      setNewPatientPhone("");
      setNewPatientAddress("");
      fetchPatients();
    }
    setAddingPatient(false);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      e.target.value = "";
      return;
    }
    setCsvUploading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        setCsvUploading(false);
        e.target.value = "";
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
      const nameIdx = headers.findIndex((h) => h.includes("name"));
      const emailIdx = headers.findIndex((h) => h.includes("email"));
      const phoneIdx = headers.findIndex((h) => h.includes("phone"));
      const addressIdx = headers.findIndex((h) => h.includes("address"));

      if (nameIdx === -1 || emailIdx === -1) {
        toast.error("CSV must have 'name' and 'email' columns");
        setCsvUploading(false);
        e.target.value = "";
        return;
      }

      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        return {
          client_name: cols[nameIdx] || "",
          client_email: (cols[emailIdx] || "").toLowerCase(),
          client_phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          address: addressIdx >= 0 ? cols[addressIdx] || null : null,
        };
      }).filter((r) => r.client_name && r.client_email);

      if (rows.length === 0) {
        toast.error("No valid patient rows found");
        setCsvUploading(false);
        e.target.value = "";
        return;
      }

      const { error } = await supabase.from("patients").upsert(rows, { onConflict: "client_email,client_name", ignoreDuplicates: true });
      if (error) {
        toast.error("Failed to import patients");
      } else {
        toast.success(`${rows.length} patient(s) imported successfully`);
        fetchPatients();
      }
    } catch {
      toast.error("Failed to parse CSV file");
    }
    setCsvUploading(false);
    e.target.value = "";
  };

  // CSV export field definitions — every available patient field
  const EXPORT_FIELDS: { key: string; label: string; get: (p: any) => any }[] = [
    { key: "id", label: "Patient ID", get: (p) => p.id },
    { key: "first_name", label: "First Name", get: (p) => ((p.client_name || "").trim().split(/\s+/)[0] || "") },
    { key: "last_name", label: "Last Name", get: (p) => { const parts = (p.client_name || "").trim().split(/\s+/); parts.shift(); return parts.join(" "); } },
    { key: "full_name", label: "Full Name", get: (p) => p.client_name },
    { key: "client_email", label: "Email", get: (p) => p.client_email },
    { key: "client_phone", label: "Mobile Phone", get: (p) => p.client_phone },
    { key: "address", label: "Address", get: (p) => p.address },
    { key: "date_of_birth", label: "Date of Birth", get: (p) => p.date_of_birth },
    { key: "notes", label: "Notes", get: (p) => p.notes },
    { key: "alert_note", label: "Alert Note", get: (p) => p.alert_note },
    { key: "marketing_email", label: "Marketing Email", get: (p) => p.marketing_email ? "Yes" : "No" },
    { key: "marketing_sms", label: "Marketing SMS", get: (p) => p.marketing_sms ? "Yes" : "No" },
    { key: "marketing_opted_in_at", label: "Marketing Opted In At", get: (p) => p.marketing_opted_in_at },
    { key: "latitude", label: "Latitude", get: (p) => p.latitude },
    { key: "longitude", label: "Longitude", get: (p) => p.longitude },
    { key: "relationship_label", label: "Relationship Label", get: (p) => p.relationship_label },
    { key: "relationship_to_patient_id", label: "Related Patient ID", get: (p) => p.relationship_to_patient_id },
    { key: "deceased", label: "Deceased", get: (p) => p.deceased ? "Yes" : "No" },
    { key: "deceased_at", label: "Deceased At", get: (p) => p.deceased_at },
    { key: "google_contact_synced_at", label: "Google Contact Synced At", get: (p) => p.google_contact_synced_at },
    { key: "created_at", label: "Created At", get: (p) => p.created_at },
    { key: "updated_at", label: "Updated At", get: (p) => p.updated_at },
  ];
  const DEFAULT_EXPORT_FIELDS = ["first_name","last_name","full_name","client_email","client_phone","address","date_of_birth","notes","alert_note","marketing_email","marketing_sms","created_at"];
  const [exportFieldKeys, setExportFieldKeys] = useState<string[]>(DEFAULT_EXPORT_FIELDS);

  const toggleExportField = (key: string) => {
    setExportFieldKeys((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const runPatientCsvExport = async () => {
    if (exportFieldKeys.length === 0) { toast.error("Select at least one field"); return; }
    setExportingCsv(true);
    try {
      const all: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .order("client_name", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) { toast.error("Export failed"); setExportingCsv(false); return; }
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      const chosen = EXPORT_FIELDS.filter((f) => exportFieldKeys.includes(f.key));
      const headers = chosen.map((f) => f.label);
      const esc = (v: any) => {
        if (v === null || v === undefined) return "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n\r]/.test(s) ? `"${s}"` : s;
      };
      const rows = all.map((p) => chosen.map((f) => esc(f.get(p))).join(","));
      const csv = [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `shawscope-patients-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} patient(s)`);
      setExportDialogOpen(false);
    } catch {
      toast.error("Export failed");
    }
    setExportingCsv(false);
  };

  const openConsultFormPicker = () => {
    if (!selectedPatient || selectedPatient.appointments.length === 0) {
      toast.error("No appointments to link a form to");
      return;
    }
    if (selectedPatient.appointments.length === 1) {
      setConsultAptId(selectedPatient.appointments[0].id);
      setConsultTemplateId(selectedPatient.appointments[0].consent_form_template_id);
      setConsultFormOpen(true);
    } else {
      setPickAptForFormOpen(true);
    }
  };

  const findDuplicates = () => {
    // Stricter matching to avoid bogus groups like "Mike" + "Mike Ratsey".
    // A pair is a duplicate when ANY of these are true:
    //   - same real (non-placeholder) email
    //   - same phone (≥10 digits)
    //   - exactly the same normalized full name with ≥2 name tokens
    //     (after stripping punctuation and generic "mum/dad/parent" tokens)
    const norm = (s: string | null | undefined) =>
      (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
    const nameKey = (s: string | null | undefined) => {
      const generic = new Set(["mum", "mom", "dad", "parent", "and", "&", "the"]);
      const tokens = norm(s).split(" ").filter(t => t && !generic.has(t));
      return tokens.length >= 2 ? tokens.sort().join(" ") : "";
    };
    const phoneKey = (s: string | null | undefined) => {
      const d = (s || "").replace(/\D/g, "");
      return d.length >= 10 ? d.slice(-10) : "";
    };
    const emailKey = (s: string | null | undefined) => {
      const e = (s || "").toLowerCase().trim();
      if (!e || e.includes("@placeholder.local") || e.includes("@noemail")) return "";
      return e;
    };

    // Union-find by composite keys
    const parent: number[] = patients.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const union = (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };

    const buckets: Record<string, number[]> = {};
    patients.forEach((p, i) => {
      const keys = [
        `e:${emailKey(p.client_email)}`,
        `p:${phoneKey(p.client_phone)}`,
        `n:${nameKey(p.client_name)}`,
      ].filter(k => k.length > 2);
      for (const k of keys) (buckets[k] ||= []).push(i);
    });
    for (const k of Object.keys(buckets)) {
      const ids = buckets[k];
      for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
    }

    const clusters: Record<number, PatientSummary[]> = {};
    patients.forEach((p, i) => {
      const r = find(i);
      (clusters[r] ||= []).push(p);
    });
    const dismissed = getDismissedDupSignatures();
    const groups = Object.values(clusters)
      .filter(g => g.length > 1)
      .filter(g => !dismissed.has(groupSignature(g)))
      // Most appointments / most recent first inside each group
      .map(g => g.slice().sort((a, b) =>
        (b.appointment_count - a.appointment_count) ||
        ((b.last_appointment || "").localeCompare(a.last_appointment || ""))
      ))
      // Largest, most-active groups first
      .sort((a, b) => b.length - a.length);

    setDuplicateGroups(groups);
    setDupDialogOpen(true);
    if (groups.length === 0) toast.info("No duplicates found");
  };

  // Persistent "not a duplicate" dismissals (per-browser).
  const DUP_DISMISS_KEY = "patients.dismissedDuplicateGroups.v1";
  const groupSignature = (g: PatientSummary[]) =>
    g.map(p => p.id || p.client_email.toLowerCase()).filter(Boolean).sort().join("|");
  const getDismissedDupSignatures = (): Set<string> => {
    try {
      const raw = localStorage.getItem(DUP_DISMISS_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  };
  const dismissDuplicateGroup = (g: PatientSummary[]) => {
    const sig = groupSignature(g);
    if (!sig) return;
    const set = getDismissedDupSignatures();
    set.add(sig);
    try { localStorage.setItem(DUP_DISMISS_KEY, JSON.stringify(Array.from(set))); } catch {}
    setDuplicateGroups(prev => prev.filter(x => x !== g));
  };

  // Pick the "best" record to keep: most appointments → most fields filled → real email
  const pickBestKeepIndex = (group: PatientSummary[]): number => {
    const score = (p: PatientSummary) => {
      const realEmail = !p.client_email.includes("@placeholder.local") && !p.client_email.includes("@noemail");
      const filled = [p.client_phone, p.address, p.date_of_birth, p.alert_note].filter(Boolean).length;
      return p.appointment_count * 100 + filled * 5 + (realEmail ? 3 : 0);
    };
    let best = 0;
    group.forEach((p, i) => { if (score(p) > score(group[best])) best = i; });
    return best;
  };

  const MERGE_FIELDS: { key: keyof PatientSummary; label: string }[] = [
    { key: "client_name", label: "Name" },
    { key: "client_email", label: "Email" },
    { key: "client_phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "date_of_birth", label: "Date of Birth" },
    { key: "alert_note", label: "Alert / Notes" },
  ];

  const beginMerge = (groupIndex: number, keepIndex: number) => {
    const group = duplicateGroups[groupIndex];
    beginMergeForGroup(group, keepIndex, groupIndex);
  };

  const beginMergeForGroup = (group: PatientSummary[], keepIndex: number, groupIndex: number = -1) => {
    const keep = group[keepIndex];
    const others = group.filter((_, i) => i !== keepIndex);

    // Build conflict list: field has ≥2 distinct non-empty values across the group
    const conflicts: { field: keyof PatientSummary; label: string; options: string[] }[] = [];
    for (const { key, label } of MERGE_FIELDS) {
      const vals = Array.from(new Set(
        group.map(p => (p[key] as any) ? String(p[key]).trim() : "").filter(Boolean)
      ));
      // For email, ignore placeholders as conflict candidates
      const cleanVals = key === "client_email"
        ? vals.filter(v => !v.includes("@placeholder.local") && !v.includes("@noemail"))
        : vals;
      if (cleanVals.length > 1) conflicts.push({ field: key, label, options: cleanVals });
    }

    if (conflicts.length === 0) {
      void mergePatients(group, keepIndex, {});
      return;
    }

    // Default choices = the kept record's value if non-empty, else first option
    const choices: Record<string, string> = {};
    for (const c of conflicts) {
      const kv = (keep[c.field] as any) ? String(keep[c.field]).trim() : "";
      choices[c.field as string] = kv && c.options.includes(kv) ? kv : c.options[0];
    }
    setConflictResolver({ groupIndex, keep, others, conflicts, choices });
  };

  const mergePatients = async (
    group: PatientSummary[],
    keepIndex: number,
    overrides: Partial<Record<keyof PatientSummary, string>>
  ) => {
    const keep = group[keepIndex];
    const others = group.filter((_, i) => i !== keepIndex);
    setMergingGroup(keepIndex);

    try {
      // Build the merged field set: explicit override > kept value > first non-empty from any other
      const merged: Record<string, any> = {};
      for (const { key } of MERGE_FIELDS) {
        const ov = overrides[key];
        if (ov !== undefined && ov !== "") {
          merged[key as string] = ov;
          continue;
        }
        const kv = (keep[key] as any) ? String(keep[key]).trim() : "";
        if (kv) { merged[key as string] = kv; continue; }
        const fromOther = others.map(o => (o[key] as any) ? String(o[key]).trim() : "").find(Boolean);
        if (fromOther) merged[key as string] = fromOther;
      }
      // Marketing prefs: OR across the group
      const anyEmail = group.some(p => p.marketing_email);
      const anySms = group.some(p => p.marketing_sms);

      // Skip writing email if final value is a placeholder
      const finalEmail = merged.client_email || keep.client_email;
      const writePayload: any = {
        client_name: merged.client_name || keep.client_name,
        client_phone: merged.client_phone || null,
        address: merged.address || null,
        date_of_birth: merged.date_of_birth || null,
        alert_note: merged.alert_note || null,
        marketing_email: anyEmail,
        marketing_sms: anySms,
      };
      if (finalEmail && !finalEmail.includes("@placeholder.local") && !finalEmail.includes("@noemail")) {
        writePayload.client_email = finalEmail.toLowerCase();
      }

      // 1) Reassign all child rows from each other patient to the kept one
      for (const other of others) {
        if (!other.client_email) continue;
        await supabase
          .from("appointments")
          .update({ client_email: writePayload.client_email || keep.client_email, client_name: writePayload.client_name })
          .eq("client_email", other.client_email);
        await supabase
          .from("patient_files")
          .update({ client_email: writePayload.client_email || keep.client_email })
          .eq("client_email", other.client_email);
      }

      // 2) Update the kept patient with the merged values
      await supabase.from("patients").update(writePayload).eq("id", keep.id);

      // 3) Delete the other patient rows
      for (const other of others) {
        if (other.id) await supabase.from("patients").delete().eq("id", other.id);
      }

      toast.success(`Merged ${others.length} record${others.length === 1 ? "" : "s"} into ${writePayload.client_name}`);
      // Remove this group from the dialog list
      setDuplicateGroups(prev => prev.filter(g => g !== group));
      setConflictResolver(null);
      fetchPatients();
    } catch (e: any) {
      toast.error(e?.message || "Failed to merge patients");
    }
    setMergingGroup(null);
  };

  // ---- Manual link / merge from patient profile ----
  const openLinkPicker = () => {
    setLinkTarget(null);
    setLinkSearch("");
    setLinkResults([]);
    setLinkRelationLabel("");
    setLinkPickerOpen(true);
  };

  useEffect(() => {
    if (!linkPickerOpen) return;
    const q = linkSearch.trim();
    if (q.length < 2) { setLinkResults([]); return; }
    setLinkSearching(true);
    const handle = setTimeout(async () => {
      const safe = q.replace(/[%,()]/g, " ").trim();
      const { data } = await supabase
        .from("patients")
        .select("id, client_name, client_email, client_phone, address, alert_note, marketing_email, marketing_sms, updated_at, created_at, relationship_label, relationship_to_patient_id")
        .or(`client_name.ilike.%${safe}%,client_email.ilike.%${safe}%,client_phone.ilike.%${safe}%`)
        .limit(20);
      const rows = (data || [])
        .filter((p: any) => !selectedPatient || p.id !== selectedPatient.id)
        .map((p: any) => ({
          id: p.id,
          client_name: p.client_name,
          client_email: p.client_email,
          client_phone: p.client_phone,
          address: p.address,
          alert_note: p.alert_note,
          marketing_email: !!p.marketing_email,
          marketing_sms: !!p.marketing_sms,
          last_appointment: null,
          appointment_count: 0,
          appointments: [],
          updated_at: p.updated_at,
          created_at: p.created_at,
          relationship_label: p.relationship_label || null,
          relationship_to_patient_id: p.relationship_to_patient_id || null,
          relationship_to_name: null,
        } as PatientSummary));
      setLinkResults(rows);
      setLinkSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [linkSearch, linkPickerOpen, selectedPatient]);

  const mergeIntoTarget = async () => {
    if (!selectedPatient || !linkTarget) return;
    setLinkBusy(true);
    try {
      // Keep the target (index 0), fold the currently-open patient into it
      const group: PatientSummary[] = [linkTarget, selectedPatient];
      setLinkPickerOpen(false);
      setDetailOpen(false);
      beginMergeForGroup(group, 0, -1);
    } finally {
      setLinkBusy(false);
    }
  };

  const linkAsRelative = async () => {
    if (!selectedPatient?.id || !linkTarget?.id) return;
    if (!linkRelationLabel.trim()) {
      toast.error("Enter a label, e.g. 'Mum', 'Son', 'Partner'");
      return;
    }
    setLinkBusy(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          relationship_label: linkRelationLabel.trim(),
          relationship_to_patient_id: linkTarget.id,
        })
        .eq("id", selectedPatient.id);
      if (error) throw error;
      toast.success(`Linked as ${linkRelationLabel.trim()} of ${linkTarget.client_name}`);
      setSelectedPatient({
        ...selectedPatient,
        relationship_label: linkRelationLabel.trim(),
        relationship_to_patient_id: linkTarget.id,
        relationship_to_name: linkTarget.client_name,
      });
      setLinkPickerOpen(false);
      fetchPatients();
    } catch (e: any) {
      toast.error(e?.message || "Failed to link relative");
    }
    setLinkBusy(false);
  };

  const unlinkRelative = async () => {
    if (!selectedPatient?.id) return;
    setLinkBusy(true);
    try {
      await supabase
        .from("patients")
        .update({ relationship_label: null, relationship_to_patient_id: null })
        .eq("id", selectedPatient.id);
      setSelectedPatient({
        ...selectedPatient,
        relationship_label: null,
        relationship_to_patient_id: null,
        relationship_to_name: null,
      });
      toast.success("Relationship removed");
      fetchPatients();
    } finally {
      setLinkBusy(false);
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h2 className="font-serif text-2xl font-bold text-foreground">Patient Records</h2>
        <p className="text-sm text-muted-foreground mt-1">View, search, and manage all patient records, appointments, and clinical files</p>
      </div>
      <CompliancePanel />
      <Card className="bg-card/60 border-border">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-serif text-white">Patient Records</CardTitle>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              {serverSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
              )}
              {search.trim().length >= 2 && (serverSearchResults.length > 0 || !serverSearching) && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-72 overflow-y-auto">
                  {serverSearchResults.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground text-center">No patients found</p>
                  ) : (
                    serverSearchResults.map((p) => (
                      <button
                        key={p.id || p.client_email}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          openPatientDetail(p);
                          setSearch("");
                          setServerSearchResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border/40 last:border-0"
                      >
                        <p className="text-sm font-medium text-foreground truncate">{p.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.client_email}{p.client_phone ? ` • ${p.client_phone}` : ""}
                        </p>
                        {p.address && (
                          <p className="text-[11px] text-muted-foreground/80 truncate">{p.address}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-auto gap-1 h-9 text-sm">
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="appointments">Most Appointments</SelectItem>
                <SelectItem value="last_visit">Last Visit</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={findDuplicates}>
              <GitMerge className="mr-1 h-4 w-4" /> Duplicates
            </Button>
            <Button size="sm" variant="outline" onClick={fetchBirthdays} disabled={birthdaysLoading}>
              {birthdaysLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Cake className="mr-1 h-4 w-4" />}
              Birthdays
            </Button>
            <Button
              size="sm"
              variant={showDeceased ? "default" : "outline"}
              onClick={() => setShowDeceased((v) => !v)}
              title={showDeceased ? "Hide deceased patients" : "Show deceased patients"}
            >
              {showDeceased ? "Hide" : "Show"} Deceased
            </Button>
            {googleConnected ? (
              <Button size="sm" variant="outline" onClick={openGoogleSyncDialog} disabled={syncingContacts}>
                {syncingContacts ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Phone className="mr-1 h-4 w-4" />}
                <span className="hidden sm:inline">{syncingContacts ? "Syncing..." : "Google Contacts"}</span>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={connectGoogle}>
                <Phone className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Connect Google</span>
              </Button>
            )}
            <Button size="sm" onClick={() => setAddPatientOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => setExportDialogOpen(true)} disabled={exportingCsv}>
              {exportingCsv ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button size="sm" variant="outline" onClick={bulkExportPatientPDFs} disabled={bulkExporting}>
              {bulkExporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileDown className="mr-1 h-4 w-4" />}
              <span className="hidden sm:inline">
                {bulkExporting && bulkExportProgress
                  ? `Exporting ${bulkExportProgress.current}/${bulkExportProgress.total}`
                  : "Bulk PDFs"}
              </span>
            </Button>
            <div>
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">{csvUploading ? "Importing..." : "CSV"}</span>
                </div>
              </Label>
              <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} disabled={csvUploading} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPatients.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No patients found.</p>
          ) : (
            <>
              {/* Mobile tile view */}
              <div className="sm:hidden space-y-2">
                {filteredPatients.map((p) => (
                  <div
                    key={p.client_email}
                    className={cn(
                      "rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between",
                      p.deceased && "opacity-60"
                    )}
                    onClick={() => openPatientDetail(p)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-medium text-sm flex items-center gap-1.5 truncate text-white", p.deceased && "line-through")}>
                        {p.client_name}
                        {p.alert_note && <span title={p.alert_note}><AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" /></span>}
                        {p.deceased && (
                          <Badge variant="outline" className="text-[9px] h-4 border-destructive/40 text-destructive">Deceased</Badge>
                        )}
                        {p.relationship_label && p.relationship_to_name && (
                          <Badge variant="outline" className="text-[9px] h-4 border-amber-500/40 text-amber-300">
                            {p.relationship_label} of {p.relationship_to_name}
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{p.client_email}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/70">
                        <span>{p.appointment_count} appt{p.appointment_count !== 1 ? "s" : ""}</span>
                        <span>Last: {format(parseISO(p.last_appointment), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/70 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Phone</TableHead>
                      <TableHead className="text-muted-foreground">Appointments</TableHead>
                      <TableHead className="text-muted-foreground">Last Visit</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((p) => (
                      <TableRow key={p.client_email} className={cn("cursor-pointer hover:bg-muted/50 border-border", p.deceased && "opacity-60")} onClick={() => openPatientDetail(p)}>
                        <TableCell className={cn("font-medium text-white", p.deceased && "line-through")}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{p.client_name}</span>
                            {p.alert_note && <span title={p.alert_note}><AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" /></span>}
                            {p.deceased && (
                              <Badge variant="outline" className="text-[10px] h-4 border-destructive/40 text-destructive">Deceased</Badge>
                            )}
                            {p.relationship_label && p.relationship_to_name && (
                              <Badge variant="outline" className="text-[10px] h-4 border-amber-500/40 text-amber-300">
                                {p.relationship_label} of {p.relationship_to_name}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.client_email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.client_phone || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="border-border text-muted-foreground">{p.appointment_count}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(parseISO(p.last_appointment), "MMM d, yyyy")}</TableCell>
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground/70" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Birthdays Dialog */}
      <Dialog open={birthdaysOpen} onOpenChange={setBirthdaysOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg flex flex-col p-0 gap-0 overflow-y-auto bg-background text-foreground">
          <DialogHeader className="bg-secondary/10 border-b border-border px-4 py-4">
            <DialogTitle className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
              <Cake className="h-5 w-5 text-secondary" />
              Upcoming Birthdays
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {birthdayPatients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No birthdays on record.</p>
            ) : (
              <div className="space-y-2">
                {/* Mobile tile view */}
                <div className="sm:hidden space-y-2">
                  {birthdayPatients.map((p: any) => (
                    <div
                      key={p.id}
                      className={cn(
                        "rounded-lg border border-border p-3 transition-colors flex gap-3",
                        p.cardSent ? "opacity-60 bg-muted/30" : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={p.cardSent}
                        onCheckedChange={() => toggleBirthdayCardSent(p)}
                        className="mt-1 shrink-0"
                        title={p.cardSent ? "Card sent — click to undo" : "Mark card as sent"}
                      />
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => { setBirthdaysOpen(false); openPatientDetail(p); }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("font-medium text-sm text-white truncate", p.cardSent && "line-through")}>{p.client_name}</p>
                          <Badge className="bg-secondary text-secondary-foreground border-secondary text-[11px] font-semibold h-5 shrink-0">
                            {p.daysUntil === 0 ? "Today" : p.daysUntil === 1 ? "Tomorrow" : `${p.daysUntil} days`}
                          </Badge>
                        </div>
                        {p.address && (
                          <p className={cn("text-xs text-muted-foreground mt-0.5", p.cardSent && "line-through")}>{p.address}</p>
                        )}
                        <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">{p.client_email}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/70">
                          <span>{p.nextBirthdayStr}</span>
                          <span>Turning {p.turningAge}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table view */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground w-10"></TableHead>
                        <TableHead className="text-muted-foreground">Name</TableHead>
                        <TableHead className="text-muted-foreground">Date</TableHead>
                        <TableHead className="text-muted-foreground">Age</TableHead>
                        <TableHead className="text-muted-foreground">In</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {birthdayPatients.map((p: any) => (
                        <TableRow
                          key={p.id}
                          className={cn("border-border", p.cardSent ? "opacity-60" : "hover:bg-muted/50")}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={p.cardSent}
                              onCheckedChange={() => toggleBirthdayCardSent(p)}
                              title={p.cardSent ? "Card sent — click to undo" : "Mark card as sent"}
                            />
                          </TableCell>
                          <TableCell
                            className="font-medium text-white cursor-pointer"
                            onClick={() => { setBirthdaysOpen(false); openPatientDetail(p); }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={cn(p.cardSent && "line-through")}>{p.client_name}</span>
                              {p.alert_note && <span title={p.alert_note}><AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" /></span>}
                            </div>
                            {p.address && (
                              <p className={cn("text-xs text-muted-foreground font-normal mt-0.5", p.cardSent && "line-through")}>{p.address}</p>
                            )}
                            <p className="text-xs text-muted-foreground/80 font-normal">{p.client_email}</p>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.nextBirthdayStr}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.turningAge}</TableCell>
                          <TableCell>
                            <Badge className="bg-secondary text-secondary-foreground border-secondary font-semibold">
                              {p.daysUntil === 0 ? "Today" : p.daysUntil === 1 ? "1 day" : `${p.daysUntil} days`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => {
        if (!open && autoOpenedFromOtherTab) {
          setDetailOpen(false);
          setAutoOpenedFromOtherTab(false);
          onReturnToPreviousTab?.();
        } else {
          setDetailOpen(open);
          if (!open) setAutoOpenedFromOtherTab(false);
        }
      }}>
        <DialogContent className="max-h-[95vh] max-w-md flex flex-col p-0 gap-0 overflow-y-auto bg-background text-foreground">
          {/* Header */}
          <div className="bg-secondary/10 border-b border-border px-4 pb-3 pl-4 pr-20 pt-4 sm:pr-16">
            <div className="flex flex-col gap-3 pr-2 sm:flex-row sm:items-center sm:gap-2 sm:pr-0">
              <Users className="h-5 w-5 text-secondary shrink-0" />
              <div className="flex-1 min-w-0 pr-2 sm:pr-0">
                <h2 className="font-serif text-lg font-bold truncate text-foreground">{selectedPatient?.client_name}</h2>
                {patientDob && (
                  <p className="text-[11px] text-foreground/60">DOB: {format(parseISO(patientDob), "dd MMMM yyyy")}</p>
                )}
              </div>
              <Button size="sm" className="h-8 w-full text-xs px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold sm:w-auto sm:max-w-[calc(100%-2rem)] sm:shrink-0" onClick={() => { setPdfDialogOpen(true); setPdfPassword(""); setPdfEncrypt(false); }}>
                <FileDown className="h-3.5 w-3.5 mr-1" /> Export PDF
              </Button>
            </div>
          </div>
          {selectedPatient && (
            <div className="px-4 py-3 space-y-3">
              {/* Alert Note Banner */}
              {selectedPatient.alert_note && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/15 border border-destructive/30 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-xs font-semibold text-destructive">{selectedPatient.alert_note}</p>
                </div>
              )}

              {/* Medical Summary — derived from latest consent form responses */}
              {(() => {
                const completed = consentResponses
                  .filter((cr: any) => cr.status !== "draft" && cr.responses && typeof cr.responses === "object")
                  .sort((a: any, b: any) => new Date(b.signed_at || b.created_at).getTime() - new Date(a.signed_at || a.created_at).getTime());
                if (completed.length === 0) return null;

                const findLatest = (matcher: RegExp): { value: string; date: string } | null => {
                  for (const cr of completed) {
                    const resp = cr.responses as Record<string, any>;
                    for (const [k, v] of Object.entries(resp)) {
                      if (k.startsWith("__")) continue;
                      if (!matcher.test(k)) continue;
                      if (v === null || v === undefined || v === "") continue;
                      const str = typeof v === "boolean" ? (v ? "Yes" : "No") : String(v).trim();
                      if (!str || /^(none|n\/a|no|nil)$/i.test(str)) continue;
                      return { value: str, date: cr.signed_at || cr.created_at };
                    }
                  }
                  return null;
                };

                const allergies = findLatest(/allerg/i);
                const gp = findLatest(/\bgp\b|surgery|doctor/i);
                const meds = findLatest(/medication|medicines/i);
                const anticoag = findLatest(/anticoag|blood\s*thinn|warfarin|apixaban|rivaroxaban|dabigatran|edoxaban|clopidogrel/i);
                const conditions = findLatest(/medical\s*(history|conditions?)|relevant\s*medical/i);
                const ecName = findLatest(/emergency\s*contact\s*name/i);
                const ecPhone = findLatest(/emergency\s*contact\s*(phone|number|tel)/i);
                const ecRel = findLatest(/relationship\s*to\s*emergency/i);
                const emergency = ecName || ecPhone
                  ? {
                      value: [ecName?.value, ecPhone?.value, ecRel?.value ? `(${ecRel.value})` : null]
                        .filter(Boolean)
                        .join(" · "),
                      date: (ecName || ecPhone)!.date,
                    }
                  : null;

                if (!allergies && !gp && !meds && !anticoag && !conditions && !emergency) return null;

                const Row = ({ icon: Icon, label, data, tone }: { icon: any; label: string; data: { value: string; date: string } | null; tone: "alert" | "info" }) => {
                  if (!data) return null;
                  const isAlert = tone === "alert";
                  return (
                    <div className={cn(
                      "rounded-md border px-2.5 py-1.5",
                      isAlert ? "bg-destructive/10 border-destructive/30" : "bg-blue-500/10 border-blue-500/25"
                    )}>
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("h-3 w-3 shrink-0", isAlert ? "text-destructive" : "text-blue-400")} />
                        <p className={cn("text-[10px] uppercase tracking-wider font-semibold", isAlert ? "text-destructive" : "text-blue-300")}>{label}</p>
                      </div>
                      <p className="text-xs font-medium text-foreground mt-0.5 break-words">{data.value}</p>
                      <p className="text-[9px] text-foreground/40 mt-0.5">From consent {format(new Date(data.date), "dd/MM/yyyy")}</p>
                    </div>
                  );
                };

                return (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <h3 className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Medical Summary (from consent forms)</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <Row icon={AlertTriangle} label="Allergies" data={allergies} tone="alert" />
                      <Row icon={AlertTriangle} label="Anticoagulants" data={anticoag} tone="alert" />
                      <Row icon={AlertTriangle} label="Medical Conditions" data={conditions} tone="alert" />
                      <Row icon={Users} label="GP / Surgery" data={gp} tone="info" />
                      <Row icon={FileText} label="Medications" data={meds} tone="info" />
                      <Row icon={Users} label="Emergency Contact" data={emergency} tone="info" />
                    </div>
                  </div>
                );
              })()}

              {/* Profile Section */}
              <div className="rounded-lg border border-border bg-foreground/5 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] text-foreground/60 uppercase tracking-wider font-semibold">Profile</h3>
                  {!editingProfile ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={selectedPatient.deceased ? "outline" : "ghost"}
                        className={cn(
                          "h-7 text-[10px] px-2.5 font-semibold",
                          selectedPatient.deceased
                            ? "border-success/40 text-success hover:bg-success/10"
                            : "text-destructive hover:bg-destructive/10"
                        )}
                        onClick={toggleDeceased}
                        disabled={markingDeceased}
                      >
                        {markingDeceased
                          ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          : null}
                        {selectedPatient.deceased ? "Restore" : "Mark Deceased"}
                      </Button>
                      <Button size="sm" className="h-7 text-[10px] px-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold" onClick={() => { setEditingProfile(true); setProfileName(selectedPatient.client_name); setProfileEmail(selectedPatient.client_email); setProfilePhone(selectedPatient.client_phone || ""); setProfileAddress(selectedPatient.address || ""); setProfileAlertNote(selectedPatient.alert_note || ""); setProfileDob(patientDob || ""); setProfileMarketingEmail(selectedPatient.marketing_email); setProfileMarketingSms(selectedPatient.marketing_sms); }}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-[10px] px-2.5 bg-success text-white hover:bg-success/80 font-semibold" onClick={saveProfile}>
                        <Save className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-foreground" onClick={() => setEditingProfile(false)}>Cancel</Button>
                    </div>
                  )}
                </div>
                {selectedPatient.deceased && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 px-2.5 py-1.5 text-[11px] text-destructive font-semibold">
                    Marked as deceased{selectedPatient.deceased_at ? ` on ${format(parseISO(selectedPatient.deceased_at), "dd/MM/yyyy")}` : ""}. Archived — excluded from marketing, birthdays and recalls.
                  </div>
                )}
                {editingProfile ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Name</Label>
                      <Input className="h-7 text-xs" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Email</Label>
                      <Input className="h-7 text-xs" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Phone</Label>
                      <Input className="h-7 text-xs" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Date of Birth</Label>
                      <Input className="h-7 text-xs" type="date" value={profileDob} onChange={(e) => setProfileDob(e.target.value)} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-[10px]">Address</Label>
                      <Input className="h-7 text-xs" value={profileAddress} onChange={(e) => setProfileAddress(e.target.value)} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-[10px] flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-destructive" /> Alert Note</Label>
                      <Textarea value={profileAlertNote} onChange={(e) => setProfileAlertNote(e.target.value)} placeholder="e.g. Allergic to latex..." rows={2} className="text-xs" />
                    </div>
                    <div className="col-span-2 flex items-center gap-4 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Switch id="mkt-email" checked={profileMarketingEmail} onCheckedChange={setProfileMarketingEmail} className="scale-75" />
                        <Label htmlFor="mkt-email" className="text-[10px]">Email mkt</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Switch id="mkt-sms" checked={profileMarketingSms} onCheckedChange={setProfileMarketingSms} className="scale-75" />
                        <Label htmlFor="mkt-sms" className="text-[10px]">SMS mkt</Label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      className="rounded-md bg-blue-500/10 border border-blue-500/25 px-2.5 py-1.5 text-left hover:bg-blue-500/20 transition-colors cursor-pointer"
                      onClick={() => { navigator.clipboard.writeText(selectedPatient.client_email); toast.success("Email copied"); }}
                      title="Click to copy email"
                    >
                      <p className="text-[10px] text-foreground/50 flex items-center gap-1">Email <Copy className="h-2.5 w-2.5" /></p>
                      <p className="text-xs font-medium text-foreground truncate">{selectedPatient.client_email}</p>
                    </button>
                    <button
                      className="rounded-md bg-foreground/5 border border-border px-2.5 py-1.5 text-left hover:bg-foreground/10 transition-colors cursor-pointer"
                      onClick={() => { if (selectedPatient.client_phone) { navigator.clipboard.writeText(selectedPatient.client_phone); toast.success("Phone copied"); } }}
                      title="Click to copy phone"
                    >
                      <p className="text-[10px] text-foreground/50 flex items-center gap-1">Phone <Copy className="h-2.5 w-2.5" /></p>
                      <p className="text-xs font-medium text-foreground">{selectedPatient.client_phone || "—"}</p>
                    </button>
                    <button
                      className="rounded-md bg-foreground/5 border border-border px-2.5 py-1.5 text-left hover:bg-foreground/10 transition-colors cursor-pointer"
                      onClick={() => { if (selectedPatient.address) { navigator.clipboard.writeText(selectedPatient.address); toast.success("Address copied"); } }}
                      title="Click to copy address"
                    >
                      <p className="text-[10px] text-foreground/50 flex items-center gap-1">Address <Copy className="h-2.5 w-2.5" /></p>
                      <p className="text-xs font-medium text-foreground truncate">{selectedPatient.address || "—"}</p>
                    </button>
                    <div className="rounded-md bg-foreground/5 border border-border px-2.5 py-1.5">
                      <p className="text-[10px] text-foreground/50">Date of Birth</p>
                      <p className="text-xs font-medium text-foreground">{patientDob ? format(parseISO(patientDob), "dd/MM/yyyy") : "—"}</p>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      {selectedPatient.marketing_email && <Badge variant="outline" className="text-[9px] py-0 bg-success/10 text-success border-success/20">Email ✓</Badge>}
                      {selectedPatient.marketing_sms && <Badge variant="outline" className="text-[9px] py-0 bg-success/10 text-success border-success/20">SMS ✓</Badge>}
                      {!selectedPatient.marketing_email && !selectedPatient.marketing_sms && <span className="text-[10px] text-foreground/50">No marketing consent</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Fitzpatrick Skin Score */}
              {(() => {
                const scoredResponses = consentResponses
                  .filter((cr: any) => {
                    const r = cr.responses as Record<string, any>;
                    return r?.__fitzpatrick_score != null;
                  })
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                if (scoredResponses.length === 0) return null;
                
                const latest = scoredResponses[0].responses as Record<string, any>;
                const score = latest.__fitzpatrick_score;
                const type = latest.__fitzpatrick_type;
                const desc = latest.__fitzpatrick_description;
                const isHighRisk = score >= 21;
                
                return (
                  <div className="rounded-lg border border-border bg-foreground/5 p-3 space-y-2">
                    <h3 className="text-[10px] text-foreground/60 uppercase tracking-wider font-semibold flex items-center gap-1">
                      <Snowflake className="h-3 w-3" /> Fitzpatrick Skin Score
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[56px]",
                        isHighRisk ? "bg-destructive/10 border border-destructive/20" : "bg-success/10 border border-success/20"
                      )}>
                        <span className={cn("text-2xl font-serif font-bold", isHighRisk ? "text-destructive" : "text-success")}>{score}</span>
                        <span className="text-[9px] text-muted-foreground">{type}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{desc}</p>
                        <p className="text-[10px] text-foreground/60 mt-0.5">
                          {isHighRisk ? "⚠ Adjusted freezing protocol required" : "✓ Standard protocol"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Last assessed: {format(parseISO(scoredResponses[0].created_at), "MMM d, yyyy")}
                          {scoredResponses.length > 1 && ` (${scoredResponses.length} assessments)`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons Row */}
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs flex-1 bg-secondary text-white hover:bg-secondary/80 font-semibold" onClick={openConsultFormPicker}>
                  <ClipboardList className="mr-1 h-3.5 w-3.5" /> Consultation
                </Button>
                <Button size="sm" className="h-8 text-xs bg-emerald-600 text-white hover:bg-emerald-700 font-semibold" disabled={syncingSingleContact} onClick={async () => {
                  setSyncingSingleContact(true);
                  try {
                    const patientRecord = patients.find(p => p.client_email === selectedPatient.client_email);
                    const result = await syncPatientToGoogle({
                      client_name: selectedPatient.client_name,
                      client_email: selectedPatient.client_email,
                      client_phone: selectedPatient.client_phone,
                      address: selectedPatient.address,
                      date_of_birth: patientRecord ? (patientRecord as any).date_of_birth : null,
                    });
                    if (result.skipped) toast.info("Skipped (placeholder email)");
                    else toast.success(`Contact ${result.action} in Google`);
                  } catch (e: any) { toast.error("Sync failed"); }
                  setSyncingSingleContact(false);
                }}>
                  {syncingSingleContact ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Phone className="mr-1 h-3.5 w-3.5" />} Sync
                </Button>
              </div>

              {/* Suggested booking duration based on past timed appointments */}
              {(() => {
                const timedSecs = selectedPatient.appointments
                  .map(a => aptTimings[a.id]?.duration_seconds)
                  .filter((s): s is number => typeof s === "number" && s > 0);
                if (timedSecs.length === 0) return null;
                const avgMin = Math.round(timedSecs.reduce((a, b) => a + b, 0) / timedSecs.length / 60);
                const lastMin = Math.round((timedSecs[0] || 0) / 60);
                const suggested = Math.max(15, Math.ceil(avgMin / 5) * 5);
                return (
                  <div className="flex items-center gap-2 rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-2 text-[11px] text-foreground">
                    <Timer className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span>
                      <span className="font-semibold">Suggested booking duration:</span> ~{suggested} min
                      <span className="text-foreground/60"> · avg {avgMin}m across {timedSecs.length} timed {timedSecs.length === 1 ? "visit" : "visits"} (last {lastMin}m)</span>
                    </span>
                  </div>
                );
              })()}

              {/* Book Next Appointment */}
              <BookNextAppointment
                clientName={selectedPatient.client_name}
                clientEmail={selectedPatient.client_email}
                clientPhone={selectedPatient.client_phone}
                address={selectedPatient.address}
                postcode={selectedPatient.address?.match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/i)?.[0] || null}
                currentServiceId={selectedPatient.appointments?.[0]?.service_id || null}
                currentServiceName={selectedPatient.appointments?.[0]?.service_id ? getServiceName(selectedPatient.appointments[0].service_id) : null}
                onBooked={() => fetchPatients()}
              />

              {/* ===== COLLAPSIBLE SECTIONS ===== */}

              {/* Appointments — open if has upcoming/pending */}
              {(() => {
                const hasActive = selectedPatient.appointments.some(a => 
                  a.status === 'confirmed' || a.status === 'pending' || a.status === 'requested'
                );
                return (
                  <Collapsible defaultOpen={hasActive}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-border bg-foreground/5 px-3 py-2.5 hover:bg-foreground/10 transition-colors">
                      <CalendarDays className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span className="text-[11px] text-foreground font-semibold uppercase tracking-wider flex-1 text-left">
                        Appointments ({selectedPatient.appointment_count})
                      </span>
                      {hasActive && <span className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                      <ChevronRight className="h-3.5 w-3.5 text-foreground/40 transition-transform [[data-state=open]>&]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1">
                      {selectedPatient.appointments.map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between rounded-lg border border-border bg-foreground/5 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                              <span className="truncate">{getServiceName(apt.service_id)}</span>
                              {apt.media_consent && (
                                <span title="Media consent — patient happy to be photographed/filmed (share before posting)" className="inline-flex shrink-0"><Camera className="h-3 w-3 text-secondary" /></span>
                              )}
                              {(() => {
                                const dictGranted = apt.dictation_consent !== false;
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={(e) => e.stopPropagation()}
                                        title={dictGranted ? "Dictation consent granted — click to change" : "Dictation declined — click to change"}
                                        className={cn("inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[9px] font-bold text-white", dictGranted ? "bg-purple-600" : "bg-red-600")}
                                      >
                                        {dictGranted ? <Mic className="h-2.5 w-2.5" /> : <MicOff className="h-2.5 w-2.5" />}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-60 p-2 space-y-2" align="start" onClick={(e) => e.stopPropagation()}>
                                      <p className="text-xs text-muted-foreground">
                                        {dictGranted
                                          ? "🎙️ Patient has consented to audio dictation for clinical notes."
                                          : "🔇 Patient has declined audio dictation. Do not record this appointment."}
                                      </p>
                                      <Button
                                        size="sm"
                                        variant={dictGranted ? "destructive" : "default"}
                                        className="w-full text-xs h-8"
                                        onClick={async () => {
                                          const { error } = await supabase.from("appointments").update({ dictation_consent: !dictGranted }).eq("id", apt.id);
                                          if (error) { toast.error("Failed to update"); return; }
                                          toast.success(dictGranted ? "Marked as no dictation consent" : "Dictation consent restored");
                                          fetchPatients();
                                        }}
                                      >
                                        {dictGranted ? <><MicOff className="h-3.5 w-3.5 mr-1" /> Mark as Not Granted</> : <><Mic className="h-3.5 w-3.5 mr-1" /> Restore Consent</>}
                                      </Button>
                                    </PopoverContent>
                                  </Popover>
                                );
                              })()}
                            </p>
                            <p className="text-[10px] text-foreground/50">
                              {format(parseISO(apt.appointment_date), "MMM d, yy")} {apt.appointment_time.slice(0, 5)}
                              {apt.price != null && ` · £${Number(apt.price).toFixed(2)}`}
                              {(() => {
                                const secs = aptTimings[apt.id]?.duration_seconds;
                                if (typeof secs !== "number" || secs <= 0) return null;
                                const m = Math.floor(secs / 60);
                                const s = secs % 60;
                                return (
                                  <span className="ml-1 inline-flex items-center gap-0.5 text-secondary" title="Actual recorded appointment duration">
                                    · <Timer className="h-2.5 w-2.5" />{m}m{s ? ` ${s}s` : ""}
                                  </span>
                                );
                              })()}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Consultation" onClick={() => { setConsultNoteAptId(apt.id); setConsultNoteServiceName(getServiceName(apt.service_id)); setConsultNoteClientName(selectedPatient?.client_name); setConsultNoteOpen(true); }}>
                              <Stethoscope className={cn("h-3 w-3", consultNotes[apt.id] ? "text-success" : "text-muted-foreground")} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Consent" onClick={() => { setConsultAptId(apt.id); setConsultTemplateId(apt.consent_form_template_id); setConsultFormOpen(true); }}>
                              <ClipboardList className="h-3 w-3 text-secondary" />
                            </Button>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", statusColors[apt.status])}>{apt.status}</Badge>
                            {/* Actions menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {apt.status !== "cancelled" && (
                                  <DropdownMenuItem
                                    className="text-xs text-amber-500"
                                    onClick={async () => {
                                      if (!confirm("Cancel this appointment?")) return;
                                      const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", apt.id);
                                      if (error) { toast.error("Failed to cancel"); return; }
                                      // Cancel scheduled comms
                                      await supabase.from("scheduled_communications").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("appointment_id", apt.id).eq("status", "pending");
                                      toast.success("Appointment cancelled");
                                      if (selectedPatient) {
                                        const updatedApts = selectedPatient.appointments.map(a => a.id === apt.id ? { ...a, status: "cancelled" } : a);
                                        setSelectedPatient({ ...selectedPatient, appointments: updatedApts });
                                      }
                                      fetchPatients();
                                    }}
                                  >
                                    <CalendarX className="h-3.5 w-3.5 mr-2" /> Cancel Appointment
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-xs text-destructive"
                                  onClick={async () => {
                                    if (!confirm("Permanently delete this appointment? This cannot be undone.")) return;
                                    // Delete related records first
                                    await supabase.from("scheduled_communications").delete().eq("appointment_id", apt.id);
                                    await supabase.from("appointment_payments").delete().eq("appointment_id", apt.id);
                                    await supabase.from("appointment_timings").delete().eq("appointment_id", apt.id);
                                    await supabase.from("consultation_notes").delete().eq("appointment_id", apt.id);
                                    await supabase.from("consent_form_responses").delete().eq("appointment_id", apt.id);
                                    const { error } = await supabase.from("appointments").delete().eq("id", apt.id);
                                    if (error) { toast.error("Failed to delete"); return; }
                                    toast.success("Appointment deleted");
                                    if (selectedPatient) {
                                      const updatedApts = selectedPatient.appointments.filter(a => a.id !== apt.id);
                                      setSelectedPatient({ ...selectedPatient, appointments: updatedApts, appointment_count: updatedApts.length });
                                    }
                                    fetchPatients();
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Appointment
                                </DropdownMenuItem>
                                {apt.status !== "cancelled" && apt.status !== "completed" && (
                                  <DropdownMenuItem
                                    className="text-xs text-blue-400"
                                    onClick={() => {
                                      // Open the BookNextAppointment with pre-fill context — scroll to it
                                      toast.info(`To rearrange, cancel this appointment then book a new one using the 'Book Next Appointment' button below.`);
                                    }}
                                  >
                                    <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Rearrange
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })()}

              {/* Pending Consent Forms — open if has pending */}
              {(() => {
                const completedAptIds = new Set(consentResponses.filter(cr => cr.status !== "draft").map(cr => cr.appointment_id));
                const pendingForms = selectedPatient.appointments.filter(
                  apt => apt.consent_sent_at && apt.consent_form_template_id && !completedAptIds.has(apt.id) && apt.status !== 'cancelled' && apt.status !== 'rejected'
                );
                return (
                  <Collapsible defaultOpen={pendingForms.length > 0}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-border bg-foreground/5 px-3 py-2.5 hover:bg-foreground/10 transition-colors">
                      <Send className="h-3.5 w-3.5 text-warning shrink-0" />
                      <span className="text-[11px] text-foreground font-semibold uppercase tracking-wider flex-1 text-left">
                        Pending Consent ({pendingForms.length})
                      </span>
                      {pendingForms.length > 0 && <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
                      <ChevronRight className="h-3.5 w-3.5 text-foreground/40 transition-transform [[data-state=open]>&]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1">
                      <div className="flex justify-end mb-1">
                        <Button size="sm" className="h-7 text-[10px] bg-secondary text-white hover:bg-secondary/80 font-semibold" onClick={() => { setSendConsentOpen(true); setSendConsentAptId(""); setSendConsentTemplateId(""); }}>
                          <Send className="h-3 w-3 mr-1" /> Send Form
                        </Button>
                      </div>
                      {pendingForms.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground text-center py-2">No pending consent forms.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {pendingForms.map(apt => {
                            const templateName = consentTemplates.find(t => t.id === apt.consent_form_template_id)?.title || "Consent Form";
                            return (
                              <div key={apt.id} className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-foreground">{templateName}</p>
                                  <p className="text-[10px] text-foreground/50">
                                    {getServiceName(apt.service_id)} · {format(parseISO(apt.appointment_date), "MMM d, yy")}
                                    {apt.consent_sent_at && ` · Sent ${format(parseISO(apt.consent_sent_at), "MMM d")}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={async () => {
                                    setSendingConsent(true);
                                    try {
                                      const { data, error } = await supabase.functions.invoke("send-form-email", {
                                        body: { appointmentId: apt.id, recipientEmail: selectedPatient.client_email, templateName },
                                      });
                                      if (error) throw error;
                                      await supabase.from("appointments").update({ consent_sent_at: new Date().toISOString() }).eq("id", apt.id);
                                      toast.success("Consent form resent");
                                    } catch (e) { toast.error("Failed to resend"); }
                                    setSendingConsent(false);
                                  }}>
                                    <RefreshCw className="h-3 w-3 mr-1" /> Resend
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Pending Form?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will clear the consent form link for this appointment.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={async () => {
                                            await supabase.from("appointments").update({ consent_sent_at: null, consent_form_template_id: null }).eq("id", apt.id);
                                            toast.success("Pending form removed");
                                            if (selectedPatient) {
                                              const updatedApts = selectedPatient.appointments.map(a => 
                                                a.id === apt.id ? { ...a, consent_sent_at: null, consent_form_template_id: null } : a
                                              );
                                              setSelectedPatient({ ...selectedPatient, appointments: updatedApts });
                                            }
                                          }}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })()}

              {/* Send Consent Form Dialog */}
              <Dialog open={sendConsentOpen} onOpenChange={setSendConsentOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-base">Send Consent Form</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Appointment <span className="text-muted-foreground">(optional)</span></Label>
                      <Select value={sendConsentAptId} onValueChange={setSendConsentAptId}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="No appointment (standalone)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs italic text-muted-foreground">No appointment (standalone)</SelectItem>
                          {selectedPatient.appointments
                            .filter(a => a.status !== 'cancelled' && a.status !== 'rejected')
                            .map(a => (
                              <SelectItem key={a.id} value={a.id} className="text-xs">
                                {getServiceName(a.service_id)} — {format(parseISO(a.appointment_date), "MMM d, yy")} {a.appointment_time.slice(0, 5)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Consent Form Template</Label>
                      <Select value={sendConsentTemplateId} onValueChange={setSendConsentTemplateId}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {consentTemplates.map(t => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full bg-secondary text-white hover:bg-secondary/80 font-semibold"
                      size="sm"
                      disabled={!sendConsentTemplateId || sendingConsent}
                      onClick={async () => {
                        setSendingConsent(true);
                        try {
                          let aptId = sendConsentAptId;
                          if (!aptId || aptId === "__none__") {
                            const today = new Date().toISOString().split("T")[0];
                            const { data: newApt, error: createErr } = await supabase
                              .from("appointments")
                              .insert({
                                client_name: selectedPatient.client_name,
                                client_email: selectedPatient.client_email,
                                client_phone: selectedPatient.client_phone || null,
                                address: selectedPatient.address || null,
                                appointment_date: today,
                                appointment_time: "00:00",
                                status: "form_only",
                                consent_form_template_id: sendConsentTemplateId,
                                consent_sent_at: new Date().toISOString(),
                                notes: "Standalone form — no appointment",
                              })
                              .select("id, access_token")
                              .single();
                            if (createErr) throw createErr;
                            aptId = newApt.id;
                          } else {
                            await supabase.from("appointments").update({
                              consent_form_template_id: sendConsentTemplateId,
                              consent_sent_at: new Date().toISOString(),
                            }).eq("id", aptId);
                          }
                          const templateName = consentTemplates.find(t => t.id === sendConsentTemplateId)?.title || "Consent Form";
                          const { error } = await supabase.functions.invoke("send-form-email", {
                            body: { appointmentId: aptId, recipientEmail: selectedPatient.client_email, templateName },
                          });
                          if (error) throw error;
                          toast.success("Consent form sent to patient");
                          setSendConsentOpen(false);
                          if (sendConsentAptId && sendConsentAptId !== "__none__") {
                            const updatedApts = selectedPatient.appointments.map(a =>
                              a.id === sendConsentAptId ? { ...a, consent_form_template_id: sendConsentTemplateId, consent_sent_at: new Date().toISOString() } : a
                            );
                            setSelectedPatient({ ...selectedPatient, appointments: updatedApts });
                          } else {
                            const { data: freshApts } = await supabase
                              .from("appointments")
                              .select("id, appointment_date, appointment_time, status, service_id, notes, price, consent_form_template_id, consent_sent_at, access_token, dictation_consent, created_at")
                              .eq("client_email", selectedPatient.client_email)
                              .order("appointment_date", { ascending: false });
                            if (freshApts) {
                              setSelectedPatient({ ...selectedPatient, appointments: freshApts, appointment_count: freshApts.length });
                            }
                          }
                        } catch (e: any) {
                          console.error("Consent form send error:", e);
                          toast.error(e?.message || "Failed to send consent form");
                        }
                        setSendingConsent(false);
                      }}
                    >
                      {sendingConsent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Send to {selectedPatient.client_name.split(" ")[0]}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Draft Forms — open if has drafts */}
              {(() => {
                const drafts = consentResponses.filter((cr: any) => cr.status === "draft");
                return drafts.length > 0 ? (
                  <Collapsible defaultOpen={true}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2.5 hover:bg-secondary/10 transition-colors">
                      <Save className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span className="text-[11px] text-foreground font-semibold uppercase tracking-wider flex-1 text-left">
                        Draft Forms ({drafts.length})
                      </span>
                      <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                      <ChevronRight className="h-3.5 w-3.5 text-foreground/40 transition-transform [[data-state=open]>&]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1">
                      {drafts.map((cr) => (
                        <div key={cr.id} className="flex items-center justify-between rounded-lg border border-secondary/30 bg-secondary/5 p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{cr.template_title}</p>
                            <p className="text-xs text-foreground/50">Draft saved {format(parseISO(cr.created_at), "MMM d, yyyy")}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" className="bg-secondary text-white hover:bg-secondary/80 font-semibold" onClick={() => {
                              setConsultAptId(cr.appointment_id);
                              setConsultTemplateId(cr.consent_form_template_id);
                              setConsultDraftId(cr.id);
                              setConsultFormOpen(true);
                            }}>
                              <Pencil className="h-3 w-3 mr-1" /> Resume
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete the draft "{cr.template_title}" form.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                                    const { error } = await supabase.from("consent_form_responses").delete().eq("id", cr.id);
                                    if (error) { toast.error("Failed to delete draft"); return; }
                                    toast.success("Draft deleted");
                                    setConsentResponses(prev => prev.filter(r => r.id !== cr.id));
                                  }}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ) : null;
              })()}

              {/* Completed Forms — closed by default */}
              {(() => {
                const completed = consentResponses.filter((cr: any) => cr.status !== "draft" && cr.template_form_type !== "consultation");
                return (
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-border bg-foreground/5 px-3 py-2.5 hover:bg-foreground/10 transition-colors">
                      <FileText className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span className="text-[11px] text-foreground font-semibold uppercase tracking-wider flex-1 text-left">
                        Completed Forms ({completed.length})
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-foreground/40 transition-transform [[data-state=open]>&]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1">
                      {completed.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground text-center py-2">No completed forms.</p>
                      ) : (
                        completed.map((cr) => (
                          <div key={cr.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-foreground/5 p-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">{cr.template_title}</p>
                              <p className="text-xs text-foreground/50">
                                Completed {format(parseISO(cr.created_at), "MMM d, yyyy")}
                                {cr.signed_at && ` · Signed ${format(parseISO(cr.signed_at), "MMM d, yyyy")}`}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" onClick={() => setViewingResponse(cr)}>View</Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Completed Form?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete the "{cr.template_title}" form response.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                                      const { error } = await supabase.from("consent_form_responses").delete().eq("id", cr.id);
                                      if (error) { toast.error("Failed to delete form"); return; }
                                      toast.success("Form deleted");
                                      setConsentResponses(prev => prev.filter(r => r.id !== cr.id));
                                    }}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })()}

              {/* Consultation Notes — closed by default */}
              {(() => {
                const consultFormResponses = consentResponses.filter((cr: any) => cr.status !== "draft" && cr.template_form_type === "consultation");
                const totalCount = Object.keys(consultNotes).length + consultFormResponses.length;
                return (
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-border bg-foreground/5 px-3 py-2.5 hover:bg-foreground/10 transition-colors">
                  <Stethoscope className="h-3.5 w-3.5 text-secondary shrink-0" />
                  <span className="text-[11px] text-foreground font-semibold uppercase tracking-wider flex-1 text-left">
                    Consultation Notes ({totalCount})
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-foreground/40 transition-transform [[data-state=open]>&]:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1">
                  {totalCount === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-2">No consultation notes.</p>
                  ) : (
                    <>
                    {/* Consultation form responses */}
                    {consultFormResponses.map((cr: any) => {
                      const apt = selectedPatient?.appointments.find(a => a.id === cr.appointment_id);
                      return (
                        <div key={cr.id} className="rounded-lg border border-border bg-foreground/5 p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">{cr.template_title}</p>
                              <p className="text-xs text-foreground/50">
                                {apt ? format(parseISO(apt.appointment_date), "MMM d, yyyy") : format(parseISO(cr.created_at), "MMM d, yyyy")}
                                {cr.submitter_name ? ` · ${cr.submitter_name}` : ""}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" onClick={() => setViewingResponse(cr)}>View</Button>
                              <Button size="sm" className="bg-secondary text-white hover:bg-secondary/80 font-semibold" onClick={() => {
                                setConsultAptId(cr.appointment_id);
                                setConsultTemplateId(cr.consent_form_template_id);
                                setConsultDraftId(cr.id);
                                setConsultFormOpen(true);
                              }}>Edit</Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Consultation Record?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete the "{cr.template_title}" consultation record.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                                      const { error } = await supabase.from("consent_form_responses").delete().eq("id", cr.id);
                                      if (error) { toast.error("Failed to delete consultation"); return; }
                                      toast.success("Consultation deleted");
                                      setConsentResponses(prev => prev.filter(r => r.id !== cr.id));
                                    }}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {Object.entries(consultNotes).map(([aptId, note]: [string, any]) => {
                      const apt = selectedPatient?.appointments.find(a => a.id === aptId);
                      return (
                        <div key={aptId} className="rounded-lg border border-border bg-foreground/5 p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">{getServiceName(apt?.service_id || null)}</p>
                              <p className="text-xs text-foreground/50">
                                {apt ? format(parseISO(apt.appointment_date), "MMM d, yyyy") : ""} · {note.completed_by || "—"}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" className="bg-secondary text-white hover:bg-secondary/80 font-semibold" onClick={() => { setConsultNoteAptId(aptId); setConsultNoteServiceName(getServiceName(apt?.service_id || null)); setConsultNoteClientName(selectedPatient?.client_name); setConsultNoteOpen(true); }}>Edit</Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Consultation Note?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete the consultation note for this appointment.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                                      const { error } = await supabase.from("consultation_notes").delete().eq("appointment_id", aptId);
                                      if (error) { toast.error("Failed to delete note"); return; }
                                      toast.success("Consultation note deleted");
                                      setConsultNotes(prev => {
                                        const next = { ...prev };
                                        delete next[aptId];
                                        return next;
                                      });
                                    }}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-foreground">
                            {note.other_notes && <div className="col-span-2"><span className="text-foreground/50">Other Notes:</span> {note.other_notes}</div>}
                            {note.presenting_complaint && <div className="col-span-2"><span className="text-foreground/50">Presenting Complaint:</span> {note.presenting_complaint}</div>}
                            {note.medical_history && <div><span className="text-foreground/50">Medical History:</span> {note.medical_history}</div>}
                            {note.current_medications && <div><span className="text-foreground/50">Medications:</span> {note.current_medications}</div>}
                            {note.allergies && <div><span className="text-foreground/50">Allergies:</span> {note.allergies}</div>}
                            {note.examination_findings && <div className="col-span-2"><span className="text-foreground/50">Examination:</span> {note.examination_findings}</div>}
                            {note.procedure_performed && <div><span className="text-foreground/50">Procedure:</span> {note.procedure_performed}</div>}
                            {note.equipment_used && <div><span className="text-foreground/50">Equipment:</span> {note.equipment_used?.replace(/\s*\[kit:[^\]]*\]/, '')}</div>}
                            {note.procedure_notes && <div className="col-span-2"><span className="text-foreground/50">Procedure Notes:</span> {note.procedure_notes}</div>}
                            {note.outcome && <div><span className="text-foreground/50">Outcome:</span> {note.outcome}</div>}
                            {note.complications && <div><span className="text-foreground/50">Complications:</span> {note.complications}</div>}
                            {note.aftercare_advice && <div className="col-span-2"><span className="text-foreground/50">Aftercare:</span> {note.aftercare_advice}</div>}
                            {note.follow_up_notes && <div className="col-span-2"><span className="text-foreground/50">Follow-up Notes:</span> {note.follow_up_notes}</div>}
                            <div className="col-span-2 flex gap-3 mt-1 flex-wrap">
                              {note.verbal_consent_gained && <Badge variant="outline" className="text-xs text-foreground">Verbal consent</Badge>}
                              {note.written_consent_gained && <Badge variant="outline" className="text-xs text-foreground">Written consent</Badge>}
                              {note.risks_explained && <Badge variant="outline" className="text-xs text-foreground">Risks explained</Badge>}
                              {note.follow_up_required && <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">Follow-up needed</Badge>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>
                );
              })()}

              {/* Clinical Observations — closed by default */}
              {(() => {
                const allObs: { obs: NEWSObservation; date: string; formTitle: string }[] = [];
                for (const cr of consentResponses) {
                  const r = cr.responses as Record<string, any>;
                  if (r?.__newsObservations && Array.isArray(r.__newsObservations)) {
                    for (const obs of r.__newsObservations as NEWSObservation[]) {
                      allObs.push({ obs, date: cr.created_at, formTitle: cr.template_title || "Consultation" });
                    }
                  }
                }
                for (const [aptId, note] of Object.entries(consultNotes)) {
                  if (note && (note as any).news_observations && Array.isArray((note as any).news_observations)) {
                    for (const obs of (note as any).news_observations as NEWSObservation[]) {
                      allObs.push({ obs, date: (note as any).created_at || obs.timestamp, formTitle: "Consultation Note" });
                    }
                  }
                }
                allObs.sort((a, b) => new Date(b.obs.timestamp).getTime() - new Date(a.obs.timestamp).getTime());
                const recentObs = allObs.slice(0, 5);

                return recentObs.length > 0 ? (
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-border bg-foreground/5 px-3 py-2.5 hover:bg-foreground/10 transition-colors">
                      <Activity className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span className="text-[11px] text-foreground font-semibold uppercase tracking-wider flex-1 text-left">
                        Clinical Observations ({allObs.length})
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-foreground/40 transition-transform [[data-state=open]>&]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-2">
                      {/* Chart */}
                      {allObs.length >= 2 && (() => {
                        const chartData = [...allObs]
                          .sort((a, b) => new Date(a.obs.timestamp).getTime() - new Date(b.obs.timestamp).getTime())
                          .map(item => ({
                            date: format(new Date(item.obs.timestamp), "dd/MM/yy"),
                            time: format(new Date(item.obs.timestamp), "HH:mm"),
                            NEWS: item.obs.score,
                            RR: item.obs.respirationRate ? Number(item.obs.respirationRate) : null,
                            SpO2: item.obs.spo2 ? Number(item.obs.spo2) : null,
                            Systolic: item.obs.systolicBP ? Number(item.obs.systolicBP) : null,
                            Diastolic: item.obs.diastolicBP ? Number(item.obs.diastolicBP) : null,
                            HR: item.obs.pulse ? Number(item.obs.pulse) : null,
                            Temp: item.obs.temperature ? Number(item.obs.temperature) : null,
                          }));
                        const BPVerticalBars = (props: any) => {
                          const { formattedGraphicalItems, xAxisMap, yAxisMap } = props;
                          if (!formattedGraphicalItems || !xAxisMap || !yAxisMap) return null;
                          const xAxis = Object.values(xAxisMap)[0] as any;
                          const yAxis = Object.values(yAxisMap)[0] as any;
                          if (!xAxis?.scale || !yAxis?.scale) return null;
                          return (
                            <g>
                              {chartData.map((d, i) => {
                                if (d.Systolic == null || d.Diastolic == null) return null;
                                const x = xAxis.scale(i) + (xAxis.bandSize ? xAxis.bandSize / 2 : 0);
                                const ySys = yAxis.scale(d.Systolic);
                                const yDia = yAxis.scale(d.Diastolic);
                                if (isNaN(x) || isNaN(ySys) || isNaN(yDia)) return null;
                                return <line key={`bp-v-${i}`} x1={x} y1={ySys} x2={x} y2={yDia} stroke="#f97316" strokeWidth={2} strokeLinecap="round" />;
                              })}
                            </g>
                          );
                        };
                        return (
                          <div className="rounded-md border bg-card p-2">
                            <p className="text-[10px] text-muted-foreground mb-1 font-medium">Trend over time</p>
                            <div className="h-[180px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                                  <XAxis dataKey="date" tick={{ fontSize: 9 }} className="fill-muted-foreground" />
                                  <YAxis tick={{ fontSize: 9 }} className="fill-muted-foreground" />
                                  <RechartsTooltip
                                    contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: 'hsl(var(--border))' }}
                                    labelFormatter={(label, payload) => {
                                      const item = payload?.[0]?.payload;
                                      return item ? `${label} ${item.time}` : label;
                                    }}
                                  />
                                  <Line type="monotone" dataKey="NEWS" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} name="NEWS Score" connectNulls />
                                  <Line type="monotone" dataKey="HR" stroke="hsl(var(--secondary-foreground))" strokeWidth={1.5} dot={{ r: 2 }} name="Heart Rate" connectNulls />
                                  <Line type="monotone" dataKey="RR" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={{ r: 2 }} name="Resp Rate" connectNulls />
                                  <Line type="monotone" dataKey="SpO2" stroke="#22c55e" strokeWidth={1.5} dot={{ r: 2 }} name="SpO₂ %" connectNulls />
                                  <Line type="monotone" dataKey="Systolic" stroke="#f97316" strokeWidth={0} dot={{ r: 3, fill: "#f97316" }} name="Systolic BP" connectNulls={false} />
                                  <Line type="monotone" dataKey="Diastolic" stroke="#f97316" strokeWidth={0} dot={{ r: 3, fill: "#f97316", strokeDasharray: "" }} name="Diastolic BP" connectNulls={false} />
                                  <Line type="monotone" dataKey="Temp" stroke="#8b5cf6" strokeWidth={1.5} dot={{ r: 2 }} name="Temp °C" connectNulls />
                                  <Customized component={BPVerticalBars} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="space-y-1.5">
                        {recentObs.map((item, i) => {
                          const bpStr = item.obs.systolicBP ? (item.obs.diastolicBP ? `${item.obs.systolicBP}/${item.obs.diastolicBP}` : item.obs.systolicBP) : "";
                          return (
                            <div key={i} className={`rounded-md border p-2 ${getScoreColor(item.obs.score)}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium">{format(new Date(item.obs.timestamp), "dd/MM/yy HH:mm")} — {item.formTitle}</span>
                                <span className="text-xs font-bold">NEWS {item.obs.score}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                                {item.obs.respirationRate && <span>RR: {item.obs.respirationRate}</span>}
                                {item.obs.spo2 && <span>SpO₂: {item.obs.spo2}%</span>}
                                {bpStr && <span>BP: {bpStr}</span>}
                                {item.obs.pulse && <span>HR: {item.obs.pulse}</span>}
                                {item.obs.temperature && <span>Temp: {item.obs.temperature}°C</span>}
                                <span>O₂: {item.obs.airOrOxygen === "oxygen" ? "Supp" : "Air"}</span>
                                <span>ACVPU: {item.obs.consciousness === "alert" ? "A" : "CVPU"}</span>
                              </div>
                              {item.obs.gpReferred && <p className="text-[10px] font-medium mt-0.5">✓ GP referral advised</p>}
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : null;
              })()}

              {/* Hearing Screenings — closed by default */}
              {hearingScreenings.length > 0 && (
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-border bg-foreground/5 px-3 py-2.5 hover:bg-foreground/10 transition-colors">
                    <Activity className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span className="text-[11px] text-foreground font-semibold uppercase tracking-wider flex-1 text-left">
                      Hearing Screenings ({hearingScreenings.length})
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-foreground/40 transition-transform [[data-state=open]>&]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1">
                    {hearingScreenings.map((s: any) => (
                      <div key={s.id} className="rounded-lg border border-border bg-foreground/5 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-foreground">{format(parseISO(s.created_at), "MMM d, yyyy HH:mm")}</p>
                          <Badge variant="outline" className={cn("text-[9px]",
                            s.overall_recommendation === "pass" ? "text-success border-success/30" :
                            s.overall_recommendation === "refer" ? "text-destructive border-destructive/30" :
                            "text-warning border-warning/30"
                          )}>{(s.overall_recommendation || "—").replace('_', ' ')}</Badge>
                        </div>
                        <div className="flex gap-4 text-[10px] text-foreground/70">
                          <span>L: {(s.left_classification || '—').replace('_', ' ')}</span>
                          <span>R: {(s.right_classification || '—').replace('_', ' ')}</span>
                        </div>
                        {s.clinical_summary && <p className="text-[10px] text-foreground/60 mt-1 line-clamp-2">{s.clinical_summary}</p>}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Booking Agreements — closed by default */}
              {(() => {
                const agreements = [
                  ...activityLog.filter(l => l.event_type === "policy_agreement" || l.event_type === "marketing_consent"),
                  ...selectedPatient.appointments.map(apt => ({
                    id: `dictation-${apt.id}`,
                    event_type: "dictation_consent" as const,
                    message: apt.dictation_consent === false
                      ? `Audio dictation declined — ${getServiceName(apt.service_id)} on ${format(parseISO(apt.appointment_date), "dd/MM/yyyy")}`
                      : `Audio dictation consent granted — ${getServiceName(apt.service_id)} on ${format(parseISO(apt.appointment_date), "dd/MM/yyyy")}`,
                    created_at: apt.created_at,
                  })),
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                if (agreements.length === 0) return null;
                return (
                  <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-border bg-foreground/5 px-3 py-2.5 hover:bg-foreground/10 transition-colors">
                      <ScrollText className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span className="text-[11px] text-foreground font-semibold uppercase tracking-wider flex-1 text-left">
                        Booking Agreements ({agreements.length})
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-foreground/40 transition-transform [[data-state=open]>&]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1 max-h-[180px] overflow-y-auto">
                      {agreements.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs bg-foreground/5 border border-border">
                          <span className="text-foreground/50 whitespace-nowrap mt-0.5">
                            {format(parseISO(log.created_at), "dd/MM/yy HH:mm")}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px] shrink-0 mt-0.5",
                            log.event_type === "dictation_consent"
                              ? (log.message.includes("declined") ? "border-red-400/40 text-red-400" : "border-purple-400/40 text-purple-400")
                              : "border-secondary/30 text-secondary"
                          )}>
                            {log.event_type === "policy_agreement" ? "agreement" : log.event_type === "marketing_consent" ? "consent" : "dictation"}
                          </Badge>
                          <span className="text-foreground">{log.message}</span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })()}

              {/* Files — closed by default */}
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-border bg-foreground/5 px-3 py-2.5 hover:bg-foreground/10 transition-colors">
                  <Paperclip className="h-3.5 w-3.5 text-secondary shrink-0" />
                  <span className="text-[11px] text-foreground font-semibold uppercase tracking-wider flex-1 text-left">
                    Files ({patientFiles.length})
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-foreground/40 transition-transform [[data-state=open]>&]:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-2">
                  <div className="rounded-lg border border-dashed p-3 space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Link to appointment (optional)</Label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                        value={selectedAptIdForUpload || ""}
                        onChange={(e) => setSelectedAptIdForUpload(e.target.value || null)}
                      >
                        <option value="">General (no specific appointment)</option>
                        {selectedPatient.appointments.map((apt) => (
                          <option key={apt.id} value={apt.id}>
                            {format(parseISO(apt.appointment_date), "MMM d, yyyy")} — {getServiceName(apt.service_id)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description (optional)</Label>
                      <Input value={fileDesc} onChange={(e) => setFileDesc(e.target.value)} placeholder="e.g. Clinical photo, referral letter..." maxLength={200} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex items-center justify-center gap-2 rounded-md bg-secondary text-white px-4 py-2 text-sm font-semibold hover:bg-secondary/80 transition-colors">
                          <Upload className="h-4 w-4" />
                          {uploading ? "Uploading..." : "Upload File"}
                        </div>
                      </Label>
                      <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </div>
                  </div>

                  {patientFiles.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground py-2 text-center">No files uploaded yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {patientFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between rounded-lg border border-border bg-foreground/5 p-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{file.file_name}</p>
                            <p className="text-[10px] text-foreground/50">
                              {formatFileSize(file.file_size)} · {format(parseISO(file.created_at), "MMM d, yyyy")}
                              {file.description && ` · ${file.description}`}
                            </p>
                          </div>
                          <div className="flex gap-0.5 ml-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => viewFile(file)} title="View">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadFile(file)} title="Download">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteFile(file)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Activity Log — closed by default */}
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-border bg-foreground/5 px-3 py-2.5 hover:bg-foreground/10 transition-colors">
                  <Activity className="h-3.5 w-3.5 text-secondary shrink-0" />
                  <span className="text-[11px] text-foreground font-semibold uppercase tracking-wider flex-1 text-left">
                    Notes & Activity ({activityLog.filter(l => l.event_type !== "policy_agreement" && l.event_type !== "marketing_consent").length})
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-foreground/40 transition-transform [[data-state=open]>&]:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      className="text-sm"
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addManualNote()}
                    />
                    <Button size="sm" className="bg-secondary text-white hover:bg-secondary/80" onClick={addManualNote} disabled={addingNote || !newNote.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {(() => {
                    const filtered = activityLog.filter(l => l.event_type !== "policy_agreement" && l.event_type !== "marketing_consent");
                    return filtered.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground py-2 text-center">No activity recorded yet.</p>
                    ) : (
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {filtered.map((log) => (
                          <div key={log.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50">
                            <span className="text-muted-foreground whitespace-nowrap mt-0.5">
                              {format(parseISO(log.created_at), "dd/MM/yy HH:mm")}
                            </span>
                            <Badge variant="outline" className={cn("text-[10px] shrink-0 mt-0.5", 
                              log.event_type === "note" ? "border-primary/30 text-primary" :
                              log.event_type === "booking" ? "border-success/30 text-success" :
                              log.event_type === "cancelled" ? "border-destructive/30 text-destructive" :
                              log.event_type === "rescheduled" ? "border-warning/30 text-warning" :
                              "border-secondary/30 text-secondary"
                            )}>
                              {log.event_type}
                            </Badge>
                            <span className="text-foreground">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CollapsibleContent>
              </Collapsible>

              {/* Delete Patient Record */}
              <div className="pt-4 mt-4 border-t border-destructive/20">
                {/* Link / Merge */}
                <div className="mb-3 rounded-md border border-border bg-card/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-secondary" />
                    Link with another patient
                  </p>
                  {selectedPatient.relationship_label && selectedPatient.relationship_to_name ? (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">
                        Linked as <span className="text-foreground font-medium">{selectedPatient.relationship_label}</span> of <span className="text-foreground font-medium">{selectedPatient.relationship_to_name}</span>
                      </span>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={unlinkRelative} disabled={linkBusy}>
                        Unlink
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Merge this record into another, or link them as a relative (e.g. Mum, Son, Partner).</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={openLinkPicker}>
                      <GitMerge className="h-3.5 w-3.5 mr-1" />
                      Merge / Link…
                    </Button>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full font-semibold" disabled={deleting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleting ? "Deleting..." : "Delete Patient Record"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Patient Record</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedPatient.client_name}'s patient record, files, and activity log. Appointment history will be preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deletePatient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pick Appointment for Form Dialog */}
      <Dialog open={pickAptForFormOpen} onOpenChange={setPickAptForFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Select Appointment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Choose which appointment to link the consultation form to:</p>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {selectedPatient?.appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setConsultAptId(apt.id);
                  setConsultTemplateId(apt.consent_form_template_id);
                  setPickAptForFormOpen(false);
                  setConsultFormOpen(true);
                }}
              >
                <div>
                  <p className="text-sm font-medium">{getServiceName(apt.service_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(apt.appointment_date), "MMM d, yyyy")} at {apt.appointment_time.slice(0, 5)}
                  </p>
                </div>
                <Badge variant="outline" className={cn("text-xs", statusColors[apt.status])}>{apt.status}</Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Response Dialog */}
      <Dialog open={!!viewingResponse} onOpenChange={(open) => !open && setViewingResponse(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">{viewingResponse?.template_title}</DialogTitle>
          </DialogHeader>
          {viewingResponse && (
            <ViewConsentResponseContent response={viewingResponse} patientName={selectedPatient?.client_name} />
          )}
        </DialogContent>
      </Dialog>

      {/* Consultation Form Dialog */}
      <ConsultationFormDialog
        open={consultFormOpen}
        onOpenChange={(open) => { setConsultFormOpen(open); if (!open) setConsultDraftId(null); }}
        appointmentId={consultAptId}
        preselectedTemplateId={consultTemplateId}
        formType="consultation"
        draftResponseId={consultDraftId}
        onComplete={() => {
          if (selectedPatient) openPatientDetail(selectedPatient);
        }}
      />

      {/* Consultation Note Dialog */}
      <ConsultationNoteDialog
        open={consultNoteOpen}
        onOpenChange={setConsultNoteOpen}
        appointmentId={consultNoteAptId}
        serviceName={consultNoteServiceName}
        clientName={consultNoteClientName}
        onComplete={() => {
          if (selectedPatient) openPatientDetail(selectedPatient);
        }}
      />

      {/* Refer Patient Dialog */}

      {/* Manual Link / Merge Picker */}
      <Dialog open={linkPickerOpen} onOpenChange={setLinkPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Link2 className="h-5 w-5 text-secondary" />
              Merge or Link Patient
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Search for the patient to merge <span className="font-medium text-foreground">{selectedPatient?.client_name}</span> into, or link them as a relative of.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search by name, email or phone…"
                value={linkSearch}
                onChange={(e) => { setLinkSearch(e.target.value); setLinkTarget(null); }}
                className="pl-9"
              />
              {linkSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {linkTarget ? (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{linkTarget.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{linkTarget.client_email}</p>
                    {linkTarget.client_phone && <p className="text-xs text-muted-foreground">{linkTarget.client_phone}</p>}
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setLinkTarget(null)}>
                    Change
                  </Button>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={mergeIntoTarget}
                    disabled={linkBusy}
                  >
                    <GitMerge className="h-4 w-4 mr-1" />
                    Merge {selectedPatient?.client_name} into this record
                  </Button>

                  <div className="rounded-md border border-border p-2 space-y-2">
                    <Label className="text-xs">Or link as relative</Label>
                    <Input
                      placeholder="Relationship label (e.g. Mum, Son, Partner)"
                      value={linkRelationLabel}
                      onChange={(e) => setLinkRelationLabel(e.target.value)}
                      maxLength={40}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={linkAsRelative}
                      disabled={linkBusy || !linkRelationLabel.trim()}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Link as {linkRelationLabel.trim() || "relative"} of {linkTarget.client_name}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                {linkResults.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                    {linkSearch.trim().length < 2 ? "Type at least 2 characters to search." : (linkSearching ? "Searching…" : "No patients found.")}
                  </p>
                ) : (
                  linkResults.map((p) => (
                    <button
                      key={p.id || p.client_email}
                      type="button"
                      onClick={() => setLinkTarget(p)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border/40 last:border-0"
                    >
                      <p className="text-sm font-medium text-foreground truncate">{p.client_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.client_email}{p.client_phone ? ` • ${p.client_phone}` : ""}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Patient Dialog */}
      <Dialog open={addPatientOpen} onOpenChange={setAddPatientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary" />
              Add New Patient
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} placeholder="e.g. John Smith" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={newPatientEmail} onChange={(e) => setNewPatientEmail(e.target.value)} placeholder="e.g. john@example.com" maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={newPatientPhone} onChange={(e) => setNewPatientPhone(e.target.value)} placeholder="e.g. 07700 900000" maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={newPatientAddress} onChange={(e) => setNewPatientAddress(e.target.value)} placeholder="e.g. 123 High Street, Dorchester" maxLength={500} />
            </div>
            <Button onClick={addPatientManually} className="w-full" disabled={addingPatient}>
              {addingPatient ? "Adding..." : "Add Patient"}
            </Button>
          </div>
          <div className="rounded-lg border bg-muted/50 p-3 mt-2">
            <p className="text-xs text-muted-foreground">
              <strong>CSV Upload:</strong> To bulk import patients, use the CSV button. Your file should have columns: <code className="bg-muted px-1 rounded">name, email, phone, address</code> (name &amp; email are required).
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Viewer Dialog */}
      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="font-serif text-sm truncate flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              {viewingFile?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4 overflow-auto max-h-[75vh]">
            {viewingFile && viewingFile.type?.startsWith('image/') || viewingFile?.name.match(/\.(png|jpg|jpeg|webp|gif)$/i) ? (
              <img src={viewingFile?.url} alt={viewingFile?.name} className="w-full h-auto rounded-lg" />
            ) : viewingFile?.name.toLowerCase().endsWith('.pdf') || viewingFile?.type === 'application/pdf' ? (
              <iframe src={viewingFile?.url} className="w-full h-[70vh] rounded-lg border" title={viewingFile?.name} />
            ) : (
              <div className="text-center py-8 space-y-3">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
                <Button onClick={() => { if (viewingFile) window.open(viewingFile.url, '_blank'); }}>
                  <Download className="h-4 w-4 mr-2" /> Open in New Tab
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Detection Dialog */}
      <Dialog open={dupDialogOpen} onOpenChange={setDupDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-secondary" />
              Duplicate Patients ({duplicateGroups.length} group{duplicateGroups.length !== 1 ? "s" : ""})
            </DialogTitle>
          </DialogHeader>
          {duplicateGroups.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No potential duplicates found. All patients are unique.</p>
          ) : (
            <div className="space-y-6">
              <p className="text-xs text-muted-foreground">
                Pick <span className="font-semibold text-foreground">Merge into this</span> on the record you want to keep — all other records in the group will be folded into it (appointments, files, phone, address, DOB, alert notes). If two records have different values for the same field, we'll ask you which to keep before merging. Use <span className="font-semibold text-foreground">Not duplicates</span> to dismiss a group.
              </p>
              {duplicateGroups.map((group, gi) => {
                const best = pickBestKeepIndex(group);
                return (
                  <div key={gi} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold">Possible duplicate ({group.length} records)</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={mergingGroup !== null}
                          onClick={() => beginMerge(gi, best)}
                        >
                          Smart merge
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={mergingGroup !== null}
                          onClick={() => dismissDuplicateGroup(group)}
                        >
                          Not duplicates
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {group.map((p, pi) => (
                        <div key={p.id || p.client_email} className={`flex items-center justify-between gap-3 rounded-md border p-3 ${pi === best ? "bg-primary/5 border-primary/40" : "bg-card"}`}>
                          <div className="space-y-0.5 text-sm min-w-0">
                            <p className="font-medium truncate flex items-center gap-2">
                              {p.client_name}
                              {pi === best && <span className="text-[10px] uppercase tracking-wide bg-primary/20 text-primary px-1.5 py-0.5 rounded">Best</span>}
                            </p>
                            <p className="text-muted-foreground text-xs truncate">{p.client_email}</p>
                            <p className="text-muted-foreground text-xs">{p.client_phone || "No phone"} · {p.appointment_count} appt{p.appointment_count !== 1 ? "s" : ""}{p.date_of_birth ? ` · DOB ${p.date_of_birth}` : ""}</p>
                            {p.address && <p className="text-xs text-muted-foreground truncate">{p.address}</p>}
                          </div>
                          <Button
                            size="sm"
                            variant={pi === best ? "default" : "outline"}
                            disabled={mergingGroup !== null}
                            onClick={() => beginMerge(gi, pi)}
                          >
                            {mergingGroup === pi ? "Merging..." : "Merge into this"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Field conflict resolver */}
      <Dialog open={!!conflictResolver} onOpenChange={(o) => !o && setConflictResolver(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Resolve differences</DialogTitle>
          </DialogHeader>
          {conflictResolver && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                These records have different values. Pick which value to keep for <span className="font-semibold text-foreground">{conflictResolver.keep.client_name}</span>.
              </p>
              {conflictResolver.conflicts.map(c => (
                <div key={String(c.field)} className="space-y-1">
                  <p className="text-sm font-medium">{c.label}</p>
                  <div className="grid gap-1">
                    {c.options.map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm rounded-md border p-2 cursor-pointer hover:bg-muted/40">
                        <input
                          type="radio"
                          name={`conflict-${String(c.field)}`}
                          checked={conflictResolver.choices[String(c.field)] === opt}
                          onChange={() => setConflictResolver(cr => cr ? { ...cr, choices: { ...cr.choices, [String(c.field)]: opt } } : cr)}
                        />
                        <span className="truncate">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setConflictResolver(null)} disabled={mergingGroup !== null}>Cancel</Button>
                <Button
                  disabled={mergingGroup !== null}
                  onClick={() => {
                    if (!conflictResolver) return;
                    const group = duplicateGroups[conflictResolver.groupIndex];
                    const keepIndex = group.indexOf(conflictResolver.keep);
                    void mergePatients(group, keepIndex, conflictResolver.choices as any);
                  }}
                >
                  {mergingGroup !== null ? "Merging..." : "Merge records"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CSV Export Options Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Export Patients CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Select fields to include:</Label>
              <div className="flex gap-2 mt-1">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setExportFieldKeys(EXPORT_FIELDS.map((f) => f.key))}>Select All</Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setExportFieldKeys([])}>Deselect All</Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setExportFieldKeys(DEFAULT_EXPORT_FIELDS)}>Defaults</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {EXPORT_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer rounded-md border p-2 hover:bg-muted/50 transition-colors">
                  <Checkbox checked={exportFieldKeys.includes(f.key)} onCheckedChange={() => toggleExportField(f.key)} />
                  <span className="text-sm">{f.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
              <Button onClick={runPatientCsvExport} disabled={exportingCsv || exportFieldKeys.length === 0}>
                {exportingCsv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export CSV
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Export Options Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Export Patient PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Select sections to include:</Label>
              <div className="flex gap-2 mt-1">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => selectAllSections(true)}>Select All</Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => selectAllSections(false)}>Deselect All</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {([
                ["contactInfo", "Contact Information"],
                ["alertNotes", "Alert / Private Notes"],
                ["marketingPrefs", "Marketing Preferences"],
                ["appointments", "Appointment History"],
                ["consentForms", "Completed Consent Forms"],
                ["consultationNotes", "Consultation Notes"],
                ["clinicalObservations", "Clinical Observations & Graph"],
                ["hearingScreenings", "Hearing Screenings"],
                ["patientFiles", "Patient Files List"],
                ["activityLog", "Activity Log"],
              ] as [keyof typeof pdfSections, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer rounded-md border p-2 hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={pdfSections[key]}
                    onCheckedChange={() => togglePdfSection(key)}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={pdfEncrypt}
                  onCheckedChange={(checked) => setPdfEncrypt(!!checked)}
                />
                <span className="text-sm font-medium">Password protect this PDF</span>
              </label>
              {pdfEncrypt && (
                <div className="space-y-1 pl-6">
                  <Label htmlFor="pdf-password" className="text-xs text-muted-foreground">
                    Enter a password (share this separately with the patient)
                  </Label>
                  <Input
                    id="pdf-password"
                    type="password"
                    placeholder="Enter password..."
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={exportPatientPDF}
                disabled={pdfEncrypt && !pdfPassword.trim()}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {pdfEncrypt ? "Export Encrypted PDF" : "Export PDF"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Contacts Sync Dialog */}
      <Dialog open={googleSyncDialogOpen} onOpenChange={setGoogleSyncDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Google Contacts Sync
            </DialogTitle>
          </DialogHeader>
          
          {loadingUnsynced ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading unsynced patients...</span>
            </div>
          ) : unsyncedPatients.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">All patients are synced to Google Contacts!</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  {unsyncedPatients.length} patient{unsyncedPatients.length !== 1 ? "s" : ""} not yet synced
                </p>
                <Button
                  size="sm"
                  onClick={syncAllUnsynced}
                  disabled={syncingContacts || Object.values(syncProgress).every(s => s === "done")}
                >
                  {syncingContacts ? (
                    <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Syncing...</>
                  ) : (
                    <><RefreshCw className="mr-1 h-4 w-4" /> Sync All</>
                  )}
                </Button>
              </div>
              
              {/* Progress summary */}
              {Object.values(syncProgress).some(s => s !== "pending") && (
                <div className="flex gap-3 text-xs mb-2">
                  <span className="text-green-600">✓ {Object.values(syncProgress).filter(s => s === "done").length} synced</span>
                  {Object.values(syncProgress).some(s => s === "error") && (
                    <span className="text-destructive">✗ {Object.values(syncProgress).filter(s => s === "error").length} failed</span>
                  )}
                  {Object.values(syncProgress).some(s => s === "pending") && (
                    <span className="text-muted-foreground">{Object.values(syncProgress).filter(s => s === "pending").length} remaining</span>
                  )}
                </div>
              )}
              
              <div className="overflow-y-auto flex-1 space-y-1 pr-1">
                {unsyncedPatients.map(patient => {
                  const status = syncProgress[patient.id] || "pending";
                  return (
                    <div
                      key={patient.id}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
                        status === "done" && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                        status === "syncing" && "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
                        status === "error" && "bg-destructive/5 border-destructive/20"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{patient.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{patient.client_email}</p>
                      </div>
                      <div className="ml-2 shrink-0">
                        {status === "pending" && (
                          <span className="text-xs text-muted-foreground">Waiting</span>
                        )}
                        {status === "syncing" && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {status === "done" && (
                          <span className="text-green-600 text-xs font-medium">✓ Synced</span>
                        )}
                        {status === "error" && (
                          <span className="text-destructive text-xs font-medium">✗ Failed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PatientsTab;
