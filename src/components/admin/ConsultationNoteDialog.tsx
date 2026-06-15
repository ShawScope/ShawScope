import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Stethoscope, Save, Download, Sparkles, Loader2, PenLine, X, ShieldCheck, UserCheck, Mic, Star, Ear, Package, Plus, Minus, ChevronUp, ChevronDown, CheckCircle } from "lucide-react";
import HearingScreeningDialog from "./HearingScreening/HearingScreeningDialog";
import NEWSScorePanel, { type NEWSObservation } from "./NEWSScorePanel";
import jsPDF from "jspdf";
import { format } from "date-fns";

interface KitItem {
  id: string;
  kit_name: string;
  service_types: string[];
  available_kits: number;
  is_washable: boolean;
}

interface ConsultationNote {
  id: string;
  appointment_id: string;
  presenting_complaint: string | null;
  medical_history: string | null;
  current_medications: string | null;
  allergies: string | null;
  examination_findings: string | null;
  procedure_performed: string | null;
  procedure_notes: string | null;
  equipment_used: string | null;
  outcome: string | null;
  complications: string | null;
  aftercare_advice: string | null;
  follow_up_required: boolean;
  follow_up_notes: string | null;
  verbal_consent_gained: boolean;
  written_consent_gained: boolean;
  risks_explained: boolean;
  patient_understood: boolean;
  completed_by: string | null;
  patient_signature: string | null;
  practitioner_signature: string | null;
  verbal_consent_witness: string | null;
  ai_prefill_summary: string | null;
  created_at: string;
  updated_at: string;
}

interface ConsultationNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  serviceName?: string;
  clientName?: string;
  onComplete?: () => void;
}

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

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPoint.current = getPoint(e);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing.current || !lastPoint.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
  };

  const endDraw = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave(dataUrl);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 p-4 flex flex-col">
        <p className="text-sm text-muted-foreground mb-3">Please sign below using your finger or stylus</p>
        <div className="flex-1 border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
      </div>
      <div className="flex gap-3 p-4 border-t">
        <Button variant="outline" onClick={clearCanvas} className="flex-1">
          Clear
        </Button>
        <Button onClick={saveSignature} className="flex-1">
          <Save className="h-4 w-4 mr-2" /> Save Signature
        </Button>
      </div>
    </div>
  );
};

const ConsultationNoteDialog = ({
  open,
  onOpenChange,
  appointmentId,
  serviceName,
  clientName,
  onComplete,
}: ConsultationNoteDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [hasSignedConsent, setHasSignedConsent] = useState(false);

  // Signature pad states
  const [showPatientSigPad, setShowPatientSigPad] = useState(false);
  const [showPractitionerSigPad, setShowPractitionerSigPad] = useState(false);
  const [showDictate, setShowDictate] = useState(false);
  const [hearingScreenOpen, setHearingScreenOpen] = useState(false);
  const [consultPatientId, setConsultPatientId] = useState<string | null>(null);

  // Kit inventory tracking
  const [availableKits, setAvailableKits] = useState<KitItem[]>([]);
  const [kitQuantities, setKitQuantities] = useState<Record<string, number>>({});
  const [initialKitQuantities, setInitialKitQuantities] = useState<Record<string, number>>({});
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [showAddKit, setShowAddKit] = useState(false);
  const [newKitName, setNewKitName] = useState("");
  const [newKitWashable, setNewKitWashable] = useState(true);
  const [newKitTotal, setNewKitTotal] = useState(10);
  const [newKitThreshold, setNewKitThreshold] = useState(2);
  const [newKitForFuture, setNewKitForFuture] = useState(true);
  const [addingKit, setAddingKit] = useState(false);

  const dictateFields = [
    "Any other notes, comments, or anything said during the consultation — use this for anything you want to record",
    "What is the presenting complaint",
    "What is the patient's medical history",
    "What current medications is the patient taking",
    "Does the patient have any allergies",
    "What are your examination findings",
    "What procedure was performed",
    "What equipment was used",
    "Describe the procedure notes",
    "What is the outcome or result",
    "Were there any complications",
    "What aftercare advice was given",
    "Is follow-up required and if so what are the details",
    "Were risks and benefits explained to the patient (yes/no)",
    "Did the patient confirm understanding (yes/no)",
    "Was verbal consent gained (yes/no)",
    "Was written consent gained (yes/no)",
  ];

  const handleDictateResult = (filledFields: Record<string, string>, summary: string, rawTranscript?: string) => {
    const fieldMap: Record<string, (v: string) => void> = {
      "Any other notes, comments, or anything said during the consultation — use this for anything you want to record": setOtherNotes,
      "What is the presenting complaint": setPresentingComplaint,
      "What is the patient's medical history": setMedicalHistory,
      "What current medications is the patient taking": setCurrentMedications,
      "Does the patient have any allergies": setAllergies,
      "What are your examination findings": setExaminationFindings,
      "What procedure was performed": setProcedurePerformed,
      "What equipment was used": setEquipmentUsed,
      "Describe the procedure notes": setProcedureNotes,
      "What is the outcome or result": setOutcome,
      "Were there any complications": setComplications,
      "What aftercare advice was given": setAftercareAdvice,
      "Is follow-up required and if so what are the details": (v: string) => {
        setFollowUpRequired(true);
        setFollowUpNotes(v);
      },
    };
    const boolMap: Record<string, (v: boolean) => void> = {
      "Were risks and benefits explained to the patient (yes/no)": setRisksExplained,
      "Did the patient confirm understanding (yes/no)": setPatientUnderstood,
      "Was verbal consent gained (yes/no)": setVerbalConsent,
      "Was written consent gained (yes/no)": setWrittenConsent,
    };

    // Fill all text fields — use AI value or "N/A" for fields with no content
    for (const [key, setter] of Object.entries(fieldMap)) {
      if (filledFields[key]) {
        setter(filledFields[key]);
      } else {
        // Fill missing required fields with N/A
        if (key !== "Is follow-up required and if so what are the details") {
          setter("N/A");
        }
      }
    }
    // Fill all boolean fields — default to false if not mentioned
    for (const [key, setter] of Object.entries(boolMap)) {
      if (filledFields[key]) {
        const val = filledFields[key].toLowerCase();
        setter(val === "yes" || val === "true" || val === "y");
      } else {
        setter(false);
      }
    }
    const parts: string[] = [];
    if (rawTranscript) parts.push("Full dictation transcript:\n" + rawTranscript);
    if (summary) parts.push("AI clinical summary:\n" + summary);
    if (parts.length > 0) {
      const newContent = parts.join("\n\n");
      setAiSummary((prev) => (prev ? prev + "\n\n---\n\n" + newContent : newContent));
    }
  };

  // Form state
  const [otherNotes, setOtherNotes] = useState("");
  const [presentingComplaint, setPresentingComplaint] = useState("");
  const [newsObservations, setNewsObservations] = useState<NEWSObservation[]>([]);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [examinationFindings, setExaminationFindings] = useState("");
  const [procedurePerformed, setProcedurePerformed] = useState("");
  const [procedureNotes, setProcedureNotes] = useState("");
  const [equipmentUsed, setEquipmentUsed] = useState("");
  const [outcome, setOutcome] = useState("");
  const [complications, setComplications] = useState("");
  const [aftercareAdvice, setAftercareAdvice] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [verbalConsent, setVerbalConsent] = useState(false);
  const [writtenConsent, setWrittenConsent] = useState(false);
  const [risksExplained, setRisksExplained] = useState(false);
  const [patientUnderstood, setPatientUnderstood] = useState(false);
  const [completedBy, setCompletedBy] = useState("Matt Shaw");
  const [patientSignature, setPatientSignature] = useState<string | null>(null);
  const [practitionerSignature, setPractitionerSignature] = useState<string | null>(null);
  const [verbalConsentWitness, setVerbalConsentWitness] = useState("");

  const fetchKitInventory = useCallback(async (sId: string | null) => {
    const { data } = await supabase.from('kit_inventory').select('id, kit_name, service_types, available_kits, is_washable').order('kit_name');
    if (data) {
      let filteredKits = data as KitItem[];
      if (sId) {
        // service_types stores service IDs — match directly against the service ID
        filteredKits = filteredKits.filter(k => 
          k.service_types.length === 0 || k.service_types.includes(sId)
        );
      }
      setAvailableKits(filteredKits);
    }
  }, []);

  useEffect(() => {
    if (open && appointmentId) {
      loadExisting();
      // Fetch service_id and patient ID
      supabase.from('appointments').select('client_email, service_id').eq('id', appointmentId).single().then(({ data }) => {
        if (data?.service_id) {
          setServiceId(data.service_id);
          fetchKitInventory(data.service_id);
        } else {
          fetchKitInventory(null);
        }
        if (data?.client_email) {
          supabase.from('patients').select('id').eq('client_email', data.client_email).maybeSingle().then(({ data: p }) => {
            if (p) setConsultPatientId(p.id);
          });
        }
      });
    }
  }, [open, appointmentId]);

  const loadExisting = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("consultation_notes")
      .select("*")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (data) {
      const n = data as unknown as ConsultationNote;
      setExistingId(n.id);
      setOtherNotes((n as any).other_notes || "");
      setPresentingComplaint(n.presenting_complaint || "");
      setMedicalHistory(n.medical_history || "");
      setCurrentMedications(n.current_medications || "");
      setAllergies(n.allergies || "");
      setExaminationFindings(n.examination_findings || "");
      setProcedurePerformed(n.procedure_performed || "");
      setProcedureNotes(n.procedure_notes || "");
      setEquipmentUsed(n.equipment_used || "");
      // Parse kit IDs and quantities from equipment_used field (format: "Kit Name ×2, Kit Name [kit:id1:2,id2:1]")
      const kitMatch = (n.equipment_used || "").match(/\[kit:([^\]]+)\]/);
      if (kitMatch) {
        const quantities: Record<string, number> = {};
        kitMatch[1].split(",").forEach(entry => {
          const parts = entry.split(":");
          if (parts.length === 2) quantities[parts[0]] = parseInt(parts[1]) || 1;
          else if (parts.length === 1) quantities[parts[0]] = 1;
        });
        setKitQuantities(quantities);
        setInitialKitQuantities({ ...quantities });
      } else {
        setKitQuantities({});
        setInitialKitQuantities({});
      }
      setOutcome(n.outcome || "");
      setComplications(n.complications || "");
      setAftercareAdvice(n.aftercare_advice || "");
      setFollowUpRequired(n.follow_up_required);
      setFollowUpNotes(n.follow_up_notes || "");
      setVerbalConsent(n.verbal_consent_gained);
      setWrittenConsent(n.written_consent_gained);
      setRisksExplained(n.risks_explained);
      setPatientUnderstood(n.patient_understood);
      setCompletedBy(n.completed_by || "Matt Shaw");
      setPatientSignature(n.patient_signature || null);
      setPractitionerSignature(n.practitioner_signature || null);
      setVerbalConsentWitness(n.verbal_consent_witness || "");
      if (n.ai_prefill_summary) setAiSummary(n.ai_prefill_summary);
      // Load NEWS observations from the record
      try {
        const newsData = (data as any).news_observations;
        if (newsData && Array.isArray(newsData)) setNewsObservations(newsData);
        else setNewsObservations([]);
      } catch { setNewsObservations([]); }
    } else {
      resetForm();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setExistingId(null);
    setOtherNotes("");
    setPresentingComplaint("");
    setMedicalHistory("");
    setCurrentMedications("");
    setAllergies("");
    setExaminationFindings("");
    setProcedurePerformed("");
    setProcedureNotes("");
    setEquipmentUsed("");
    setOutcome("");
    setComplications("");
    setAftercareAdvice("");
    setFollowUpRequired(false);
    
    setFollowUpNotes("");
    setVerbalConsent(false);
    setWrittenConsent(false);
    setRisksExplained(false);
    setPatientUnderstood(false);
    setCompletedBy("Matt Shaw");
    setPatientSignature(null);
    setPractitionerSignature(null);
    setKitQuantities({});
    setInitialKitQuantities({});
    setVerbalConsentWitness("");
    setNewsObservations([]);
  };

  // Helper to build equipment_used string from quantities
  const buildEquipmentText = useCallback((quantities: Record<string, number>, extra: string = "") => {
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
    const extraTrimmed = extra.trim();
    const text = [names, extraTrimmed].filter(Boolean).join(", ");
    return kitTag ? `${text} [kit:${kitTag}]` : text;
  }, [availableKits]);

  // Build the save payload (shared between auto-save and manual save)
  const buildPayload = useCallback(() => ({
    appointment_id: appointmentId,
    presenting_complaint: presentingComplaint.trim() || null,
    other_notes: otherNotes.trim() || null,
    medical_history: medicalHistory.trim() || null,
    current_medications: currentMedications.trim() || null,
    allergies: allergies.trim() || null,
    examination_findings: examinationFindings.trim() || null,
    procedure_performed: procedurePerformed.trim() || null,
    procedure_notes: procedureNotes.trim() || null,
    equipment_used: equipmentUsed.trim() || null,
    outcome: outcome.trim() || null,
    complications: complications.trim() || null,
    aftercare_advice: aftercareAdvice.trim() || null,
    follow_up_required: followUpRequired,
    follow_up_notes: followUpNotes.trim() || null,
    verbal_consent_gained: verbalConsent,
    written_consent_gained: writtenConsent,
    risks_explained: risksExplained,
    patient_understood: patientUnderstood,
    completed_by: "Matt Shaw",
    patient_signature: patientSignature || null,
    practitioner_signature: practitionerSignature || null,
    verbal_consent_witness: verbalConsentWitness.trim() || null,
    ai_prefill_summary: aiSummary || null,
    news_observations: newsObservations.length > 0 ? newsObservations : [],
  }), [appointmentId, otherNotes, presentingComplaint, medicalHistory, currentMedications, allergies, examinationFindings, procedurePerformed, procedureNotes, equipmentUsed, outcome, complications, aftercareAdvice, followUpRequired, followUpNotes, verbalConsent, writtenConsent, risksExplained, patientUnderstood, completedBy, patientSignature, practitionerSignature, verbalConsentWitness, aiSummary, newsObservations]);

  // Auto-save with debounce
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const hasLoadedRef = useRef(false);

  // Manual draft save (keeps form open)
  const handleSaveDraft = useCallback(async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setDraftSaving(true);
    const payload = buildPayload();
    try {
      let error;
      if (existingId) {
        ({ error } = await supabase.from("consultation_notes").update(payload as any).eq("id", existingId));
      } else {
        const { data, error: insertError } = await supabase.from("consultation_notes").insert(payload as any).select("id").single();
        error = insertError;
        if (data?.id) setExistingId(data.id);
      }
      if (!error) {
        setDraftSaved(true);
        toast.success("Draft saved", { duration: 1500 });
        setTimeout(() => setDraftSaved(false), 2500);
      } else {
        toast.error("Failed to save draft");
      }
    } catch {
      toast.error("Failed to save draft");
    }
    setDraftSaving(false);
  }, [buildPayload, existingId]);

  // Save on visibility change (phone lock / tab switch)
  useEffect(() => {
    if (!open || !hasLoadedRef.current) return;
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Immediately save when leaving
        const payload = buildPayload();
        if (existingId) {
          supabase.from("consultation_notes").update(payload as any).eq("id", existingId);
        } else {
          supabase.from("consultation_notes").insert(payload as any).select("id").single().then(({ data }) => {
            if (data?.id) setExistingId(data.id);
          });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [open, buildPayload, existingId]);

  useEffect(() => {
    // Don't auto-save while loading initial data
    if (loading || !open || !hasLoadedRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      const payload = buildPayload();
      setAutoSaveStatus('saving');
      try {
        let error;
        if (existingId) {
          ({ error } = await supabase.from("consultation_notes").update(payload as any).eq("id", existingId));
        } else {
          const { data, error: insertError } = await supabase.from("consultation_notes").insert(payload as any).select("id").single();
          error = insertError;
          if (data?.id) setExistingId(data.id);
        }
        if (!error) {
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } else {
          setAutoSaveStatus('idle');
        }
      } catch {
        setAutoSaveStatus('idle');
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [buildPayload, existingId, loading, open]);

  // Mark as loaded after initial load completes
  useEffect(() => {
    if (!loading && open) {
      // Small delay to prevent auto-save from firing on initial load
      const t = setTimeout(() => { hasLoadedRef.current = true; }, 500);
      return () => clearTimeout(t);
    }
    if (!open) { hasLoadedRef.current = false; }
  }, [loading, open]);

  const handleVerbalConsentOverride = () => {
    setVerbalConsent(true);
    setWrittenConsent(true);
    setPatientUnderstood(true);
    setRisksExplained(true);
    toast.success("Verbal consent recorded — consent marked as complete");
  };

  const handleSave = async () => {
    setSaving(true);
    // Cancel any pending auto-save
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    const payload = buildPayload();

    let error;
    if (existingId) {
      ({ error } = await supabase.from("consultation_notes").update(payload as any).eq("id", existingId));
    } else {
      ({ error } = await supabase.from("consultation_notes").insert(payload as any));
    }

    if (error) {
      toast.error("Failed to save consultation note");
    } else {
      toast.success(existingId ? "Consultation note updated" : "Consultation note saved");

      // Deduct/adjust inventory based on quantity changes
      for (const [kitId, newQty] of Object.entries(kitQuantities)) {
        const oldQty = initialKitQuantities[kitId] || 0;
        const diff = newQty - oldQty;
        if (diff === 0) continue;
        const kit = availableKits.find(k => k.id === kitId);
        if (!kit) continue;
        if (diff > 0) {
          // More used than before
          if (!kit.is_washable) {
            await supabase.from('kit_inventory').update({ available_kits: Math.max(0, kit.available_kits - diff) }).eq('id', kitId);
          }
          await supabase.from('kit_usage_log').insert({ kit_id: kitId, event_type: 'used', quantity: diff, appointment_id: appointmentId, notes: `Used ${diff} in consultation${kit.is_washable ? ' (reusable)' : ''}` });
        } else {
          // Reduced usage
          if (!kit.is_washable) {
            await supabase.from('kit_inventory').update({ available_kits: kit.available_kits + Math.abs(diff) }).eq('id', kitId);
          }
          await supabase.from('kit_usage_log').insert({ kit_id: kitId, event_type: 'returned', quantity: Math.abs(diff), appointment_id: appointmentId, notes: `Reduced usage by ${Math.abs(diff)} in consultation` });
        }
      }
      // Handle fully removed kits
      for (const [kitId, oldQty] of Object.entries(initialKitQuantities)) {
        if (!(kitId in kitQuantities) || kitQuantities[kitId] === 0) {
          const kit = availableKits.find(k => k.id === kitId);
          if (kit && !kit.is_washable) {
            await supabase.from('kit_inventory').update({ available_kits: kit.available_kits + oldQty }).eq('id', kitId);
          }
          if (kit) {
            await supabase.from('kit_usage_log').insert({ kit_id: kitId, event_type: 'returned', quantity: oldQty, appointment_id: appointmentId, notes: `Removed from consultation` });
          }
        }
      }
      setInitialKitQuantities({ ...kitQuantities });


      onOpenChange(false);
      onComplete?.();
    }
    setSaving(false);
  };

  const handleDownloadPdf = async () => {
    // Fetch patient details for the PDF
    const { data: apt } = await supabase.from("appointments")
      .select("client_email, client_phone, address, postcode, appointment_date")
      .eq("id", appointmentId).single();
    
    let patientDob: string | null = null;
    if (apt?.client_email) {
      const { data: pat } = await supabase.from("patients")
        .select("date_of_birth").eq("client_email", apt.client_email).maybeSingle();
      if (pat?.date_of_birth) patientDob = pat.date_of_birth;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;
    let pageNum = 1;

    // Theme colors
    const amberR = 212, amberG = 145, amberB = 42;
    const darkR = 14, darkG = 20, darkB = 32;

    const addPageFooter = () => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);
      doc.text(`matt@shawscope.co.uk  |  01305 340194`, pageWidth / 2, pageHeight - 10, { align: "center" });
      doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: "right" });
      doc.text("CONFIDENTIAL", margin, pageHeight - 10);
      doc.setTextColor(0);
    };

    const newPage = () => {
      addPageFooter();
      doc.addPage();
      pageNum++;
      y = 16;
    };

    const checkPage = (needed = 12) => {
      if (y > pageHeight - 25 - needed) newPage();
    };

    const addSectionHeading = (text: string) => {
      checkPage(14);
      // Amber accent bar
      doc.setFillColor(amberR, amberG, amberB);
      doc.rect(margin, y - 1, 3, 6, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkR, darkG, darkB);
      doc.text(text, margin + 6, y + 4);
      doc.setTextColor(0);
      y += 10;
    };

    const addField = (label: string, value: string) => {
      if (!value) return;
      checkPage(10);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(amberR, amberG, amberB);
      doc.text(label, margin + 2, y);
      doc.setTextColor(0);
      y += 4;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50);
      const lines = doc.splitTextToSize(value, contentWidth - 4);
      for (const line of lines) {
        checkPage(5);
        doc.text(line, margin + 2, y);
        y += 4.2;
      }
      doc.setTextColor(0);
      y += 2;
    };

    const addCheck = (label: string, checked: boolean) => {
      checkPage(6);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50);
      // Draw checkbox
      doc.setDrawColor(amberR, amberG, amberB);
      doc.setLineWidth(0.4);
      doc.rect(margin + 2, y - 3.2, 3.5, 3.5);
      if (checked) {
        doc.setFillColor(amberR, amberG, amberB);
        doc.rect(margin + 2.6, y - 2.6, 2.3, 2.3, "F");
      }
      doc.text(label, margin + 7.5, y);
      doc.setTextColor(0);
      doc.setDrawColor(0);
      y += 5;
    };

    // === HEADER ===
    const centerX = pageWidth / 2;
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    const shawWidth = doc.getTextWidth("Shaw");
    const scopeWidth = doc.getTextWidth("Scope");
    const totalWidth = shawWidth + scopeWidth;
    doc.setTextColor(darkR, darkG, darkB);
    doc.text("Shaw", centerX - totalWidth / 2, y);
    doc.setTextColor(amberR, amberG, amberB);
    doc.text("Scope", centerX - totalWidth / 2 + shawWidth, y);
    y += 5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130);
    doc.text("A Home Visiting Service", centerX, y, { align: "center" });
    y += 4;
    doc.setDrawColor(amberR, amberG, amberB);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    // === TITLE ===
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkR, darkG, darkB);
    doc.text("Consultation Notes", centerX, y, { align: "center" });
    doc.setTextColor(0);
    y += 8;

    // === PATIENT INFO BOX ===
    const boxTop = y;
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(230);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, boxTop, contentWidth, 28, 2, 2, "FD");
    
    y = boxTop + 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(amberR, amberG, amberB);
    doc.text("PATIENT DETAILS", margin + 4, y);
    doc.setTextColor(0);
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    const col1 = margin + 4;
    const col2 = margin + contentWidth / 2;
    
    if (clientName) { doc.setFont("helvetica", "bold"); doc.text(clientName, col1, y); doc.setFont("helvetica", "normal"); }
    if (patientDob) { doc.text(`DOB: ${format(new Date(patientDob), "dd/MM/yyyy")}`, col2, y); }
    y += 4.5;
    if (apt?.client_email && !apt.client_email.includes("noemail.")) {
      doc.text(apt.client_email, col1, y);
    }
    if (apt?.client_phone) { doc.text(apt.client_phone, col2, y); }
    y += 4.5;
    const fullAddress = [apt?.address, apt?.postcode].filter(Boolean).join(", ");
    if (fullAddress) {
      const addrLines = doc.splitTextToSize(fullAddress, contentWidth / 2 - 8);
      doc.text(addrLines, col1, y);
    }
    if (serviceName) { doc.text(`Service: ${serviceName}`, col2, y); }

    y = boxTop + 30;

    // Date line
    doc.setFontSize(8);
    doc.setTextColor(100);
    const dateStr = apt?.appointment_date 
      ? format(new Date(apt.appointment_date), "dd MMMM yyyy")
      : new Date().toLocaleDateString("en-GB");
    doc.text(`Date of consultation: ${dateStr}`, margin, y);
    doc.setTextColor(0);
    y += 8;

    // === CONTENT ===
    if (newsObservations.length > 0) {
      addSectionHeading("Clinical Observations (NEWS2)");
      newsObservations.forEach((obs, idx) => {
        addField(`Observation ${idx + 1} (${format(new Date(obs.timestamp), "dd/MM/yyyy HH:mm")})`,
          `RR: ${obs.respirationRate || '-'}, SpO₂: ${obs.spo2 || '-'}%, ${obs.airOrOxygen === 'oxygen' ? 'On O₂' : 'Room air'}, BP: ${obs.systolicBP || '-'} mmHg, HR: ${obs.pulse || '-'} bpm, ${obs.consciousness === 'alert' ? 'Alert' : 'CVPU'}, Temp: ${obs.temperature || '-'}°C — Score: ${obs.score}/21`
        );
        if (obs.gpReferred) addCheck("GP referral recommended", true);
      });
    }

    if (aiSummary) {
      addSectionHeading("AI Summary & Dictation Record");
      addField("Summary", aiSummary);
    }

    if (otherNotes) {
      addSectionHeading("Other Notes");
      addField("Additional Notes", otherNotes);
    }

    addSectionHeading("Patient History");
    addField("Presenting Complaint", presentingComplaint);
    addField("Medical History", medicalHistory);
    addField("Current Medications", currentMedications);
    addField("Allergies", allergies);

    addSectionHeading("Examination & Procedure");
    addField("Examination Findings", examinationFindings);
    addField("Procedure Performed", procedurePerformed);
    addField("Equipment Used", equipmentUsed.replace(/\s*\[kit:[^\]]*\]/, ''));
    addField("Procedure Notes", procedureNotes);

    addSectionHeading("Outcome");
    addField("Outcome / Result", outcome);
    addField("Complications", complications);

    addSectionHeading("Aftercare");
    addField("Aftercare Advice", aftercareAdvice);
    addCheck("Follow-up required", followUpRequired);
    if (followUpRequired) addField("Follow-up Notes", followUpNotes);

    addSectionHeading("Consent");
    addCheck("Verbal consent gained", verbalConsent);
    addCheck("Written consent gained", writtenConsent);
    addCheck("Risks and benefits explained", risksExplained);
    addCheck("Patient confirmed understanding", patientUnderstood);
    if (verbalConsentWitness) addField("Verbal consent witness", verbalConsentWitness);

    // Signatures
    if (patientSignature) {
      addSectionHeading("Patient Signature");
      checkPage(30);
      try { doc.addImage(patientSignature, "PNG", margin, y, 55, 22); y += 26; } catch { /* skip */ }
    }
    if (practitionerSignature) {
      addSectionHeading("Practitioner Signature");
      checkPage(30);
      try { doc.addImage(practitionerSignature, "PNG", margin, y, 55, 22); y += 26; } catch { /* skip */ }
    }

    if (completedBy) {
      y += 2;
      addField("Completed By", completedBy);
    }

    // Add footer to last page
    addPageFooter();

    const safeName = (clientName || "patient").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`consultation_notes_${safeName}.pdf`);
    toast.success("PDF downloaded");
  };

  const consentComplete = hasSignedConsent || verbalConsent;

  return (
    <>
      <Dialog open={open && !showPatientSigPad && !showPractitionerSigPad} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-secondary" />
              Consultation Notes
            </DialogTitle>
            {(clientName || serviceName) && (
              <p className="text-sm text-muted-foreground">
                {clientName && <span className="font-medium text-foreground">{clientName}</span>}
                {clientName && serviceName && " · "}
                {serviceName}
              </p>
            )}
          </DialogHeader>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : (
            <div className="space-y-6">
              {/* Consent Status Indicator */}
              {hasSignedConsent && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                    Patient has already signed the consent form — patient signature not required below
                  </p>
                </div>
              )}

              {/* NEWS2 Clinical Observations */}
              <NEWSScorePanel observations={newsObservations} onChange={setNewsObservations} />

              <Separator />

              {/* Patient History Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">Other Notes & Comments</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm text-foreground">Anything you want to note — comments, observations, anything said, reminders, or general notes</Label>
                    <Textarea value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} placeholder="Type anything here — comments, anything said by the patient or practitioner, observations, reminders..." rows={4} className="border-secondary/30 text-foreground" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Patient History Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Patient History</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Presenting Complaint</Label>
                    <Textarea value={presentingComplaint} onChange={(e) => setPresentingComplaint(e.target.value)} placeholder="Reason for visit / chief complaint..." rows={2} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Medical History</Label>
                    <Textarea value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} placeholder="Relevant medical history..." rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Current Medications</Label>
                      <Textarea value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} placeholder="List any medications..." rows={2} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Allergies</Label>
                      <Textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Known allergies..." rows={2} />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Examination & Procedure Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Examination & Procedure</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Examination Findings</Label>
                    <Textarea value={examinationFindings} onChange={(e) => setExaminationFindings(e.target.value)} placeholder="Clinical findings on examination..." rows={2} />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm">Procedure Performed</Label>
                      <Input value={procedurePerformed} onChange={(e) => setProcedurePerformed(e.target.value)} placeholder="e.g. Microsuction, Cryotherapy" />
                    </div>

                  {/* Equipment Used - Kit Inventory with Quantities */}
                  <div className="space-y-2">
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
                                    const extra = equipmentUsed.replace(/\s*\[kit:[^\]]*\]/, '').replace(/^[^,]*(?:,\s*[^,[]*)*/, '').trim();
                                    setEquipmentUsed(buildEquipmentText(updated, extra));
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
                                    const extra = equipmentUsed.replace(/\s*\[kit:[^\]]*\]/, '').replace(/^[^,]*(?:,\s*[^,[]*)*/, '').trim();
                                    setEquipmentUsed(buildEquipmentText(updated, extra));
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
                          <Switch checked={newKitWashable} onCheckedChange={setNewKitWashable} />
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
                          <Label className="text-xs font-normal text-foreground">Keep this kit for all future {serviceName || 'this type of'} consultations</Label>
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
                                service_type: serviceId || 'general',
                                service_types: newKitForFuture && serviceId ? [serviceId] : [],
                                total_kits: newKitTotal,
                                available_kits: newKitTotal,
                                low_stock_threshold: newKitThreshold,
                                is_washable: newKitWashable,
                              };
                              const { data, error } = await supabase.from('kit_inventory').insert(payload).select('id, kit_name, service_types, available_kits, is_washable').single();
                              if (error) {
                                toast.error('Failed to add kit');
                              } else if (data) {
                                toast.success(`${newKitName.trim()} added to inventory`);
                                setAvailableKits(prev => [...prev, data as KitItem]);
                                // Auto-select 1 of the new kit
                                const updated = { ...kitQuantities, [data.id]: 1 };
                                setKitQuantities(updated);
                                setEquipmentUsed(buildEquipmentText(updated));
                                setShowAddKit(false);
                                setNewKitName("");
                              }
                              setAddingKit(false);
                            }}
                          >
                            {addingKit ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                            Add Kit
                          </Button>
                        </div>
                      </div>
                    )}

                    <Input value={equipmentUsed.replace(/\s*\[kit:[^\]]*\]/, '')} onChange={(e) => {
                      const kitTag = Object.keys(kitQuantities).length > 0 ? ` [kit:${Object.entries(kitQuantities).filter(([,q]) => q > 0).map(([id,q]) => `${id}:${q}`).join(",")}]` : "";
                      setEquipmentUsed(e.target.value + kitTag);
                    }} placeholder="Additional equipment notes..." className="text-sm" />
                  </div>
                  {/* ShawScope Hearing Screening - only for earwax/wellness */}
                  {(serviceName?.toLowerCase().includes('earwax') || serviceName?.toLowerCase().includes('wellness') || serviceName?.toLowerCase().includes('ear')) && consultPatientId && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <Button variant="outline" className="w-full" onClick={() => setHearingScreenOpen(true)}>
                        <Ear className="h-4 w-4 mr-2" /> Run ShawScope Hearing Screening
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                        Opens screening modal — patient pre-selected. Returns here when done.
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-sm">Procedure Notes</Label>
                    <Textarea value={procedureNotes} onChange={(e) => setProcedureNotes(e.target.value)} placeholder="Detailed procedure notes..." rows={3} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Outcomes Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Outcome</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Outcome / Result</Label>
                    <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Treatment outcome..." rows={2} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Complications (if any)</Label>
                    <Textarea value={complications} onChange={(e) => setComplications(e.target.value)} placeholder="Any complications or adverse events..." rows={2} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Aftercare Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Aftercare</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Aftercare Advice Given</Label>
                    <Textarea value={aftercareAdvice} onChange={(e) => setAftercareAdvice(e.target.value)} placeholder="Aftercare instructions provided to patient..." rows={3} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={followUpRequired} onCheckedChange={(c) => setFollowUpRequired(!!c)} />
                    <Label className="font-normal">Follow-up appointment required</Label>
                  </div>
                  {followUpRequired && (
                    <div className="space-y-1">
                      <Label className="text-sm">Follow-up Notes</Label>
                      <Textarea value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} placeholder="When and why follow-up is needed..." rows={2} />
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Consent & Signatures Section */}
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
                    <Input
                      value={verbalConsentWitness}
                      onChange={(e) => setVerbalConsentWitness(e.target.value)}
                      placeholder="Name of witness to verbal consent"
                      className="text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-amber-300 hover:bg-amber-100"
                    onClick={handleVerbalConsentOverride}
                  >
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

              <Separator />

              {/* Completed By — always Matt Shaw */}
              <div className="space-y-1">
                <Label className="text-sm">Completed By</Label>
                <Input value="Matt Shaw" disabled className="bg-muted" />
              </div>


              {/* Auto-save indicator */}
              {autoSaveStatus !== 'idle' && (
                <p className="text-xs text-muted-foreground text-center">
                  {autoSaveStatus === 'saving' ? '⏳ Auto-saving...' : '✓ Auto-saved'}
                </p>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save & Close"}
                </Button>
                {existingId && (
                  <Button variant="outline" onClick={handleDownloadPdf} title="Download as PDF">
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {/* Extra padding for floating button */}
              <div className="h-16" />
            </div>
          )}

          {/* Floating save draft button */}
          {!loading && (
            <button
              onClick={handleSaveDraft}
              disabled={draftSaving}
              className={cn(
                "fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-full px-4 py-3 shadow-lg transition-all duration-300",
                "text-sm font-medium",
                draftSaved
                  ? "bg-emerald-600 text-white"
                  : draftSaving
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
              )}
            >
              {draftSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : draftSaved ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{draftSaving ? "Saving…" : draftSaved ? "Saved ✓" : "Save Draft"}</span>
            </button>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-screen signature pads */}
      <SignaturePad
        open={showPatientSigPad}
        onClose={() => setShowPatientSigPad(false)}
        onSave={(dataUrl) => { setPatientSignature(dataUrl); setWrittenConsent(true); }}
        title="Patient Signature"
      />
      <SignaturePad
        open={showPractitionerSigPad}
        onClose={() => setShowPractitionerSigPad(false)}
        onSave={setPractitionerSignature}
        title="Practitioner Signature"
      />
      <HearingScreeningDialog
        open={hearingScreenOpen}
        onOpenChange={setHearingScreenOpen}
        patientId={consultPatientId}
        patientName={clientName}
        serviceContext={serviceName?.toLowerCase().includes('earwax') ? 'earwax_removal' : serviceName?.toLowerCase().includes('wellness') ? 'ear_wellness' : 'standalone'}
        onComplete={() => setHearingScreenOpen(false)}
      />
    </>
  );
};

export default ConsultationNoteDialog;
