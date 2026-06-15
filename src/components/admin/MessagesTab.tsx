import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, parseISO, addHours, addDays } from "date-fns";
import { Search, Mail, MessageSquare, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, Trash2, X, Send, Archive, Eye, Plus, User, Calendar, AlertTriangle, FileText, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import PlannedCommunications from "./PlannedCommunications";

interface CommLog {
  id: string;
  channel: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  subject: string | null;
  body_preview: string | null;
  body_html: string | null;
  trigger_type: string;
  appointment_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

const triggerLabels: Record<string, string> = {
  new_request: "New Booking",
  approved: "Consent Form",
  rejected: "Booking Rejected",
  cancelled: "Booking Cancelled",
  follow_up: "Follow Up",
  appointment_changed: "Appointment Changed",
  notification: "Notification",
  consent_form_copy: "Consent Form Copy",
  form_email: "Form Sent",
  manual_sms_reminder: "SMS Reminder (Manual)",
  auto_sms_reminder: "SMS Reminder (Auto)",
  review_request: "Review Request",
  cryo_followup: "Cryo Follow-up",
  cryo_aftercare: "Cryo Aftercare",
  booking_received_sms: "SMS Confirmation",
  booking_confirmed_sms: "SMS Confirmed",
  sms_reminder: "SMS Reminder",
  consent_reminder: "Consent Reminder",
  patient_recall: "Patient Recall",
  manual: "Manual Message",
  morning_reminder: "Morning Reminder",
  on_my_way: "On My Way",
  delay_notification: "Delay Notification",
  arrived: "Arrived",
};

// Color themes for different trigger types
const triggerColors: Record<string, string> = {
  new_request: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  rejected: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
  cancelled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
  follow_up: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
  appointment_changed: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
  notification: "bg-muted text-muted-foreground border-border dark:bg-background/30 dark:text-muted-foreground dark:border-border",
  consent_form_copy: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800",
  form_email: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800",
  review_request: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  cryo_followup: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800",
  cryo_aftercare: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800",
  booking_received_sms: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  booking_confirmed_sms: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  sms_reminder: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800",
  manual_sms_reminder: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800",
  auto_sms_reminder: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800",
  consent_reminder: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
  patient_recall: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800",
  manual: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800",
  morning_reminder: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800",
  on_my_way: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  delay_notification: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  arrived: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
};

interface PendingComm {
  id: string;
  channel: string;
  trigger_type: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  subject: string | null;
  scheduled_for: string;
  status: string;
  appointment_id: string | null;
  metadata: any;
}

const PendingCommItem = ({ comm, onCancel, onDelete, onView }: { comm: PendingComm; onCancel: (id: string) => void; onDelete: (id: string) => void; onView: (comm: PendingComm) => void }) => {
  const scheduledTime = parseISO(comm.scheduled_for);
  const isOverdue = scheduledTime.getTime() < Date.now();
  const triggerColor = triggerColors[comm.trigger_type] || triggerColors.notification;

  return (
    <div className="rounded-lg border p-3 bg-muted/40 border-border cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => onView(comm)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5 bg-secondary/50">
            {comm.channel === "email" ? <Mail className="h-4 w-4 text-muted-foreground" /> : <MessageSquare className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate text-white">{comm.recipient_name || "Unknown"}</p>
              <Badge className={cn("text-[10px] px-1.5 py-0 border", triggerColor)}>
                {triggerLabels[comm.trigger_type] || comm.trigger_type}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {comm.channel === "email" ? comm.recipient_email : comm.recipient_phone}
              {comm.subject && <> · {comm.subject}</>}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground font-medium">
                {isOverdue ? "Sending now..." : `${format(scheduledTime, "dd MMM")} at ${format(scheduledTime, "HH:mm")}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={() => onView(comm)} title="Preview message">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={() => onCancel(comm.id)} title="Cancel (keeps record)">
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(comm.id)} title="Delete permanently">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const MessagesTab = () => {
  const [pendingComms, setPendingComms] = useState<PendingComm[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [sentDialogOpen, setSentDialogOpen] = useState(false);
  const [sentLogs, setSentLogs] = useState<CommLog[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentSearch, setSentSearch] = useState("");
  const [sentChannelFilter, setSentChannelFilter] = useState<string>("all");
  const [sentDateFilter, setSentDateFilter] = useState<string>("30");
  const [sentPage, setSentPage] = useState(0);
  const [selectedMsg, setSelectedMsg] = useState<CommLog | null>(null);
  const [plannedCollapsed, setPlannedCollapsed] = useState(true);
  const [selectedPending, setSelectedPending] = useState<PendingComm | null>(null);
  const [pendingPreviewHtml, setPendingPreviewHtml] = useState<string | null>(null);
  const [pendingPreviewLoading, setPendingPreviewLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeChannel, setComposeChannel] = useState<"email" | "sms">("email");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeScheduleFor, setComposeScheduleFor] = useState("");
  const [composePatientSearch, setComposePatientSearch] = useState("");
  const [composePatients, setComposePatients] = useState<any[]>([]);
  const [composeSelectedPatient, setComposeSelectedPatient] = useState<any | null>(null);
  const [composeAppointments, setComposeAppointments] = useState<any[]>([]);
  const [composeSelectedAppointment, setComposeSelectedAppointment] = useState<any | null>(null);
  const [composeSending, setComposeSending] = useState(false);
  const [missingConsentApts, setMissingConsentApts] = useState<any[]>([]);
  const [consentTemplates, setConsentTemplates] = useState<any[]>([]);
  const [sendingFormFor, setSendingFormFor] = useState<string | null>(null);
  const [sendFormDialogApt, setSendFormDialogApt] = useState<any | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const PAGE_SIZE = 50;

  const fetchPending = async () => {
    setPendingLoading(true);
    const { data } = await supabase
      .from("scheduled_communications")
      .select("id, channel, trigger_type, recipient_name, recipient_email, recipient_phone, subject, scheduled_for, status, appointment_id, metadata")
      .eq("status", "pending")
      .order("scheduled_for", { ascending: true });
    setPendingComms((data || []) as PendingComm[]);
    setPendingLoading(false);
  };

  const fetchMissingConsent = async () => {
    const today = new Date().toISOString().split("T")[0];
    // Get upcoming confirmed/approved appointments (exclude past)
    const { data: apts } = await supabase
      .from("appointments")
      .select("id, client_name, client_email, appointment_date, appointment_time, service_id, consent_sent_at, services:service_id(name)")
      .in("status", ["confirmed", "approved"])
      .gte("appointment_date", today)
      .order("appointment_date", { ascending: true });

    if (!apts?.length) { setMissingConsentApts([]); return; }

    // Get all appointment IDs that have consent responses
    const aptIds = apts.map(a => a.id);
    const { data: responses } = await supabase
      .from("consent_form_responses")
      .select("appointment_id")
      .in("appointment_id", aptIds);

    const completedIds = new Set((responses || []).map(r => r.appointment_id));
    const missing = apts.filter(a => !completedIds.has(a.id));
    setMissingConsentApts(missing);

    // Also fetch templates if not loaded
    if (consentTemplates.length === 0) {
      const { data: tpls } = await supabase
        .from("consent_form_templates")
        .select("id, title, form_type")
        .eq("is_active", true)
        .neq("form_type", "consultation")
        .order("title");
      setConsentTemplates(tpls || []);
    }
  };

  const handleSendConsentForm = async () => {
    if (!sendFormDialogApt || !selectedTemplateId) return;
    setSendingFormFor(sendFormDialogApt.id);
    try {
      const template = consentTemplates.find(t => t.id === selectedTemplateId);
      const { error } = await supabase.functions.invoke("send-form-email", {
        body: {
          appointmentId: sendFormDialogApt.id,
          recipientEmail: sendFormDialogApt.client_email,
          templateName: template?.title || "Consent Form",
        },
      });
      if (error) throw error;
      // Update the appointment with template and sent timestamp
      await supabase.from("appointments").update({
        consent_form_template_id: selectedTemplateId,
        consent_sent_at: new Date().toISOString(),
      }).eq("id", sendFormDialogApt.id);
      toast.success(`Consent form sent to ${sendFormDialogApt.client_name}`);
      setSendFormDialogApt(null);
      setSelectedTemplateId("");
      fetchMissingConsent();
    } catch (e: any) {
      toast.error("Failed to send: " + (e.message || "Unknown error"));
    }
    setSendingFormFor(null);
  };

  const handleMarkConsentComplete = async (aptId: string) => {
    // Insert a placeholder consent response to mark as manually completed
    const apt = missingConsentApts.find(a => a.id === aptId);
    if (!apt) return;
    const templateId = apt.consent_form_template_id;
    if (!templateId) {
      // If no template assigned, just remove from list by inserting a minimal response
      const fallbackTemplate = consentTemplates[0];
      if (!fallbackTemplate) { toast.error("No consent templates available"); return; }
      const { error } = await supabase.from("consent_form_responses").insert({
        appointment_id: aptId,
        consent_form_template_id: fallbackTemplate.id,
        responses: { manually_completed: true },
        status: "completed",
        submitter_name: "Admin (manual)",
      });
      if (error) { toast.error("Failed to mark complete"); return; }
    } else {
      const { error } = await supabase.from("consent_form_responses").insert({
        appointment_id: aptId,
        consent_form_template_id: templateId,
        responses: { manually_completed: true },
        status: "completed",
        submitter_name: "Admin (manual)",
      });
      if (error) { toast.error("Failed to mark complete"); return; }
    }
    toast.success("Marked as complete");
    fetchMissingConsent();
  };

  const cancelPending = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_communications")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Failed to cancel");
    else { toast.success("Message cancelled"); setPendingComms(prev => prev.filter(c => c.id !== id)); }
  };

  const deletePending = async (id: string) => {
    const { error } = await supabase.from("scheduled_communications").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Message permanently deleted"); setPendingComms(prev => prev.filter(c => c.id !== id)); }
  };

  const fetchSentLogs = async () => {
    setSentLoading(true);
    let query = supabase.from("communications_log").select("*").order("created_at", { ascending: false }).range(sentPage * PAGE_SIZE, (sentPage + 1) * PAGE_SIZE - 1);
    if (sentChannelFilter !== "all") query = query.eq("channel", sentChannelFilter);
    if (sentDateFilter !== "all") {
      const daysAgo = parseFloat(sentDateFilter);
      const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", since);
    }
    const { data } = await query;
    if (data) setSentLogs(data as CommLog[]);
    setSentLoading(false);
  };

  // Map scheduled comm trigger_types to their actual template trigger_types
  const smsTemplateMapping: Record<string, string> = {
    sms_reminder: "appointment_reminder",
    booking_received_sms: "booking_received",
    booking_confirmed_sms: "appointment_approved",
  };

  const compactVisitToken = (token?: string | null) => (token || "").split("-")[0];

  const fetchPendingPreview = async (comm: PendingComm) => {
    setPendingPreviewHtml(null);
    setPendingPreviewLoading(true);
    setSelectedPending(comm);

    // Build variable replacement map
    let vars: Record<string, string> = {
      "{{client_name}}": comm.recipient_name || "Patient",
      "{{client_email}}": comm.recipient_email || "",
    };

    if (comm.appointment_id) {
      const { data: apt } = await supabase.from("appointments").select("*, services:service_id(name)").eq("id", comm.appointment_id).maybeSingle();
      if (apt) {
        vars["{{service_name}}"] = (apt as any).services?.name || "Service";
        vars["{{date}}"] = apt.appointment_date ? format(parseISO(apt.appointment_date), "EEEE, MMMM d, yyyy") : "";
        vars["{{time}}"] = apt.appointment_time?.slice(0, 5) || "";
        vars["{{address}}"] = apt.address || "";
        vars["{{notes}}"] = apt.notes || "";
        vars["{{admin_notes}}"] = apt.admin_notes || "";
      }
    }

    const replaceVars = (text: string) => {
      let result = text;
      for (const [key, val] of Object.entries(vars)) {
        result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), val);
      }
      return result;
    };

    // Check for body stored in metadata (manual messages)
    const metadataBody = (comm.metadata as any)?.body_html || (comm.metadata as any)?.body_text;
    if (metadataBody) {
      if (comm.channel === "email" && (comm.metadata as any)?.body_html) {
        setPendingPreviewHtml(replaceVars((comm.metadata as any).body_html));
      } else {
        setPendingPreviewHtml(`<div style="font-family:sans-serif;padding:16px;white-space:pre-wrap;">${replaceVars(metadataBody)}</div>`);
      }
      setPendingPreviewLoading(false);
      return;
    }

    // Handle cryo follow-up templates separately
    if (comm.trigger_type === "cryo_followup" && comm.channel === "email") {
      const weekNumber = (comm.metadata as any)?.week_number || 1;
      const { data: cryoTpl } = await supabase.from("cryo_followup_templates").select("guidance_html, heading, subject").eq("week_number", weekNumber).eq("is_active", true).maybeSingle();
      if (cryoTpl?.guidance_html) {
        setPendingPreviewHtml(replaceVars(cryoTpl.guidance_html));
        setPendingPreviewLoading(false);
        return;
      }
    }

    // Handle morning_reminder, on_my_way, delay_notification — add extra template vars
    if (["morning_reminder", "on_my_way", "delay_notification"].includes(comm.trigger_type) && comm.appointment_id) {
      const { data: apt } = await supabase.from("appointments").select("access_token, client_name, appointment_time, service_id").eq("id", comm.appointment_id).maybeSingle();
      if (apt) {
        let serviceName = "your appointment";
        if (apt.service_id) {
          const { data: svc } = await supabase.from("services").select("name").eq("id", apt.service_id).maybeSingle();
          if (svc?.name) serviceName = svc.name;
        }
        const siteUrl = "https://shawscope.co.uk";
        vars["{{service_name}}"] = serviceName;
        vars["{{time}}"] = apt.appointment_time?.slice(0, 5) || "";
        const messageToken = comm.channel === "sms" ? compactVisitToken(apt.access_token) : apt.access_token;
        vars["{{ready_url}}"] = `${siteUrl}/visit-ready/${messageToken}`;
        vars["{{tracking_url}}"] = `${siteUrl}/visit-tracking/${messageToken}`;
        vars["{{eta}}"] = "~15 min";
        vars["{{eta_line}}"] = "Updated ETA: ~15 min";
      }
    }

    // Handle consent_reminder — add consent_url variable
    if (comm.trigger_type === "consent_reminder" && comm.appointment_id) {
      const { data: apt } = await supabase.from("appointments").select("access_token, appointment_date, appointment_time, services(name)").eq("id", comm.appointment_id).maybeSingle();
      if (apt) {
        const siteUrl = "https://shawscope.co.uk";
        vars["{{consent_url}}"] = `${siteUrl}/consent/${apt.access_token}`;
        const rawDate = apt.appointment_date;
        const dateParts = rawDate?.split("-");
        vars["{{date}}"] = dateParts?.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate || "";
        vars["{{time}}"] = apt.appointment_time?.slice(0, 5) || "";
        vars["{{service_name}}"] = (apt as any).services?.name || "your appointment";
      }
    }

    // Try email templates (with trigger type mapping)
    if (comm.channel === "email") {
      const emailTemplateMapping: Record<string, string> = {
        review_request: "review_request",
        approved: "approved",
        new_request: "new_request_client",
        cancelled: "cancelled",
        rejected: "rejected",
        appointment_changed: "appointment_changed",
      };
      const emailTrigger = emailTemplateMapping[comm.trigger_type] || comm.trigger_type;
      const { data: tpl } = await supabase.from("email_templates").select("body_html, subject").eq("trigger_type", emailTrigger).eq("is_active", true).maybeSingle();
      if (tpl?.body_html) {
        setPendingPreviewHtml(replaceVars(tpl.body_html));
        setPendingPreviewLoading(false);
        return;
      }
    }

    // Try SMS templates (with trigger type mapping)
    if (comm.channel === "sms") {
      const smsTrigger = smsTemplateMapping[comm.trigger_type] || comm.trigger_type;
      const { data: smsTpl } = await supabase.from("sms_templates").select("body_text").eq("trigger_type", smsTrigger).eq("is_active", true).maybeSingle();
      if (smsTpl?.body_text) {
        const text = replaceVars(smsTpl.body_text);
        setPendingPreviewHtml(`<div style="font-family:sans-serif;padding:16px;white-space:pre-wrap;">${text}</div>`);
        setPendingPreviewLoading(false);
        return;
      }
    }

    setPendingPreviewLoading(false);
  };

  const sendTestNotification = async () => {
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          appointmentId: null,
          type: "test",
          testMode: true,
        },
      });
      if (error) throw error;
      toast.success("Test notification sent to your admin phone & email");
    } catch (e: any) {
      toast.error("Failed to send test: " + (e.message || "Unknown error"));
    }
    setSendingTest(false);
  };

  useEffect(() => { fetchPending(); fetchMissingConsent(); }, []);
  useEffect(() => { const interval = setInterval(() => { fetchPending(); fetchMissingConsent(); }, 30000); return () => clearInterval(interval); }, []);
  useEffect(() => { if (sentDialogOpen) fetchSentLogs(); }, [sentDialogOpen, sentChannelFilter, sentDateFilter, sentPage]);

  // Compose: search patients
  useEffect(() => {
    if (!composeOpen || composePatientSearch.length < 2) { setComposePatients([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase.from("patients").select("id, client_name, client_email, client_phone").or(`client_name.ilike.%${composePatientSearch}%,client_email.ilike.%${composePatientSearch}%`).limit(10);
      setComposePatients(data || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [composePatientSearch, composeOpen]);

  // Compose: fetch appointments for selected patient
  useEffect(() => {
    if (!composeSelectedPatient) { setComposeAppointments([]); return; }
    (async () => {
      const { data } = await supabase.from("appointments").select("id, appointment_date, appointment_time, status, services:service_id(name)").eq("client_email", composeSelectedPatient.client_email).order("appointment_date", { ascending: false }).limit(20);
      setComposeAppointments(data || []);
    })();
  }, [composeSelectedPatient]);

  const handleComposeSubmit = async () => {
    if (!composeSelectedPatient) { toast.error("Please select a patient"); return; }
    if (composeChannel === "email" && !composeSubject.trim()) { toast.error("Please enter a subject"); return; }
    if (!composeBody.trim()) { toast.error("Please enter a message body"); return; }

    setComposeSending(true);
    const scheduledFor = composeScheduleFor ? new Date(composeScheduleFor).toISOString() : new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error } = await supabase.from("scheduled_communications").insert({
      channel: composeChannel,
      trigger_type: "manual",
      recipient_name: composeSelectedPatient.client_name,
      recipient_email: composeChannel === "email" ? composeSelectedPatient.client_email : null,
      recipient_phone: composeChannel === "sms" ? composeSelectedPatient.client_phone : null,
      subject: composeChannel === "email" ? composeSubject : null,
      scheduled_for: scheduledFor,
      status: "pending",
      appointment_id: composeSelectedAppointment?.id || null,
      metadata: {
        body_html: composeChannel === "email" ? composeBody : undefined,
        body_text: composeChannel === "sms" ? composeBody : undefined,
        manual: true,
      },
    });

    if (error) {
      toast.error("Failed to schedule message");
    } else {
      toast.success("Message scheduled");
      setComposeOpen(false);
      setComposeSubject("");
      setComposeBody("");
      setComposeScheduleFor("");
      setComposeSelectedPatient(null);
      setComposeSelectedAppointment(null);
      setComposePatientSearch("");
      fetchPending();
    }
    setComposeSending(false);
  };

  // Categorise pending comms by time
  const now = new Date();
  const twentyFourHoursFromNow = addHours(now, 24);
  const sevenDaysFromNow = addDays(now, 7);
  const fourteenDaysFromNow = addDays(now, 14);
  const twentyOneDaysFromNow = addDays(now, 21);
  const fourWeeksFromNow = addDays(now, 28);

  const urgent = pendingComms.filter(c => parseISO(c.scheduled_for).getTime() <= twentyFourHoursFromNow.getTime());
  const soon = pendingComms.filter(c => {
    const t = parseISO(c.scheduled_for).getTime();
    return t > twentyFourHoursFromNow.getTime() && t <= sevenDaysFromNow.getTime();
  });
  const next14d = pendingComms.filter(c => {
    const t = parseISO(c.scheduled_for).getTime();
    return t > sevenDaysFromNow.getTime() && t <= fourteenDaysFromNow.getTime();
  });
  const next21d = pendingComms.filter(c => {
    const t = parseISO(c.scheduled_for).getTime();
    return t > fourteenDaysFromNow.getTime() && t <= twentyOneDaysFromNow.getTime();
  });
  const fourWeeks = pendingComms.filter(c => {
    const t = parseISO(c.scheduled_for).getTime();
    return t > twentyOneDaysFromNow.getTime() && t <= fourWeeksFromNow.getTime();
  });
  const later = pendingComms.filter(c => parseISO(c.scheduled_for).getTime() > fourWeeksFromNow.getTime());

  const filteredSent = sentLogs.filter(l => {
    if (!sentSearch) return true;
    const s = sentSearch.toLowerCase();
    return l.recipient_name?.toLowerCase().includes(s) || l.recipient_email?.toLowerCase().includes(s) || l.recipient_phone?.toLowerCase().includes(s) || l.subject?.toLowerCase().includes(s) || l.trigger_type.toLowerCase().includes(s);
  });

  const sections = [
    { key: "urgent", title: "🚨 Outgoing — Next 24 Hours", items: urgent, bg: "bg-red-950/40", border: "border-red-800/50", titleColor: "text-red-300", badgeBg: "bg-red-500", descColor: "text-red-400/70", desc: "Sending within the next 24 hours" },
    { key: "soon", title: "⏳ Outgoing Soon", items: soon, bg: "bg-amber-950/40", border: "border-amber-800/50", titleColor: "text-amber-300", badgeBg: "bg-amber-500", descColor: "text-amber-400/70", desc: "Scheduled within the next 7 days" },
    { key: "14days", title: "📆 Outgoing in the Next 14 Days", items: next14d, bg: "bg-yellow-950/40", border: "border-yellow-800/50", titleColor: "text-yellow-300", badgeBg: "bg-yellow-500", descColor: "text-yellow-400/70", desc: "Scheduled 7–14 days from now" },
    { key: "21days", title: "📅 Outgoing in the Next 21 Days", items: next21d, bg: "bg-lime-950/40", border: "border-lime-800/50", titleColor: "text-lime-300", badgeBg: "bg-lime-500", descColor: "text-lime-400/70", desc: "Scheduled 14–21 days from now" },
    { key: "4weeks", title: "📅 Outgoing Within Next 4 Weeks", items: fourWeeks, bg: "bg-emerald-950/40", border: "border-emerald-800/50", titleColor: "text-emerald-300", badgeBg: "bg-emerald-500", descColor: "text-emerald-400/70", desc: "Scheduled 21–28 days from now" },
    { key: "later", title: "🗓️ Outgoing Later", items: later, bg: "bg-green-950/40", border: "border-green-800/50", titleColor: "text-green-300", badgeBg: "bg-green-500", descColor: "text-green-400/70", desc: "Scheduled more than 4 weeks from now" },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="font-serif text-2xl font-bold text-foreground">Messages</h2>
        <p className="text-sm text-muted-foreground mt-1">Monitor outgoing notifications, reminders, and scheduled communications</p>
      </div>
      {/* Top bar: Refresh + Sent Messages button */}
      <div className="space-y-2">
        <Badge variant="outline" className="text-[10px] text-white border-border">{pendingComms.length} pending</Badge>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => setComposeOpen(true)} className="bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-400/30">
            <Plus className="h-3.5 w-3.5 mr-1" /> New Message
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPending} disabled={pendingLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", pendingLoading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setSentDialogOpen(true)} className="bg-secondary text-white hover:bg-accent">
            <Archive className="h-3.5 w-3.5 mr-1" /> Sent
          </Button>
        </div>
      </div>

      {/* Missing Consent Forms Alert */}
      {missingConsentApts.length > 0 && (
        <Card className="border-amber-800/50 bg-amber-950/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <CardTitle className="font-serif text-base text-amber-300">
                Missing Consent Forms
              </CardTitle>
              <Badge className="text-[10px] text-white border-0 bg-amber-500">
                {missingConsentApts.length}
              </Badge>
            </div>
            <p className="text-xs text-amber-400/70">Upcoming appointments without a completed consent form</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {missingConsentApts.map(apt => {
                const sentAt = apt.consent_sent_at ? new Date(apt.consent_sent_at) : null;
                const hoursSinceSent = sentAt ? (Date.now() - sentAt.getTime()) / (1000 * 60 * 60) : null;
                const isRecentlySent = sentAt && hoursSinceSent !== null && hoursSinceSent < 48;
                const iconBg = isRecentlySent ? "bg-emerald-900/50" : "bg-amber-900/50";
                const iconColor = isRecentlySent ? "text-emerald-300" : "text-amber-300";
                return (
                  <div key={apt.id} className={cn("rounded-lg border p-3 flex items-start justify-between gap-2", isRecentlySent ? "bg-emerald-950/30 border-emerald-800/50" : "bg-muted/40 border-border")}>
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconBg)}>
                        <FileText className={cn("h-4 w-4", iconColor)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{apt.client_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(apt as any).services?.name || "Service"} · {format(parseISO(apt.appointment_date), "EEE dd MMM")} at {apt.appointment_time?.slice(0, 5)}
                        </p>
                        {sentAt && (
                          <p className={cn("text-[10px] mt-0.5", isRecentlySent ? "text-emerald-400" : "text-amber-400")}>
                            {isRecentlySent ? "✓" : "⚠"} Form sent {format(sentAt, "dd MMM 'at' HH:mm")}
                            {!isRecentlySent && " · 48h+ no response"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 border-emerald-700 text-emerald-300 hover:bg-emerald-900/50 hover:text-emerald-200"
                        onClick={() => handleMarkConsentComplete(apt.id)}
                        title="Mark consent as manually completed"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-amber-700 text-amber-300 hover:bg-amber-900/50 hover:text-amber-200"
                        onClick={() => { setSendFormDialogApt(apt); setSelectedTemplateId(""); }}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" /> {sentAt ? "Resend" : "Send"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send consent form dialog */}
      <Dialog open={!!sendFormDialogApt} onOpenChange={(open) => { if (!open) setSendFormDialogApt(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Send Consent Form</DialogTitle>
          </DialogHeader>
          {sendFormDialogApt && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Sending to <strong className="text-foreground">{sendFormDialogApt.client_name}</strong> ({sendFormDialogApt.client_email})
              </div>
              <div className="space-y-2">
                <Label>Select Form Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a consent form..." />
                  </SelectTrigger>
                  <SelectContent>
                    {consentTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSendFormDialogApt(null)}>Cancel</Button>
                <Button onClick={handleSendConsentForm} disabled={!selectedTemplateId || sendingFormFor === sendFormDialogApt.id}>
                  {sendingFormFor === sendFormDialogApt.id ? "Sending..." : "Send Form"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Time-based pending sections */}
      {sections.map(section => (
        <Collapsible key={section.key} defaultOpen={section.key === "urgent" && section.items.length > 0}>
          <Card className={cn(section.border, section.bg)}>
            <CollapsibleTrigger className="w-full text-left">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className={cn("font-serif text-base", section.titleColor)}>
                      {section.title}
                    </CardTitle>
                    <Badge className={cn("text-[10px] text-white border-0", section.badgeBg)}>
                      {section.items.length}
                    </Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className={cn("text-xs", section.descColor)}>{section.desc}</p>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {section.items.length === 0 ? (
                  <p className="text-sm text-center py-3 text-muted-foreground">No messages in this category.</p>
                ) : (
                  <div className="space-y-2">
                    {section.items.map(comm => (
                      <PendingCommItem key={comm.id} comm={comm} onCancel={cancelPending} onDelete={deletePending} onView={fetchPendingPreview} />
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}

      {/* Top action: Send test notification */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={sendTestNotification} disabled={sendingTest}>
          <Send className="h-3.5 w-3.5 mr-1" /> {sendingTest ? "Sending..." : "Send Test Notification to Self"}
        </Button>
      </div>

      {/* Planned Communications - collapsed by default */}
      <Collapsible open={!plannedCollapsed} onOpenChange={(open) => setPlannedCollapsed(!open)}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors bg-card/60 border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base text-white">Planned Communications</CardTitle>
                {plannedCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <PlannedCommunications />
        </CollapsibleContent>
      </Collapsible>

      {/* Sent Messages Dialog */}
      <Dialog open={sentDialogOpen} onOpenChange={setSentDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              <Send className="h-5 w-5" /> Sent Messages
            </DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone..." value={sentSearch} onChange={(e) => setSentSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={sentChannelFilter} onValueChange={(v) => { setSentChannelFilter(v); setSentPage(0); }}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sentDateFilter} onValueChange={(v) => { setSentDateFilter(v); setSentPage(0); }}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.04">Last hour</SelectItem>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sent log list */}
          <div className="overflow-y-auto flex-1 space-y-2">
            {sentLoading ? (
              <p className="py-8 text-center text-muted-foreground">Loading...</p>
            ) : filteredSent.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {sentLogs.length === 0 ? "No sent messages yet." : "No results match your search."}
              </p>
            ) : (
              filteredSent.map((log) => {
                const triggerColor = triggerColors[log.trigger_type] || triggerColors.notification;
                return (
                  <div key={log.id} onClick={() => setSelectedMsg(log)} className={cn("rounded-lg border p-3 transition-colors cursor-pointer", log.status === "failed" ? "border-destructive/30 bg-destructive/5" : "hover:bg-muted/30")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5", log.channel === "email" ? "bg-primary/10" : "bg-secondary/10")}>
                          {log.channel === "email" ? <Mail className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-secondary" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate text-foreground">{log.recipient_name || "Unknown"}</p>
                            <Badge className={cn("text-[10px] px-1.5 py-0 border", triggerColor)}>
                              {triggerLabels[log.trigger_type] || log.trigger_type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {log.channel === "email" ? log.recipient_email : log.recipient_phone}
                            {log.subject && <> · {log.subject}</>}
                          </p>
                          {log.error_message && <p className="text-xs text-destructive mt-0.5 truncate">Error: {log.error_message}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <p className="text-[10px] text-muted-foreground whitespace-nowrap">{format(parseISO(log.created_at), "dd MMM HH:mm")}</p>
                        {log.status === "sent" ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {sentLogs.length === PAGE_SIZE && (
              <div className="flex justify-center gap-2 pt-2">
                {sentPage > 0 && <Button variant="outline" size="sm" onClick={() => setSentPage(p => p - 1)}>Previous</Button>}
                <Button variant="outline" size="sm" onClick={() => setSentPage(p => p + 1)}>Load More</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMsg} onOpenChange={(open) => !open && setSelectedMsg(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {selectedMsg && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-lg flex items-center gap-2">
                  {selectedMsg.channel === "email" ? <Mail className="h-5 w-5 text-primary" /> : <MessageSquare className="h-5 w-5 text-secondary" />}
                  {selectedMsg.subject || "Message"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-muted/30 rounded-lg p-3 text-xs">
                  <div><span className="text-muted-foreground">To:</span> <span className="font-medium">{selectedMsg.recipient_name || "Unknown"}</span></div>
                  <div><span className="text-muted-foreground">Sent:</span> {format(parseISO(selectedMsg.created_at), "dd MMM yyyy, HH:mm")}</div>
                  <div><span className="text-muted-foreground">{selectedMsg.channel === "email" ? "Email:" : "Phone:"}</span> {selectedMsg.channel === "email" ? selectedMsg.recipient_email : selectedMsg.recipient_phone}</div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <Badge className={cn("text-[10px] px-1.5 py-0 border", triggerColors[selectedMsg.trigger_type] || triggerColors.notification)}>
                      {triggerLabels[selectedMsg.trigger_type] || selectedMsg.trigger_type}
                    </Badge>
                  </div>
                  <div><span className="text-muted-foreground">Status:</span> {selectedMsg.status === "sent" ? <span className="text-success font-medium">Delivered</span> : <span className="text-destructive font-medium">Failed</span>}</div>
                  <div><span className="text-muted-foreground">Channel:</span> {selectedMsg.channel === "email" ? "Email" : "SMS"}</div>
                </div>
                {selectedMsg.error_message && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs text-destructive"><strong>Error:</strong> {selectedMsg.error_message}</div>
                )}
                <div className="border rounded-lg overflow-hidden">
                  {selectedMsg.body_html ? (
                    selectedMsg.channel === "email" ? (
                      <iframe srcDoc={selectedMsg.body_html} className="w-full min-h-[400px] border-0 bg-white" title="Email preview" sandbox="allow-same-origin" />
                    ) : (
                      <div className="p-4 bg-muted/20 whitespace-pre-wrap text-sm">{selectedMsg.body_html}</div>
                    )
                  ) : (
                    <div className="p-4 text-muted-foreground text-center text-xs">
                      <p>Message body not available.</p>
                      <p className="mt-1">Messages sent before the logging update won't have body content stored.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pending Message Preview Dialog */}
      <Dialog open={!!selectedPending} onOpenChange={(open) => !open && setSelectedPending(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          {selectedPending && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-lg flex items-center gap-2">
                  {selectedPending.channel === "email" ? <Mail className="h-5 w-5 text-primary" /> : <MessageSquare className="h-5 w-5 text-secondary" />}
                  Scheduled Message
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-muted/30 rounded-lg p-3 text-xs">
                  <div><span className="text-muted-foreground">To:</span> <span className="font-medium">{selectedPending.recipient_name || "Unknown"}</span></div>
                  <div><span className="text-muted-foreground">Scheduled:</span> {format(parseISO(selectedPending.scheduled_for), "dd MMM yyyy, HH:mm")}</div>
                  <div><span className="text-muted-foreground">{selectedPending.channel === "email" ? "Email:" : "Phone:"}</span> {selectedPending.channel === "email" ? selectedPending.recipient_email : selectedPending.recipient_phone}</div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <Badge className={cn("text-[10px] px-1.5 py-0 border", triggerColors[selectedPending.trigger_type] || triggerColors.notification)}>
                      {triggerLabels[selectedPending.trigger_type] || selectedPending.trigger_type}
                    </Badge>
                  </div>
                  {selectedPending.subject && (
                    <div className="col-span-2"><span className="text-muted-foreground">Subject:</span> {selectedPending.subject}</div>
                  )}
                  <div><span className="text-muted-foreground">Channel:</span> {selectedPending.channel === "email" ? "Email" : "SMS"}</div>
                  <div><span className="text-muted-foreground">Status:</span> <span className="text-amber-600 dark:text-amber-400 font-medium">Pending</span></div>
                </div>

                {/* Actual message content preview */}
                <div className="border rounded-lg overflow-hidden">
                  {pendingPreviewLoading ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">Loading message preview...</div>
                  ) : pendingPreviewHtml ? (
                    selectedPending.channel === "email" ? (
                      <iframe srcDoc={pendingPreviewHtml} className="w-full min-h-[300px] border-0 bg-white" title="Email preview" sandbox="allow-same-origin" />
                    ) : (
                      <div className="p-4 bg-muted/20 whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: pendingPreviewHtml }} />
                    )
                  ) : (
                    <div className="p-4 text-muted-foreground text-center text-xs">
                      <p>No template found for this message type.</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { cancelPending(selectedPending.id); setSelectedPending(null); }}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel Message
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => { deletePending(selectedPending.id); setSelectedPending(null); }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Permanently
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Compose New Message Dialog */}
      <Dialog open={composeOpen} onOpenChange={(open) => { if (!open) { setComposeOpen(false); setComposeSelectedPatient(null); setComposeSelectedAppointment(null); setComposePatientSearch(""); setComposeSubject(""); setComposeBody(""); setComposeScheduleFor(""); } else { setComposeOpen(true); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" /> Compose Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1">
            {/* Channel */}
            <div className="space-y-1.5">
              <Label className="text-xs">Channel</Label>
              <div className="flex gap-2">
                <Button variant={composeChannel === "email" ? "default" : "outline"} size="sm" onClick={() => setComposeChannel("email")} className="flex-1">
                  <Mail className="h-3.5 w-3.5 mr-1" /> Email
                </Button>
                <Button variant={composeChannel === "sms" ? "default" : "outline"} size="sm" onClick={() => setComposeChannel("sms")} className="flex-1">
                  <MessageSquare className="h-3.5 w-3.5 mr-1" /> SMS
                </Button>
              </div>
            </div>

            {/* Patient Search */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Patient</Label>
              {composeSelectedPatient ? (
                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5 border">
                  <div>
                    <p className="text-sm font-medium">{composeSelectedPatient.client_name}</p>
                    <p className="text-xs text-muted-foreground">{composeSelectedPatient.client_email}{composeSelectedPatient.client_phone && ` · ${composeSelectedPatient.client_phone}`}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setComposeSelectedPatient(null); setComposeSelectedAppointment(null); setComposePatientSearch(""); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Input placeholder="Search patient by name or email..." value={composePatientSearch} onChange={(e) => setComposePatientSearch(e.target.value)} />
                  {composePatients.length > 0 && (
                    <div className="border rounded-lg max-h-32 overflow-y-auto">
                      {composePatients.map(p => (
                        <div key={p.id} className="p-2 text-xs hover:bg-muted/50 cursor-pointer border-b last:border-b-0" onClick={() => { setComposeSelectedPatient(p); setComposePatientSearch(""); }}>
                          <p className="font-medium">{p.client_name}</p>
                          <p className="text-muted-foreground">{p.client_email}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Appointment Link (optional) */}
            {composeSelectedPatient && composeAppointments.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Link to Appointment <span className="text-muted-foreground">(optional)</span></Label>
                {composeSelectedAppointment ? (
                  <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5 border">
                    <div>
                      <p className="text-sm font-medium">{(composeSelectedAppointment as any).services?.name || "Appointment"}</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(composeSelectedAppointment.appointment_date), "dd MMM yyyy")} at {composeSelectedAppointment.appointment_time?.slice(0, 5)} · <Badge variant="outline" className="text-[9px]">{composeSelectedAppointment.status}</Badge></p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setComposeSelectedAppointment(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="border rounded-lg max-h-32 overflow-y-auto">
                    {composeAppointments.map(a => (
                      <div key={a.id} className="p-2 text-xs hover:bg-muted/50 cursor-pointer border-b last:border-b-0" onClick={() => setComposeSelectedAppointment(a)}>
                        <p className="font-medium">{(a as any).services?.name || "Appointment"} — {format(parseISO(a.appointment_date), "dd MMM yyyy")} at {a.appointment_time?.slice(0, 5)}</p>
                        <Badge variant="outline" className="text-[9px] mt-0.5">{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Subject (email only) */}
            {composeChannel === "email" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Input placeholder="Email subject..." value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
              </div>
            )}

            {/* Body */}
            <div className="space-y-1.5">
              <Label className="text-xs">Message {composeChannel === "email" ? "(HTML supported)" : ""}</Label>
              <Textarea placeholder={composeChannel === "email" ? "Enter email body (HTML or plain text)..." : "Enter SMS text..."} value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={composeChannel === "sms" ? 4 : 8} />
              {composeChannel === "sms" && <p className="text-[10px] text-muted-foreground">{composeBody.length}/160 characters</p>}
            </div>

            {/* Schedule */}
            <div className="space-y-1.5">
              <Label className="text-xs">Schedule for <span className="text-muted-foreground">(leave blank to send in 5 minutes)</span></Label>
              <Input type="datetime-local" value={composeScheduleFor} onChange={(e) => setComposeScheduleFor(e.target.value)} />
            </div>

            {/* Submit */}
            <Button className="w-full" onClick={handleComposeSubmit} disabled={composeSending || !composeSelectedPatient}>
              <Send className="h-3.5 w-3.5 mr-1" /> {composeSending ? "Scheduling..." : "Schedule Message"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagesTab;
