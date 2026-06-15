import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { offlineMutation } from "@/lib/offlineMutation";
import { addMonths, format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { FileText, Save, Trash2, Camera, ImagePlus, X, Sparkles, Loader2, PenLine, ShieldCheck, UserCheck, CalendarClock, Mail, Phone, Mic, Ear, History, ChevronDown, ChevronUp, ClipboardList, BrainCircuit, Upload, Stethoscope, Package, Minus, Plus } from "lucide-react";
import { StableInput, StableTextarea } from "@/components/StableFormFields";
import NEWSScorePanel, { type NEWSObservation } from "./NEWSScorePanel";
import BookNextAppointment from "./BookNextAppointment";
import HearingScreeningDialog from "./HearingScreening/HearingScreeningDialog";

// Map AI-dictated form labels to consultation_notes columns (best-effort, case-insensitive substring match)
const mapDictateToConsultationNote = (filled: Record<string, string>) => {
  const out: Record<string, string | boolean> = {};
  const lc = (s: string) => s.toLowerCase();
  const findVal = (...needles: string[]) => {
    for (const [k, v] of Object.entries(filled)) {
      const kk = lc(k);
      if (needles.every((n) => kk.includes(n))) return v;
    }
    return undefined;
  };
  const findBool = (...needles: string[]) => {
    const v = findVal(...needles);
    if (v == null) return undefined;
    const s = String(v).toLowerCase().trim();
    return s === "yes" || s === "true" || s === "y" || s === "1";
  };

  const text: Record<string, string | undefined> = {
    presenting_complaint: findVal("presenting") || findVal("complaint"),
    medical_history: findVal("medical", "history"),
    current_medications: findVal("medication"),
    allergies: findVal("allerg"),
    examination_findings: findVal("examination") || findVal("finding"),
    procedure_performed: findVal("procedure", "performed"),
    procedure_notes: findVal("procedure", "note"),
    equipment_used: findVal("equipment"),
    outcome: findVal("outcome") || findVal("result"),
    complications: findVal("complication"),
    aftercare_advice: findVal("aftercare"),
    follow_up_notes: findVal("follow") && (findVal("follow", "up") as string | undefined),
    other_notes: findVal("other", "note") || findVal("comment"),
  };
  for (const [k, v] of Object.entries(text)) {
    if (v && String(v).trim()) out[k] = String(v).trim();
  }
  const followUp = findBool("follow", "up");
  if (followUp !== undefined) out.follow_up_required = followUp;
  else if (text.follow_up_notes) out.follow_up_required = true;

  const verbal = findBool("verbal", "consent");
  const written = findBool("written", "consent");
  const risks = findBool("risk");
  const understood = findBool("understood") ?? findBool("understanding");
  if (verbal !== undefined) out.verbal_consent_gained = verbal;
  if (written !== undefined) out.written_consent_gained = written;
  if (risks !== undefined) out.risks_explained = risks;
  if (understood !== undefined) out.patient_understood = understood;
  return out;
};

// Persist (insert or update) a consultation_notes row from an AI dictation/upload result
const persistDictatedConsultationNote = async (
  appointmentId: string,
  filledFields: Record<string, string>,
  summary: string,
  rawTranscript: string | undefined,
  source: "HEIDI" | "HEIDI (uploaded recording)" = "HEIDI",
) => {
  try {
    const mapped = mapDictateToConsultationNote(filledFields);
    const parts: string[] = [];
    if (rawTranscript) parts.push((source.includes("uploaded") ? "Uploaded recording transcript" : "Full dictation transcript") + ":\n" + rawTranscript);
    if (summary) parts.push("AI clinical summary:\n" + summary);
    const aiPrefill = parts.join("\n\n") || null;

    const { data: existing } = await supabase
      .from("consultation_notes")
      .select("id, ai_prefill_summary")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (existing?.id) {
      const merged = aiPrefill
        ? (existing.ai_prefill_summary ? existing.ai_prefill_summary + "\n\n---\n\n" + aiPrefill : aiPrefill)
        : existing.ai_prefill_summary;
      await supabase
        .from("consultation_notes")
        .update({ ...mapped, ai_prefill_summary: merged, completed_by: source } as any)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("consultation_notes")
        .insert({ appointment_id: appointmentId, ...mapped, ai_prefill_summary: aiPrefill, completed_by: source } as any);
    }
  } catch (e) {
    console.error("Failed to persist dictated consultation note", e);
  }
};

const PhotoThumbnails = ({ photos, fieldLabel, onRemove }: { photos: string[]; fieldLabel: string; onRemove: (label: string, i: number) => void }) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const load = async () => {
      const result: Record<string, string> = {};
      for (const path of photos) {
        const { data } = await supabase.storage.from("shawscope").createSignedUrl(path, 3600);
        if (data?.signedUrl) result[path] = data.signedUrl;
      }
      setUrls(result);
    };
    load();
  }, [photos]);
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((path, i) => (
        <div key={path} className="relative group w-20 h-20 rounded-md overflow-hidden border">
          {urls[path] ? (
            <img src={urls[path]} alt={`${fieldLabel} ${i + 1}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted animate-pulse" />
          )}
          <button
            type="button"
            onClick={() => onRemove(fieldLabel, i)}
            className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

// Full-screen signature pad component
const SignaturePad = ({ open, onClose, onSave, title }: { open: boolean; onClose: () => void; onSave: (dataUrl: string) => void; title: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [open]);

  const getPoint = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => { e.preventDefault(); isDrawing.current = true; lastPoint.current = getPoint(e); };
  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing.current || !lastPoint.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const point = getPoint(e);
    ctx.beginPath(); ctx.moveTo(lastPoint.current.x, lastPoint.current.y); ctx.lineTo(point.x, point.y); ctx.stroke();
    lastPoint.current = point;
  };
  const endDraw = () => { isDrawing.current = false; lastPoint.current = null; };
  const clearCanvas = () => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (ctx) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); } };
  const saveSignature = () => { if (!canvasRef.current) return; onSave(canvasRef.current.toDataURL("image/png")); onClose(); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
      </div>
      <div className="flex-1 p-4 flex flex-col">
        <p className="text-sm text-muted-foreground mb-3">Please sign below using your finger or stylus</p>
        <div className="flex-1 border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full cursor-crosshair touch-none"
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        </div>
      </div>
      <div className="flex gap-3 p-4 border-t">
        <Button variant="outline" onClick={clearCanvas} className="flex-1">Clear</Button>
        <Button onClick={saveSignature} className="flex-1"><Save className="h-4 w-4 mr-2" /> Save Signature</Button>
      </div>
    </div>
  );
};

interface ConsentTemplate {
  id: string;
  title: string;
  description: string | null;
  fields: any[];
  is_active: boolean;
}

interface ConsultationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  preselectedTemplateId?: string | null;
  formType?: 'consent' | 'consultation';
  draftResponseId?: string | null;
  onComplete?: () => void;
}

const AddTodoFromConsultation = ({ patientId, patientName, patientEmail, appointmentId }: { patientId: string; patientName: string; patientEmail: string; appointmentId: string }) => {
  const [todoOpen, setTodoOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    const { error } = await supabase.from('admin_todos' as any).insert({
      title: title.trim(),
      patient_id: patientId,
      patient_name: patientName,
      patient_email: patientEmail,
      appointment_id: appointmentId,
      due_date: dueDate || null,
      priority: 1,
    } as any);
    setSaving(false);
    if (error) { toast.error('Failed to add todo'); return; }
    toast.success('Todo added');
    setTitle(''); setDueDate(''); setTodoOpen(false);
  };

  if (!todoOpen) {
    return (
      <Button variant="outline" size="sm" className="w-full bg-amber-950/30 border-amber-700 text-amber-200 hover:bg-amber-950/50" onClick={() => setTodoOpen(true)}>
        <ClipboardList className="h-4 w-4 mr-2" /> Add Todo for {patientName}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-amber-400 flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> Add Todo</p>
      <input
        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        placeholder="What needs to be done?"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <input
        type="date"
        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={save} disabled={saving}>
          {saving ? 'Adding...' : 'Add Todo'}
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setTodoOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
};

const ConsultationFormDialog = ({
  open,
  onOpenChange,
  appointmentId,
  preselectedTemplateId,
  formType,
  draftResponseId,
  onComplete,
}: ConsultationFormDialogProps) => {
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(preselectedTemplateId || null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [existingDraftId, setExistingDraftId] = useState<string | null>(draftResponseId || null);

  // AI prefill & consent state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const [hasSignedConsent, setHasSignedConsent] = useState(false);

  // Signature pad states
  const [showPatientSigPad, setShowPatientSigPad] = useState(false);
  const [showPractitionerSigPad, setShowPractitionerSigPad] = useState(false);
  const [showDictate, setShowDictate] = useState(false);
  const [showUploadRecording, setShowUploadRecording] = useState(false);
  const [patientSignature, setPatientSignature] = useState<string | null>(null);
  const [practitionerSignature, setPractitionerSignature] = useState<string | null>(null);

  // NEWS observations
  const [newsObservations, setNewsObservations] = useState<NEWSObservation[]>([]);

  // Verbal consent
  const [verbalConsent, setVerbalConsent] = useState(false);
  const [verbalConsentWitness, setVerbalConsentWitness] = useState("");
  const [risksExplained, setRisksExplained] = useState(false);
  const [patientUnderstood, setPatientUnderstood] = useState(false);
  const [writtenConsent, setWrittenConsent] = useState(false);

  // Recall state
  const [recallWanted, setRecallWanted] = useState<boolean | null>(null);
  const [recallMonths, setRecallMonths] = useState(6);
  const [recallEmail, setRecallEmail] = useState("");
  const [recallPhone, setRecallPhone] = useState("");
  const [recallServiceName, setRecallServiceName] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  // Hearing screening
  const [hearingScreenOpen, setHearingScreenOpen] = useState(false);
  // Appointment history
  const [appointmentHistory, setAppointmentHistory] = useState<any[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historySummary, setHistorySummary] = useState<string | null>(null);
  const [historySummarizing, setHistorySummarizing] = useState(false);
  // Appointment details for booking next appointment
  const [aptDetails, setAptDetails] = useState<{ clientName: string; clientEmail: string; clientPhone: string | null; address: string | null; postcode: string | null; serviceId: string | null; serviceName: string | null } | null>(null);
  const [followUpBookedId, setFollowUpBookedId] = useState<string | null>(null);
  
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const hasUnsavedData = Object.keys(responses).some(k => !k.startsWith("__") && k !== "Date" && responses[k]);

  // Consultation entry mode: choose form vs Heidi upload
  const [consultMode, setConsultMode] = useState<'choose' | 'form' | 'astari'>('choose');
  const [astariNotes, setAstariNotes] = useState("");
  const [astariProcessing, setAstariProcessing] = useState(false);
  const [patientDobDisplay, setPatientDobDisplay] = useState<string | null>(null);

  // AI Diagnosis state
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [aiDiagnosisNotes, setAiDiagnosisNotes] = useState("");
  const [aiDiagnosisImages, setAiDiagnosisImages] = useState<{ data: string; name: string }[]>([]);
  const [aiDiagnosing, setAiDiagnosing] = useState(false);
  const [aiDiagnosisResult, setAiDiagnosisResult] = useState<Record<string, any> | null>(null);
  const aiDiagnosisFileRef = useRef<HTMLInputElement>(null);

  // Kit inventory tracking
  const [availableKits, setAvailableKits] = useState<{ id: string; kit_name: string; service_types: string[]; available_kits: number; is_washable: boolean }[]>([]);
  const [kitQuantities, setKitQuantities] = useState<Record<string, number>>({});
  const [initialKitQuantities, setInitialKitQuantities] = useState<Record<string, number>>({});
  const [showAddKit, setShowAddKit] = useState(false);
  const [newKitName, setNewKitName] = useState("");
  const [newKitWashable, setNewKitWashable] = useState(true);
  const [newKitTotal, setNewKitTotal] = useState(10);
  const [newKitThreshold, setNewKitThreshold] = useState(2);
  const [newKitForFuture, setNewKitForFuture] = useState(true);
  const [addingKit, setAddingKit] = useState(false);

  const fetchKitInventory = useCallback(async (sId: string | null) => {
    const { data } = await supabase.from('kit_inventory').select('id, kit_name, service_types, available_kits, is_washable').order('kit_name');
    if (data) {
      let filteredKits = data as { id: string; kit_name: string; service_types: string[]; available_kits: number; is_washable: boolean }[];
      if (sId) {
        filteredKits = filteredKits.filter(k => k.service_types.length === 0 || k.service_types.includes(sId));
      }
      setAvailableKits(filteredKits);
    }
  }, []);

  const buildEquipmentText = useCallback((quantities: Record<string, number>) => {
    const kitParts = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const kit = availableKits.find(k => k.id === id);
        return kit ? `${kit.kit_name}${qty > 1 ? ` ×${qty}` : ""}` : null;
      })
      .filter(Boolean);
    const kitTag = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => `${id}:${qty}`)
      .join(",");
    const names = kitParts.join(", ");
    return kitTag ? `${names} [kit:${kitTag}]` : names;
  }, [availableKits]);

  const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
      img.src = url;
    });
  };

  const toSafeString = (value: unknown): string => {
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === "string" ? v : String(v ?? "")))
        .filter(Boolean)
        .join(", ");
    }
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const toSafeStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .map((v) => toSafeString(v).trim())
        .filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(/\n|;/)
        .map((item) => item.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter(Boolean);
    }
    return [];
  };

  const handleAiDiagnosisImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const maxImages = 5;
    const currentCount = aiDiagnosisImages.length;
    const filesToProcess = Array.from(files).slice(0, maxImages - currentCount);
    if (filesToProcess.length === 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const newImages: { data: string; name: string }[] = [];
    for (const file of filesToProcess) {
      try {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }
        const compressed = await compressImage(file);
        newImages.push({ data: compressed, name: file.name });
      } catch (err) {
        console.error("Image compression error:", err);
        toast.error(`Failed to process ${file.name}`);
      }
    }

    if (newImages.length > 0) {
      setAiDiagnosisImages((prev) => [...prev, ...newImages]);
    }
  };

  const handleAskAiDiagnosis = async () => {
    toast.error("AI Clinical Assessment has been removed for compliance — please complete the form manually.");
  };

  const handleDialogClose = (openState: boolean) => {
    if (!openState && selectedTemplateId && hasUnsavedData) {
      setShowCloseConfirm(true);
      return;
    }
    onOpenChange(openState);
  };

  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    onOpenChange(false);
  };

  const handleSaveAndClose = async () => {
    setShowCloseConfirm(false);
    await handleSaveDraft();
  };
  useEffect(() => {
    let query = supabase
      .from("consent_form_templates")
      .select("*")
      .eq("is_active", true);
    if (formType) {
      query = query.eq("form_type", formType);
    }
    query.order("title").then(({ data }) => {
      if (data) setTemplates(data as ConsentTemplate[]);
    });
  }, [formType]);

  useEffect(() => {
    if (preselectedTemplateId) setSelectedTemplateId(preselectedTemplateId);
  }, [preselectedTemplateId]);

  useEffect(() => {
    setExistingDraftId(draftResponseId || null);
  }, [draftResponseId]);

  // Reset Heidi/mode gate whenever the dialog re-opens or the template changes
  useEffect(() => {
    if (!open) return;
    setConsultMode('choose');
    setAstariNotes("");
    setPatientDobDisplay(null);
  }, [open, selectedTemplateId]);

  // Fetch patient details for recall auto-fill and pre-fill name/DOB + previous history
  useEffect(() => {
    if (!open || !appointmentId || formType !== 'consultation') return;
    const fetchPatientForRecall = async () => {
      const { data: apt } = await supabase
        .from("appointments")
        .select("client_name, client_email, client_phone, address, postcode, service_id, services(name)")
        .eq("id", appointmentId)
        .single();
      if (apt) {
        setRecallEmail(apt.client_email || "");
        setRecallPhone(apt.client_phone || "");
        setRecallServiceName((apt.services as any)?.name || "");
        setAptDetails({
          clientName: apt.client_name,
          clientEmail: apt.client_email,
          clientPhone: apt.client_phone,
          address: apt.address,
          postcode: apt.postcode,
          serviceId: apt.service_id,
          serviceName: (apt.services as any)?.name || null,
        });

        // Fetch kit inventory for this service
        fetchKitInventory(apt.service_id);

        const { data: patient } = await supabase
          .from("patients")
          .select("id, date_of_birth, client_name")
          .eq("client_email", apt.client_email)
          .maybeSingle();
        if (patient) {
          setPatientId(patient.id);

          // Fetch appointment history for the history box
          const { data: historyApts } = await supabase
            .from("appointments")
            .select("id, appointment_date, appointment_time, status, service_id, services(name), admin_notes, ai_consent_summary, notes")
            .eq("client_email", apt.client_email)
            .neq("id", appointmentId)
            .in("status", ["confirmed", "completed", "pending"])
            .order("appointment_date", { ascending: false })
            .limit(20);
          setAppointmentHistory(historyApts || []);
          // Get patient's previous appointment IDs
          const { data: patientApts } = await supabase
            .from("appointments")
            .select("id")
            .eq("client_email", apt.client_email);

          const patientAptIds = (patientApts || []).map(a => a.id);

          // Fetch previous consultation_notes for this patient
          const { data: prevNotes } = await supabase
            .from("consultation_notes")
            .select("medical_history, allergies, current_medications, presenting_complaint, examination_findings, aftercare_advice, follow_up_notes, news_observations, appointment_id, created_at")
            .in("appointment_id", patientAptIds.length > 0 ? patientAptIds : ["__none__"])
            .order("created_at", { ascending: false })
            .limit(5);

          const latestNote = (prevNotes || [])[0];

          // Find the most recent completed consultation response for this patient
          let latestFormResp: Record<string, any> | null = null;
          if (patientAptIds.length > 0) {
            const { data: prevFormResponses } = await supabase
              .from("consent_form_responses")
              .select("responses, created_at, appointment_id")
              .in("appointment_id", patientAptIds)
              .eq("status", "completed")
              .neq("appointment_id", appointmentId)
              .order("created_at", { ascending: false })
              .limit(5);

            if (prevFormResponses && prevFormResponses.length > 0) {
              const resp = prevFormResponses[0].responses;
              if (resp && typeof resp === 'object' && !Array.isArray(resp)) {
                latestFormResp = resp as Record<string, any>;
              }
            }
          }

          // Helper for case-insensitive field matching
          const findFieldValue = (source: Record<string, any>, searchTerms: string[]): any => {
            for (const term of searchTerms) {
              const termLower = term.toLowerCase();
              for (const [key, value] of Object.entries(source)) {
                if (key.toLowerCase() === termLower && value) return value;
              }
              // Partial match
              for (const [key, value] of Object.entries(source)) {
                if (key.toLowerCase().includes(termLower) && value) return value;
              }
            }
            return undefined;
          };

          // Pre-fill patient name, DOB, and previous history
          setResponses(prev => {
            const updates: Record<string, any> = {};
            const patientName = patient.client_name || apt.client_name || "";

            // Name fields - case insensitive matching
            const nameFields = ["Patient Name", "Client Name", "Full Name", "Name"];
            for (const f of nameFields) {
              if (!prev[f]) updates[f] = patientName;
            }

            // DOB
            if (patient.date_of_birth) {
              const dobFormatted = format(parseISO(patient.date_of_birth), "dd/MM/yyyy");
              setPatientDobDisplay(dobFormatted);
              if (!prev["Date of Birth"]) updates["Date of Birth"] = dobFormatted;
              if (!prev["DOB"]) updates["DOB"] = dobFormatted;
              if (!prev["Date Of Birth"]) updates["Date Of Birth"] = dobFormatted;
              if (!prev["date of birth"]) updates["date of birth"] = dobFormatted;
            }

            // Pre-fill from previous consultation notes
            if (latestNote) {
              if (latestNote.medical_history) {
                for (const f of ["Medical History", "Medical history", "medical history"]) {
                  if (!prev[f] && !updates[f]) updates[f] = latestNote.medical_history;
                }
              }
              if (latestNote.allergies) {
                for (const f of ["Allergies", "allergies", "Known Allergies"]) {
                  if (!prev[f] && !updates[f]) updates[f] = latestNote.allergies;
                }
              }
              if (latestNote.current_medications) {
                for (const f of ["Current Medications", "Medications", "current medications", "medications"]) {
                  if (!prev[f] && !updates[f]) updates[f] = latestNote.current_medications;
                }
              }
            }

            // Pre-fill from previous form responses (richer data)
            if (latestFormResp) {
              // Build a map of all previous response keys (case-insensitive)
              const prevKeysLower = new Map<string, any>();
              for (const [key, value] of Object.entries(latestFormResp)) {
                if (key.startsWith("__")) continue;
                if (value !== null && value !== undefined && value !== "") {
                  prevKeysLower.set(key.toLowerCase(), { key, value });
                }
              }

              // Medical/history fields to carry forward
              const historySearchTerms = [
                "medical history", "allergies", "current medications", "medications",
                "gp name", "gp surgery", "gp practice", "doctor",
                "emergency contact", "emergency contact name", "emergency contact number",
                "next of kin", "blood pressure", "known conditions",
                "address", "telephone", "phone number", "mobile",
              ];

              for (const term of historySearchTerms) {
                const match = prevKeysLower.get(term);
                if (match && !prev[match.key] && !updates[match.key]) {
                  updates[match.key] = match.value;
                }
              }

              // Carry forward ALL text/string fields from previous form that look medical
              for (const [key, value] of Object.entries(latestFormResp)) {
                if (key.startsWith("__")) continue;
                if (prev[key] || updates[key]) continue;
                
                // Carry forward string values for history-type fields
                if (typeof value === 'string' && value.trim()) {
                  const kl = key.toLowerCase();
                  if (kl.includes("history") || kl.includes("allerg") || kl.includes("medication") ||
                      kl.includes("gp") || kl.includes("doctor") || kl.includes("emergency") ||
                      kl.includes("next of kin") || kl.includes("condition") || kl.includes("blood") ||
                      kl.includes("contact") || kl.includes("phone") || kl.includes("address") ||
                      kl.includes("date of birth") || kl.includes("dob") || kl.includes("name")) {
                    updates[key] = value;
                  }
                }

                // Carry forward boolean medical conditions
                if (typeof value === 'boolean' && value === true) {
                  const kl = key.toLowerCase();
                  if (kl.includes("diabetes") || kl.includes("blood") || kl.includes("heart") ||
                      kl.includes("asthma") || kl.includes("epilepsy") || kl.includes("pregnant") ||
                      kl.includes("immunosuppressed") || kl.includes("pacemaker") ||
                      kl.includes("anticoagulant") || kl.includes("condition") ||
                      kl.includes("thyroid") || kl.includes("liver") || kl.includes("kidney") ||
                      kl.includes("cancer") || kl.includes("hiv") || kl.includes("hepatitis")) {
                    updates[key] = value;
                  }
                }
              }
            }

            return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
          });
        }
      }
    };
    fetchPatientForRecall();
  }, [open, appointmentId, formType]);

  // Load draft from DB or reset when template changes
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      if (existingDraftId) {
        const { data } = await supabase
          .from("consent_form_responses")
          .select("*")
          .eq("id", existingDraftId)
          .single();
        if (data) {
          setSelectedTemplateId(data.consent_form_template_id);
          const r = typeof data.responses === 'object' && data.responses !== null ? data.responses as Record<string, any> : {};
          setResponses(r);
          setSignature(data.signature || "");
          setHasDraft(true);
          return;
        }
      }

      if (selectedTemplateId && appointmentId) {
        const { data } = await supabase
          .from("consent_form_responses")
          .select("*")
          .eq("appointment_id", appointmentId)
          .eq("consent_form_template_id", selectedTemplateId)
          .eq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          const r = typeof data.responses === 'object' && data.responses !== null ? data.responses as Record<string, any> : {};
          setResponses(r);
          setSignature(data.signature || "");
          setExistingDraftId(data.id);
          setHasDraft(true);
          return;
        }
      }

      // Pre-fill date field for new forms
      setResponses(prev => {
        if (!prev["Date"]) {
          return { ...prev, "Date": new Date().toLocaleDateString("en-GB") };
        }
        return prev;
      });
      setSignature("");
      setHasDraft(false);
      if (!existingDraftId) setExistingDraftId(null);
    };

    loadData();
  }, [selectedTemplateId, appointmentId, existingDraftId, open]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const fields = selectedTemplate ? (Array.isArray(selectedTemplate.fields) ? selectedTemplate.fields : []) : [];
  const isConsultationForm = formType === 'consultation';

  const updateResponse = useCallback((label: string, value: any) => {
    setResponses(prev => ({ ...prev, [label]: value }));
  }, []);

  const handleSaveDraft = async () => {
    if (!selectedTemplateId) return;
    setLoading(true);
    try {
      // Merge consent/signature data into responses for consultation forms
      const finalResponses: Record<string, any> = isConsultationForm ? {
        ...responses,
        __patientSignature: patientSignature,
        __practitionerSignature: practitionerSignature,
        __verbalConsent: verbalConsent,
        __verbalConsentWitness: verbalConsentWitness,
        __risksExplained: risksExplained,
        __patientUnderstood: patientUnderstood,
        __writtenConsent: writtenConsent,
        __newsObservations: newsObservations,
      } : responses;

      if (existingDraftId) {
        const r = await offlineMutation({ table: "consent_form_responses", operation: "update", data: { responses: finalResponses, signature: signature.trim() || null, status: "draft" }, matchColumn: "id", matchValue: existingDraftId, successMessage: "Draft saved" });
        if (!r.success) { setLoading(false); return; }
      } else {
        if (navigator.onLine) {
          const snapshotData = selectedTemplate ? { fields: selectedTemplate.fields, title: selectedTemplate.title, description: selectedTemplate.description } : null;
          const { data, error } = await supabase
            .from("consent_form_responses")
            .insert({ appointment_id: appointmentId, consent_form_template_id: selectedTemplateId, responses: finalResponses, signature: signature.trim() || null, status: "draft", template_snapshot: snapshotData } as any)
            .select("id").single();
          if (error) { toast.error("Failed to save draft"); setLoading(false); return; }
          setExistingDraftId(data.id);
        } else {
          const snapshotOff = selectedTemplate ? { fields: selectedTemplate.fields, title: selectedTemplate.title, description: selectedTemplate.description } : null;
          const r = await offlineMutation({ table: "consent_form_responses", operation: "insert", data: { appointment_id: appointmentId, consent_form_template_id: selectedTemplateId, responses: finalResponses, signature: signature.trim() || null, status: "draft", template_snapshot: snapshotOff } });
          if (!r.success) { setLoading(false); return; }
        }
      }

      setHasDraft(true);
      toast.success("Draft saved to patient profile");
      onOpenChange(false);
      onComplete?.();
    } catch (err) {
      console.error("Save draft error:", err);
      toast.error("Failed to save draft — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleClearDraft = async () => {
    if (!existingDraftId) return;
    const { error } = await supabase.from("consent_form_responses").delete().eq("id", existingDraftId);
    if (error) { toast.error("Failed to delete draft"); return; }
    setResponses({ "Date": new Date().toLocaleDateString("en-GB") });
    setSignature("");
    setHasDraft(false);
    setExistingDraftId(null);
    toast.success("Draft cleared");
    onComplete?.();
  };

  const handleVerbalConsentOverride = () => {
    setVerbalConsent(true);
    setWrittenConsent(true);
    setPatientUnderstood(true);
    setRisksExplained(true);
    toast.success("Verbal consent recorded — consent marked as complete");
  };

  const handleSubmit = async (opts?: { skipValidation?: boolean; extraResponses?: Record<string, any> }) => {
    if (!selectedTemplateId) { toast.error("Please select a form"); return; }

    if (!opts?.skipValidation) {
      for (const field of fields) {
        if (field.required && field.type !== "checkbox") {
          if (field.showWhen && !responses[field.showWhen]) continue;
          if (!responses[field.label]?.toString().trim()) {
            toast.error(`Please fill in: ${field.label}`);
            return;
          }
        }
      }

      const hasSignatureField = fields.some((f: any) => f.type === "signature");
      if (hasSignatureField && !signature.trim()) { toast.error("Please provide a signature"); return; }
    }

    setLoading(true);
    try {
      const finalResponses: Record<string, any> = isConsultationForm ? {
        ...responses,
        ...(opts?.extraResponses || {}),
        __patientSignature: patientSignature,
        __practitionerSignature: practitionerSignature,
        __verbalConsent: verbalConsent,
        __verbalConsentWitness: verbalConsentWitness,
        __risksExplained: risksExplained,
        __patientUnderstood: patientUnderstood,
        __writtenConsent: writtenConsent,
        __aiSummary: opts?.extraResponses?.__aiSummary ?? aiSummary,
        __recallWanted: recallWanted,
        __recallMonths: recallWanted ? recallMonths : null,
        __newsObservations: newsObservations,
        __followUpBookedId: followUpBookedId,
      } : { ...responses, ...(opts?.extraResponses || {}) };

      const snapshotPayload = selectedTemplate ? { fields: selectedTemplate.fields, title: selectedTemplate.title, description: selectedTemplate.description } : null;
      if (existingDraftId) {
        const r = await offlineMutation({ table: "consent_form_responses", operation: "update", data: { responses: finalResponses, signature: signature.trim() || null, signed_at: signature.trim() ? new Date().toISOString() : null, status: "completed", template_snapshot: snapshotPayload }, matchColumn: "id", matchValue: existingDraftId, successMessage: "Form saved" });
        if (!r.success) { setLoading(false); return; }
      } else {
        const r = await offlineMutation({ table: "consent_form_responses", operation: "insert", data: { appointment_id: appointmentId, consent_form_template_id: selectedTemplateId, responses: finalResponses, signature: signature.trim() || null, signed_at: signature.trim() ? new Date().toISOString() : null, status: "completed", template_snapshot: snapshotPayload }, successMessage: "Form saved" });
        if (!r.success) { setLoading(false); return; }
      }

      // Save recall if patient wants one
      if (isConsultationForm && recallWanted === true && patientId) {
        const recallDate = addMonths(new Date(), recallMonths);
        await supabase.from("patient_recalls").insert({
          patient_id: patientId,
          client_name: responses["Patient Name"] || responses["Client Name"] || "",
          client_email: recallEmail,
          client_phone: recallPhone || null,
          service_name: recallServiceName,
          recall_months: recallMonths,
          recall_date: recallDate.toISOString(),
          notes: `Set during consultation on ${new Date().toLocaleDateString("en-GB")}`,
        } as any);
        toast.success(`Recall scheduled for ${recallMonths} months`);
      }


      // Adjust kit inventory stock
      if (Object.keys(kitQuantities).length > 0) {
        for (const [kitId, qty] of Object.entries(kitQuantities)) {
          const initialQty = initialKitQuantities[kitId] || 0;
          const delta = qty - initialQty;
          if (delta !== 0) {
            const kit = availableKits.find(k => k.id === kitId);
            if (kit && !kit.is_washable && delta > 0) {
              await supabase.from('kit_inventory').update({ available_kits: Math.max(0, kit.available_kits - delta) }).eq('id', kitId);
            }
            await supabase.from('kit_usage_log').insert({ kit_id: kitId, event_type: 'used', quantity: qty, appointment_id: appointmentId, notes: `Via consultation form` } as any);
          }
        }
      }

      // Store equipment text in responses
      if (Object.keys(kitQuantities).length > 0) {
        const eqText = buildEquipmentText(kitQuantities);
        if (eqText) {
          finalResponses.__equipmentUsed = eqText;
        }
      }

      setExistingDraftId(null);
      toast.success("Consultation form completed!");
      onOpenChange(false);
      onComplete?.();
    } catch (err) {
      console.error("Submit form error:", err);
      toast.error("Failed to submit form — please try again");
    } finally {
      setLoading(false);
    }
  };

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handlePhotoUpload = async (fieldLabel: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const existing: string[] = responses[fieldLabel] || [];
      const newPaths: string[] = [...existing];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `consultation/${appointmentId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("shawscope").upload(path, file);
        if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
        newPaths.push(path);
      }
      updateResponse(fieldLabel, newPaths);
    } catch (err) {
      console.error("Photo upload error:", err);
      toast.error("Failed to upload photo — please try again");
    }
  };

  const removePhoto = (fieldLabel: string, index: number) => {
    const current: string[] = responses[fieldLabel] || [];
    updateResponse(fieldLabel, current.filter((_, i) => i !== index));
  };

  // Restore consent state from saved responses when loading existing draft
  useEffect(() => {
    if (isConsultationForm && responses.__verbalConsent !== undefined) {
      setPatientSignature(responses.__patientSignature || null);
      setPractitionerSignature(responses.__practitionerSignature || null);
      setVerbalConsent(!!responses.__verbalConsent);
      setVerbalConsentWitness(responses.__verbalConsentWitness || "");
      setRisksExplained(!!responses.__risksExplained);
      setPatientUnderstood(!!responses.__patientUnderstood);
      setWrittenConsent(!!responses.__writtenConsent);
      if (responses.__aiSummary) setAiSummary(responses.__aiSummary);
      if (responses.__newsObservations && Array.isArray(responses.__newsObservations)) {
        setNewsObservations(responses.__newsObservations);
      }
    }
  }, [responses.__verbalConsent, isConsultationForm]);

  const consentComplete = hasSignedConsent || (verbalConsent && verbalConsentWitness.trim());

  // Check if a conditional field should be shown
  const shouldShowField = (field: any) => {
    if (!field.showWhen) return true;
    return !!responses[field.showWhen];
  };

  return (
    <>
      <Dialog open={open && !showPatientSigPad && !showPractitionerSigPad} onOpenChange={handleDialogClose}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <FileText className="h-5 w-5 text-secondary" />
              {formType === 'consultation' ? 'Consultation Form' : 'Complete Form'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Form</Label>
              <Select
                value={selectedTemplateId || "none"}
                onValueChange={(v) => { setSelectedTemplateId(v === "none" ? null : v); setExistingDraftId(null); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a form..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a form...</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <>
                {/* Entry gate for consultation forms — choose method */}
                {isConsultationForm && consultMode === 'choose' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                      How would you like to complete this consultation?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        className="w-full h-14 text-sm font-semibold"
                        onClick={() => setConsultMode('form')}
                      >
                        <ClipboardList className="h-5 w-5 mr-2" />
                        Complete Form
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-14 text-sm font-semibold text-white border-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:via-violet-500 hover:to-fuchsia-500 shadow-md shadow-violet-500/30"
                        onClick={() => setConsultMode('astari')}
                      >
                        <Upload className="h-5 w-5 mr-2" />
                        Upload Heidi
                      </Button>
                    </div>
                  </div>
                )}

                {/* Heidi paste-in panel */}
                {isConsultationForm && consultMode === 'astari' && (
                  <div className="space-y-3 rounded-lg border border-secondary/30 bg-secondary/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-secondary" />
                        <h3 className="text-sm font-semibold">Upload Heidi</h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setConsultMode('choose')}
                        disabled={astariProcessing}
                      >
                        Back
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Paste the Heidi notes for <span className="font-semibold">this patient only</span>. They will be saved exactly as pasted and shown on the consultation and PDF.
                    </p>

                    {/* Big patient-confirmation banner — sanity check before pasting */}
                    <div className="rounded-lg border-2 border-amber-500/60 bg-amber-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-300/90 mb-1">
                        Confirm you have the right patient
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground leading-tight break-words">
                        {aptDetails?.clientName || "Unknown patient"}
                      </p>
                      <p className="text-base sm:text-lg font-semibold text-foreground/90 mt-1">
                        DOB: {patientDobDisplay || "—"}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="astari-notes" className="text-xs font-medium">Heidi Notes</Label>
                      <Textarea
                        id="astari-notes"
                        value={astariNotes}
                        onChange={(e) => setAstariNotes(e.target.value)}
                        placeholder="Paste the Heidi notes here..."
                        rows={14}
                        disabled={astariProcessing}
                        className="text-sm"
                      />
                      <p className="text-[10px] text-muted-foreground text-right">
                        {astariNotes.length.toLocaleString()} chars
                      </p>
                    </div>

                    {/* Equipment Used (mirrors form view) */}
                    <div className="space-y-2 pt-1">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" /> Equipment Used
                      </Label>
                      {availableKits.length > 0 && (
                        <div className="space-y-1.5 rounded-lg border border-border p-3 bg-foreground/5">
                          {availableKits.map(kit => {
                            const qty = kitQuantities[kit.id] || 0;
                            const lowStock = kit.available_kits <= 2;
                            const outOfStock = kit.available_kits <= 0;
                            return (
                              <div key={kit.id} className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-medium text-foreground">{kit.kit_name}</span>
                                  {kit.is_washable && <span className="text-foreground/50 text-[10px] ml-1">(reusable)</span>}
                                </div>
                                <Badge variant="outline" className={`text-[9px] shrink-0 ${outOfStock ? 'text-destructive border-destructive/40' : lowStock ? 'text-amber-500 border-amber-500/40' : 'text-foreground/60'}`}>
                                  {kit.available_kits} left
                                </Badge>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 border-border text-foreground"
                                    disabled={qty <= 0 || astariProcessing}
                                    onClick={() => {
                                      const newQty = Math.max(0, qty - 1);
                                      const updated = { ...kitQuantities };
                                      if (newQty === 0) delete updated[kit.id]; else updated[kit.id] = newQty;
                                      setKitQuantities(updated);
                                    }}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className={`text-xs font-bold w-6 text-center ${qty > 0 ? 'text-secondary' : 'text-foreground/40'}`}>
                                    {qty}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 border-border text-foreground"
                                    disabled={(outOfStock && qty === 0) || astariProcessing}
                                    onClick={() => {
                                      const updated = { ...kitQuantities, [kit.id]: qty + 1 };
                                      setKitQuantities(updated);
                                    }}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {Object.keys(kitQuantities).length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Equipment: {buildEquipmentText(kitQuantities).replace(/\s*\[kit:[^\]]*\]/, '')}
                        </p>
                      )}
                    </div>

                    <Button
                      className="w-full h-11"
                      disabled={astariProcessing || !astariNotes.trim()}
                      onClick={async () => {
                        const notes = astariNotes.trim();
                        if (!notes) {
                          toast.error("Paste the Heidi notes first");
                          return;
                        }
                        try {
                          setAstariProcessing(true);
                          if (!selectedTemplateId) {
                            toast.error("Please select a form");
                            return;
                          }
                          // Save Heidi notes verbatim via a direct insert — no AI parsing, no form-fill,
                          // no shared handleSubmit logic that could strip the notes.
                          const heidiNotes = notes;
                          const finalResponses: Record<string, any> = {
                            ...responses,
                            __heidiNotes: heidiNotes,
                            __heidiSummary: null,
                            __heidiTranscript: null,
                            __heidiOnly: true,
                            __patientSignature: patientSignature,
                            __practitionerSignature: practitionerSignature,
                            __verbalConsent: verbalConsent,
                            __verbalConsentWitness: verbalConsentWitness,
                            __risksExplained: risksExplained,
                            __patientUnderstood: patientUnderstood,
                            __writtenConsent: writtenConsent,
                            __aiSummary: aiSummary,
                            __recallWanted: recallWanted,
                            __recallMonths: recallWanted ? recallMonths : null,
                            __newsObservations: newsObservations,
                            __followUpBookedId: followUpBookedId,
                          };
                          if (Object.keys(kitQuantities).length > 0) {
                            const eqText = buildEquipmentText(kitQuantities);
                            if (eqText) finalResponses.__equipmentUsed = eqText;
                          }
                          const snapshotPayload = selectedTemplate
                            ? { fields: selectedTemplate.fields, title: selectedTemplate.title, description: selectedTemplate.description }
                            : null;
                          console.log("[Heidi] Saving notes verbatim", { len: heidiNotes.length, existingDraftId });
                          if (existingDraftId) {
                            const { error } = await supabase
                              .from("consent_form_responses")
                              .update({ responses: finalResponses, signature: signature.trim() || null, signed_at: signature.trim() ? new Date().toISOString() : null, status: "completed", template_snapshot: snapshotPayload } as any)
                              .eq("id", existingDraftId);
                            if (error) { toast.error(`Failed to save: ${error.message}`); return; }
                          } else {
                            const { error } = await supabase
                              .from("consent_form_responses")
                              .insert({ appointment_id: appointmentId, consent_form_template_id: selectedTemplateId, responses: finalResponses, signature: signature.trim() || null, signed_at: signature.trim() ? new Date().toISOString() : null, status: "completed", template_snapshot: snapshotPayload } as any);
                            if (error) { toast.error(`Failed to save: ${error.message}`); return; }
                          }
                          // Mirror into ai summary box for in-app summary panel
                          setAiSummary((prev) => prev ? prev + "\n\n---\n\n" + heidiNotes : heidiNotes);
                          toast.success("Heidi notes saved to consultation");
                          setExistingDraftId(null);
                          onOpenChange(false);
                          onComplete?.();
                        } catch (err) {
                          console.error("Heidi processing error:", err);
                          toast.error("Failed to save Heidi notes");
                        } finally {
                          setAstariProcessing(false);
                        }
                      }}
                    >
                      {astariProcessing ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" /> Submit</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Gate the rest of the consultation UI behind the 'form' choice */}
                {(!isConsultationForm || consultMode === 'form') && (
                <>

                {hasDraft && (
                  <div className="flex items-center justify-between rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2">
                    <p className="text-xs text-secondary font-medium">📝 Draft restored</p>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={handleClearDraft}>
                      <Trash2 className="h-3 w-3 mr-1" /> Clear
                    </Button>
                  </div>
                )}

                {/* Appointment History Box */}
                {isConsultationForm && appointmentHistory.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-muted p-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => setHistoryExpanded(!historyExpanded)}
                      className="flex items-center justify-between w-full"
                    >
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-amber-400" />
                        <h3 className="text-sm font-semibold text-white">Appointment History ({appointmentHistory.length})</h3>
                      </div>
                      {historyExpanded ? <ChevronUp className="h-4 w-4 text-white" /> : <ChevronDown className="h-4 w-4 text-white" />}
                    </button>

                    {historyExpanded && (
                      <div className="space-y-2 pt-1">
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {appointmentHistory.map((a: any) => (
                            <div key={a.id} className="rounded-md bg-secondary border border-border px-2.5 py-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-white">{format(parseISO(a.appointment_date), "dd/MM/yyyy")}</span>
                                <span className="text-[10px] text-amber-400/80 capitalize">{a.status}</span>
                              </div>
                              <p className="text-[11px] text-white/90">{(a.services as any)?.name || 'Unknown service'}</p>
                              {(a.admin_notes || a.notes) && (
                                <p className="text-[10px] text-white/60 mt-0.5 line-clamp-2">{a.admin_notes || a.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Consent status indicator */}
                {isConsultationForm && hasSignedConsent && (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 px-3 py-2">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                      Patient has already signed the consent form — patient signature not required below
                    </p>
                  </div>
                )}

                {/* NEWS2 Clinical Observations */}
                {isConsultationForm && (
                  <>
                    <NEWSScorePanel observations={newsObservations} onChange={setNewsObservations} />
                    <Separator />
                  </>
                )}

                {selectedTemplate.description && (
                  <p className="text-sm text-muted-foreground rounded-lg border bg-muted/50 p-3">
                    {selectedTemplate.description}
                  </p>
                )}

                {/* AI Clinical Assessment — at top of every consultation form */}
                {isConsultationForm && (
                  <div className="rounded-lg border border-amber-500/40 bg-muted overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setAskAiOpen(!askAiOpen)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-amber-300 hover:bg-secondary/50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <BrainCircuit className="h-4 w-4" />
                        🤖 Ask AI — Clinical Assessment
                      </span>
                      {askAiOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {askAiOpen && (
                      <div className="px-3 pb-3 space-y-3 border-t border-amber-500/20 pt-3">
                        <p className="text-[11px] text-muted-foreground">
                          AI will assess the presenting complaint and optionally an uploaded image to help pre-fill clinical fields. Original notes are preserved.
                        </p>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Additional notes for AI</Label>
                          <Textarea
                            rows={2}
                            placeholder="Add any extra observations, e.g. location, duration, patient history..."
                            value={aiDiagnosisNotes}
                            onChange={(e) => setAiDiagnosisNotes(e.target.value)}
                            className="text-sm bg-card border-border text-white placeholder:text-muted-foreground/70"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Upload clinical photo (optional)</Label>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={aiDiagnosisFileRef}
                            onChange={(e) => { handleAiDiagnosisImageUpload(e.target.files); e.target.value = ""; }}
                            multiple
                          />
                          {aiDiagnosisImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {aiDiagnosisImages.map((img, idx) => (
                                <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                                  <img src={img.data} alt={`Clinical photo ${idx + 1}`} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => setAiDiagnosisImages(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {aiDiagnosisImages.length < 5 && (
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" size="sm" className="border-border text-foreground hover:bg-secondary" onClick={() => aiDiagnosisFileRef.current?.click()}>
                                <Upload className="h-4 w-4 mr-1" /> {aiDiagnosisImages.length > 0 ? "Add More" : "Upload Image"}
                              </Button>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                id="ai-diagnosis-camera"
                                onChange={(e) => { handleAiDiagnosisImageUpload(e.target.files); e.target.value = ""; }}
                              />
                              <Button type="button" variant="outline" size="sm" className="border-border text-foreground hover:bg-secondary" onClick={() => document.getElementById('ai-diagnosis-camera')?.click()}>
                                <Camera className="h-4 w-4 mr-1" /> Camera
                              </Button>
                            </div>
                          )}
                          {aiDiagnosisImages.length > 0 && (
                            <p className="text-xs text-muted-foreground/70">{aiDiagnosisImages.length}/5 photos</p>
                          )}
                        </div>
                        <Button
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={handleAskAiDiagnosis}
                          disabled={aiDiagnosing}
                        >
                          {aiDiagnosing ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analysing...</>
                          ) : (
                            <><Stethoscope className="h-4 w-4 mr-2" /> Run AI Assessment</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Clinical Assessment Results Box */}
                {isConsultationForm && aiDiagnosisResult && (
                  <div className="rounded-lg border border-emerald-500/40 bg-muted p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <BrainCircuit className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-emerald-400">🤖 AI Clinical Assessment Findings</h3>
                    </div>

                    {aiDiagnosisResult.presentingComplaint && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Assessment</p>
                        <p className="text-xs text-white leading-relaxed">
                          {Array.isArray(aiDiagnosisResult.presentingComplaint) ? aiDiagnosisResult.presentingComplaint.join(", ") : aiDiagnosisResult.presentingComplaint}
                        </p>
                      </div>
                    )}

                    {Array.isArray(aiDiagnosisResult.differentialConsiderations) && aiDiagnosisResult.differentialConsiderations.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Differential Considerations</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {aiDiagnosisResult.differentialConsiderations.map((dc: string, i: number) => (
                            <li key={i} className="text-xs text-white/90">{dc}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiDiagnosisResult.examinationFindings && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Examination Findings</p>
                        <p className="text-xs text-white/80 leading-relaxed">{aiDiagnosisResult.examinationFindings}</p>
                      </div>
                    )}

                    {aiDiagnosisResult.suggestedProcedure && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Suggested Procedure</p>
                        <p className="text-xs text-white/80 leading-relaxed">{aiDiagnosisResult.suggestedProcedure}</p>
                      </div>
                    )}

                    {aiDiagnosisResult.precautions && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Precautions</p>
                        <p className="text-xs text-white/80 leading-relaxed">{aiDiagnosisResult.precautions}</p>
                      </div>
                    )}

                    {aiDiagnosisResult.equipmentSuggested && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Equipment</p>
                        <p className="text-xs text-white/80 leading-relaxed">{aiDiagnosisResult.equipmentSuggested}</p>
                      </div>
                    )}

                    {aiDiagnosisResult.aftercareAdvice && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Aftercare Advice</p>
                        <p className="text-xs text-white/80 leading-relaxed">{aiDiagnosisResult.aftercareAdvice}</p>
                      </div>
                    )}

                    <p className="text-[9px] text-muted-foreground/70 italic pt-1">AI-generated clinical observations — for practitioner reference only</p>
                  </div>
                )}

                {fields.map((field: any, i: number) => {
                  if (!shouldShowField(field)) return null;

                  // Check if we should show hearing screening button after this field
                  const isEarService = recallServiceName?.toLowerCase().includes('earwax') || recallServiceName?.toLowerCase().includes('wellness') || recallServiceName?.toLowerCase().includes('ear');
                  const fieldLabelLower = field.label?.toLowerCase() || '';
                  const showScreeningAfter = isConsultationForm && isEarService && patientId && (
                    fieldLabelLower.includes('hearing screening performed')
                  );

                  const renderScreeningButton = showScreeningAfter ? (
                    <div key={`screening-${i}`} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <Button variant="outline" className="w-full" onClick={() => setHearingScreenOpen(true)}>
                        <Ear className="h-4 w-4 mr-2" /> Run ShawScope Hearing Screening
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                        Opens screening modal — patient pre-selected. Returns here when done.
                      </p>
                    </div>
                  ) : null;

                  // Render field content based on type
                  let fieldContent: React.ReactNode = null;

                  if (field.type === "heading") {
                    fieldContent = (
                      <div className="pt-4 pb-1">
                        <Separator className="mb-3" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{field.label.replace(/^── |──$/g, '').trim()}</h3>
                      </div>
                    );
                  } else if (field.type === "multiselect") {
                    const selected: string[] = responses[field.label] || [];
                    fieldContent = (
                      <div className="space-y-2">
                        <Label>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {(field.options || []).map((opt: string) => {
                            const isSelected = selected.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  const next = isSelected
                                    ? selected.filter(s => s !== opt)
                                    : [...selected, opt];
                                  updateResponse(field.label, next);
                                }}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted/50 text-foreground border-border hover:bg-muted'
                                }`}
                              >
                                {isSelected && '✓ '}{opt}
                              </button>
                            );
                          })}
                        </div>
                        {selected.length > 0 && (
                          <p className="text-[10px] text-muted-foreground">{selected.length} selected</p>
                        )}
                      </div>
                    );
                  } else if (field.type === "checkbox") {
                    fieldContent = (
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={!!responses[field.label]}
                          onCheckedChange={(checked) => updateResponse(field.label, checked)}
                        />
                        <Label className="font-normal">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                      </div>
                    );
                  } else if (field.type === "select") {
                    fieldContent = (
                      <div className="space-y-2">
                        <Label>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Select value={responses[field.label] || ""} onValueChange={(v) => updateResponse(field.label, v)}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map((opt: string) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  } else if (field.type === "signature") {
                    fieldContent = (
                      <div className="space-y-2">
                        <Label>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <StableInput placeholder="Type full name as signature" value={signature} onValueCommit={setSignature} />
                        <p className="text-xs text-muted-foreground">By typing your name, you confirm agreement to this form.</p>
                      </div>
                    );
                  } else if (field.type === "textarea") {
                    fieldContent = (
                      <div className="space-y-2">
                        <Label>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <StableTextarea value={responses[field.label] || ""} onValueCommit={(val) => updateResponse(field.label, val)} rows={3} placeholder={field.placeholder || ""} />
                        {field.placeholder && !responses[field.label] && (
                          <p className="text-xs text-muted-foreground italic">Hint: {field.placeholder}</p>
                        )}
                      </div>
                    );
                  } else if (field.type === "photo") {
                    const photos: string[] = responses[field.label] || [];
                    fieldContent = (
                      <div className="space-y-2">
                        <Label>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {photos.length > 0 && (
                          <PhotoThumbnails photos={photos} fieldLabel={field.label} onRemove={removePhoto} />
                        )}
                        <div className="flex gap-2">
                          <input type="file" accept="image/*" multiple className="hidden"
                            ref={el => { fileInputRefs.current[field.label] = el; }}
                            onChange={e => { handlePhotoUpload(field.label, e.target.files); e.target.value = ""; }} />
                          <input type="file" accept="image/*" capture="environment" className="hidden"
                            ref={el => { cameraInputRefs.current[field.label] = el; }}
                            onChange={e => { handlePhotoUpload(field.label, e.target.files); e.target.value = ""; }} />
                          <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRefs.current[field.label]?.click()}>
                            <Camera className="h-4 w-4 mr-1" /> Camera
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRefs.current[field.label]?.click()}>
                            <ImagePlus className="h-4 w-4 mr-1" /> Gallery
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{photos.length} photo{photos.length !== 1 ? "s" : ""} attached</p>
                      </div>
                    );
                  } else {
                    fieldContent = (
                      <div className="space-y-2">
                        <Label>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <StableInput value={responses[field.label] || ""} onValueCommit={(val) => updateResponse(field.label, val)} placeholder={field.placeholder || ""} />
                      </div>
                    );
                  }

                  const renderAskAiPanel = null; // Moved to top of form

                  return (
                    <React.Fragment key={i}>
                      {fieldContent}
                      {renderAskAiPanel}
                      {renderScreeningButton}
                    </React.Fragment>
                  );
                })}

                {/* Equipment / Kit Inventory Tracking */}
                {isConsultationForm && (
                  <div className="space-y-2">
                    <Separator />
                    <Label className="text-sm flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" /> Equipment Used
                    </Label>
                    {availableKits.length > 0 && (
                      <div className="space-y-1.5 rounded-lg border border-border p-3 bg-foreground/5">
                        {availableKits.map(kit => {
                          const qty = kitQuantities[kit.id] || 0;
                          const lowStock = kit.available_kits <= 2;
                          const outOfStock = kit.available_kits <= 0;
                          return (
                            <div key={kit.id} className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-foreground">{kit.kit_name}</span>
                                {kit.is_washable && <span className="text-foreground/50 text-[10px] ml-1">(reusable)</span>}
                              </div>
                              <Badge variant="outline" className={`text-[9px] shrink-0 ${outOfStock ? 'text-destructive border-destructive/40' : lowStock ? 'text-amber-500 border-amber-500/40' : 'text-foreground/60'}`}>
                                {kit.available_kits} left
                              </Badge>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 border-border text-foreground"
                                  disabled={qty <= 0}
                                  onClick={() => {
                                    const newQty = Math.max(0, qty - 1);
                                    const updated = { ...kitQuantities };
                                    if (newQty === 0) delete updated[kit.id]; else updated[kit.id] = newQty;
                                    setKitQuantities(updated);
                                  }}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className={`text-xs font-bold w-6 text-center ${qty > 0 ? 'text-secondary' : 'text-foreground/40'}`}>
                                  {qty}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 border-border text-foreground"
                                  disabled={outOfStock && qty === 0}
                                  onClick={() => {
                                    const updated = { ...kitQuantities, [kit.id]: qty + 1 };
                                    setKitQuantities(updated);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add New Kit inline */}
                    {!showAddKit ? (
                      <Button type="button" variant="outline" size="sm" className="text-xs text-foreground border-border bg-secondary/20 hover:bg-secondary/30" onClick={() => setShowAddKit(true)}>
                        <Plus className="h-3 w-3 mr-1" /> Add New Kit Item
                      </Button>
                    ) : (
                      <div className="rounded-lg border border-secondary/30 p-3 space-y-3 bg-foreground/5">
                        <p className="text-xs font-semibold text-secondary">Add New Kit</p>
                        <Input value={newKitName} onChange={e => setNewKitName(e.target.value)} placeholder="Kit name, e.g. 4mm Specula" className="text-sm text-foreground" />
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-foreground">Washable / Reusable?</Label>
                          <input type="checkbox" checked={newKitWashable} onChange={(e) => setNewKitWashable(e.target.checked)} className="h-4 w-4" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-foreground/70">{newKitWashable ? 'Total Kits' : 'Total Stock'}</Label>
                            <Input type="number" min={1} value={newKitTotal} onChange={e => setNewKitTotal(Number(e.target.value))} className="text-foreground" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-foreground/70">Low Stock Alert At</Label>
                            <Input type="number" min={0} value={newKitThreshold} onChange={e => setNewKitThreshold(Number(e.target.value))} className="text-foreground" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox checked={newKitForFuture} onCheckedChange={(c) => setNewKitForFuture(!!c)} />
                          <Label className="text-xs font-normal text-foreground">Keep for all future {recallServiceName || 'this type of'} consultations</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" className="flex-1 text-foreground border-border" onClick={() => { setShowAddKit(false); setNewKitName(""); }}>
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            disabled={!newKitName.trim() || addingKit}
                            onClick={async () => {
                              setAddingKit(true);
                              const payload: any = {
                                kit_name: newKitName.trim(),
                                service_type: aptDetails?.serviceId || 'general',
                                service_types: newKitForFuture && aptDetails?.serviceId ? [aptDetails.serviceId] : [],
                                total_kits: newKitTotal,
                                available_kits: newKitTotal,
                                low_stock_threshold: newKitThreshold,
                                is_washable: newKitWashable,
                              };
                              const { data: newKit, error } = await supabase.from('kit_inventory').insert(payload).select().single();
                              if (error) { toast.error('Failed to add kit'); setAddingKit(false); return; }
                              toast.success(`${newKitName.trim()} added`);
                              setNewKitName(""); setShowAddKit(false); setAddingKit(false);
                              fetchKitInventory(aptDetails?.serviceId || null);
                            }}
                          >
                            {addingKit ? 'Adding...' : 'Add Kit'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {Object.keys(kitQuantities).length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        Equipment: {buildEquipmentText(kitQuantities).replace(/\s*\[kit:[^\]]*\]/, '')}
                      </p>
                    )}
                  </div>
                )}

                {/* Consent & Signatures Section - always shown for consultation forms */}
                {isConsultationForm && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Consent & Signatures</h3>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={risksExplained} onCheckedChange={(c) => setRisksExplained(!!c)} />
                          <Label className="font-normal">Risks and benefits explained</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox checked={patientUnderstood} onCheckedChange={(c) => setPatientUnderstood(!!c)} />
                          <Label className="font-normal">Patient confirmed understanding</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox checked={verbalConsent} onCheckedChange={(c) => setVerbalConsent(!!c)} />
                          <Label className="font-normal">Verbal consent gained</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox checked={writtenConsent} onCheckedChange={(c) => setWrittenConsent(!!c)} />
                          <Label className="font-normal">Written consent gained</Label>
                        </div>
                      </div>

                      {/* Patient Signature */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Patient Signature</Label>
                        {hasSignedConsent && !patientSignature && (
                          <p className="text-xs text-green-600">✓ Already signed via consent form</p>
                        )}
                        {patientSignature ? (
                          <div className="relative border rounded-lg p-2 bg-white inline-block">
                            <img src={patientSignature} alt="Patient signature" className="h-16 object-contain" />
                            <button onClick={() => setPatientSignature(null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setShowPatientSigPad(true)} disabled={hasSignedConsent}>
                            <PenLine className="h-4 w-4 mr-2" /> {hasSignedConsent ? "Not required" : "Open Signature Pad"}
                          </Button>
                        )}
                      </div>

                      {/* Verbal Consent Override */}
                      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-amber-600" />
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                            Patient unable to sign? Record verbal consent instead
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Witness Name</Label>
                          <Input value={verbalConsentWitness} onChange={(e) => setVerbalConsentWitness(e.target.value)}
                            placeholder="Name of witness to verbal consent" className="text-sm" />
                        </div>
                        <Button variant="outline" size="sm" className="w-full text-xs border-amber-300 hover:bg-amber-100"
                          onClick={handleVerbalConsentOverride} disabled={!verbalConsentWitness.trim()}>
                          <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                          Consent form read out & patient verbally agreed
                        </Button>
                      </div>

                      {/* Practitioner Signature */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Practitioner Signature</Label>
                        {practitionerSignature ? (
                          <div className="relative border rounded-lg p-2 bg-white inline-block">
                            <img src={practitionerSignature} alt="Practitioner signature" className="h-16 object-contain" />
                            <button onClick={() => setPractitionerSignature(null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setShowPractitionerSigPad(true)}>
                            <PenLine className="h-4 w-4 mr-2" /> Sign as Practitioner
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Recall Section - shown for all consultation forms */}
                {isConsultationForm && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" /> Patient Recall
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Would the patient like a recall reminder (SMS &amp; email) to book a follow-up appointment in the future?
                      </p>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={recallWanted === true ? "default" : "outline"}
                          size="sm"
                          onClick={() => setRecallWanted(true)}
                        >
                          Yes, set a recall
                        </Button>
                        <Button
                          type="button"
                          variant={recallWanted === false ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => setRecallWanted(false)}
                        >
                          No thanks (declined)
                        </Button>
                      </div>

                      {recallWanted === true && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4 space-y-3">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Confirm contact details &amp; recall timing</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                              <Input value={recallEmail} onChange={(e) => setRecallEmail(e.target.value)} className="text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
                              <Input value={recallPhone} onChange={(e) => setRecallPhone(e.target.value)} className="text-sm" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Service</Label>
                            <Input value={recallServiceName} onChange={(e) => setRecallServiceName(e.target.value)} className="text-sm" />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Send recall in</Label>
                            <Select value={String(recallMonths)} onValueChange={(v) => setRecallMonths(Number(v))}>
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[3, 6, 9, 12, 18, 24, 36].map((m) => (
                                  <SelectItem key={m} value={String(m)}>{m} months</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Patient will receive an email &amp; SMS on approximately {addMonths(new Date(), recallMonths).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                      )}

                      {recallWanted === false && (
                        <p className="text-xs text-muted-foreground italic">Patient declined recall — noted on record.</p>
                      )}
                    </div>
                  </>
                )}

                {/* Book Next Appointment */}
                {isConsultationForm && aptDetails && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" /> Book Next Appointment
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Book the patient's next appointment now while you're together. Their details are pre-filled.
                      </p>
                      <BookNextAppointment
                        clientName={aptDetails.clientName}
                        clientEmail={aptDetails.clientEmail}
                        clientPhone={aptDetails.clientPhone}
                        address={aptDetails.address}
                        postcode={aptDetails.postcode}
                        currentServiceId={aptDetails.serviceId}
                        currentServiceName={aptDetails.serviceName}
                        onBooked={(id, date, time) => setFollowUpBookedId(id)}
                      />
                    </div>
                  </>
                )}

                {/* Add Todo Button */}
                {isConsultationForm && patientId && aptDetails && (
                  <div className="border rounded-lg p-3 bg-yellow-950/20 border-yellow-800/30">
                    <AddTodoFromConsultation
                      patientId={patientId}
                      patientName={aptDetails.clientName}
                      patientEmail={aptDetails.clientEmail}
                      appointmentId={appointmentId}
                    />
                  </div>
                )}


                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={handleSaveDraft} className="flex-1" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" /> Save Draft
                  </Button>
                  <Button onClick={() => handleSubmit()} className="flex-1" disabled={loading}>
                    {loading ? "Saving..." : "Submit Form"}
                  </Button>
                </div>
                </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-screen signature pads */}
      <SignaturePad open={showPatientSigPad} onClose={() => setShowPatientSigPad(false)}
        onSave={(dataUrl) => { setPatientSignature(dataUrl); setWrittenConsent(true); }} title="Patient Signature" />
      <SignaturePad open={showPractitionerSigPad} onClose={() => setShowPractitionerSigPad(false)}
        onSave={setPractitionerSignature} title="Practitioner Signature" />
      {/* Hearing Screening Dialog */}
      {isConsultationForm && patientId && (
        <HearingScreeningDialog
          open={hearingScreenOpen}
          onOpenChange={setHearingScreenOpen}
          patientId={patientId}
          patientName={aptDetails?.clientName}
          patientDob={null}
          patientEmail={aptDetails?.clientEmail}
          serviceContext={
            recallServiceName?.toLowerCase().includes('earwax') ? 'earwax_removal' :
            recallServiceName?.toLowerCase().includes('wellness') ? 'ear_wellness' : 'standalone'
          }
        />
      )}

      {/* Close confirmation */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save draft before closing?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this consultation form. Would you like to save a draft before closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConfirmClose}>Discard</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndClose}>
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ConsultationFormDialog;
