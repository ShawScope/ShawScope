import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format, parseISO, isBefore, startOfDay, addWeeks, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, getMonth, differenceInYears, differenceInCalendarDays, setYear, formatDistanceToNow } from "date-fns";
import { CalendarDays, Users, FileText, Settings, LogOut, Plus, Trash2, Stethoscope, Pencil, CalendarCheck, ExternalLink, CalendarPlus, CheckCircle, XCircle, MapPin, Eye, Mail, ClipboardList, ChevronDown, ChevronUp, Send, Ban, Repeat, Clock, ChevronLeft, ChevronRight, PoundSterling, TrendingUp, TrendingDown, UserCheck, RefreshCw, CalendarClock, AlertTriangle, MessageSquare, MoreVertical, FileDown, Loader2, Car, Navigation, BarChart3, UserPlus, Wifi, WifiOff, CloudUpload, CloudDownload, Phone, Save, Coffee, Megaphone, ArrowUp, ArrowDown, Copy, Building2, GripVertical, X, Camera, Ear, Timer, Shield, ShieldCheck, Star, RotateCw, Home, Footprints, Mic, MicOff } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "@/lib/utils";
import { offlineMutation } from "@/lib/offlineMutation";
import PatientsTab from "@/components/admin/PatientsTab";
import TravelHUD from "@/components/admin/TravelHUD";
import MarketingTab from "@/components/admin/MarketingTab";
import MessagesTab from "@/components/admin/MessagesTab";
import ChatLogsTab from "@/components/admin/ChatLogsTab";
import MileageTab from "@/components/admin/MileageTab";
import AccountsTab from "@/components/admin/AccountsTab";
import ReportsTab from "@/components/admin/ReportsTab";
import RecallsTab from "@/components/admin/RecallsTab";
import ReferralsTab from "@/components/admin/ReferralsTab";
import NoticesTab from "@/components/admin/NoticesTab";
import FinancesTab from "@/components/admin/FinancesTab";
import ConsultationFormDialog from "@/components/admin/ConsultationFormDialog";
import PhoneBookingWizard from "@/components/admin/PhoneBookingWizard";
import HearingScreeningDialog from "@/components/admin/HearingScreening/HearingScreeningDialog";
import HearingScreeningTab from "@/components/admin/HearingScreeningTab";
import GovernanceTab from "@/components/admin/GovernanceTab";
import TodoTab from "@/components/admin/TodoTab";
import FormBuilderDialog from "@/components/admin/FormBuilderDialog";
import EmailTemplateEditor from "@/components/admin/EmailTemplateEditor";
import SmsTemplateEditor from "@/components/admin/SmsTemplateEditor";
import AdminAuthenticatorSettings from "@/components/admin/AdminAuthenticatorSettings";
import AppearanceSettings from "@/components/admin/AppearanceSettings";
import ServiceOffersPanel from "@/components/admin/ServiceOffersPanel";
import PaymentDialog from "@/components/admin/PaymentDialog";
import StartDayButton from "@/components/admin/governance/StartDayButton";

interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  appointment_date: string;
  appointment_time: string;
  notes: string | null;
  address: string | null;
  postcode: string | null;
  status: string;
  service_id: string | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  admin_notes: string | null;
  alternative_date: string | null;
  alternative_time: string | null;
  price: number | null;
  travel_fee: number | null;
  travel_distance_miles: number | null;
  consent_form_template_id: string | null;
  consent_sent_at: string | null;
  ai_consent_summary: string | null;
  group_id: string | null;
  access_token?: string;
  ready_from_time: string | null;
  recurring_group_id: string | null;
  recurring_interval_weeks: number | null;
  duration_minutes: number | null;
  locality: string | null;
  come_to_practitioner?: boolean;
  media_consent?: boolean;
  dictation_consent?: boolean;
}

interface ConsentTemplate {
  id: string;
  title: string;
  description: string | null;
  fields: any[];
  is_active: boolean;
  created_at: string;
  form_type: string;
}

interface AvailableDateRow {
  id: string;
  available_date: string;
  start_hour: number | null;
  end_hour: number | null;
  is_available: boolean;
}

interface BlockedTime {
  id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  repeat_type: string;
  repeat_until: string | null;
  repeat_group_id: string | null;
  created_at: string;
}

interface BizSettings {
  id: string;
  start_hour: number;
  end_hour: number;
  buffer_minutes: number;
  appointment_duration_minutes: number;
  days_available: number[];
  booking_cutoff_hours: number;
  travel_buffer_per_mile: number;
}

const fmtHourMin = (h: number): string => {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
  status: string;
  sort_order: number;
  consent_form_template_id: string | null;
  image_url: string | null;
}


interface WaitlistEntry {
  id: string;
  service_id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  notified_at: string | null;
  created_at: string;
}

interface EmailTemplate {
  id: string;
  trigger_type: string;
  subject: string;
  body_html: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface SmsTemplate {
  id: string;
  trigger_type: string;
  body_text: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ConsentResponse {
  id: string;
  appointment_id: string;
  consent_form_template_id: string;
  responses: any;
  signature: string | null;
  signed_at: string | null;
  created_at: string;
  template_title?: string;
}

const statusColors: Record<string, string> = {
  requested: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-primary/10 text-primary border-primary/20",
};

const triggerTypeLabels: Record<string, string> = {
  new_request_admin: "New Booking → Admin",
  new_request_client: "New Booking → Client",
  approved: "Booking Approved → Client",
  rejected: "Booking Rejected → Client",
  follow_up: "Follow-up → Client",
  appointment_changed: "Appointment Rescheduled → Client",
  appointment_cancelled: "Appointment Cancelled → Client",
  consent_reminder: "Consent Reminder → Client",
  review_request: "Review Request → Client",
  recall_reminder: "Recall Reminder → Client",
};

const smsTriggerTypeLabels: Record<string, string> = {
  appointment_reminder: "Appointment Reminder",
  appointment_approved: "Booking Approved",
  appointment_rejected: "Booking Rejected",
  appointment_rescheduled: "Appointment Rescheduled",
  appointment_cancelled: "Appointment Cancelled",
  consent_reminder: "Consent Reminder",
};

const availableVars = [
  "{{client_name}}", "{{client_email}}", "{{client_phone}}", "{{service_name}}",
  "{{date}}", "{{time}}", "{{address}}", "{{notes}}", "{{admin_notes}}",
  "{{alt_date}}", "{{alt_time}}", "{{consent_form_url}}", "{{has_consent_form}}",
];

const smsAvailableVars = [
  "{{client_name}}", "{{service_name}}", "{{date}}", "{{time}}",
  "{{address}}", "{{admin_notes}}",
];

const isNoEmail = (email?: string | null) => !!email && email.toLowerCase().endsWith("@noemail.co.uk");

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const { isOnline, pendingCount, isSyncing, lastSyncAt, sync, setOnSilentSyncComplete } = useOfflineSync();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [settings, setSettings] = useState<BizSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableDates, setAvailableDates] = useState<AvailableDateRow[]>([]);
  const [availCalendarDates, setAvailCalendarDates] = useState<Date[]>([]);
  const [googleMapsKey, setGoogleMapsKey] = useState<string>("");
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [consentCompletedIds, setConsentCompletedIds] = useState<Set<string>>(new Set());
  const [onMyWaySentIds, setOnMyWaySentIds] = useState<Set<string>>(new Set());
  const [onMyWayEtas, setOnMyWayEtas] = useState<Record<string, string>>({}); // appointmentId -> eta text
  const [onMyWayEtaArrivals, setOnMyWayEtaArrivals] = useState<Record<string, string>>({}); // appointmentId -> ISO arrival time
  const [onMyWaySending, setOnMyWaySending] = useState<string | null>(null);
  const [delaySentIds, setDelaySentIds] = useState<Set<string>>(new Set());
  const [delaySending, setDelaySending] = useState<string | null>(null);
  const [arrivedAptIds, setArrivedAptIds] = useState<Set<string>>(new Set());
  const [etaCountdownTick, setEtaCountdownTick] = useState(0);
  const [liveTrackerStatus, setLiveTrackerStatus] = useState<{ text: string; color: string } | null>(null);
  const [totalPatients, setTotalPatients] = useState(0);
  const [patientDobs, setPatientDobs] = useState<Record<string, string | null>>({});
  const [patientAlerts, setPatientAlerts] = useState<Record<string, string | null>>({});
  // Patient list (lightweight) for duplicate detection on pending requests
  const [allPatientsLite, setAllPatientsLite] = useState<{ id: string; client_name: string; client_email: string; client_phone: string | null }[]>([]);
  // Suggested durations by client_email + service_id, in minutes (rounded up to 5)
  const [suggestedDurations, setSuggestedDurations] = useState<Record<string, { avgMin: number; count: number }>>({});
  const [visitorData, setVisitorData] = useState<{ thisWeekVisitors: number; lastWeekVisitors: number; thisMonthVisitors: number; lastMonthVisitors: number } | null>(null);
  const [auditWarning, setAuditWarning] = useState(false);
  const [todoOverdueCount, setTodoOverdueCount] = useState(0);
  const [hasLiveNotice, setHasLiveNotice] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [messagesSubView, setMessagesSubView] = useState<string>("messages");
  const [upcomingRecalls, setUpcomingRecalls] = useState(false);
  const [upcomingMessages, setUpcomingMessages] = useState(false);
  const [recallEmails, setRecallEmails] = useState<Set<string>>(new Set());
  const [tabOrder, setTabOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('admin_tab_order') || '[]'); } catch { return []; }
  });

  // Upcoming appointments expanded
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [upcomingCollapsed, setUpcomingCollapsed] = useState(true);
  const [upcomingDaysFilter, setUpcomingDaysFilter] = useState<number>(999);

  // Day preview dialog for pending requests
  const [previewDayDate, setPreviewDayDate] = useState<string | null>(null);
  const [previewDayHighlightAptId, setPreviewDayHighlightAptId] = useState<string | null>(null);

  // Consent form dialog
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFields, setNewFields] = useState<{ label: string; type: string; required: boolean }[]>([
    { label: "", type: "text", required: true },
  ]);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  // Edit template
  const [editingTemplate, setEditingTemplate] = useState<ConsentTemplate | null>(null);
  const [editTemplateDialogOpen, setEditTemplateDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editFields, setEditFields] = useState<{ label: string; type: string; required: boolean; options?: string[] }[]>([]);

  // Service dialog
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [svcName, setSvcName] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcDuration, setSvcDuration] = useState(60);
  const [svcPrice, setSvcPrice] = useState("");
  const [svcActive, setSvcActive] = useState(true);
  const [svcStatus, setSvcStatus] = useState("active");
  const [svcOrder, setSvcOrder] = useState(0);
  const [svcConsentFormId, setSvcConsentFormId] = useState<string | null>(null);
  const [svcImageUrl, setSvcImageUrl] = useState<string | null>(null);
  const [uploadingServiceImage, setUploadingServiceImage] = useState(false);

  // Patient tracker preview Sheet
  const [trackerPreviewToken, setTrackerPreviewToken] = useState<string | null>(null);


  // Service waitlist
  const [serviceWaitlist, setServiceWaitlist] = useState<WaitlistEntry[]>([]);
  const [waitlistDialogOpen, setWaitlistDialogOpen] = useState(false);
  const [waitlistServiceId, setWaitlistServiceId] = useState<string>("");
  const [footCareWaitlist, setFootCareWaitlist] = useState<{ id: string; client_name: string; client_email: string; client_phone: string | null; poll_responses: Record<string, string>; created_at: string }[]>([]);
  const [footCareWaitlistExpanded, setFootCareWaitlistExpanded] = useState(false);

  // Appointment dialog
  const [aptDialogOpen, setAptDialogOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [aptName, setAptName] = useState("");
  const [aptEmail, setAptEmail] = useState("");
  const [aptHasEmail, setAptHasEmail] = useState(true);
  const [aptPhone, setAptPhone] = useState("");
  const [aptDate, setAptDate] = useState("");
  const [aptTime, setAptTime] = useState("");
  const [aptNotes, setAptNotes] = useState("");
  const [aptAddress, setAptAddress] = useState("");
  const [aptServiceId, setAptServiceId] = useState<string | null>(null);
  const [aptStatus, setAptStatus] = useState("pending");
  const [aptPrice, setAptPrice] = useState("");
  const [aptSendNotification, setAptSendNotification] = useState(true);
  const [aptTimeOverride, setAptTimeOverride] = useState(false);
  const [aptAvailableSlots, setAptAvailableSlots] = useState<{ time: string; available: boolean; status?: "taken" | "available" | "recommended" }[]>([]);
  const [aptLatitude, setAptLatitude] = useState<number | null>(null);
  const [aptLongitude, setAptLongitude] = useState<number | null>(null);
  const [aptTravelFee, setAptTravelFee] = useState<number | null>(null);
  const [aptTravelDistance, setAptTravelDistance] = useState<number | null>(null);
  const [aptLocality, setAptLocality] = useState<string>("");
  const [aptPostcode, setAptPostcode] = useState("");
  const [aptTravelLoading, setAptTravelLoading] = useState(false);
  const [aptMapVisible, setAptMapVisible] = useState(false);
  const [aptGeocoding, setAptGeocoding] = useState(false);
  const [aptAddressList, setAptAddressList] = useState<string[]>([]);
  const [aptAddressLoading, setAptAddressLoading] = useState(false);
  const [aptManualAddress, setAptManualAddress] = useState(false);
  const [aptDurationOverride, setAptDurationOverride] = useState<string>("");
  const [aptComeToPractitioner, setAptComeToPractitioner] = useState(false);
  // Admin multi-person booking
  const [aptAdditionalPeople, setAptAdditionalPeople] = useState<{ name: string; email: string; phone: string; relationship_label?: string }[]>([]);
  const [aptExistingGroupMembers, setAptExistingGroupMembers] = useState<{ id: string; client_name: string; client_email: string; client_phone: string | null; status: string }[]>([]);

  // Recurring appointment
  const [aptRecurring, setAptRecurring] = useState(false);
  const [aptRecurringWeeks, setAptRecurringWeeks] = useState(4);
  const [aptRecurringCount, setAptRecurringCount] = useState(3);

  // Edit recurring series prompt
  const [recurringEditPromptOpen, setRecurringEditPromptOpen] = useState(false);
  const [recurringEditChoice, setRecurringEditChoice] = useState<"this" | "future">("this");
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Appointment | null>(null);

  // Reschedule group prompt
  const [rescheduleGroupPromptOpen, setRescheduleGroupPromptOpen] = useState(false);
  const [rescheduleGroupChoice, setRescheduleGroupChoice] = useState<"single" | "all">("single");

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingApt, setRejectingApt] = useState<Appointment | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejectAltDate, setRejectAltDate] = useState("");
  const [rejectAltTime, setRejectAltTime] = useState("");
  const [rejectTimeOverride, setRejectTimeOverride] = useState(false);
  const [rejectAvailableSlots, setRejectAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [isReoffer, setIsReoffer] = useState(false);

   // AI Summary quick-view dialog
   const [aiSummaryDialogOpen, setAiSummaryDialogOpen] = useState(false);
   const [aiSummaryDialogData, setAiSummaryDialogData] = useState<{ name: string; summary: string } | null>(null);

   // Detail view dialog
   const [detailDialogOpen, setDetailDialogOpen] = useState(false);
   const [detailApt, setDetailApt] = useState<Appointment | null>(null);
  const [detailConsentResponses, setDetailConsentResponses] = useState<ConsentResponse[]>([]);
  const [viewingDetailResponse, setViewingDetailResponse] = useState<ConsentResponse | null>(null);
  const [detailPendingMsgs, setDetailPendingMsgs] = useState<any[]>([]);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgSubject, setEditingMsgSubject] = useState("");
  const [editingMsgBody, setEditingMsgBody] = useState("");

  // Consultation form dialog
  const [consultFormOpen, setConsultFormOpen] = useState(false);
  const [consultAptId, setConsultAptId] = useState<string>("");
  const [consultTemplateId, setConsultTemplateId] = useState<string | null>(null);
  const [consultFormType, setConsultFormType] = useState<'consent' | 'consultation' | undefined>(undefined);

  // Consultation form completed tracking (uses consent_form_responses with consultation templates)
  const [consultNoteCompletedIds, setConsultNoteCompletedIds] = useState<Set<string>>(new Set());

  // Awaiting consultation notes bar — completed appointments without consultation forms
  const [awaitingConsultExpanded, setAwaitingConsultExpanded] = useState(false);
  const [skippedConsultIds, setSkippedConsultIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("skippedConsultIds");
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {}
    return new Set();
  });
  useEffect(() => {
    try {
      localStorage.setItem("skippedConsultIds", JSON.stringify([...skippedConsultIds]));
    } catch {}
  }, [skippedConsultIds]);

  // Mark as Open dialog
  const [markOpenDialogOpen, setMarkOpenDialogOpen] = useState(false);
  const [markOpenStartHour, setMarkOpenStartHour] = useState(9);
  const [markOpenEndHour, setMarkOpenEndHour] = useState(17);

  // Email template dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<EmailTemplate | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailActive, setEmailActive] = useState(true);
  const [emailDesc, setEmailDesc] = useState("");
  const [emailTriggerType, setEmailTriggerType] = useState("");
  const [isNewEmail, setIsNewEmail] = useState(false);

  // SMS template state
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [editingSms, setEditingSms] = useState<SmsTemplate | null>(null);
  const [smsBody, setSmsBody] = useState("");
  const [smsActive, setSmsActive] = useState(true);
  const [smsDesc, setSmsDesc] = useState("");
  const [smsTriggerType, setSmsTriggerType] = useState("");
  const [isNewSms, setIsNewSms] = useState(false);

  // Cryo followup templates
  const [cryoTemplates, setCryoTemplates] = useState<{ id: string; week_number: number; subject: string; heading: string; guidance_html: string; is_active: boolean }[]>([]);
  const [cryoDialogOpen, setCryoDialogOpen] = useState(false);
  const [editingCryo, setEditingCryo] = useState<any>(null);
  const [cryoSubject, setCryoSubject] = useState("");
  const [cryoHeading, setCryoHeading] = useState("");
  const [cryoGuidance, setCryoGuidance] = useState("");
  const [cryoActive, setCryoActive] = useState(true);

  // Send form dialog
  const [sendFormDialogOpen, setSendFormDialogOpen] = useState(false);
  const [sendFormTemplateId, setSendFormTemplateId] = useState<string | null>(null);
  const [sendFormEmail, setSendFormEmail] = useState("");
  const [sendFormSending, setSendFormSending] = useState(false);

  // Blocked times state
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndTime, setBlockEndTime] = useState("17:00");
  const [blockReason, setBlockReason] = useState("");
  const [blockRepeatType, setBlockRepeatType] = useState("none");
  const [blockRepeatUntil, setBlockRepeatUntil] = useState("");
  const [blockRepeatForever, setBlockRepeatForever] = useState(false);
  const [blockCustomIntervalDays, setBlockCustomIntervalDays] = useState(14);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  // Break slot picker state
  const [breakPickerOpen, setBreakPickerOpen] = useState(false);
  const [breakPickerDate, setBreakPickerDate] = useState("");
  const [breakPickerType, setBreakPickerType] = useState<"lunch" | "mobile">("lunch");
  const [breakDuration, setBreakDuration] = useState(60);
  const [breakSelectedSlot, setBreakSelectedSlot] = useState<string | null>(null);

  // Available slots detail dialog
  const [slotsDetailOpen, setSlotsDetailOpen] = useState(false);
  const [slotsDetailDate, setSlotsDetailDate] = useState("");
  const [slotsDetailData, setSlotsDetailData] = useState<{ slots: number; slotTimes: string[]; suggestion: string | null }>({ slots: 0, slotTimes: [], suggestion: null });

  // Reschedule dialog
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleNotify, setRescheduleNotify] = useState(true);
  const [rescheduleTimeOverride, setRescheduleTimeOverride] = useState(false);
  const [rescheduleAvailableSlots, setRescheduleAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingApt, setDeletingApt] = useState<Appointment | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteSendEmail, setDeleteSendEmail] = useState(true);
  const [calendarFeedUrl, setCalendarFeedUrl] = useState("");
  const [pastAptsExpanded, setPastAptsExpanded] = useState(false);

   // Status change confirmation dialog
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [statusChangeApt, setStatusChangeApt] = useState<Appointment | null>(null);
  const [statusChangeNewStatus, setStatusChangeNewStatus] = useState("");
  const [statusChangeNotify, setStatusChangeNotify] = useState(true);
  const [statusChangeNotifySms, setStatusChangeNotifySms] = useState(false);
  const [statusChangeReviewRequest, setStatusChangeReviewRequest] = useState(false);
  const [statusChangePreviewHtml, setStatusChangePreviewHtml] = useState("");
  const [statusChangePreviewSubject, setStatusChangePreviewSubject] = useState("");
  const [statusChangeShowPreview, setStatusChangeShowPreview] = useState(false);

  // Payment tracking
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDialogApt, setPaymentDialogApt] = useState<Appointment | null>(null);
  const [paymentDialogExisting, setPaymentDialogExisting] = useState<{ id: string; amount: number; payment_method: string; payment_status: string; notes: string | null } | null>(null);
  const [pendingPayments, setPendingPayments] = useState<{ appointment_id: string; amount: number; payment_method: string; client_name: string; appointment_date: string; service_id: string | null; client_email: string; client_phone: string | null; last_reminder_sent: string | null }[]>([]);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [pendingPaymentsExpanded, setPendingPaymentsExpanded] = useState(false);
  const [clinicEnquiries, setClinicEnquiries] = useState<{ id: string; client_name: string; client_email: string; client_phone: string | null; service_name: string | null; number_of_people: number; notes: string | null; status: string; created_at: string }[]>([]);
  const [onMyWayConfirmApt, setOnMyWayConfirmApt] = useState<Appointment | null>(null);
  const [onMyWayEtaMode, setOnMyWayEtaMode] = useState<"google" | "manual">("google");
  const [onMyWayManualMinutes, setOnMyWayManualMinutes] = useState<number>(10);
  const [onMyWaySkipNotify, setOnMyWaySkipNotify] = useState(false);
  const [clinicReadyConfirmApt, setClinicReadyConfirmApt] = useState<Appointment | null>(null);
  const [clinicReadyTimeMode, setClinicReadyTimeMode] = useState<"now" | "specific">("now");
  const [clinicReadySpecificTime, setClinicReadySpecificTime] = useState("09:00");
  const [clinicReadySending, setClinicReadySending] = useState<string | null>(null);
  const [clinicReadySentIds, setClinicReadySentIds] = useState<Set<string>>(new Set());
  const [delayConfirmApt, setDelayConfirmApt] = useState<Appointment | null>(null);
  const [delayEtaMinutes, setDelayEtaMinutes] = useState<number>(10);
  const [travelHudAptId, setTravelHudAptId] = useState<string | null>(null);
  const [travelHudMinimized, setTravelHudMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");
  const [previousTab, setPreviousTab] = useState<string | null>(null);
  const [phoneBookingOpen, setPhoneBookingOpen] = useState(false);
  const [phoneBookingPrefill, setPhoneBookingPrefill] = useState<{ name?: string; email?: string; phone?: string; serviceId?: string; peopleCount?: number; notes?: string; comeToPractitioner?: boolean } | null>(null);
  const [patientTabEmail, setPatientTabEmail] = useState<string | null>(null);

  // Hearing screening state
  const [hearingScreeningOpen, setHearingScreeningOpen] = useState(false);
  const [hearingPatient, setHearingPatient] = useState<{ id: string; client_name: string; client_email: string; date_of_birth: string | null; client_phone: string | null } | null>(null);
  const [hearingConsultationId, setHearingConsultationId] = useState<string | null>(null);
  const [hearingServiceContext, setHearingServiceContext] = useState<'earwax_removal' | 'ear_wellness' | 'standalone'>('standalone');
  const [hearingTabPatient, setHearingTabPatient] = useState<{ id: string; client_name: string; client_email: string; client_phone: string | null; date_of_birth: string | null } | null>(null);

  // Unified patient profile: always navigate to PatientsTab, remembering previous tab
  const openInlinePatient = (email: string) => {
    if (activeTab !== "patients") setPreviousTab(activeTab);
    setPatientTabEmail(email);
    setActiveTab("patients");
  };

  const returnToPreviousTab = () => {
    if (previousTab && previousTab !== "patients") {
      setActiveTab(previousTab);
    }
    setPreviousTab(null);
    setPatientTabEmail(null);
  };

  // Route cache for travel time display
  const [routeCache, setRouteCache] = useState<{ origin_postcode: string; destination_postcode: string; drive_time_minutes: number; distance_miles: number }[]>([]);

  // Live traffic cache for today's routes (traffic-aware drive times)
  const [liveTrafficCache, setLiveTrafficCache] = useState<{ origin: string; destination: string; drive_time_minutes: number | null; distance_miles: number | null; in_traffic: boolean }[]>([]);
  const liveTrafficFetchedRef = useRef<string>(""); // tracks which routes were last fetched
  const routeTipEmailedRef = useRef<Set<string>>(new Set()); // dedupe auto-sent route tip emails per date+sequence

  // Patient search for new appointments
  const [patientSuggestions, setPatientSuggestions] = useState<{ client_name: string; client_email: string; client_phone: string | null; address: string | null }[]>([]);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);

  // Derived: open dates as Date objects for calendar modifiers
  const openDatesSet = useMemo(() => availableDates.map(d => parseISO(d.available_date)), [availableDates]);

  // Derived: completed appointments awaiting consultation notes (not skipped)
  const awaitingConsultApts = useMemo(() => {
    return allAppointments.filter(a =>
      a.status === "completed" &&
      !consultNoteCompletedIds.has(a.id) &&
      !skippedConsultIds.has(a.id)
    ).sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
  }, [allAppointments, consultNoteCompletedIds, skippedConsultIds]);

  const fetchRouteCache = async () => {
    const { data } = await supabase.from("route_cache").select("origin_postcode, destination_postcode, drive_time_minutes, distance_miles");
    if (data) setRouteCache(data);
  };

  // Fetch live traffic for today's appointments
  const fetchLiveTraffic = useCallback(async () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayAptsList = appointments.filter(
      a => a.appointment_date === todayStr && a.status !== "cancelled" && a.status !== "rejected" && a.status !== "form_only" && a.postcode
    ).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    if (todayAptsList.length === 0) return;

    // Build route pairs: base→first, each consecutive pair, last→base
    const routes: { origin: string; destination: string }[] = [];
    const BASE = "DT2 8DG";

    // Base to first
    if (todayAptsList[0]?.postcode) {
      routes.push({ origin: BASE, destination: todayAptsList[0].postcode });
    }

    // Between consecutive appointments
    for (let i = 0; i < todayAptsList.length - 1; i++) {
      const from = todayAptsList[i].postcode;
      const to = todayAptsList[i + 1].postcode;
      if (from && to) routes.push({ origin: from, destination: to });
    }

    // Last to base
    const lastPc = todayAptsList[todayAptsList.length - 1]?.postcode;
    if (lastPc) routes.push({ origin: lastPc, destination: BASE });

    // Deduplicate
    const uniqueRoutes = routes.filter((r, i, arr) =>
      arr.findIndex(x => x.origin.replace(/\s/g, "").toUpperCase() === r.origin.replace(/\s/g, "").toUpperCase() &&
        x.destination.replace(/\s/g, "").toUpperCase() === r.destination.replace(/\s/g, "").toUpperCase()) === i
    );

    const routeKey = uniqueRoutes.map(r => `${r.origin}-${r.destination}`).join("|");
    // Skip if same routes already fetched recently (prevents duplicate calls)
    if (routeKey === liveTrafficFetchedRef.current && liveTrafficCache.length > 0) return;

    try {
      const { data, error } = await supabase.functions.invoke("live-traffic", {
        body: { routes: uniqueRoutes },
      });
      if (!error && data?.results) {
        setLiveTrafficCache(data.results);
        liveTrafficFetchedRef.current = routeKey;
      }
    } catch { /* silently fail — fall back to cached */ }
  }, [appointments]);

  // Auto-refresh live traffic every 5 minutes for today
  useEffect(() => {
    fetchLiveTraffic();
    const interval = setInterval(fetchLiveTraffic, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLiveTraffic]);

  // Helper to get live traffic drive time, falling back to route cache
  const getLiveOrCachedDriveTime = useCallback((fromPostcode: string, toPostcode: string): { drive_time_minutes: number | null; distance_miles: number | null; isLive: boolean } => {
    const fromNorm = fromPostcode.replace(/\s/g, "").toUpperCase();
    const toNorm = toPostcode.replace(/\s/g, "").toUpperCase();

    // Check live traffic first (only for today)
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const isToday = selectedDate ? format(selectedDate, "yyyy-MM-dd") === todayStr : false;

    if (isToday) {
      const live = liveTrafficCache.find(
        r => r.origin.replace(/\s/g, "").toUpperCase() === fromNorm &&
             r.destination.replace(/\s/g, "").toUpperCase() === toNorm
      );
      if (live && live.drive_time_minutes != null) {
        return { drive_time_minutes: live.drive_time_minutes, distance_miles: live.distance_miles, isLive: true };
      }
    }

    // Fall back to route cache
    const cached = routeCache.find(
      r => r.origin_postcode.replace(/\s/g, "").toUpperCase() === fromNorm &&
           r.destination_postcode.replace(/\s/g, "").toUpperCase() === toNorm
    );
    if (cached) {
      return { drive_time_minutes: cached.drive_time_minutes, distance_miles: cached.distance_miles, isLive: false };
    }

    return { drive_time_minutes: null, distance_miles: null, isLive: false };
  }, [liveTrafficCache, routeCache, selectedDate]);

  const BASE_POSTCODE = "DT2 8DG";

  // Compute travel segments between consecutive appointments on the same day
  const computeTravelSegments = (dayApts: Appointment[], dayBlocks?: BlockedTime[]) => {
    const sorted = [...dayApts]
      .filter(a => a.status !== "cancelled" && a.status !== "rejected" && a.status !== "form_only")
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    const segments: { afterAptId: string; fromPostcode: string; toPostcode: string; driveMinutes: number | null; rawDriveMinutes: number | null; bufferMinutes: number | null; departBy: string; arriveBy: string; distanceMiles: number | null; toPatientName: string; availableGapMinutes: number; mobileBreak?: { startTime: string; endTime: string } | null; isLive?: boolean }[] = [];

    const lunchBlock = dayBlocks?.find(bt => bt.reason?.includes("Lunch"));
    const lunchStartMin = lunchBlock ? parseInt(lunchBlock.start_time.slice(0, 2)) * 60 + parseInt(lunchBlock.start_time.slice(3, 5)) : null;
    const lunchEndMin = lunchBlock ? parseInt(lunchBlock.end_time.slice(0, 2)) * 60 + parseInt(lunchBlock.end_time.slice(3, 5)) : null;

    const mobileBlocks = dayBlocks?.filter(bt => bt.reason?.includes("Mobile")) || [];
    const bufferPerMile = settings?.travel_buffer_per_mile ?? 0.5;

    const formatTime = (mins: number) => `${Math.floor(Math.max(0, mins) / 60).toString().padStart(2, "0")}:${(Math.max(0, mins) % 60).toString().padStart(2, "0")}`;

    // Track which apt pair is handled by lunch (so we skip normal segment for it)
    const lunchHandledIndex = new Set<number>();

    for (let i = 0; i < sorted.length; i++) {
      const apt = sorted[i];
      const svc = services.find(s => s.id === apt.service_id);
      const duration = svc?.duration_minutes ?? 60;
      const endMinutes = parseInt(apt.appointment_time.slice(0, 2)) * 60 + parseInt(apt.appointment_time.slice(3, 5)) + duration;
      const fromPostcode = apt.postcode?.trim().toUpperCase() || "";

      // Check if lunch break falls between this appointment and the next
      if (lunchBlock && lunchStartMin != null && lunchEndMin != null && endMinutes <= lunchStartMin && !lunchHandledIndex.has(i)) {
        const nextApt = sorted[i + 1];
        const nextStartMin = nextApt ? parseInt(nextApt.appointment_time.slice(0, 2)) * 60 + parseInt(nextApt.appointment_time.slice(3, 5)) : Infinity;

        if (nextStartMin >= lunchEndMin && fromPostcode) {
          const toBaseResult = getLiveOrCachedDriveTime(fromPostcode, BASE_POSTCODE);
          const rawDriveToBase = toBaseResult.drive_time_minutes;
          const distToBase = toBaseResult.distance_miles;
          const isLiveToBase = toBaseResult.isLive;
          const bufToBase = rawDriveToBase != null && distToBase != null ? Math.ceil(distToBase * bufferPerMile) : null;
          const arriveBaseMin = lunchStartMin;
          const departToBaseMin = rawDriveToBase != null ? arriveBaseMin - rawDriveToBase : endMinutes;
          const gapToLunch = lunchStartMin - endMinutes;

          segments.push({
            afterAptId: `__to_lunch_${apt.id}`,
            fromPostcode,
            toPostcode: BASE_POSTCODE,
            driveMinutes: rawDriveToBase != null && bufToBase != null ? rawDriveToBase + bufToBase : rawDriveToBase,
            rawDriveMinutes: rawDriveToBase,
            bufferMinutes: bufToBase,
            departBy: formatTime(departToBaseMin),
            arriveBy: formatTime(arriveBaseMin),
            distanceMiles: distToBase,
            toPatientName: "Base (Lunch)",
            availableGapMinutes: gapToLunch,
            isLive: isLiveToBase,
          });

          if (nextApt) {
            const toPostcode = nextApt.postcode?.trim().toUpperCase() || "";
            if (toPostcode) {
              const fromBaseResult = getLiveOrCachedDriveTime(BASE_POSTCODE, toPostcode);
              const rawDriveFromBase = fromBaseResult.drive_time_minutes;
              const distFromBase = fromBaseResult.distance_miles;
              const isLiveFromBase = fromBaseResult.isLive;
              const bufFromBase = rawDriveFromBase != null && distFromBase != null ? Math.ceil(distFromBase * bufferPerMile) : null;
              const arriveNextMin = parseInt(nextApt.appointment_time.slice(0, 2)) * 60 + parseInt(nextApt.appointment_time.slice(3, 5));
              const departFromBaseMin = rawDriveFromBase != null ? arriveNextMin - rawDriveFromBase : lunchEndMin;
              const gapFromLunch = arriveNextMin - lunchEndMin;

              segments.push({
                afterAptId: `__lunch_to_${nextApt.id}`,
                fromPostcode: BASE_POSTCODE,
                toPostcode,
                driveMinutes: rawDriveFromBase != null && bufFromBase != null ? rawDriveFromBase + bufFromBase : rawDriveFromBase,
                rawDriveMinutes: rawDriveFromBase,
                bufferMinutes: bufFromBase,
                departBy: formatTime(departFromBaseMin),
                arriveBy: formatTime(arriveNextMin),
                distanceMiles: distFromBase,
                toPatientName: nextApt.client_name,
                availableGapMinutes: gapFromLunch,
                isLive: isLiveFromBase,
              });
            }
          }

          // Mark this pair as handled by lunch - skip normal segment but continue processing next apt
          lunchHandledIndex.add(i);
          continue;
        }
      }

      const nextApt = sorted[i + 1];
      if (!nextApt) break;

      if (apt.group_id && nextApt.group_id && apt.group_id === nextApt.group_id) continue;

      const toPostcode = nextApt.postcode?.trim().toUpperCase() || "";
      const nextStartMinutes = parseInt(nextApt.appointment_time.slice(0, 2)) * 60 + parseInt(nextApt.appointment_time.slice(3, 5));
      const gapMinutes = nextStartMinutes - endMinutes;

      // Check for mobile break in this gap
      const mobileInGap = mobileBlocks.find(mb => {
        const mbStart = parseInt(mb.start_time.slice(0, 2)) * 60 + parseInt(mb.start_time.slice(3, 5));
        const mbEnd = parseInt(mb.end_time.slice(0, 2)) * 60 + parseInt(mb.end_time.slice(3, 5));
        return mbStart >= endMinutes && mbEnd <= nextStartMinutes;
      });

      if (!fromPostcode || !toPostcode) {
        segments.push({
          afterAptId: apt.id,
          fromPostcode: fromPostcode || "Unknown",
          toPostcode: toPostcode || "Unknown",
          driveMinutes: null,
          rawDriveMinutes: null,
          bufferMinutes: null,
          departBy: formatTime(endMinutes),
          arriveBy: nextApt.appointment_time.slice(0, 5),
          distanceMiles: null,
          toPatientName: nextApt.client_name,
          availableGapMinutes: gapMinutes,
          mobileBreak: mobileInGap ? { startTime: mobileInGap.start_time, endTime: mobileInGap.end_time } : null,
        });
        continue;
      }

      const liveResult = getLiveOrCachedDriveTime(fromPostcode, toPostcode);

      const rawDrive = liveResult.drive_time_minutes;
      const distanceMiles = liveResult.distance_miles;
      const isLiveSegment = liveResult.isLive;
      const bufferMins = rawDrive != null && distanceMiles != null
        ? Math.ceil(distanceMiles * bufferPerMile)
        : null;
      const totalTravelMinutes = rawDrive != null && bufferMins != null
        ? rawDrive + bufferMins
        : rawDrive;

      const arriveByMinutes = nextStartMinutes;
      // Clamp depart time to never be before the current appointment ends
      const departByMinutes = rawDrive != null ? Math.max(endMinutes, arriveByMinutes - rawDrive) : endMinutes;

      segments.push({
        afterAptId: apt.id,
        fromPostcode,
        toPostcode,
        driveMinutes: totalTravelMinutes,
        rawDriveMinutes: rawDrive,
        bufferMinutes: bufferMins,
        departBy: formatTime(departByMinutes),
        arriveBy: formatTime(arriveByMinutes),
        distanceMiles,
        toPatientName: nextApt.client_name,
        availableGapMinutes: gapMinutes,
        mobileBreak: mobileInGap ? { startTime: mobileInGap.start_time, endTime: mobileInGap.end_time } : null,
        isLive: isLiveSegment,
      });
    }

    // Travel FROM base to first appointment (or post-lunch travel if lunch comes before first apt)
    if (sorted.length > 0) {
      const firstApt = sorted[0];
      const toPostcode = firstApt.postcode?.trim().toUpperCase() || "";
      const firstStartMinutes = parseInt(firstApt.appointment_time.slice(0, 2)) * 60 + parseInt(firstApt.appointment_time.slice(3, 5));

      // Check if lunch block exists before the first appointment (no apt before lunch)
      const lunchBeforeFirstApt = lunchBlock && lunchEndMin != null && lunchStartMin != null &&
        firstStartMinutes >= lunchEndMin &&
        !sorted.some(a => {
          const aEnd = parseInt(a.appointment_time.slice(0, 2)) * 60 + parseInt(a.appointment_time.slice(3, 5)) + (services.find(s => s.id === a.service_id)?.duration_minutes ?? 60);
          return aEnd <= lunchStartMin!;
        });

      if (lunchBeforeFirstApt && toPostcode) {
        // Generate post-lunch travel: base → first patient
        const baseToFirstResult = getLiveOrCachedDriveTime(BASE_POSTCODE, toPostcode);
        if (baseToFirstResult.drive_time_minutes != null) {
          const rawDrive = baseToFirstResult.drive_time_minutes;
          const bufferMins = Math.ceil((baseToFirstResult.distance_miles ?? 0) * bufferPerMile);
          const departMinutes = firstStartMinutes - rawDrive;
          const gapFromLunch = firstStartMinutes - lunchEndMin!;
          segments.push({
            afterAptId: `__lunch_to_${firstApt.id}`,
            fromPostcode: BASE_POSTCODE,
            toPostcode,
            driveMinutes: rawDrive + bufferMins,
            rawDriveMinutes: rawDrive,
            bufferMinutes: bufferMins,
            departBy: formatTime(departMinutes),
            arriveBy: firstApt.appointment_time.slice(0, 5),
            distanceMiles: baseToFirstResult.distance_miles,
            toPatientName: firstApt.client_name,
            availableGapMinutes: gapFromLunch,
            isLive: baseToFirstResult.isLive,
          });
        }
      } else if (toPostcode) {
        // Normal base → first appointment travel
        const baseResult = getLiveOrCachedDriveTime(BASE_POSTCODE, toPostcode);
        if (baseResult.drive_time_minutes != null) {
          const rawDrive = baseResult.drive_time_minutes;
          const bufferMins = Math.ceil((baseResult.distance_miles ?? 0) * bufferPerMile);
          const baseTotalTravel = rawDrive + bufferMins;
          const departMinutes = firstStartMinutes - rawDrive;
          segments.unshift({
            afterAptId: "__base__",
            fromPostcode: BASE_POSTCODE,
            toPostcode,
            driveMinutes: baseTotalTravel,
            rawDriveMinutes: rawDrive,
            bufferMinutes: bufferMins,
            departBy: formatTime(departMinutes),
            arriveBy: firstApt.appointment_time.slice(0, 5),
            distanceMiles: baseResult.distance_miles,
            toPatientName: firstApt.client_name,
            availableGapMinutes: 999,
            isLive: baseResult.isLive,
          });
        }
      }
    }

    return segments;
  };

  // Compute dead gaps between adjacent timeline items (including through travel tiles)
  const insertDeadGaps = (timeline: { type: string; time: string; data: any }[], openingHours?: { startMin: number; endMin: number } | null) => {
    const minSvcDur = Math.min(...services.filter(s => s.is_active).map(s => s.duration_minutes), 999);
    const formatMin = (m: number) => `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
    const result: typeof timeline = [];

    // Helper to insert gap/free between two time boundaries
    const insertGapOrFree = (currEndMin: number, nextStartMin: number, travelTotalMin: number, hasUnknownDrive: boolean) => {
      const totalGap = nextStartMin - currEndMin;
      if (totalGap <= 0) return;
      const usableGap = totalGap - travelTotalMin;
      const isDead = usableGap > 0 && usableGap < minSvcDur;
      const isUnknownTight = hasUnknownDrive && totalGap > 0 && totalGap < minSvcDur + 15;
      if (isDead || isUnknownTight) {
        const displayGap = hasUnknownDrive && !isDead ? totalGap : usableGap;
        result.push({ type: 'dead_gap' as any, time: formatMin(currEndMin), data: { gapMinutes: displayGap, minServiceDuration: minSvcDur, unknownDrive: hasUnknownDrive } });
      } else if (usableGap >= minSvcDur) {
        result.push({ type: 'free_slot' as any, time: formatMin(currEndMin), data: { startMin: currEndMin, endMin: nextStartMin, gapMinutes: usableGap, travelMinutes: travelTotalMin } });
      }
    };

    // Free time before first item
    if (openingHours && timeline.length > 0) {
      const first = timeline[0];
      const firstStartMin = first.type === 'apt'
        ? parseInt(first.data.appointment_time.slice(0, 2)) * 60 + parseInt(first.data.appointment_time.slice(3, 5))
        : first.type === 'block'
        ? parseInt(first.data.start_time.slice(0, 2)) * 60 + parseInt(first.data.start_time.slice(3, 5))
        : first.type === 'travel' && first.data.departBy
        ? parseInt(first.data.departBy.slice(0, 2)) * 60 + parseInt(first.data.departBy.slice(3, 5))
        : first.type === 'setup'
        ? parseInt(first.time.slice(0, 2)) * 60 + parseInt(first.time.slice(3, 5))
        : null;
      if (firstStartMin != null && firstStartMin - openingHours.startMin >= minSvcDur) {
        result.push({ type: 'free_slot' as any, time: formatMin(openingHours.startMin), data: { startMin: openingHours.startMin, endMin: firstStartMin, gapMinutes: firstStartMin - openingHours.startMin, travelMinutes: 0 } });
      }
    }

    for (let i = 0; i < timeline.length; i++) {
      result.push(timeline[i]);
      const curr = timeline[i];
      if (curr.type === 'travel' || curr.type === 'dead_gap' || curr.type === 'free_slot' || curr.type === 'setup') continue;
      let nextRealIdx = i + 1;
      let hasTravelBetween = false;
      let travelTotalMin = 0;
      let hasUnknownDrive = false;
      while (nextRealIdx < timeline.length && (timeline[nextRealIdx].type === 'travel' || timeline[nextRealIdx].type === 'setup')) {
        const nxt = timeline[nextRealIdx];
        if (nxt.type === 'travel') {
          hasTravelBetween = true;
          const td = nxt.data;
          if (td.driveMinutes != null) {
            travelTotalMin += (td.driveMinutes ?? 0) + (td.bufferMinutes ?? 0);
          } else {
            hasUnknownDrive = true;
          }
        } else if (nxt.type === 'setup') {
          travelTotalMin += nxt.data.durationMinutes || 10;
        }
        nextRealIdx++;
      }
      const next = timeline[nextRealIdx];
      if (!next || (next.type !== 'apt' && next.type !== 'block')) continue;
      let currEndMin: number | null = null;
      if (curr.type === 'apt') {
        const dur = services.find(s => s.id === curr.data.service_id)?.duration_minutes ?? 60;
        currEndMin = parseInt(curr.data.appointment_time.slice(0, 2)) * 60 + parseInt(curr.data.appointment_time.slice(3, 5)) + dur;
      } else if (curr.type === 'block') {
        currEndMin = parseInt(curr.data.end_time.slice(0, 2)) * 60 + parseInt(curr.data.end_time.slice(3, 5));
      }
      let nextStartMin: number | null = null;
      if (next.type === 'apt') {
        nextStartMin = parseInt(next.data.appointment_time.slice(0, 2)) * 60 + parseInt(next.data.appointment_time.slice(3, 5));
      } else if (next.type === 'block') {
        nextStartMin = parseInt(next.data.start_time.slice(0, 2)) * 60 + parseInt(next.data.start_time.slice(3, 5));
      }
      if (currEndMin != null && nextStartMin != null) {
        insertGapOrFree(currEndMin, nextStartMin, travelTotalMin, hasUnknownDrive);
      }
    }

    // Free time after last item
    if (openingHours && timeline.length > 0) {
      const last = timeline[timeline.length - 1];
      let lastEndMin: number | null = null;
      if (last.type === 'apt') {
        const dur = services.find(s => s.id === last.data.service_id)?.duration_minutes ?? 60;
        lastEndMin = parseInt(last.data.appointment_time.slice(0, 2)) * 60 + parseInt(last.data.appointment_time.slice(3, 5)) + dur;
      } else if (last.type === 'block') {
        lastEndMin = parseInt(last.data.end_time.slice(0, 2)) * 60 + parseInt(last.data.end_time.slice(3, 5));
      } else if (last.type === 'travel' && last.data.arriveBy) {
        lastEndMin = parseInt(last.data.arriveBy.slice(0, 2)) * 60 + parseInt(last.data.arriveBy.slice(3, 5));
      }
      if (lastEndMin != null && openingHours.endMin - lastEndMin >= minSvcDur) {
        result.push({ type: 'free_slot' as any, time: formatMin(lastEndMin), data: { startMin: lastEndMin, endMin: openingHours.endMin, gapMinutes: openingHours.endMin - lastEndMin, travelMinutes: 0 } });
      }
    }

    return result;
  };

  // Compute available booking slots for a given day considering appointments, blocks, and travel
  const computeAvailableSlots = (
    dateStr: string,
    dayApts: Appointment[],
    dayBlocks: BlockedTime[],
    dayOpen: AvailableDateRow | null | undefined
  ) => {
    if (!dayOpen || !settings) return { slots: 0, slotTimes: [] as string[], suggestion: null as string | null };

    const startMin = (dayOpen.start_hour ?? settings.start_hour) * 60;
    const endMin = (dayOpen.end_hour ?? settings.end_hour) * 60;
    const bufferPerMile = settings.travel_buffer_per_mile ?? 0.5;
    const buffer = settings.buffer_minutes ?? 15;
    const minSvcDur = Math.min(...services.filter(s => s.is_active).map(s => s.duration_minutes), 60);

    // Build occupied ranges (in minutes from midnight)
    const occupied: { start: number; end: number; label: string }[] = [];

    const activeApts = dayApts.filter(a => a.status !== "cancelled" && a.status !== "rejected" && a.status !== "form_only");
    for (const apt of activeApts) {
      const svc = services.find(s => s.id === apt.service_id);
      const dur = svc?.duration_minutes ?? 60;
      const aptStart = parseInt(apt.appointment_time.slice(0, 2)) * 60 + parseInt(apt.appointment_time.slice(3, 5));
      const aptEnd = aptStart + dur;

      // Add travel buffer before
      const fromPC = apt.postcode?.trim().toUpperCase() || "";
      let travelBefore = buffer;
      if (fromPC) {
        // Find previous apt or base
        const prevApts = activeApts.filter(a => {
          const aStart = parseInt(a.appointment_time.slice(0, 2)) * 60 + parseInt(a.appointment_time.slice(3, 5));
          return aStart < aptStart;
        });
        const prevPC = prevApts.length > 0
          ? (prevApts[prevApts.length - 1].postcode?.trim().toUpperCase() || BASE_POSTCODE)
          : BASE_POSTCODE;
        const cached = routeCache.find(r =>
          r.origin_postcode.replace(/\s/g, "").toUpperCase() === prevPC.replace(/\s/g, "").toUpperCase() &&
          r.destination_postcode.replace(/\s/g, "").toUpperCase() === fromPC.replace(/\s/g, "").toUpperCase()
        );
        if (cached) {
          travelBefore = cached.drive_time_minutes + Math.ceil(cached.distance_miles * bufferPerMile);
        }
      }

      occupied.push({ start: aptStart - travelBefore, end: aptEnd + buffer, label: apt.client_name });
    }

    for (const bt of dayBlocks) {
      const bs = parseInt(bt.start_time.slice(0, 2)) * 60 + parseInt(bt.start_time.slice(3, 5));
      const be = parseInt(bt.end_time.slice(0, 2)) * 60 + parseInt(bt.end_time.slice(3, 5));
      occupied.push({ start: bs, end: be, label: bt.reason || "Block" });
    }

    occupied.sort((a, b) => a.start - b.start);

    // Find free windows
    const freeWindows: { start: number; end: number }[] = [];
    let cursor = startMin;
    for (const occ of occupied) {
      const occStart = Math.max(occ.start, startMin);
      const occEnd = Math.min(occ.end, endMin);
      if (cursor < occStart) {
        freeWindows.push({ start: cursor, end: occStart });
      }
      cursor = Math.max(cursor, occEnd);
    }
    if (cursor < endMin) {
      freeWindows.push({ start: cursor, end: endMin });
    }

    // Count how many minimum-service slots fit
    const slotTimes: string[] = [];
    for (const w of freeWindows) {
      const windowDur = w.end - w.start;
      if (windowDur >= minSvcDur) {
        // Generate possible start times in 15-min increments
        for (let t = w.start; t + minSvcDur <= w.end; t += 15) {
          const hh = Math.floor(t / 60).toString().padStart(2, "0");
          const mm = (t % 60).toString().padStart(2, "0");
          slotTimes.push(`${hh}:${mm}`);
        }
      }
    }

    // Smart suggestion: check if extending open hours by 15 mins could add a slot
    let suggestion: string | null = null;
    if (activeApts.length > 0) {
      // Check extending end by 15 min
      const lastOcc = occupied.length > 0 ? Math.max(...occupied.map(o => o.end)) : startMin;
      const currentEndGap = endMin - lastOcc;
      if (currentEndGap < minSvcDur && currentEndGap >= 0) {
        const needed = minSvcDur - currentEndGap;
        const extraSlots15 = Math.ceil(needed / 15);
        const extraMins = extraSlots15 * 15;
        suggestion = `Extend closing by ${extraMins} min to fit 1 more booking slot`;
      }

      // Check starting earlier
      if (!suggestion) {
        const firstOcc = occupied.length > 0 ? Math.min(...occupied.map(o => Math.max(o.start, startMin))) : endMin;
        const earlyGap = firstOcc - startMin;
        if (earlyGap < minSvcDur && earlyGap >= 0 && startMin > 0) {
          const needed = minSvcDur - earlyGap;
          const extraSlots15 = Math.ceil(needed / 15);
          const extraMins = extraSlots15 * 15;
          suggestion = `Start ${extraMins} min earlier to fit 1 more booking slot`;
        }
      }
    }

    return { slots: slotTimes.length, slotTimes, suggestion };
  };

  const sendSmsReminder = async (apt: Appointment) => {
    if (!apt.client_phone) {
      toast.error("No phone number on file for this patient");
      return;
    }
    toast.loading("Sending SMS reminder...", { id: "sms-send" });
    const { data, error } = await supabase.functions.invoke("send-sms-reminder", {
      body: { appointmentId: apt.id },
    });
    if (error) {
      toast.error("Failed to send SMS reminder", { id: "sms-send" });
    } else if (data?.sent > 0) {
      toast.success(`SMS reminder sent to ${apt.client_phone}`, { id: "sms-send" });
    } else {
      toast.error(data?.results?.[0]?.error || "SMS failed to send", { id: "sms-send" });
    }
  };

  const sendManualReviewRequest = async (apt: Appointment) => {
    try {
      const scheduledFor = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const comms: any[] = [];
      if (!isNoEmail(apt.client_email)) {
        comms.push({
          appointment_id: apt.id,
          channel: "email",
          trigger_type: "review_request",
          recipient_name: apt.client_name,
          recipient_email: apt.client_email,
          recipient_phone: apt.client_phone,
          scheduled_for: scheduledFor,
          subject: "How was your ShawScope appointment?",
          status: "pending",
        });
      }
      if (apt.client_phone) {
        comms.push({
          appointment_id: apt.id,
          channel: "sms",
          trigger_type: "review_request",
          recipient_name: apt.client_name,
          recipient_email: apt.client_email,
          recipient_phone: apt.client_phone,
          scheduled_for: scheduledFor,
          status: "pending",
        });
      }
      if (comms.length === 0) { toast.error("No email or phone on file"); return; }
      await supabase.from("scheduled_communications").insert(comms as any);
      toast.success("Review request scheduled (30 min)");
    } catch (e) {
      console.error("Failed to schedule review request", e);
      toast.error("Failed to schedule review request");
    }
  };

  const resendMorningTracking = async (apt: Appointment) => {
    try {
      toast.loading("Resending morning tracking...", { id: "resend-tracking" });
      const scheduledFor = new Date(Date.now() + 60 * 1000).toISOString();
      const comms: any[] = [];
      if (!isNoEmail(apt.client_email)) {
        comms.push({
          appointment_id: apt.id,
          channel: "email",
          trigger_type: "morning_reminder",
          recipient_name: apt.client_name,
          recipient_email: apt.client_email,
          subject: "Your ShawScope Visit Today",
          scheduled_for: scheduledFor,
          status: "pending",
          metadata: { access_token: apt.access_token },
        });
      }
      if (apt.client_phone) {
        comms.push({
          appointment_id: apt.id,
          channel: "sms",
          trigger_type: "morning_reminder",
          recipient_name: apt.client_name,
          recipient_phone: apt.client_phone,
          subject: "Morning Reminder",
          scheduled_for: scheduledFor,
          status: "pending",
          metadata: { access_token: apt.access_token },
        });
      }
      if (comms.length === 0) { toast.error("No email or phone on file", { id: "resend-tracking" }); return; }
      await supabase.from("scheduled_communications").insert(comms as any);
      toast.success("Morning tracking resent — will send in ~1 min", { id: "resend-tracking" });
    } catch (e) {
      console.error("Failed to resend morning tracking", e);
      toast.error("Failed to resend", { id: "resend-tracking" });
    }
  };

  const fetchAppointments = async () => {
    const { data: allData } = await supabase.from("appointments").select("*").order("appointment_date", { ascending: true }).order("appointment_time", { ascending: true });
    if (allData) setAllAppointments(allData as Appointment[]);

    let query = supabase.from("appointments").select("*").order("appointment_date", { ascending: true }).order("appointment_time", { ascending: true });
    if (selectedDate) {
      query = query.eq("appointment_date", format(selectedDate, "yyyy-MM-dd"));
    }
    const { data } = await query;
    if (data) setAppointments(data as Appointment[]);

    // Fetch timed appointment IDs for today
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayAptIds = (allData || []).filter(a => a.appointment_date === todayStr).map(a => a.id);
    if (todayAptIds.length > 0) {
      const { data: timings } = await supabase.from("appointment_timings").select("appointment_id").in("appointment_id", todayAptIds);
      if (timings) setTimedAptIds(new Set(timings.map(t => t.appointment_id)));

      // Hydrate OMW / Arrived / Delay / Clinic Ready states from communications_log
      const { data: commsLogs, error: commsErr } = await supabase.from("communications_log")
        .select("appointment_id, trigger_type, body_preview, created_at")
        .in("appointment_id", todayAptIds)
        .in("trigger_type", ["on_my_way", "on_my_way_cancelled", "arrived", "delay_notification", "clinic_ready"])
        .order("created_at", { ascending: true });
      if (commsErr) console.error("Comms hydration error:", commsErr);
      if (commsLogs) {
        const omwIds = new Set<string>();
        const arrivedIds = new Set<string>();
        const delayIds = new Set<string>();
        const clinicReadyIds = new Set<string>();
        const travelStateByApt: Record<string, "on_my_way" | "cancelled"> = {};
        const etas: Record<string, string> = {};
        for (const log of commsLogs) {
          if (!log.appointment_id) continue;
          if (log.trigger_type === "on_my_way") {
            travelStateByApt[log.appointment_id] = "on_my_way";
            // Extract ETA from body_preview e.g. "On my way - ETA ~12 min"
            const etaMatch = log.body_preview?.match(/ETA\s+(~?\d+\s*min)/i);
            if (etaMatch) etas[log.appointment_id] = etaMatch[1];
          }
          if (log.trigger_type === "on_my_way_cancelled") travelStateByApt[log.appointment_id] = "cancelled";
          if (log.trigger_type === "arrived") arrivedIds.add(log.appointment_id);
          if (log.trigger_type === "delay_notification") delayIds.add(log.appointment_id);
          if (log.trigger_type === "clinic_ready") clinicReadyIds.add(log.appointment_id);
        }
        Object.entries(travelStateByApt).forEach(([id, state]) => {
          if (state === "on_my_way") omwIds.add(id);
        });
        setOnMyWaySentIds(prev => {
          const merged = new Set(prev);
          Object.entries(travelStateByApt).forEach(([id, state]) => {
            if (state === "cancelled") merged.delete(id);
          });
          omwIds.forEach(id => merged.add(id));
          return merged;
        });
        setOnMyWayEtas(prev => ({ ...prev, ...etas }));
        setArrivedAptIds(prev => {
          const merged = new Set(prev);
          arrivedIds.forEach(id => merged.add(id));
          return merged;
        });
        setDelaySentIds(prev => {
          const merged = new Set(prev);
          delayIds.forEach(id => merged.add(id));
          return merged;
        });
        setClinicReadySentIds(prev => {
          const merged = new Set(prev);
          clinicReadyIds.forEach(id => merged.add(id));
          return merged;
        });
      }

      // Hydrate ETA arrival times from appointments
      const todayAptsWithEta = (allData || []).filter(a => a.appointment_date === todayStr && (a as any).delay_eta_arrival);
      if (todayAptsWithEta.length > 0) {
        const arrivals: Record<string, string> = {};
        for (const a of todayAptsWithEta) {
          arrivals[a.id] = (a as any).delay_eta_arrival;
        }
        setOnMyWayEtaArrivals(prev => ({ ...prev, ...arrivals }));
      }
    }

    // Fetch pending (unpaid) payments
    fetchPendingPayments();

    // Fetch clinic visit enquiries
    fetchClinicEnquiries();
  };

  const fetchPendingPayments = async () => {
    const { data } = await (supabase as any)
      .from("appointment_payments")
      .select("appointment_id, amount, payment_method, payment_status, notes")
      .eq("payment_status", "unpaid");
    if (data && data.length > 0) {
      const aptIds = data.map((p: any) => p.appointment_id);
      const { data: apts } = await supabase.from("appointments").select("id, client_name, client_email, client_phone, appointment_date, service_id").in("id", aptIds);
      const aptMap = new Map((apts || []).map(a => [a.id, a]));
      // Fetch last payment reminder sent for each
      const { data: reminders } = await (supabase as any)
        .from("communications_log")
        .select("appointment_id, created_at")
        .in("appointment_id", aptIds)
        .eq("trigger_type", "payment_reminder")
        .order("created_at", { ascending: false });
      const lastReminderMap = new Map<string, string>();
      (reminders || []).forEach((r: any) => {
        if (!lastReminderMap.has(r.appointment_id)) lastReminderMap.set(r.appointment_id, r.created_at);
      });
      setPendingPayments(data.map((p: any) => {
        const apt = aptMap.get(p.appointment_id);
        return {
          appointment_id: p.appointment_id,
          amount: Number(p.amount),
          payment_method: p.payment_method,
          client_name: apt?.client_name || "Unknown",
          client_email: apt?.client_email || "",
          client_phone: apt?.client_phone || null,
          appointment_date: apt?.appointment_date || "",
          service_id: apt?.service_id || null,
          last_reminder_sent: lastReminderMap.get(p.appointment_id) || null,
        };
      }));
    } else {
      setPendingPayments([]);
    }
  };

  const fetchClinicEnquiries = async () => {
    const { data } = await (supabase as any)
      .from("clinic_visit_enquiries")
      .select("id, client_name, client_email, client_phone, service_name, number_of_people, notes, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setClinicEnquiries(data || []);
  };

  const dismissClinicEnquiry = async (id: string) => {
    await (supabase as any).from("clinic_visit_enquiries").update({ status: "dismissed" }).eq("id", id);
    setClinicEnquiries(prev => prev.filter(e => e.id !== id));
    toast.success("Enquiry dismissed");
  };

  const markClinicEnquiryContacted = async (id: string) => {
    await (supabase as any).from("clinic_visit_enquiries").update({ status: "contacted" }).eq("id", id);
    setClinicEnquiries(prev => prev.filter(e => e.id !== id));
    toast.success("Marked as contacted");
  };

  const sendPaymentReminder = async (p: typeof pendingPayments[0]) => {
    setSendingReminder(p.appointment_id);
    const firstName = p.client_name.split(" ")[0];
    const amountStr = `£${p.amount.toFixed(2)}`;
    const smsMessage = `Hi ${firstName}, just a friendly reminder that your payment of ${amountStr} for your ShawScope appointment is still outstanding. You can pay by bank transfer to: Matt Shaw (Business), Sort Code: 04-00-03, Acc: 99491218, Ref: ${p.client_name.toUpperCase()}. Thank you! — ShawScope`;

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #292524; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: #fff; margin: 0; font-size: 20px;">💷 Payment Reminder</h2>
        </div>
        <div style="background: #fff; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 16px; color: #333;">Hi ${firstName},</p>
          <p style="margin: 0 0 16px; color: #333;">This is a friendly reminder that your payment of <strong>${amountStr}</strong> for your recent ShawScope appointment is still outstanding.</p>
          <p style="margin: 0 0 8px; color: #333; font-weight: 600;">You can pay by bank transfer:</p>
          <div style="background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 0 0 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 4px 0; color: #666; font-size: 14px;">Account Name</td><td style="padding: 4px 0; font-weight: bold; color: #333; text-align: right;">Matt Shaw</td></tr>
              <tr><td style="padding: 4px 0; color: #666; font-size: 14px;">Account Type</td><td style="padding: 4px 0; font-weight: bold; color: #333; text-align: right;">Business</td></tr>
              <tr><td style="padding: 4px 0; color: #666; font-size: 14px;">Sort Code</td><td style="padding: 4px 0; font-weight: bold; color: #333; text-align: right;">04-00-03</td></tr>
              <tr><td style="padding: 4px 0; color: #666; font-size: 14px;">Account Number</td><td style="padding: 4px 0; font-weight: bold; color: #333; text-align: right;">99491218</td></tr>
              <tr><td style="padding: 4px 0; color: #666; font-size: 14px;">Reference</td><td style="padding: 4px 0; font-weight: bold; color: #333; text-align: right;">${p.client_name.toUpperCase()}</td></tr>
              <tr style="border-top: 1px solid #e0e0e0;"><td style="padding: 8px 0 4px; color: #666; font-size: 14px;">Amount Due</td><td style="padding: 8px 0 4px; font-weight: bold; color: #16a34a; text-align: right; font-size: 18px;">${amountStr}</td></tr>
            </table>
          </div>
          <p style="margin: 0 0 8px; color: #666; font-size: 13px;">⚠️ Please use <strong>${p.client_name.toUpperCase()}</strong> as the payment reference.</p>
          <p style="margin: 0; color: #999; font-size: 12px;">If you've already paid, please disregard this message. Thank you — ShawScope</p>
        </div>
      </div>
    `;

    try {
      // Send email
      if (p.client_email) {
        await supabase.functions.invoke("send-form-email", {
          body: { to: p.client_email, subject: "Payment Reminder — ShawScope", html: emailHtml },
        });
      }
      // Send SMS
      if (p.client_phone) {
        await supabase.functions.invoke("send-sms-reminder", {
          body: { appointmentId: p.appointment_id, customMessage: smsMessage },
        });
      }
      // Log to communications_log
      await (supabase as any).from("communications_log").insert({
        channel: p.client_phone ? "sms" : "email",
        recipient_name: p.client_name,
        recipient_email: p.client_email,
        recipient_phone: p.client_phone,
        subject: "Payment Reminder",
        body_preview: smsMessage.slice(0, 200),
        trigger_type: "payment_reminder",
        appointment_id: p.appointment_id,
        status: "sent",
      });
      toast.success(`Payment reminder sent to ${p.client_name}`);
      fetchPendingPayments();
    } catch (err: any) {
      toast.error("Failed to send reminder: " + err.message);
    } finally {
      setSendingReminder(null);
    }
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from("consent_form_templates").select("*").order("created_at", { ascending: false });
    if (data) setTemplates(data as ConsentTemplate[]);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("business_settings").select("*").single();
    if (data) setSettings(data as BizSettings);
  };

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*").order("sort_order");
    if (data) setServices(data as Service[]);
    // Fetch waitlist
    const { data: wlData } = await supabase.from("service_waitlist").select("*").order("created_at", { ascending: false });
    if (wlData) setServiceWaitlist(wlData as WaitlistEntry[]);
    // Fetch foot care waitlist
    const { data: fcWl } = await (supabase as any).from("foot_care_waitlist").select("*").order("created_at", { ascending: false });
    if (fcWl) setFootCareWaitlist(fcWl);
  };

  const fetchAvailableDates = async () => {
    const { data } = await supabase.from("available_dates").select("*").order("available_date", { ascending: true });
    if (data) {
      setAvailableDates(data as AvailableDateRow[]);
      setAvailCalendarDates(data.filter((d: any) => d.is_available).map((d: any) => parseISO(d.available_date)));
    }
  };

  const fetchCryoTemplates = async () => {
    const { data } = await supabase.from("cryo_followup_templates").select("*").order("week_number");
    if (data) setCryoTemplates(data);
  };

  const fetchEmailTemplates = async () => {
    const { data } = await supabase.from("email_templates").select("*").order("trigger_type");
    if (data) setEmailTemplates(data as EmailTemplate[]);
  };

  const fetchSmsTemplates = async () => {
    const { data } = await supabase.from("sms_templates").select("*").order("trigger_type");
    if (data) setSmsTemplates(data as SmsTemplate[]);
  };

  const fetchBlockedTimes = async () => {
    const { data } = await supabase.from("blocked_times").select("*").order("blocked_date").order("start_time");
    if (data) setBlockedTimes(data as BlockedTime[]);
  };

  const fetchConsentStatus = async () => {
    const { data } = await supabase
      .from("consent_form_responses")
      .select("appointment_id");
    if (data) {
      setConsentCompletedIds(new Set(data.map((r) => r.appointment_id)));
    }
  };

  const fetchConsultNoteStatus = async () => {
    // Find consultation template IDs
    const consultTemplateIds = templates.filter(t => t.form_type === 'consultation').map(t => t.id);
    if (consultTemplateIds.length === 0) return;
    const { data } = await supabase
      .from("consent_form_responses")
      .select("appointment_id")
      .in("consent_form_template_id", consultTemplateIds);
    if (data) {
      setConsultNoteCompletedIds(new Set(data.map((r: any) => r.appointment_id)));
    }
  };

  const fetchPatientCount = async () => {
    const { count } = await supabase.from("patients").select("*", { count: "exact", head: true });
    setTotalPatients(count || 0);
  };

  const fetchVisitorData = async () => {
    try {
      const { data, error } = await supabase
        .from("website_analytics_cache")
        .select("this_week_visitors, last_week_visitors, this_month_visitors, last_month_visitors")
        .limit(1)
        .maybeSingle();
      if (error) { console.error("Analytics cache error:", error); return; }
      if (data) setVisitorData({
        thisWeekVisitors: data.this_week_visitors,
        lastWeekVisitors: data.last_week_visitors,
        thisMonthVisitors: data.this_month_visitors,
        lastMonthVisitors: data.last_month_visitors,
      });
    } catch (e) { console.error("Analytics fetch failed:", e); }
  };

  const fetchPatientDobs = async () => {
    const { data } = await supabase
      .from("patients")
      .select("client_email, date_of_birth, alert_note, deceased")
      .eq("deceased", false);
    if (data) {
      const dobMap: Record<string, string | null> = {};
      const alertMap: Record<string, string | null> = {};
      data.forEach((p: any) => { dobMap[p.client_email] = p.date_of_birth; alertMap[p.client_email] = p.alert_note; });
      setPatientDobs(dobMap);
      setPatientAlerts(alertMap);
    }
  };

  // Lite patient list + suggested durations for duplicate detection on dashboard
  const fetchDuplicateHelpers = async () => {
    const { data: pats } = await supabase
      .from("patients")
      .select("id, client_name, client_email, client_phone")
      .eq("deceased", false);
    if (pats) setAllPatientsLite(pats as any);

    const { data: completed } = await supabase
      .from("appointments")
      .select("id, client_email, service_id")
      .in("status", ["completed", "confirmed"]);
    if (!completed || completed.length === 0) return;
    const ids = completed.map((a: any) => a.id);
    // Chunk to avoid URL limits
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 200) chunks.push(ids.slice(i, i + 200));
    const timings: { appointment_id: string; duration_seconds: number | null }[] = [];
    for (const c of chunks) {
      const { data: t } = await supabase
        .from("appointment_timings")
        .select("appointment_id, duration_seconds")
        .in("appointment_id", c)
        .not("duration_seconds", "is", null);
      if (t) timings.push(...(t as any));
    }
    if (timings.length === 0) return;
    const aptMap: Record<string, { email: string; service_id: string | null }> = {};
    for (const a of completed as any[]) aptMap[a.id] = { email: (a.client_email || "").toLowerCase(), service_id: a.service_id };
    const buckets: Record<string, number[]> = {};
    for (const t of timings) {
      const a = aptMap[t.appointment_id];
      if (!a || !a.email || !t.duration_seconds || t.duration_seconds <= 0) continue;
      const key = `${a.email}|${a.service_id || ""}`;
      (buckets[key] ||= []).push(t.duration_seconds);
    }
    const result: Record<string, { avgMin: number; count: number }> = {};
    for (const [k, secs] of Object.entries(buckets)) {
      const avgSec = secs.reduce((x, y) => x + y, 0) / secs.length;
      result[k] = { avgMin: Math.max(5, Math.ceil(avgSec / 60 / 5) * 5), count: secs.length };
    }
    setSuggestedDurations(result);
  };

  // Normalize for fuzzy matching
  const normalizeName = (s: string) =>
    (s || "").toLowerCase().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, " ");
  const normalizePhone = (s: string | null) =>
    (s || "").replace(/\D/g, "").replace(/^0/, "44");

  // For a pending request, find a "possible duplicate" patient using phone or name
  // when the booking's email doesn't already match a patient record.
  const getDuplicateMatch = (apt: { client_email: string; client_phone: string | null; client_name: string }) => {
    const email = (apt.client_email || "").toLowerCase().trim();
    if (!email || allPatientsLite.length === 0) return null;
    const emailMatch = allPatientsLite.find((p) => (p.client_email || "").toLowerCase() === email);
    if (emailMatch) return null; // already linked via email
    const phone = normalizePhone(apt.client_phone);
    const name = normalizeName(apt.client_name);
    if (phone && phone.length >= 9) {
      const m = allPatientsLite.find((p) => normalizePhone(p.client_phone) === phone);
      if (m) return { patient: m, reason: "phone" as const };
    }
    if (name) {
      const m = allPatientsLite.find((p) => normalizeName(p.client_name) === name);
      if (m) return { patient: m, reason: "name" as const };
    }
    return null;
  };

  const getSuggestedDurationFor = (email: string, serviceId: string | null) => {
    const e = (email || "").toLowerCase();
    if (!e) return null;
    return (
      suggestedDurations[`${e}|${serviceId || ""}`] ||
      suggestedDurations[`${e}|`] ||
      null
    );
  };

  const linkBookingToPatient = async (aptId: string, patient: { client_name: string; client_email: string }) => {
    const { error } = await supabase
      .from("appointments")
      .update({ client_email: patient.client_email, client_name: patient.client_name })
      .eq("id", aptId);
    if (error) { toast.error("Couldn't link", { description: error.message }); return; }
    toast.success("Linked to record", { description: patient.client_name });
    await fetchAppointments();
  };

  const fetchRecallEmails = async () => {
    const { data } = await supabase.from("patient_recalls").select("client_email").eq("status", "pending");
    if (data) {
      setRecallEmails(new Set(data.map((r: any) => r.client_email?.toLowerCase())));
    }
  };

  const getPatientAge = (email: string): number | null => {
    const dob = patientDobs[email];
    if (!dob) return null;
    return differenceInYears(new Date(), parseISO(dob));
  };

  const logPatientActivity = async (email: string, eventType: string, message: string) => {
    await supabase.from("patient_activity_log").insert({
      client_email: email.toLowerCase(),
      event_type: eventType,
      message,
      created_by: "admin",
    }).then(({ error: logErr }) => { if (logErr) console.error("Activity log error:", logErr); });
  };

   // Manual break helpers - now opens slot picker
  const addBreak = async (type: "lunch" | "mobile", dateStr?: string) => {
    const targetDate = dateStr || (selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setBreakPickerType(type);
    setBreakPickerDate(targetDate);
    setBreakDuration(60);
    setBreakSelectedSlot(null);
    setBreakPickerOpen(true);
  };

  // Compute available break slots for the picker
  const computeBreakSlots = useMemo(() => {
    if (!breakPickerDate || !breakPickerOpen) return [];
    
    const dayApts = allAppointments
      .filter(a => a.appointment_date === breakPickerDate && a.status !== "cancelled" && a.status !== "rejected")
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    
    const dayBlks = blockedTimes.filter(b => b.blocked_date === breakPickerDate);
    const dateOverride = availableDates.find(d => d.available_date === breakPickerDate);
    const startHour = dateOverride?.start_hour ?? settings?.start_hour ?? 9;
    const endHour = dateOverride?.end_hour ?? settings?.end_hour ?? 17;
    const bufferPerMile = settings?.travel_buffer_per_mile ?? 0.5;
    const bufferMin = settings?.buffer_minutes ?? 15;

    // Build occupied ranges (start_min, end_min) including travel
    const occupied: { start: number; end: number; label: string }[] = [];

    for (const apt of dayApts) {
      const aptStart = parseInt(apt.appointment_time.slice(0, 2)) * 60 + parseInt(apt.appointment_time.slice(3, 5));
      const svc = services.find(s => s.id === apt.service_id);
      const dur = svc?.duration_minutes ?? settings?.appointment_duration_minutes ?? 60;
      const aptEnd = aptStart + dur;
      
      // Include travel buffer after appointment
      const pc = apt.postcode?.trim().toUpperCase() || "";
      let travelAfter = bufferMin; // minimum buffer
      if (pc) {
        // Check travel to base
        const cachedToBase = routeCache.find(
          r => r.origin_postcode.replace(/\s/g, "").toUpperCase() === pc &&
               r.destination_postcode.replace(/\s/g, "").toUpperCase() === BASE_POSTCODE.replace(/\s/g, "").toUpperCase()
        );
        if (cachedToBase) {
          travelAfter = Math.max(travelAfter, cachedToBase.drive_time_minutes + Math.ceil(cachedToBase.distance_miles * bufferPerMile));
        }
      }
      
      // Include travel before appointment (from base)
      let travelBefore = bufferMin;
      if (pc) {
        const cachedFromBase = routeCache.find(
          r => r.origin_postcode.replace(/\s/g, "").toUpperCase() === BASE_POSTCODE.replace(/\s/g, "").toUpperCase() &&
               r.destination_postcode.replace(/\s/g, "").toUpperCase() === pc
        );
        if (cachedFromBase) {
          travelBefore = Math.max(travelBefore, cachedFromBase.drive_time_minutes + Math.ceil(cachedFromBase.distance_miles * bufferPerMile));
        }
      }

      occupied.push({ 
        start: aptStart - travelBefore, 
        end: aptEnd + travelAfter, 
        label: `${apt.client_name} (${apt.appointment_time.slice(0,5)})` 
      });
    }

    // Add existing blocks
    for (const blk of dayBlks) {
      const bStart = parseInt(blk.start_time.slice(0, 2)) * 60 + parseInt(blk.start_time.slice(3, 5));
      const bEnd = parseInt(blk.end_time.slice(0, 2)) * 60 + parseInt(blk.end_time.slice(3, 5));
      occupied.push({ start: bStart, end: bEnd, label: blk.reason || "Blocked" });
    }

    // Sort occupied ranges
    occupied.sort((a, b) => a.start - b.start);

    // Generate 30-min interval slots within working hours
    const slots: { time: string; endTime: string; available: boolean; conflict?: string }[] = [];
    const dayStartMin = startHour * 60;
    const dayEndMin = endHour * 60;

    for (let m = dayStartMin; m + breakDuration <= dayEndMin; m += 15) {
      const slotStart = m;
      const slotEnd = m + breakDuration;
      const timeStr = `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
      const endStr = `${Math.floor(slotEnd / 60).toString().padStart(2, "0")}:${(slotEnd % 60).toString().padStart(2, "0")}`;

      // Check if slot overlaps any occupied range
      const conflict = occupied.find(o => slotStart < o.end && slotEnd > o.start);
      
      slots.push({
        time: timeStr,
        endTime: endStr,
        available: !conflict,
        conflict: conflict?.label,
      });
    }

    return slots;
  }, [breakPickerDate, breakPickerOpen, breakDuration, allAppointments, blockedTimes, availableDates, settings, services, routeCache]);

  const confirmBreakSlot = async () => {
    if (!breakSelectedSlot || !breakPickerDate) return;
    const endMinutes = parseInt(breakSelectedSlot.slice(0, 2)) * 60 + parseInt(breakSelectedSlot.slice(3, 5)) + breakDuration;
    const endStr = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;
    const reason = breakPickerType === "lunch" ? "Lunch break" : "Mobile break";

    const { error } = await supabase.from("blocked_times").insert({
      blocked_date: breakPickerDate,
      start_time: breakSelectedSlot + ":00",
      end_time: endStr + ":00",
      reason,
      repeat_type: "none",
    });
    if (error) toast.error("Failed to add break");
    else {
      toast.success(`${reason} added: ${breakSelectedSlot}–${endStr}`);
      setBreakPickerOpen(false);
      fetchBlockedTimes();
    }
  };

  // Lunch breaks are added manually via the "Add Break" button

  // Auto-fetch missing route cache entries for displayed travel segments
  const fetchMissingRoutes = async (dayApts: Appointment[]) => {
    const sorted = [...dayApts]
      .filter(a => a.status !== "cancelled" && a.status !== "rejected" && a.postcode)
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    const pairsToFetch: { origin: string; destination: string }[] = [];

    // Check base → first
    if (sorted.length > 0) {
      const firstPc = sorted[0].postcode!.trim().toUpperCase();
      const cached = routeCache.find(
        r => r.origin_postcode.replace(/\s/g, "").toUpperCase() === BASE_POSTCODE.replace(/\s/g, "").toUpperCase() &&
             r.destination_postcode.replace(/\s/g, "").toUpperCase() === firstPc.replace(/\s/g, "").toUpperCase()
      );
      if (!cached) pairsToFetch.push({ origin: BASE_POSTCODE, destination: firstPc });
      // Also check first patient → base (for return to base / lunch travel)
      const cachedReverse = routeCache.find(
        r => r.origin_postcode.replace(/\s/g, "").toUpperCase() === firstPc.replace(/\s/g, "").toUpperCase() &&
             r.destination_postcode.replace(/\s/g, "").toUpperCase() === BASE_POSTCODE.replace(/\s/g, "").toUpperCase()
      );
      if (!cachedReverse) pairsToFetch.push({ origin: firstPc, destination: BASE_POSTCODE });
    }

    // Check consecutive pairs + reverse to base for lunch travel + base to each patient
    for (let i = 0; i < sorted.length - 1; i++) {
      const fromPc = sorted[i].postcode!.trim().toUpperCase();
      const toPc = sorted[i + 1].postcode!.trim().toUpperCase();
      if (sorted[i].group_id && sorted[i + 1].group_id && sorted[i].group_id === sorted[i + 1].group_id) continue;
      const cached = routeCache.find(
        r => r.origin_postcode.replace(/\s/g, "").toUpperCase() === fromPc.replace(/\s/g, "").toUpperCase() &&
             r.destination_postcode.replace(/\s/g, "").toUpperCase() === toPc.replace(/\s/g, "").toUpperCase()
      );
      if (!cached) pairsToFetch.push({ origin: fromPc, destination: toPc });

      // Also check reverse (patient → base) for lunch travel
      const cachedReverse = routeCache.find(
        r => r.origin_postcode.replace(/\s/g, "").toUpperCase() === fromPc.replace(/\s/g, "").toUpperCase() &&
             r.destination_postcode.replace(/\s/g, "").toUpperCase() === BASE_POSTCODE.replace(/\s/g, "").toUpperCase()
      );
      if (!cachedReverse) pairsToFetch.push({ origin: fromPc, destination: BASE_POSTCODE });

      // Also check base → each patient (for post-lunch travel)
      const cachedBaseToNext = routeCache.find(
        r => r.origin_postcode.replace(/\s/g, "").toUpperCase() === BASE_POSTCODE.replace(/\s/g, "").toUpperCase() &&
             r.destination_postcode.replace(/\s/g, "").toUpperCase() === toPc.replace(/\s/g, "").toUpperCase()
      );
      if (!cachedBaseToNext) pairsToFetch.push({ origin: BASE_POSTCODE, destination: toPc });
    }

    if (pairsToFetch.length === 0) return;

    // Fetch all missing routes in parallel
    await Promise.all(pairsToFetch.map(async (pair) => {
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-drive-time`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ origin: pair.origin, destination: pair.destination }),
        });
      } catch (e) {
        console.error(`Failed to fetch route ${pair.origin} → ${pair.destination}:`, e);
      }
    }));

    // Refresh the cache after fetching
    fetchRouteCache();
  };

  useEffect(() => {
    fetchAppointments();
    fetchTemplates();
    fetchSettings();
    fetchServices();
    fetchAvailableDates();
    fetchEmailTemplates();
    fetchSmsTemplates();
    fetchCryoTemplates();
    fetchBlockedTimes();
    fetchConsentStatus();
    fetchPatientCount();
    fetchPatientDobs();
    fetchRecallEmails();
    fetchDuplicateHelpers();
    fetchRouteCache();
    fetchVisitorData();
    supabase.functions.invoke("google-maps-key").then(({ data }) => {
      if (data?.apiKey) setGoogleMapsKey(data.apiKey);
    });
    // Check audit warnings
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count } = await supabase.from("clinical_audit_entries").select("*", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]).lt("updated_at", sevenDaysAgo);
      const { count: todoCount } = await supabase.from("admin_todos" as any).select("*", { count: "exact", head: true })
        .eq("completed", false).not("due_date", "is", null).lt("due_date", new Date().toISOString().split("T")[0]);
      setTodoOverdueCount(todoCount || 0);
      // Pulse also when there are open governance items that need attention
      const [govInc, govComp, govSafe, govBreach] = await Promise.all([
        supabase.from("gov_incidents" as any).select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("gov_complaints" as any).select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("gov_safeguarding" as any).select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("gov_gdpr_breaches" as any).select("id", { count: "exact", head: true }).neq("status", "closed"),
      ]);
      const govOpen = (govInc.count || 0) + (govComp.count || 0) + (govSafe.count || 0) + (govBreach.count || 0);
      setAuditWarning((count || 0) > 0 || govOpen > 0);
    })();
    // Check for live notices
    (async () => {
      const { count } = await supabase.from("notices").select("*", { count: "exact", head: true }).eq("is_active", true);
      setHasLiveNotice((count || 0) > 0);
    })();
    // Unread chatbot conversations — fetched at top level so the dashboard
    // can show an alert even before the Chatbot tab is opened, plus realtime
    // subscription so new patient messages flag instantly.
    const fetchUnreadChats = async () => {
      const { count } = await supabase
        .from("chat_logs")
        .select("*", { count: "exact", head: true })
        .eq("admin_read", false);
      setUnreadChatCount(count || 0);
    };
    fetchUnreadChats();
    const chatChannel = supabase
      .channel("admin-chat-logs-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_logs" }, () => {
        fetchUnreadChats();
      })
      .subscribe();
    (window as any).__chatUnreadChannel = chatChannel;

    // Check upcoming recalls (next 7 days)
    (async () => {
      const in7Days = new Date(Date.now() + 7 * 86400000).toISOString();
      const { count } = await supabase.from("patient_recalls").select("*", { count: "exact", head: true })
        .eq("status", "pending").lte("recall_date", in7Days);
      setUpcomingRecalls((count || 0) > 0);
    })();
    // Check upcoming scheduled messages (next 24 hours)
    (async () => {
      const in24h = new Date(Date.now() + 24 * 3600000).toISOString();
      const { count } = await supabase.from("scheduled_communications").select("*", { count: "exact", head: true })
        .eq("status", "pending").lte("scheduled_for", in24h);
      setUpcomingMessages((count || 0) > 0);
    })();

    return () => {
      try { supabase.removeChannel(chatChannel); } catch { /* no-op */ }
    };
  }, []);

  // Fetch consultation form completion status once templates are loaded
  useEffect(() => {
    if (templates.length > 0) fetchConsultNoteStatus();
  }, [templates]);

  useEffect(() => { fetchAppointments(); }, [selectedDate]);

  // Tick countdown every second for live ETA display on travel tiles
  useEffect(() => {
    const hasActiveEtas = Object.keys(onMyWayEtaArrivals).some(id => onMyWaySentIds.has(id) && !arrivedAptIds.has(id));
    if (!hasActiveEtas) return;
    const interval = setInterval(() => setEtaCountdownTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [onMyWayEtaArrivals, onMyWaySentIds, arrivedAptIds]);

  // Auto-fetch missing route cache entries when appointments or route cache changes
  // Also auto-create breaks for upcoming busy days
  useEffect(() => {
    if (allAppointments.length === 0 || routeCache.length === 0) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayApts = allAppointments.filter(a => a.appointment_date === todayStr && a.status !== "cancelled" && a.status !== "rejected");
    if (todayApts.length > 0) fetchMissingRoutes(todayApts);
    // Auto breaks removed — manual only now
    if (selectedDate) {
      const selStr = format(selectedDate, "yyyy-MM-dd");
      if (selStr !== todayStr) {
        const selApts = allAppointments.filter(a => a.appointment_date === selStr && a.status !== "cancelled" && a.status !== "rejected");
        if (selApts.length > 0) fetchMissingRoutes(selApts);
        // Auto breaks removed — manual only now
      }
    }
  }, [allAppointments.length, routeCache.length, selectedDate]);

  // Shared dynamic slot calculator
  const calculateDynamicSlots = async (
    targetDate: string,
    patientPostcode: string | null,
    serviceId: string | null,
    excludeAptTime?: string | null,
    excludeAptDate?: string | null,
  ): Promise<{ time: string; available: boolean; status?: "taken" | "available" | "recommended" }[]> => {
    if (!settings || !targetDate) return [];

    const selectedSvc = services.find(s => s.id === serviceId);
    const duration = selectedSvc?.duration_minutes ?? settings.appointment_duration_minutes ?? 60;

    const dateOverride = availableDates.find(d => d.available_date === targetDate);
    const startHour = dateOverride?.start_hour ?? settings.start_hour;
    const endHour = dateOverride?.end_hour ?? settings.end_hour;
    const dayStartMinutes = startHour * 60;
    const dayEndMinutes = endHour * 60;

    const toMin = (t: string) => { const p = t.split(":"); return parseInt(p[0]) * 60 + parseInt(p[1]); };
    const roundTo5 = (mins: number) => Math.ceil(mins / 5) * 5;

    const { data: blockedSlots } = await supabase.from("blocked_times").select("start_time, end_time, reason").eq("blocked_date", targetDate);
    const blocks = ((blockedSlots || []) as { start_time: string; end_time: string; reason: string | null }[]).filter(b => b.reason !== "Annual Leave" && b.reason !== "On Call");

    // If postcode available, use dynamic travel-time slots
    const pc = patientPostcode?.trim();
    if (pc) {
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-drive-time`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ destination: pc, date: targetDate }),
        });
        const dtData = await resp.json();

        if (dtData.drive_times) {
          const existingApts = (dtData.appointments || [])
            .filter((a: any) => {
              // Exclude the appointment being edited/rescheduled
              if (excludeAptTime && excludeAptDate === targetDate && a.time.slice(0,5) === excludeAptTime.slice(0,5)) return false;
              return true;
            })
            .map((a: any) => ({
              startMins: parseInt(a.time.slice(0, 2)) * 60 + parseInt(a.time.slice(3, 5)),
              duration: a.duration,
              postcode: a.postcode,
            }))
            .sort((a: any, b: any) => a.startMins - b.startMins);

          const getDriveTime = (originPc: string | null): number => {
            if (!originPc) return 15;
            const key = originPc.toUpperCase().replace(/\s+/g, " ");
            return dtData.drive_times[key]?.drive_time_minutes ?? 15;
          };
          const getBuffer = (driveTimeMins: number): number => driveTimeMins > 20 ? 10 : 5;

          const unavailableWindows: { start: number; end: number }[] = [];
          for (const apt of existingApts) {
            const aptEnd = apt.startMins + apt.duration;
            const driveFromApt = getDriveTime(apt.postcode);
            const buffer = getBuffer(driveFromApt);
            unavailableWindows.push({ start: apt.startMins, end: aptEnd + driveFromApt + buffer });
          }

          // Generate ALL 15-min slots across the day
          const allSlotMins: number[] = [];
          for (let mins = dayStartMinutes; mins + duration <= dayEndMinutes; mins += 15) allSlotMins.push(mins);
          // Also add optimal post-appointment slots
          for (const apt of existingApts) {
            const aptEnd = apt.startMins + apt.duration;
            const driveFromApt = getDriveTime(apt.postcode);
            const buffer = getBuffer(driveFromApt);
            const firstAvail = roundTo5(aptEnd + driveFromApt + buffer);
            if (firstAvail + duration <= dayEndMinutes && !allSlotMins.includes(firstAvail)) allSlotMins.push(firstAvail);
          }
          const sortedSlots = Array.from(new Set(allSlotMins)).sort((a, b) => a - b);

          // Calculate drive time FROM patient postcode to base for recommendation scoring
          const driveFromBase = getDriveTime("DT2 8DG");

          const slots: { time: string; available: boolean; status?: "taken" | "available" | "recommended" }[] = [];

          for (const mins of sortedSlots) {
            const h = Math.floor(mins / 60).toString().padStart(2, "0");
            const m = (mins % 60).toString().padStart(2, "0");
            const timeStr = `${h}:${m}`;

            const slotEnd = mins + duration;
            const isBlocked = blocks.some(b => {
              const bs = toMin(b.start_time); const be = toMin(b.end_time);
              return mins < be && slotEnd > bs;
            });
            if (isBlocked) continue;

            // Check if slot overlaps with existing appointments (travel-aware)
            let isTaken = false;
            for (const w of unavailableWindows) {
              if (mins < w.end && slotEnd > w.start) { isTaken = true; break; }
            }

            if (!isTaken) {
              for (const apt of existingApts) {
                if (apt.startMins > mins) {
                  const driveToNext = getDriveTime(apt.postcode);
                  const bufferToNext = getBuffer(driveToNext);
                  if (mins + duration + driveToNext + bufferToNext > apt.startMins) isTaken = true;
                  break;
                }
              }
            }

            // Safety: overlap check using actual travel time (not static buffer)
            // The travel-aware unavailableWindows and driveToNext checks above already handle this correctly

            if (isTaken) {
              slots.push({ time: timeStr, available: false, status: "taken" });
            } else {
              // Determine if this is a recommended slot (adjacent to existing appointments with short travel)
              let isRecommended = false;
              if (existingApts.length > 0 && pc) {
                // Check if this slot is right after an existing appointment
                for (const apt of existingApts) {
                  const aptEnd = apt.startMins + apt.duration;
                  const driveFromApt = getDriveTime(apt.postcode);
                  const bufferAfter = getBuffer(driveFromApt);
                  const idealStart = roundTo5(aptEnd + driveFromApt + bufferAfter);
                  if (Math.abs(mins - idealStart) <= 15 && driveFromApt <= 15) {
                    isRecommended = true;
                    break;
                  }
                }
                // Check if this slot is right before an existing appointment with short travel
                if (!isRecommended) {
                  for (const apt of existingApts) {
                    const driveToApt = getDriveTime(apt.postcode);
                    if (slotEnd + driveToApt + getBuffer(driveToApt) <= apt.startMins && apt.startMins - slotEnd <= 30 && driveToApt <= 15) {
                      isRecommended = true;
                      break;
                    }
                  }
                }
              }
              slots.push({ time: timeStr, available: true, status: isRecommended ? "recommended" : "available" });
            }
          }

          // Show travel info
          if (dtData.travel_fee > 0) {
            toast.info(`Travel: ${dtData.distance_miles} miles · £${dtData.travel_fee.toFixed(2)} fee`, { id: "travel-info", duration: 4000 });
          }

          return slots;
        }
      } catch (e) {
        console.error("Dynamic slot calc failed, using static fallback:", e);
      }
    }

    // Fallback: static buffer
    const buffer = settings.buffer_minutes ?? 15;
    const { data: bookedData } = await supabase.rpc("get_booked_slots_with_duration", { target_date: targetDate });
    const bookedSlots = (bookedData || []) as { appointment_time: string; duration_minutes: number }[];

    const slots: { time: string; available: boolean; status?: "taken" | "available" | "recommended" }[] = [];
    for (let mins = dayStartMinutes; mins + duration <= dayEndMinutes; mins += 15) {
      const h = Math.floor(mins / 60).toString().padStart(2, "0");
      const m = (mins % 60).toString().padStart(2, "0");
      const timeStr = `${h}:${m}`;

      const isBlocked = blocks.some(b => {
        const bs = toMin(b.start_time); const be = toMin(b.end_time);
        return mins < be && mins + duration > bs;
      });

      const isBooked = bookedSlots.some(b => {
        const bs = toMin(b.appointment_time); const bd = b.duration_minutes;
        if (excludeAptTime && excludeAptDate === targetDate && b.appointment_time.slice(0,5) === excludeAptTime.slice(0,5)) return false;
        return (mins < bs + bd + buffer && mins + duration + buffer > bs);
      });

      if (!isBlocked) slots.push({ time: timeStr, available: !isBooked, status: isBooked ? "taken" : "available" });
    }
    return slots;
  };

  // Fetch available time slots when aptDate, aptServiceId, or aptPostcode changes
  useEffect(() => {
    if (!aptDate || !settings || !aptDialogOpen) { setAptAvailableSlots([]); return; }
    calculateDynamicSlots(aptDate, aptPostcode || null, aptServiceId, editingApt?.appointment_time, editingApt?.appointment_date)
      .then(setAptAvailableSlots);
  }, [aptDate, aptServiceId, aptDialogOpen, aptPostcode]);

  // Fetch available time slots for reschedule dialog
  useEffect(() => {
    if (!rescheduleDate || !settings || !rescheduleDialogOpen || !rescheduleApt) { setRescheduleAvailableSlots([]); return; }
    calculateDynamicSlots(rescheduleDate, rescheduleApt.postcode, rescheduleApt.service_id, rescheduleApt.appointment_time, rescheduleApt.appointment_date)
      .then(setRescheduleAvailableSlots);
  }, [rescheduleDate, rescheduleDialogOpen, rescheduleApt]);

  // Fetch available time slots for reject alternative suggestion
  useEffect(() => {
    if (!rejectAltDate || !settings || !rejectDialogOpen || !rejectingApt) { setRejectAvailableSlots([]); return; }
    calculateDynamicSlots(rejectAltDate, rejectingApt.postcode, rejectingApt.service_id)
      .then(setRejectAvailableSlots);
  }, [rejectAltDate, rejectDialogOpen, rejectingApt]);

  const updateStatus = async (id: string, status: string) => {
    // If cancelling, check for travel buffer conflicts with the next appointment
    if (status === "cancelled") {
      const cancelledApt = allAppointments.find(a => a.id === id);
      if (cancelledApt) {
        const sameDayApts = allAppointments
          .filter(a => a.appointment_date === cancelledApt.appointment_date && a.id !== id && a.status !== "cancelled" && a.status !== "rejected")
          .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
        
        const cancelledIdx = sameDayApts.findIndex(a => a.appointment_time > cancelledApt.appointment_time);
        if (cancelledIdx >= 0) {
          const nextApt = sameDayApts[cancelledIdx];
          // The previous appointment's travel buffer to the next one has changed
          const prevApt = cancelledIdx > 0 ? sameDayApts[cancelledIdx - 1] : null;
          const fromLocation = prevApt ? `previous appointment (${prevApt.client_name} at ${prevApt.appointment_time.slice(0,5)})` : "base (DT2 8DG)";
          toast.warning(
            `⚠️ Travel buffer changed: ${nextApt.client_name}'s appointment at ${nextApt.appointment_time.slice(0,5)} now follows ${fromLocation}. The travel time between them may differ — please verify the schedule.`,
            { duration: 10000 }
          );
        }
      }
    }

    const result = await offlineMutation({
      table: "appointments",
      operation: "update",
      data: { status },
      matchColumn: "id",
      matchValue: id,
      successMessage: `Status updated to ${status}`,
    });
    if (result.success) fetchAppointments();
  };

  // Prompt-based status change with optional notification
  const promptStatusChange = async (apt: Appointment, newStatus: string) => {
    setStatusChangeApt(apt);
    setStatusChangeNewStatus(newStatus);
    setStatusChangeNotify(newStatus !== "completed"); // Don't notify patient on completion
    setStatusChangeNotifySms(false); // SMS off by default, user opts in
    setStatusChangeReviewRequest(newStatus === "completed"); // Default review request on for completions
    setStatusChangeShowPreview(false);
    setStatusChangePreviewHtml("");
    setStatusChangePreviewSubject("");
    setStatusChangeDialogOpen(true);

    // Load the email template preview (skip for completed since we don't notify)
    const notifyType = newStatus === "confirmed" ? "approved" : newStatus === "completed" ? "completed" : newStatus === "cancelled" ? "cancelled" : "appointment_changed";
    const { data: tplData } = await supabase.from("email_templates").select("subject, body_html").eq("trigger_type", notifyType).eq("is_active", true).maybeSingle();
    if (tplData) {
      const svcName = getServiceName(apt.service_id);
      const dateParts = apt.appointment_date?.split("-");
      const dateStr = dateParts?.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : apt.appointment_date;
      const timeStr = apt.appointment_time?.slice(0, 5) || "";
      const replaceVars = (text: string) => text
        .replace(/\{\{client_name\}\}/g, apt.client_name)
        .replace(/\{\{client_email\}\}/g, apt.client_email)
        .replace(/\{\{client_phone\}\}/g, apt.client_phone || "N/A")
        .replace(/\{\{service_name\}\}/g, svcName)
        .replace(/\{\{date\}\}/g, dateStr)
        .replace(/\{\{time\}\}/g, timeStr)
        .replace(/\{\{address\}\}/g, apt.address || "N/A")
        .replace(/\{\{notes\}\}/g, apt.notes || "")
        .replace(/\{\{admin_notes\}\}/g, apt.admin_notes || "")
        .replace(/\{\{consent_form_url\}\}/g, "")
        .replace(/\{\{has_consent_form\}\}/g, "")
        .replace(/\{\{price\}\}/g, apt.price != null ? `£${Number(apt.price).toFixed(2)}` : "")
        .replace(/\{\{has_price\}\}/g, apt.price != null ? "true" : "")
        .replace(/\{\{cancel_url\}\}/g, "");
      setStatusChangePreviewSubject(replaceVars(tplData.subject));
      setStatusChangePreviewHtml(replaceVars(tplData.body_html));
    }
  };

  const executeStatusChange = async () => {
    if (!statusChangeApt || !statusChangeNewStatus) return;
    const apt = statusChangeApt;
    const newStatus = statusChangeNewStatus;
    const notify = statusChangeNotify;
    const notifySms = statusChangeNotifySms;
    const sendReview = statusChangeReviewRequest;
    setStatusChangeDialogOpen(false);

    const r = await offlineMutation({ table: "appointments", operation: "update", data: { status: newStatus }, matchColumn: "id", matchValue: apt.id, successMessage: `Status changed to ${newStatus}` });
    if (r.success) {
      fetchAppointments();
      logPatientActivity(apt.client_email, "status_change", `Appointment status changed to ${newStatus}: ${getServiceName(apt.service_id)} on ${apt.appointment_date}`);
      if (newStatus === "completed") {
        await closeArrivalTiming(apt.id);
      }
      if ((notify || notifySms) && !r.queued) {
        const notifyType = newStatus === "confirmed" ? "approved" : newStatus === "completed" ? "completed" : newStatus === "cancelled" ? "cancelled" : "appointment_changed";
        supabase.functions.invoke("send-notification", {
          body: { appointmentId: apt.id, type: notifyType, channels: { email: notify, sms: notifySms } },
        });
        const parts = [];
        if (notify) parts.push("email");
        if (notifySms) parts.push("SMS");
        toast.success(`Patient notification sent (${parts.join(" & ")})`);
      }
      // Schedule and send review request if checked
      if (newStatus === "completed" && sendReview && !r.queued) {
        try {
          const scheduledFor = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          await supabase.from("scheduled_communications").insert([
            {
              appointment_id: apt.id,
              channel: "email",
              trigger_type: "review_request",
              recipient_name: apt.client_name,
              recipient_email: apt.client_email,
              recipient_phone: apt.client_phone,
              scheduled_for: scheduledFor,
              subject: "How was your ShawScope appointment?",
              status: "pending",
            },
            {
              appointment_id: apt.id,
              channel: "sms",
              trigger_type: "review_request",
              recipient_name: apt.client_name,
              recipient_email: apt.client_email,
              recipient_phone: apt.client_phone,
              scheduled_for: scheduledFor,
              status: "pending",
            },
          ] as any);
          toast.success("Review request scheduled (30 min)");
        } catch (e) {
          console.error("Failed to schedule review request", e);
        }
      }
      // Auto-trigger cryo aftercare on completion
      if (newStatus === "completed" && !r.queued) {
        const svc = services.find(s => s.id === apt.service_id);
        if (svc?.name?.toLowerCase().includes("cryotherapy")) {
          supabase.functions.invoke("send-cryo-aftercare", { body: { appointmentId: apt.id } });
        }
      }
      // Open payment dialog on completion — only if no payment already recorded
      if (newStatus === "completed") {
        const { data: existingPay } = await (supabase as any).from("appointment_payments").select("*").eq("appointment_id", apt.id).maybeSingle();
        if (!existingPay) {
          setPaymentDialogApt(apt);
          setPaymentDialogExisting(null);
          setPaymentDialogOpen(true);
        }
        // Flag if consultation form not yet completed
        if (!consultNoteCompletedIds.has(apt.id)) {
          toast.info("Consultation form still needed — added to awaiting bar", { duration: 4000 });
        }
      }
    }
  };

  const executeOnMyWay = async (aptId: string) => {
    const etaOverride = onMyWayEtaMode === "manual" ? onMyWayManualMinutes : undefined;
    const skipNotify = onMyWaySkipNotify;
    setOnMyWayConfirmApt(null);
    setOnMyWayEtaMode("google");
    setOnMyWayManualMinutes(10);
    setOnMyWaySkipNotify(false);
    setOnMyWaySending(aptId);
    try {
      if (skipNotify) {
        // Silent mode: set local state + HUD without sending notifications
        const etaMins = etaOverride || 15;
        const arrivalIso = new Date(Date.now() + etaMins * 60000).toISOString();
        setOnMyWaySentIds(prev => new Set([...prev, aptId]));
        setOnMyWayEtas(prev => ({ ...prev, [aptId]: `~${etaMins} min` }));
        setOnMyWayEtaArrivals(prev => ({ ...prev, [aptId]: arrivalIso }));
        // Log silently to communications_log for persistence
        await supabase.from("communications_log").insert({
          appointment_id: aptId,
          channel: "system",
          trigger_type: "on_my_way",
          recipient_name: "Silent (no notification)",
          status: "sent",
          body_preview: arrivalIso,
        });
        toast.success(`On My Way started (silent — no notification sent) — ETA ~${etaMins} min`);
        setTravelHudAptId(aptId);
        setTravelHudMinimized(false);
      } else {
        const body: any = { appointmentId: aptId };
        if (etaOverride !== undefined) body.etaOverrideMinutes = etaOverride;
        const { data, error: fnErr } = await supabase.functions.invoke("on-my-way", { body });
        if (fnErr) throw fnErr;
        setOnMyWaySentIds(prev => new Set([...prev, aptId]));
        if (data?.eta_text) setOnMyWayEtas(prev => ({ ...prev, [aptId]: data.eta_text }));
        const etaMins = etaOverride || (data?.eta_minutes);
        if (etaMins) {
          const arrivalIso = new Date(Date.now() + etaMins * 60000).toISOString();
          setOnMyWayEtaArrivals(prev => ({ ...prev, [aptId]: arrivalIso }));
        }
        const etaMsg = data?.eta_text || "shortly";
        const channels = [data?.sms_sent && "SMS", data?.email_sent && "Email"].filter(Boolean).join(" & ");
        toast.success(`"On my way" sent via ${channels} — ETA ${etaMsg}`);
        setTravelHudAptId(aptId);
        setTravelHudMinimized(false);
      }
    } catch (e: any) {
      toast.error("Failed to send: " + (e?.message || "Unknown error"));
    } finally {
      setOnMyWaySending(null);
    }
  };

  const executeClinicReady = async (aptId: string) => {
    const readyTime = clinicReadyTimeMode === "now" ? undefined : clinicReadySpecificTime + ":00";
    setClinicReadyConfirmApt(null);
    setClinicReadyTimeMode("now");
    setClinicReadySending(aptId);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("clinic-ready", {
        body: { appointmentId: aptId, readyFromTime: readyTime },
      });
      if (fnErr) throw fnErr;
      setClinicReadySentIds(prev => new Set([...prev, aptId]));
      const channels = [data?.sms_sent && "SMS", data?.email_sent && "Email"].filter(Boolean).join(" & ");
      toast.success(`"We're ready" sent via ${channels}`);
      fetchAppointments();
    } catch (e: any) {
      toast.error("Failed: " + (e?.message || "Unknown error"));
    } finally {
      setClinicReadySending(null);
    }
  };

  const executeDelayUpdate = async (aptId: string, manualEta: number) => {
    setDelayConfirmApt(null);
    setDelaySending(aptId);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("notify-delay", { body: { appointmentId: aptId, etaMinutes: manualEta } });
      if (fnErr) throw fnErr;
      if (!data?.sms_sent) {
        throw new Error(data?.details || "Delay SMS was not sent");
      }
      setDelaySentIds(prev => new Set([...prev, aptId]));
      const etaMsg = `~${manualEta} min`;
      if (data?.eta_text) setOnMyWayEtas(prev => ({ ...prev, [aptId]: data.eta_text }));
      // Update arrival time for live countdown
      const arrivalIso = new Date(Date.now() + manualEta * 60000).toISOString();
      setOnMyWayEtaArrivals(prev => ({ ...prev, [aptId]: arrivalIso }));
      toast.success(`Delay update sent to patient — ETA ${etaMsg}`);
    } catch (e: any) {
      toast.error("Failed: " + (e?.message || "Unknown error"));
    } finally {
      setDelaySending(null);
    }
  };

  const executeSilentAdjust = async (aptId: string, deltaMinutes: number) => {
    try {
      const currentArrival = onMyWayEtaArrivals[aptId];
      const baseTime = currentArrival ? new Date(currentArrival).getTime() : Date.now();
      const newArrivalIso = new Date(baseTime + deltaMinutes * 60000).toISOString();
      
      // Update in DB silently (no notifications)
      await supabase.from("appointments").update({ delay_eta_arrival: newArrivalIso } as any).eq("id", aptId);
      
      // Update local state
      setOnMyWayEtaArrivals(prev => ({ ...prev, [aptId]: newArrivalIso }));
      const remainingMins = Math.ceil((new Date(newArrivalIso).getTime() - Date.now()) / 60000);
      setOnMyWayEtas(prev => ({ ...prev, [aptId]: `~${remainingMins} min` }));
    } catch (e: any) {
      toast.error("Failed to adjust: " + (e?.message || "Unknown error"));
    }
  };

  const resetTravelCountdown = async (aptId: string) => {
    setOnMyWaySentIds(prev => {
      const next = new Set(prev);
      next.delete(aptId);
      return next;
    });
    setOnMyWayEtas(prev => {
      const next = { ...prev };
      delete next[aptId];
      return next;
    });
    setOnMyWayEtaArrivals(prev => {
      const next = { ...prev };
      delete next[aptId];
      return next;
    });
    setTravelHudAptId(null);
    setTravelHudMinimized(false);

    try {
      const { error } = await supabase.from("appointments").update({ delay_eta_arrival: null } as any).eq("id", aptId);
      if (error) throw error;
      const logError = (await supabase.from("communications_log").insert({
        appointment_id: aptId,
        channel: "system",
        trigger_type: "on_my_way_cancelled",
        recipient_name: "System",
        status: "sent",
        body_preview: "On My Way countdown reset by practitioner",
      } as any)).error;
      if (logError) throw logError;
      toast.success("Countdown reset");
      fetchAppointments();
    } catch (e: any) {
      toast.error("Countdown hidden, but reset could not be saved: " + (e?.message || "Unknown error"));
    }
  };

  const approveAppointment = async (apt: Appointment) => {
    const { error } = await supabase.from("appointments").update({ status: "confirmed" }).eq("id", apt.id);
    if (error) { toast.error("Failed to approve"); return; }
    toast.success("Appointment approved!");
    fetchAppointments();
    logPatientActivity(apt.client_email, "booking", `Appointment confirmed: ${getServiceName(apt.service_id)} on ${apt.appointment_date}`);
    supabase.functions.invoke("send-notification", {
      body: { appointmentId: apt.id, type: "approved" },
    });

    // Also approve and notify all group members
    if (apt.group_id) {
      const groupMembers = allAppointments.filter(a => a.group_id === apt.group_id && a.id !== apt.id && (a.status === "requested" || a.status === "pending"));
      for (const member of groupMembers) {
        const { error: mErr } = await supabase.from("appointments").update({ status: "confirmed" }).eq("id", member.id);
        if (!mErr) {
          logPatientActivity(member.client_email, "booking", `Appointment confirmed: ${getServiceName(member.service_id)} on ${member.appointment_date}`);
          supabase.functions.invoke("send-notification", {
            body: { appointmentId: member.id, type: "approved" },
          });
        }
      }
      if (groupMembers.length > 0) {
        toast.success(`All ${groupMembers.length + 1} group members approved & notified`);
      }
    }

    // Auto-cancel pending recalls for this patient (and group members)
    const emailsToCancel = [apt.client_email.toLowerCase()];
    if (apt.group_id) {
      allAppointments.filter(a => a.group_id === apt.group_id && a.id !== apt.id).forEach(m => emailsToCancel.push(m.client_email.toLowerCase()));
    }
    const recallEmailsToCancel = emailsToCancel.filter(e => recallEmails.has(e));
    if (recallEmailsToCancel.length > 0) {
      for (const email of recallEmailsToCancel) {
        await supabase.from("patient_recalls").update({ status: "cancelled" }).eq("client_email", email).eq("status", "pending");
        // Cancel any scheduled recall notifications
        await supabase.from("scheduled_communications").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("recipient_email", email).eq("trigger_type", "patient_recall").eq("status", "pending");
      }
      toast.info(`Recall${recallEmailsToCancel.length > 1 ? "s" : ""} auto-cancelled — patient rebooked`);
      fetchRecallEmails();
    }
  };

  const openRejectDialog = (apt: Appointment) => {
    setRejectingApt(apt);
    setRejectNotes("");
    setRejectAltDate("");
    setRejectAltTime("");
    setRejectTimeOverride(false);
    setRejectAvailableSlots([]);
    setIsReoffer(false);
    setRejectDialogOpen(true);
  };

  const openReofferDialog = (apt: Appointment) => {
    setRejectingApt(apt);
    setRejectNotes("");
    setRejectAltDate("");
    setRejectAltTime("");
    setRejectTimeOverride(false);
    setRejectAvailableSlots([]);
    setIsReoffer(true);
    setRejectDialogOpen(true);
  };

  const rejectAppointment = async () => {
    if (!rejectingApt) return;
    const hasAlt = rejectAltDate && rejectAltTime;
    
    if (isReoffer) {
      // Re-offering a new alternative to a patient who declined
      if (!hasAlt) { toast.error("Please select an alternative date and time"); return; }
      const { error } = await supabase.from("appointments").update({
        status: "rejected_awaiting",
        admin_notes: (rejectingApt.admin_notes || "") + `\n[New alternative offered: ${rejectAltDate} at ${rejectAltTime}${rejectNotes.trim() ? ` — ${rejectNotes.trim()}` : ""}]`,
        alternative_date: rejectAltDate,
        alternative_time: rejectAltTime + ":00",
        appointment_date: rejectAltDate,
        appointment_time: rejectAltTime + ":00",
        rejected_at: new Date().toISOString(),
      } as any).eq("id", rejectingApt.id);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("New alternative offered — slot held for 3 days");
      setRejectDialogOpen(false);
      fetchAppointments();
      logPatientActivity(rejectingApt.client_email, "booking", `New alternative offered: ${getServiceName(rejectingApt.service_id)} on ${rejectAltDate} at ${rejectAltTime}`);
      supabase.functions.invoke("send-notification", {
        body: { appointmentId: rejectingApt.id, type: "rejected" },
      });
    } else {
      // Initial rejection
      const { error } = await supabase.from("appointments").update({
        status: hasAlt ? "rejected_awaiting" : "rejected",
        admin_notes: rejectNotes.trim() || null,
        alternative_date: rejectAltDate || null,
        alternative_time: rejectAltTime ? rejectAltTime + ":00" : null,
        ...(hasAlt ? {
          appointment_date: rejectAltDate,
          appointment_time: rejectAltTime + ":00",
        } : {}),
        rejected_at: new Date().toISOString(),
      } as any).eq("id", rejectingApt.id);
      if (error) { toast.error("Failed to reject"); return; }
      toast.success(hasAlt ? "Rejected — alternative slot held for 3 days" : "Appointment rejected");
      setRejectDialogOpen(false);
      fetchAppointments();
      logPatientActivity(rejectingApt.client_email, "cancelled", `Appointment rejected: ${getServiceName(rejectingApt.service_id)} on ${rejectingApt.appointment_date}${rejectNotes.trim() ? ` — ${rejectNotes.trim()}` : ""}`);
      supabase.functions.invoke("send-notification", {
        body: { appointmentId: rejectingApt.id, type: "rejected" },
      });
    }
  };

  const openDetailView = async (apt: Appointment) => {
    setDetailApt(apt);
    setDetailDialogOpen(true);
    setDetailConsentResponses([]);
    setDetailPendingMsgs([]);
    setEditingMsgId(null);

    // Fetch pending messages for this appointment
    supabase.from("scheduled_communications")
      .select("*")
      .eq("appointment_id", apt.id)
      .eq("status", "pending")
      .order("scheduled_for", { ascending: true })
      .then(({ data }) => { if (data) setDetailPendingMsgs(data); });

    // Fetch consent responses for this appointment
    const { data: responses } = await supabase.from("consent_form_responses").select("*").eq("appointment_id", apt.id);
    if (responses && responses.length > 0) {
      const templateIds = [...new Set(responses.map((r) => r.consent_form_template_id))];
      const { data: tpls } = await supabase.from("consent_form_templates").select("id, title").in("id", templateIds);
      setDetailConsentResponses(
        responses.map((r) => ({
          ...r,
          template_title: tpls?.find((t) => t.id === r.consent_form_template_id)?.title || "Unknown Form",
        }))
      );
    }

    // Birthday notice — fire ONCE per year, exactly 7 days before the patient's birthday (relative to today)
    const dob = patientDobs[apt.client_email];
    if (dob) {
      const today = new Date();
      const aptDate = parseISO(apt.appointment_date);
      const birthThisYear = setYear(parseISO(dob), today.getFullYear());
      const daysUntilBirthday = differenceInCalendarDays(birthThisYear, today);
      if (daysUntilBirthday === 7) {
        const yearTag = `bday-${today.getFullYear()}`;
        // Dedupe per patient per calendar year so it only ever sends once
        const { data: existingLog } = await supabase
          .from("patient_activity_log")
          .select("id")
          .eq("client_email", apt.client_email.toLowerCase())
          .eq("event_type", "birthday_notice")
          .ilike("message", `%${yearTag}%`)
          .limit(1);

        if (!existingLog || existingLog.length === 0) {
          const age = differenceInYears(birthThisYear, parseISO(dob));
          const bdayStr = format(birthThisYear, "d MMMM");
          const msg = `🎂 Birthday on ${bdayStr} (turning ${age}) — in 7 days [${yearTag}]`;
          logPatientActivity(apt.client_email, "birthday_notice", msg);

          // Send admin notification email
          supabase.functions.invoke("send-form-email", {
            body: {
              to: "matt@shawscope.co.uk",
              subject: `🎂 Upcoming Birthday (7 days): ${apt.client_name}`,
              html: `<p><strong>${apt.client_name}</strong> has a birthday on <strong>${bdayStr}</strong> (turning ${age}) — in 7 days.</p><p>Next appointment: <strong>${format(aptDate, "EEEE d MMMM yyyy")}</strong> at ${apt.appointment_time.slice(0, 5)}.</p>${apt.address || apt.postcode ? `<p><strong>Address:</strong> ${[apt.address, apt.postcode].filter(Boolean).join(', ')}</p>` : ''}`,
            },
          });
        }
      }
    }
  };

  const updateSettings = async () => {
    if (!settings) return;
    const { error } = await supabase.from("business_settings").update({
      start_hour: settings.start_hour, end_hour: settings.end_hour,
      buffer_minutes: settings.buffer_minutes, appointment_duration_minutes: settings.appointment_duration_minutes,
      days_available: settings.days_available,
      booking_cutoff_hours: settings.booking_cutoff_hours,
      travel_buffer_per_mile: settings.travel_buffer_per_mile,
    }).eq("id", settings.id);
    if (error) toast.error("Failed to save settings");
    else toast.success("Settings saved");
  };

  const toggleAvailableDate = async (d: Date) => {
    const dateStr = format(d, "yyyy-MM-dd");
    const existing = availableDates.find((ad) => ad.available_date === dateStr);
    if (existing) {
      const { error } = await supabase.from("available_dates").delete().eq("id", existing.id);
      if (error) toast.error("Failed to remove date");
      else { toast.success(`${format(d, "MMM d")} removed`); fetchAvailableDates(); }
    } else {
      const { error } = await supabase.from("available_dates").insert({
        available_date: dateStr,
        start_hour: settings?.start_hour ?? 9,
        end_hour: settings?.end_hour ?? 17,
      });
      if (error) toast.error("Failed to add date");
      else { toast.success(`${format(d, "MMM d")} added`); fetchAvailableDates(); }
    }
  };

  const updateAvailableDateHours = async (id: string, startHour: number, endHour: number) => {
    const { error } = await supabase.from("available_dates").update({ start_hour: startHour, end_hour: endHour }).eq("id", id);
    if (error) toast.error("Failed to update hours");
    else { toast.success("Hours updated"); fetchAvailableDates(); }
  };

  const removeAvailableDate = async (id: string) => {
    const { error } = await supabase.from("available_dates").delete().eq("id", id);
    if (error) toast.error("Failed to remove");
    else { toast.success("Removed"); fetchAvailableDates(); }
  };

  // Blocked time CRUD
  const addBlockedTime = async () => {
    if (!blockDate || !blockStartTime || !blockEndTime) {
      toast.error("Please fill in date and times"); return;
    }
    if (blockStartTime >= blockEndTime) {
      toast.error("End time must be after start time"); return;
    }

    const groupId = crypto.randomUUID();
    const blocks: { blocked_date: string; start_time: string; end_time: string; reason: string | null; repeat_type: string; repeat_until: string | null; repeat_group_id: string | null }[] = [];

    const addDate = (dateStr: string) => {
      blocks.push({
        blocked_date: dateStr,
        start_time: blockStartTime + ":00",
        end_time: blockEndTime + ":00",
        reason: blockReason.trim() || null,
        repeat_type: blockRepeatType,
        repeat_until: blockRepeatUntil || null,
        repeat_group_id: blockRepeatType !== "none" ? groupId : null,
      });
    };

    addDate(blockDate);

    if (blockRepeatType !== "none" && (blockRepeatUntil || blockRepeatForever)) {
      let current = new Date(blockDate);
      const until = blockRepeatForever ? (() => { const d = new Date(blockDate); d.setFullYear(d.getFullYear() + 2); return d; })() : new Date(blockRepeatUntil);
      const increment = blockRepeatType === "weekly" ? 7 : blockRepeatType === "biweekly" ? 14 : blockRepeatType === "custom" ? blockCustomIntervalDays : 1;
      while (true) {
        current.setDate(current.getDate() + increment);
        if (current > until) break;
        addDate(format(current, "yyyy-MM-dd"));
      }
    }

    const { error } = await supabase.from("blocked_times").insert(blocks);
    if (error) toast.error("Failed to block time");
    else {
      toast.success(`Blocked ${blocks.length} time slot${blocks.length > 1 ? "s" : ""}`);
      setBlockDialogOpen(false);
      setBlockReason("");
      setBlockRepeatType("none");
      setBlockRepeatUntil("");
      setBlockRepeatForever(false);
      setBlockCustomIntervalDays(14);
      fetchBlockedTimes();
    }
    setEditingBlockId(null);
  };

  const updateBlockedTime = async () => {
    if (!editingBlockId || !blockDate || !blockStartTime || !blockEndTime) return;
    if (blockStartTime >= blockEndTime) { toast.error("End time must be after start time"); return; }
    const { error } = await supabase.from("blocked_times").update({
      blocked_date: blockDate,
      start_time: blockStartTime + ":00",
      end_time: blockEndTime + ":00",
      reason: blockReason.trim() || null,
    }).eq("id", editingBlockId);
    if (error) toast.error("Failed to update");
    else { toast.success("Block updated"); setBlockDialogOpen(false); setEditingBlockId(null); fetchBlockedTimes(); }
  };

  const openEditBlock = (bt: BlockedTime) => {
    setEditingBlockId(bt.id);
    setBlockDate(bt.blocked_date);
    setBlockStartTime(bt.start_time.slice(0, 5));
    setBlockEndTime(bt.end_time.slice(0, 5));
    setBlockReason(bt.reason || "");
    setBlockRepeatType("none");
    setBlockRepeatUntil("");
    setBlockRepeatForever(false);
    setBlockDialogOpen(true);
  };

  const removeBlockedTime = async (id: string) => {
    const { error } = await supabase.from("blocked_times").delete().eq("id", id);
    if (error) toast.error("Failed to remove");
    else { toast.success("Block removed"); fetchBlockedTimes(); }
  };

  const removeBlockedGroup = async (groupId: string) => {
    const { error } = await supabase.from("blocked_times").delete().eq("repeat_group_id", groupId);
    if (error) toast.error("Failed to remove series");
    else { toast.success("All recurring blocks removed"); fetchBlockedTimes(); }
  };

  const createTemplate = async () => {
    if (!newTitle.trim()) return;
    const validFields = newFields.filter((f) => f.label.trim());
    const { error } = await supabase.from("consent_form_templates").insert({
      title: newTitle.trim(), description: newDesc.trim() || null, fields: validFields,
    });
    if (error) toast.error("Failed to create form");
    else {
      toast.success("Consent form created");
      setNewTitle(""); setNewDesc(""); setNewFields([{ label: "", type: "text", required: true }]);
      setFormDialogOpen(false); fetchTemplates();
    }
  };

  const handleFormBuilderSave = async (data: { title: string; description: string; fields: any[]; formType: string }) => {
    if (editingTemplate) {
      const { error } = await supabase.from("consent_form_templates").update({
        title: data.title, description: data.description || null, fields: data.fields, form_type: data.formType,
      }).eq("id", editingTemplate.id);
      if (error) toast.error("Failed to update form");
      else { toast.success("Form updated"); setEditTemplateDialogOpen(false); fetchTemplates(); }
    } else {
      const { error } = await supabase.from("consent_form_templates").insert({
        title: data.title, description: data.description || null, fields: data.fields, form_type: data.formType || 'consent',
      });
      if (error) toast.error("Failed to create form");
      else { toast.success("Form created"); setFormDialogOpen(false); fetchTemplates(); }
    }
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("consent_form_templates").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); fetchTemplates(); }
  };

  const openEditTemplate = (t: ConsentTemplate) => {
    setEditingTemplate(t);
    setEditTitle(t.title);
    setEditDesc(t.description || "");
    setEditFields(Array.isArray(t.fields) ? t.fields.map((f: any) => ({ label: f.label || "", type: f.type || "text", required: f.required ?? true, options: f.options, showWhen: f.showWhen, description: f.description, placeholder: f.placeholder })) : []);
    setEditTemplateDialogOpen(true);
  };

  const saveEditTemplate = async () => {
    if (!editingTemplate || !editTitle.trim()) return;
    const validFields = editFields.filter((f) => f.label.trim());
    const { error } = await supabase.from("consent_form_templates").update({
      title: editTitle.trim(), description: editDesc.trim() || null, fields: validFields,
    }).eq("id", editingTemplate.id);
    if (error) toast.error("Failed to update form");
    else {
      toast.success("Form updated");
      setEditTemplateDialogOpen(false);
      fetchTemplates();
    }
  };

  // Service CRUD
  const openNewService = () => {
    setEditingService(null);
    setSvcName(""); setSvcDesc(""); setSvcDuration(60); setSvcPrice(""); setSvcActive(true); setSvcStatus("active"); setSvcOrder(services.length);
    setSvcConsentFormId(null);
    setSvcImageUrl(null);
    setServiceDialogOpen(true);
  };

  const openEditService = (svc: Service) => {
    setEditingService(svc);
    setSvcName(svc.name); setSvcDesc(svc.description || ""); setSvcDuration(svc.duration_minutes);
    setSvcPrice(svc.price ? String(svc.price) : ""); setSvcActive(svc.status === 'active'); setSvcStatus(svc.status || 'active'); setSvcOrder(svc.sort_order);
    setSvcConsentFormId(svc.consent_form_template_id);
    setSvcImageUrl(svc.image_url || null);
    setServiceDialogOpen(true);
  };

  const saveService = async () => {
    if (!svcName.trim()) return;
    const payload = {
      name: svcName.trim(),
      description: svcDesc.trim() || null,
      duration_minutes: svcDuration,
      price: svcPrice ? parseFloat(svcPrice) : null,
      is_active: svcStatus === 'active',
      status: svcStatus,
      sort_order: svcOrder,
      consent_form_template_id: svcConsentFormId,
      image_url: svcImageUrl,
    };

    if (editingService) {
      const { error } = await supabase.from("services").update(payload).eq("id", editingService.id);
      if (error) toast.error("Failed to update service");
      else { toast.success("Service updated"); setServiceDialogOpen(false); fetchServices(); }
    } else {
      const { error } = await supabase.from("services").insert(payload);
      if (error) toast.error("Failed to create service");
      else { toast.success("Service created"); setServiceDialogOpen(false); fetchServices(); }
    }
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) toast.error("Failed to delete service");
    else { toast.success("Service deleted"); fetchServices(); }
  };

  const openPaymentForApt = async (apt: Appointment) => {
    const { data: ep } = await (supabase as any).from("appointment_payments").select("*").eq("appointment_id", apt.id).maybeSingle();
    setPaymentDialogApt(apt);
    setPaymentDialogExisting(ep ? { id: ep.id, amount: Number(ep.amount), payment_method: ep.payment_method, payment_status: ep.payment_status, notes: ep.notes } : null);
    setPaymentDialogOpen(true);
  };

  // Waitlist functions
  const openWaitlistViewer = (serviceId: string) => {
    setWaitlistServiceId(serviceId);
    setWaitlistDialogOpen(true);
  };

  const notifyWaitlistEntry = async (entry: WaitlistEntry) => {
    const svc = services.find(s => s.id === entry.service_id);
    try {
      await supabase.functions.invoke("send-notification", {
        body: {
          to: entry.client_email,
          subject: `${svc?.name || "Service"} is Now Available — ShawScope`,
          html: `<p>Hi ${entry.client_name},</p><p>Great news! <strong>${svc?.name || "The service"}</strong> is now available for booking.</p><p>Visit our website to book your appointment.</p><p>Best wishes,<br>Matt — ShawScope</p>`,
        },
      });
      await supabase.from("service_waitlist").update({ notified_at: new Date().toISOString() }).eq("id", entry.id);
      toast.success(`Notified ${entry.client_name}`);
      fetchServices();
    } catch {
      toast.error("Failed to send notification");
    }
  };

  const deleteWaitlistEntry = async (id: string) => {
    const { error } = await supabase.from("service_waitlist").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Removed from waitlist"); fetchServices(); }
  };

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return "—";
    return services.find((s) => s.id === serviceId)?.name || "Unknown";
  };

  const getServiceWithAddons = (apt: Appointment): string => {
    return getServiceName(apt.service_id);
  };

  const getGroupDuration = (apt: Appointment): number => {
    // If a custom duration was saved on the appointment, use it
    if (apt.duration_minutes != null && apt.duration_minutes > 0) return apt.duration_minutes;
    const svc = services.find(s => s.id === apt.service_id);
    const base = svc?.duration_minutes ?? 60;
    if (!apt.group_id) return base;
    const groupMembers = appointments.filter(a => a.group_id === apt.group_id);
    const extraPeople = groupMembers.length - 1;
    if (extraPeople <= 0) return base;
    const sName = (svc?.name || "").toLowerCase();
    if (sName.includes("earwax") || sName.includes("ear wax")) return base + (30 * extraPeople);
    if (sName.includes("cryotherapy")) return base + (15 * extraPeople);
    if (sName.includes("wellness")) return base + (15 * extraPeople);
    if (sName.includes("foot")) return base + (base * extraPeople);
    return base + (30 * extraPeople);
  };

  const getEndTime = (apt: Appointment): string => {
    const duration = getGroupDuration(apt);
    const startMins = parseInt(apt.appointment_time.slice(0, 2)) * 60 + parseInt(apt.appointment_time.slice(3, 5));
    const endMins = startMins + duration;
    const h = Math.floor(endMins / 60).toString().padStart(2, "0");
    const m = (endMins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const getAreaFromAddress = (address: string | null): string | null => {
    if (!address) return null;
    const parts = address.split(",").map(p => p.trim()).filter(Boolean);
    // Try to find a town/area name (typically the last meaningful part before postcode)
    const postcodePattern = /^[A-Z]{1,2}\d/i;
    const meaningful = parts.filter(p => !postcodePattern.test(p) && p.length > 2);
    return meaningful.length > 0 ? meaningful[meaningful.length - 1] : null;
  };

  const getLocalityWord = (apt: Appointment): string | null => {
    const source = (apt.locality || "").trim();
    if (!source) return null;
    const withoutComma = source.split(",")[0]?.trim() || source;
    if (!withoutComma) return null;
    return withoutComma.charAt(0).toUpperCase() + withoutComma.slice(1).toLowerCase();
  };

  const getAiKeywords = (summary: string | null): string | null => {
    if (!summary) return null;
    // Extract first short phrase (up to 40 chars) as the key reason
    const cleaned = summary.replace(/^(patient|client|they|he|she)\s+(reports?|presents?|has|complains?|experiences?|is)\s+/i, "");
    const firstSentence = cleaned.split(/[.!;]/)[0]?.trim() || "";
    return firstSentence.length > 50 ? firstSentence.slice(0, 47) + "…" : firstSentence;
  };

  const getConsentFormName = (templateId: string | null) => {
    if (!templateId) return "None";
    return templates.find((t) => t.id === templateId)?.title || "Unknown";
  };

  const searchPatients = async (query: string) => {
    if (query.length < 2) { setPatientSuggestions([]); setShowPatientSuggestions(false); return; }
    const { data } = await supabase.from("patients").select("client_name, client_email, client_phone, address").ilike("client_name", `%${query}%`).limit(5);
    if (data && data.length > 0) { setPatientSuggestions(data); setShowPatientSuggestions(true); }
    else { setPatientSuggestions([]); setShowPatientSuggestions(false); }
  };

  const selectPatient = (p: { client_name: string; client_email: string; client_phone: string | null; address: string | null }) => {
    setAptName(p.client_name);
    setAptEmail(p.client_email);
    if (p.client_phone) setAptPhone(p.client_phone);
    if (p.address) {
      setAptAddress(p.address);
      // Extract postcode from address (UK postcode pattern)
      const pcMatch = p.address.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
      if (pcMatch) setAptPostcode(pcMatch[0].toUpperCase());
    }
    setShowPatientSuggestions(false);
  };

  const openReschedule = (apt: Appointment) => {
    setRescheduleApt(apt);
    setRescheduleDate(apt.appointment_date);
    setRescheduleTime(apt.appointment_time.slice(0, 5));
    setRescheduleNotify(true);
    setRescheduleTimeOverride(false);
    setRescheduleGroupChoice("single");
    // If this is a group booking, show the group prompt first
    if (apt.group_id) {
      const groupCount = allAppointments.filter(a => a.group_id === apt.group_id && a.status !== "cancelled" && a.status !== "rejected").length;
      if (groupCount > 1) {
        setRescheduleGroupPromptOpen(true);
        return;
      }
    }
    setRescheduleDialogOpen(true);
  };

  const handleGroupRescheduleChoice = (choice: "single" | "all") => {
    setRescheduleGroupChoice(choice);
    setRescheduleGroupPromptOpen(false);
    setRescheduleDialogOpen(true);
  };

  const saveReschedule = async () => {
    if (!rescheduleApt || !rescheduleDate || !rescheduleTime) return;
    const { error } = await supabase.from("appointments").update({
      appointment_date: rescheduleDate,
      appointment_time: rescheduleTime + ":00",
    }).eq("id", rescheduleApt.id);
    if (error) { toast.error("Failed to reschedule"); return; }

    // If group and user chose "all", reschedule all group members
    if (rescheduleGroupChoice === "all" && rescheduleApt.group_id) {
      await supabase.from("appointments").update({
        appointment_date: rescheduleDate,
        appointment_time: rescheduleTime + ":00",
      }).eq("group_id", rescheduleApt.group_id).neq("id", rescheduleApt.id);
    }

    toast.success(rescheduleGroupChoice === "all" && rescheduleApt.group_id ? "Group rescheduled" : "Appointment rescheduled");
    setRescheduleDialogOpen(false);
    setRescheduleGroupPromptOpen(false);
    fetchAppointments();
    logPatientActivity(rescheduleApt.client_email, "rescheduled", `Appointment rescheduled from ${rescheduleApt.appointment_date} ${rescheduleApt.appointment_time.slice(0,5)} to ${rescheduleDate} ${rescheduleTime}`);
    if (rescheduleNotify) {
      supabase.functions.invoke("send-notification", {
        body: { appointmentId: rescheduleApt.id, type: "appointment_changed" },
      });
    }
  };

  const openNewAppointment = (prefillDate?: Date) => {
    setEditingApt(null);
    setAptName(""); setAptEmail(""); setAptPhone(""); setAptDate(format(prefillDate || selectedDate || new Date(), "yyyy-MM-dd"));
    setAptTime(""); setAptNotes(""); setAptAddress(""); setAptServiceId(null); setAptStatus("confirmed");
    setAptPrice(""); setPatientSuggestions([]); setShowPatientSuggestions(false);
    setAptSendNotification(true); setAptTimeOverride(false);
    setAptHasEmail(true);
    setAptLatitude(null); setAptLongitude(null); setAptTravelFee(null); setAptTravelDistance(null); setAptLocality("");
    setAptPostcode(""); setAptMapVisible(false); setAptAddressList([]); setAptManualAddress(false);
    setAptComeToPractitioner(false);
    setAptAdditionalPeople([]);
    setAptRecurring(false); setAptRecurringWeeks(4); setAptRecurringCount(3);
    setAptDialogOpen(true);
  };

  const openEditAppointment = (apt: Appointment) => {
    // If part of a recurring series, prompt for this-only vs all-future
    if (apt.recurring_group_id) {
      setPendingRecurringEdit(apt);
      setRecurringEditChoice("this");
      setRecurringEditPromptOpen(true);
      return;
    }
    doOpenEditAppointment(apt);
  };

  const doOpenEditAppointment = async (apt: Appointment) => {
    setEditingApt(apt);
    setAptName(apt.client_name); setAptEmail(apt.client_email); setAptPhone(apt.client_phone || "");
    setAptHasEmail(!apt.client_email?.includes("@placeholder.local"));
    setAptDate(apt.appointment_date); setAptTime(apt.appointment_time.slice(0, 5));
    setAptNotes(apt.notes || ""); setAptAddress(apt.address || "");
    setAptServiceId(apt.service_id); setAptStatus(apt.status);
    setAptPrice(apt.price != null ? String(apt.price) : "");
    setAptTimeOverride(false);
    setAptLatitude(apt.latitude); setAptLongitude(apt.longitude);
    setAptTravelFee(apt.travel_fee); setAptTravelDistance(apt.travel_distance_miles); setAptLocality(apt.locality || "");
    setAptPostcode(apt.postcode || ""); setAptMapVisible(false);
    setAptRecurring(false); setAptRecurringWeeks(apt.recurring_interval_weeks || 4); setAptRecurringCount(3);
    setAptAdditionalPeople([]);
    // Load existing "Coming to Me" flag so it isn't silently flipped off on save
    setAptComeToPractitioner(!!apt.come_to_practitioner);
    // Load existing group members
    if (apt.group_id) {
      const { data: members } = await supabase
        .from("appointments")
        .select("id, client_name, client_email, client_phone, status")
        .eq("group_id", apt.group_id)
        .neq("id", apt.id)
        .neq("status", "cancelled");
      setAptExistingGroupMembers(members || []);
    } else {
      setAptExistingGroupMembers([]);
    }
    // Set duration: use saved duration if available, otherwise service default
    const svc = services.find(s => s.id === apt.service_id);
    setAptDurationOverride(String(apt.duration_minutes ?? svc?.duration_minutes ?? settings?.appointment_duration_minutes ?? 60));
    setAptDialogOpen(true);
  };

  const saveAppointment = async () => {
    if (!aptName.trim() || !aptDate || !aptTime) {
      toast.error("Please fill in name, date and time"); return;
    }
    const effectiveEmail = aptHasEmail && aptEmail.trim() ? aptEmail.trim() : `no-email-${Date.now()}@placeholder.local`;
    const previousApt = editingApt;
    const selectedSvc = services.find(s => s.id === aptServiceId);
    const duration = aptDurationOverride ? parseInt(aptDurationOverride) : (selectedSvc?.duration_minutes ?? settings?.appointment_duration_minutes ?? 60);
    // Use a minimal pack-up buffer for the RPC overlap check; the UI grid already validates travel-aware gaps
    const buffer = 5;

    // Server-side overlap check (skip if admin override or offline)
    if (!aptTimeOverride && navigator.onLine) {
      const { data: hasOverlap, error: overlapError } = await supabase.rpc("check_appointment_overlap", {
        p_date: aptDate,
        p_time: aptTime + ":00",
        p_duration_minutes: duration,
        p_buffer_minutes: buffer,
        p_exclude_appointment_id: editingApt?.id ?? null,
      });

      if (overlapError) {
        toast.error("Failed to check for time conflicts");
        return;
      }

      if (hasOverlap) {
        toast.error(`This time conflicts with an existing appointment. The ${duration}-minute service plus ${buffer}-minute buffer overlaps with another booking.`);
        return;
      }
    }

    const payload: any = {
      client_name: aptName.trim(),
      client_email: effectiveEmail,
      client_phone: aptPhone.trim() || null,
      appointment_date: aptDate,
      appointment_time: aptTime + ":00",
      notes: aptNotes.trim() || null,
      address: aptAddress.trim() || null,
      postcode: aptPostcode.trim().toUpperCase() || null,
      service_id: aptServiceId,
      status: aptStatus,
      price: aptPrice ? parseFloat(aptPrice) : (services.find(s => s.id === aptServiceId)?.price ?? null),
      latitude: aptLatitude,
      longitude: aptLongitude,
      travel_fee: aptTravelFee,
      travel_distance_miles: aptTravelDistance,
      locality: aptLocality || null,
      duration_minutes: aptDurationOverride ? parseInt(aptDurationOverride) : null,
      come_to_practitioner: aptComeToPractitioner,
    };

    if (editingApt) {
      let result: any;
      if (aptTimeOverride) {
        // Use admin override RPC to bypass DB trigger overlap validation
        const { error: overrideErr } = await supabase.rpc('admin_override_update_appointment' as any, {
          p_appointment_id: editingApt.id,
          p_payload: payload,
        });
        if (overrideErr) {
          toast.error(overrideErr.message || "Failed to update appointment");
          return;
        }
        toast.success("Appointment updated (override)");
        result = { success: true };
      } else {
        result = await offlineMutation({ table: "appointments", operation: "update", data: payload, matchColumn: "id", matchValue: editingApt.id, successMessage: "Appointment updated" });
      }
      if (result.success) {
        // If "future" edit was chosen for recurring series, update all future appointments too
        if (recurringEditChoice === "future" && editingApt.recurring_group_id) {
          const { data: futureApts } = await supabase
            .from("appointments")
            .select("id")
            .eq("recurring_group_id", editingApt.recurring_group_id)
            .gt("appointment_date", editingApt.appointment_date)
            .neq("status", "cancelled");
          if (futureApts && futureApts.length > 0) {
            const sharedUpdates: any = {
              client_name: payload.client_name,
              client_email: payload.client_email,
              client_phone: payload.client_phone,
              notes: payload.notes,
              address: payload.address,
              postcode: payload.postcode,
              service_id: payload.service_id,
              price: payload.price,
              latitude: payload.latitude,
              longitude: payload.longitude,
              travel_fee: payload.travel_fee,
              travel_distance_miles: payload.travel_distance_miles,
              status: payload.status,
            };
            for (const fa of futureApts) {
              await supabase.from("appointments").update(sharedUpdates).eq("id", fa.id);
            }
            toast.success(`Also updated ${futureApts.length} future appointment(s) in the series`);
          }
        }

        // Handle adding new group members to existing appointment (email optional)
        const newPeople = aptAdditionalPeople.filter(p => p.name.trim());
        if (newPeople.length > 0) {
          let groupId = editingApt.group_id;
          if (!groupId) {
            // Convert to group booking — assign new group_id to this appointment
            groupId = crypto.randomUUID();
            await supabase.from("appointments").update({ group_id: groupId }).eq("id", editingApt.id);
          }

          for (const person of newPeople) {
            const rawEmail = person.email.trim();
            const personEmail = (rawEmail || `noemail+${crypto.randomUUID()}@noemail.co.uk`).toLowerCase();
            const selectedSvcForGroup = services.find(s => s.id === payload.service_id);
            const { error: memberInsertError } = await supabase.from("appointments").insert({
              client_name: person.name.trim(),
              client_email: personEmail,
              client_phone: person.phone.trim() || null,
              appointment_date: payload.appointment_date,
              appointment_time: payload.appointment_time,
              address: payload.address,
              postcode: payload.postcode,
              service_id: payload.service_id,
              status: payload.status,
              price: selectedSvcForGroup?.price ?? null,
              travel_fee: 0,
              travel_distance_miles: null,
              latitude: payload.latitude,
              longitude: payload.longitude,
              locality: payload.locality,
              group_id: groupId,
              notes: `Part of group booking with ${aptName.trim()}`,
              access_token: crypto.randomUUID(),
            } as any);

            if (memberInsertError) {
              toast.error(`Could not add ${person.name.trim()}: ${memberInsertError.message}`);
              return;
            }

            // Ensure patient record exists
            const { data: existingMember } = await supabase.from("patients").select("id").eq("client_email", personEmail).maybeSingle();
            if (!existingMember) {
              await supabase.from("patients").insert({
                client_name: person.name.trim(),
                client_email: personEmail,
                client_phone: person.phone.trim() || null,
                address: payload.address || null,
              });
            }
          }
          toast.success(`Added ${newPeople.length} person(s) to group booking`);
        }

        setAptDialogOpen(false);
        fetchAppointments();
        if (!result.queued && previousApt && (previousApt.appointment_date !== aptDate || previousApt.appointment_time.slice(0, 5) !== aptTime)) {
          logPatientActivity(effectiveEmail, "rescheduled", `Appointment rescheduled from ${previousApt.appointment_date} ${previousApt.appointment_time.slice(0,5)} to ${aptDate} ${aptTime}`);
          if (aptSendNotification) {
            supabase.functions.invoke("send-notification", {
              body: { appointmentId: editingApt.id, type: "appointment_changed" },
            });
          }
        }
      }
    } else {
      // New appointment - handle group bookings (only count people with a name)
      const validAdditional = aptAdditionalPeople.filter(p => p.name.trim());
      const groupId = validAdditional.length > 0 ? crypto.randomUUID() : null;
      if (groupId) payload.group_id = groupId;

      // Handle recurring appointments
      const recurringGroupId = aptRecurring && aptRecurringWeeks > 0 && aptRecurringCount > 0 ? crypto.randomUUID() : null;
      if (recurringGroupId) {
        payload.recurring_group_id = recurringGroupId;
        payload.recurring_interval_weeks = aptRecurringWeeks;
      }

      const result = await offlineMutation({ table: "appointments", operation: "insert", data: payload, successMessage: aptRecurring ? `First of ${aptRecurringCount + 1} recurring appointments created` : "Appointment created" });
      if (!result.success) { /* error already toasted */ }
      else {
        if (result.queued) {
          // Also queue the patient record
          await offlineMutation({ table: "patients", operation: "insert", data: { client_name: aptName.trim(), client_email: effectiveEmail.toLowerCase(), client_phone: aptPhone.trim() || null, address: aptAddress.trim() || null }, showOfflineToast: false });
          setAptDialogOpen(false);
          fetchAppointments();
        } else {
        // Ensure patient record exists for primary person
        const primaryEmail = effectiveEmail.toLowerCase();
        const { data: existingPrimary } = await supabase.from("patients").select("id").eq("client_email", primaryEmail).maybeSingle();
        if (!existingPrimary) {
          await supabase.from("patients").insert({
            client_name: aptName.trim(),
            client_email: primaryEmail,
            client_phone: aptPhone.trim() || null,
            address: aptAddress.trim() || null,
          });
        } else {
          // Update existing patient with latest address/postcode
          const updates: Record<string, any> = {};
          if (aptAddress.trim()) updates.address = aptAddress.trim();
          if (aptPhone.trim()) updates.client_phone = aptPhone.trim();
          if (Object.keys(updates).length > 0) {
            await supabase.from("patients").update(updates).eq("id", existingPrimary.id);
          }
        }

        // Create linked appointments for additional people
        if (groupId) {
          // Get primary patient id so we can link relationships
          const primaryEmailLc = effectiveEmail.toLowerCase();
          const { data: primaryPatientRow } = await supabase
            .from("patients").select("id").eq("client_email", primaryEmailLc).maybeSingle();
          const primaryPatientId = primaryPatientRow?.id || null;
          for (const person of aptAdditionalPeople.filter(p => p.name.trim())) {
            const rawEmail = person.email.trim();
            const personEmail = (rawEmail || `noemail+${crypto.randomUUID()}@noemail.co.uk`).toLowerCase();
            const { error: memberInsertError } = await supabase.from("appointments").insert({
              ...payload,
              client_name: person.name.trim(),
              client_email: personEmail,
              client_phone: person.phone.trim() || null,
              price: services.find(s => s.id === payload.service_id)?.price ?? null,
              travel_fee: 0,
              travel_distance_miles: null,
              access_token: crypto.randomUUID(),
              notes: `Part of group booking with ${aptName.trim()}`,
            } as any);

            if (memberInsertError) {
              toast.error(`Could not add ${person.name.trim()}: ${memberInsertError.message}`);
              return;
            }

            // Ensure patient record exists for each group member
            const { data: existingMember } = await supabase.from("patients").select("id").eq("client_email", personEmail).maybeSingle();
            if (!existingMember) {
              await supabase.from("patients").insert({
                client_name: person.name.trim(),
                client_email: personEmail,
                client_phone: person.phone.trim() || null,
                address: aptAddress.trim() || null,
                relationship_to_patient_id: primaryPatientId,
                relationship_label: person.relationship_label || null,
              } as any);
            } else if (person.relationship_label && primaryPatientId) {
              await supabase.from("patients").update({
                relationship_to_patient_id: primaryPatientId,
                relationship_label: person.relationship_label,
              } as any).eq("id", existingMember.id);
            }
          }
        }
        setAptDialogOpen(false);
        fetchAppointments();
        fetchPatientDobs();
        // Auto-cancel pending recalls for this patient
        if (recallEmails.has(effectiveEmail.toLowerCase())) {
          await supabase.from("patient_recalls").update({ status: "cancelled" }).eq("client_email", effectiveEmail.toLowerCase()).eq("status", "pending");
          await supabase.from("scheduled_communications").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("recipient_email", effectiveEmail.toLowerCase()).eq("trigger_type", "patient_recall").eq("status", "pending");
          toast.info("Recall auto-cancelled — patient rebooked");
          fetchRecallEmails();
        }
        const svcName = services.find(s => s.id === aptServiceId)?.name || "appointment";
        logPatientActivity(effectiveEmail, "booking", `Booking created: ${svcName} on ${aptDate} at ${aptTime}`);

        // Auto-generate AI summary from notes for all admin bookings
        const isPhoneBooking = !aptHasEmail;
        const { data: newApts } = await supabase.from("appointments").select("id").eq("client_email", effectiveEmail.toLowerCase()).eq("appointment_date", aptDate).eq("appointment_time", aptTime + ":00").order("created_at", { ascending: false }).limit(1);

        if (newApts?.[0]) {
          const aptId = newApts[0].id;
          const consentTemplateId = services.find(s => s.id === aptServiceId)?.consent_form_template_id;

          if (isPhoneBooking) {
            // No email — record verbal consent only
            if (consentTemplateId && aptNotes.trim()) {
              await supabase.from("consent_form_responses").insert({
                appointment_id: aptId,
                consent_form_template_id: consentTemplateId,
                responses: { __verbal: true, presenting_complaint: aptNotes.trim() },
                signature: null,
                signed_at: null,
                status: "completed",
                submitter_name: aptName.trim(),
              } as any);
              fetchConsentStatus();
            }
            if (aptNotes.trim()) {
              logPatientActivity(effectiveEmail, "verbal_consent", `📞 Verbal consent recorded for ${svcName}`);
            }
          } else {
            // Has email — consent form will be sent separately by send-notification on approval
            // Only send manually if we're NOT sending a notification (since send-notification handles it)
            if (consentTemplateId && !(aptSendNotification && newApts?.[0])) {
              supabase.functions.invoke("send-form-email", {
                body: {
                  appointmentId: aptId,
                  recipientEmail: effectiveEmail,
                  templateName: services.find(s => s.id === aptServiceId)?.name || "Consent Form",
                },
              });
              logPatientActivity(effectiveEmail, "consent_sent", `📧 Consent form sent to ${effectiveEmail} for ${svcName}`);
            }
            // Still generate AI summary from notes if provided
            if (aptNotes.trim()) {
              logPatientActivity(effectiveEmail, "admin_notes_recorded", `📝 Admin notes recorded for ${svcName}`);
            }
          }
        }

        if (aptSendNotification && !isPhoneBooking && newApts?.[0]) {
          supabase.functions.invoke("send-notification", {
            body: { appointmentId: newApts[0].id, type: "approved" },
          });
        }

        // Send location info for "come to practitioner" bookings
        if (aptComeToPractitioner && newApts?.[0]) {
          supabase.functions.invoke("send-location-info", { body: { appointmentId: newApts[0].id } });
        }

        // Create recurring appointments if requested
        if (recurringGroupId && aptRecurringCount > 0) {
          const baseDate = parseISO(aptDate);
          for (let i = 1; i <= aptRecurringCount; i++) {
            const futureDate = addWeeks(baseDate, aptRecurringWeeks * i);
            const futureDateStr = format(futureDate, "yyyy-MM-dd");
            await supabase.from("appointments").insert({
              ...payload,
              appointment_date: futureDateStr,
              access_token: crypto.randomUUID(),
              recurring_group_id: recurringGroupId,
              recurring_interval_weeks: aptRecurringWeeks,
            } as any);
          }
          toast.success(`${aptRecurringCount} additional recurring appointments created (every ${aptRecurringWeeks} weeks)`);
        }

        } // end online path
      }
    }
  };

  const openDeleteDialog = (apt: Appointment) => {
    setDeletingApt(apt);
    setDeleteReason("");
    setDeleteSendEmail(true);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAppointment = async () => {
    if (!deletingApt) return;
    const reason = deleteReason.trim();

    const dateStr = format(parseISO(deletingApt.appointment_date), "MMM d, yyyy");
    const timeStr = deletingApt.appointment_time.slice(0, 5);
    const svcName = getServiceName(deletingApt.service_id);
    const note = reason
      ? `[Deleted ${format(new Date(), "dd/MM/yyyy")}] ${svcName} on ${dateStr} at ${timeStr} — ${reason}`
      : `[Deleted ${format(new Date(), "dd/MM/yyyy")}] ${svcName} on ${dateStr} at ${timeStr}`;

    // Ensure patient record exists in patients table BEFORE deleting appointment
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id, notes")
      .eq("client_email", deletingApt.client_email)
      .maybeSingle();

    if (existingPatient) {
      // Append deletion note to existing patient
      const existingNotes = existingPatient.notes ? existingPatient.notes + "\n" : "";
      await supabase.from("patients").update({ notes: existingNotes + note }).eq("id", existingPatient.id);
    } else {
      // Create patient record so it persists after appointment deletion
      await supabase.from("patients").insert({
        client_name: deletingApt.client_name,
        client_email: deletingApt.client_email,
        client_phone: deletingApt.client_phone,
        address: deletingApt.address,
        notes: note,
      });
    }

    // Send cancellation email BEFORE deleting (so edge function can still find the appointment)
    if (deleteSendEmail) {
      await supabase.functions.invoke("send-notification", {
        body: { appointmentId: deletingApt.id, type: "cancelled" },
      }).catch(() => {});
    }

    const { error } = await supabase.from("appointments").delete().eq("id", deletingApt.id);
    if (error) toast.error("Failed to delete appointment");
    else {
      toast.success("Appointment deleted — patient record preserved");
      logPatientActivity(deletingApt.client_email, "cancelled", `Appointment deleted: ${getServiceName(deletingApt.service_id)} on ${deletingApt.appointment_date}${deleteReason.trim() ? ` — ${deleteReason.trim()}` : ""}`);
      setDeleteDialogOpen(false);
      setDeletingApt(null);
      fetchAppointments();
      fetchPatientCount();
    }
  };

  // Email template CRUD
  const openNewEmail = () => {
    setEditingEmail(null);
    setIsNewEmail(true);
    setEmailSubject("");
    setEmailBody("");
    setEmailActive(true);
    setEmailDesc("");
    setEmailTriggerType("");
    setEmailDialogOpen(true);
  };

  const openEditEmail = (tpl: EmailTemplate) => {
    setEditingEmail(tpl);
    setIsNewEmail(false);
    setEmailSubject(tpl.subject);
    setEmailBody(tpl.body_html);
    setEmailActive(tpl.is_active);
    setEmailDesc(tpl.description || "");
    setEmailTriggerType(tpl.trigger_type);
    setEmailDialogOpen(true);
  };

  const saveEmailTemplate = async (data?: { triggerType: string; subject: string; bodyHtml: string; description: string; isActive: boolean }) => {
    if (data) {
      // Called from EmailTemplateEditor component
      if (isNewEmail) {
        if (!data.triggerType.trim()) { toast.error("Trigger type is required"); return; }
        const { error } = await supabase.from("email_templates").insert({
          trigger_type: data.triggerType.trim(), subject: data.subject, body_html: data.bodyHtml,
          is_active: data.isActive, description: data.description.trim() || null,
        });
        if (error) toast.error("Failed to create template");
        else { toast.success("Email template created"); setEmailDialogOpen(false); fetchEmailTemplates(); }
      } else if (editingEmail) {
        const { error } = await supabase.from("email_templates").update({
          subject: data.subject, body_html: data.bodyHtml, is_active: data.isActive, description: data.description.trim() || null,
        }).eq("id", editingEmail.id);
        if (error) toast.error("Failed to save template");
        else { toast.success("Email template saved"); setEmailDialogOpen(false); fetchEmailTemplates(); }
      }
    }
  };

  const deleteEmailTemplate = async (id: string) => {
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) toast.error("Failed to delete template");
    else { toast.success("Template deleted"); fetchEmailTemplates(); }
  };

  const TEST_EMAIL = "matt@shawscope.co.uk";
  const TEST_PHONE = "+447444653593";

  const sendTestEmail = async (tpl: EmailTemplate) => {
    const { data: testApt } = await supabase.from("appointments").select("id").limit(1).single();
    if (!testApt) { toast.error("No appointments to test with"); return; }
    const { error } = await supabase.functions.invoke("send-form-email", {
      body: {
        to: TEST_EMAIL,
        subject: `[TEST] ${tpl.subject.replace(/\{\{client_name\}\}/g, "Test User")}`,
        html: `<p><strong>⚠️ THIS IS A TEST EMAIL</strong></p>${tpl.body_html.replace(/\{\{client_name\}\}/g, "Test User").replace(/\{\{appointment_date\}\}/g, "01/01/2025").replace(/\{\{appointment_time\}\}/g, "10:00")}`,
      },
    });
    if (error) toast.error("Failed to send test");
    else toast.success(`Test email sent to ${TEST_EMAIL}!`);
  };

  // SMS template CRUD
  const openNewSms = () => {
    setEditingSms(null);
    setIsNewSms(true);
    setSmsBody("");
    setSmsActive(true);
    setSmsDesc("");
    setSmsTriggerType("");
    setSmsDialogOpen(true);
  };

  const openEditSms = (tpl: SmsTemplate) => {
    setEditingSms(tpl);
    setIsNewSms(false);
    setSmsBody(tpl.body_text);
    setSmsActive(tpl.is_active);
    setSmsDesc(tpl.description || "");
    setSmsTriggerType(tpl.trigger_type);
    setSmsDialogOpen(true);
  };

  const saveSmsTemplate = async (data?: { triggerType: string; bodyText: string; description: string; isActive: boolean }) => {
    if (data) {
      if (isNewSms) {
        if (!data.triggerType.trim()) { toast.error("Trigger type is required"); return; }
        const { error } = await supabase.from("sms_templates").insert({
          trigger_type: data.triggerType.trim(), body_text: data.bodyText, is_active: data.isActive, description: data.description.trim() || null,
        });
        if (error) toast.error("Failed to create SMS template");
        else { toast.success("SMS template created"); setSmsDialogOpen(false); fetchSmsTemplates(); }
      } else if (editingSms) {
        const { error } = await supabase.from("sms_templates").update({
          body_text: data.bodyText, is_active: data.isActive, description: data.description.trim() || null,
        }).eq("id", editingSms.id);
        if (error) toast.error("Failed to save SMS template");
        else { toast.success("SMS template saved"); setSmsDialogOpen(false); fetchSmsTemplates(); }
      }
    }
  };

  const deleteSmsTemplate = async (id: string) => {
    const { error } = await supabase.from("sms_templates").delete().eq("id", id);
    if (error) toast.error("Failed to delete SMS template");
    else { toast.success("SMS template deleted"); fetchSmsTemplates(); }
  };

  const sendTestSms = async (tpl: SmsTemplate) => {
    const message = tpl.body_text.replace(/\{\{client_name\}\}/g, "Test User").replace(/\{\{appointment_date\}\}/g, "01/01/2025").replace(/\{\{appointment_time\}\}/g, "10:00");
    const { error } = await supabase.functions.invoke("send-sms-reminder", {
      body: { testMode: true, testPhone: TEST_PHONE, testMessage: message },
    });
    if (error) toast.error("Failed to send test SMS");
    else toast.success(`Test SMS sent to ${TEST_PHONE}!`);
  };

  const sendTestCryoEmail = async (tpl: { week_number: number }) => {
    const { data: testApt } = await supabase.from("appointments").select("id, access_token, client_email, client_name, services!inner(name)").ilike("services.name", "%cryotherapy%").limit(1).single();
    if (!testApt) { toast.error("No cryotherapy appointments found to test with"); return; }
    const { data: template } = await supabase.from("cryo_followup_templates").select("*").eq("week_number", tpl.week_number).single();
    if (!template) { toast.error("Template not found"); return; }
    const siteUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const followupUrl = `${siteUrl}/followup/${testApt.access_token}?week=${tpl.week_number}`;
    // Use the send-form-email function as a generic email sender
    const { error } = await supabase.functions.invoke("send-form-email", {
      body: {
        to: TEST_EMAIL,
        subject: `[TEST] ShawScope — ${template.subject}`,
        html: `<p><strong>⚠️ THIS IS A TEST EMAIL</strong></p><h2>${template.heading}</h2><p>Hi Test User,</p><div>${template.guidance_html}</div><p><a href="${followupUrl}">Send an Update</a></p>`,
      },
    });
    if (error) toast.error("Failed to send test cryo email");
    else toast.success(`Test Week ${tpl.week_number} email sent to ${TEST_EMAIL}`);
  };

  const sendTestConsentForm = async () => {
    const { data: templates } = await supabase.from("consent_form_templates").select("id, title").eq("is_active", true);
    if (!templates || templates.length === 0) { toast.error("No active consent form templates found"); return; }
    const { data: testApt } = await supabase.from("appointments").select("id, client_email, access_token").limit(1).single();
    if (!testApt) { toast.error("No appointments found to test with"); return; }
    const consentUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/consent/${testApt.access_token}`;
    const { error } = await supabase.functions.invoke("send-form-email", {
      body: {
        to: TEST_EMAIL,
        subject: "[TEST] ShawScope — Please complete your consent form",
        html: `<p><strong>⚠️ THIS IS A TEST EMAIL</strong></p><p>Please complete your consent form by clicking the link below:</p><p><a href="${consentUrl}">Complete Consent Form</a></p>`,
      },
    });
    if (error) toast.error("Failed to send test consent form email");
    else toast.success(`Test consent form email sent to ${TEST_EMAIL}`);
  };

  // Cryo followup template CRUD
  const openEditCryo = (tpl: any) => {
    setEditingCryo(tpl);
    setCryoSubject(tpl.subject);
    setCryoHeading(tpl.heading);
    setCryoGuidance(tpl.guidance_html);
    setCryoActive(tpl.is_active);
    setCryoDialogOpen(true);
  };

  const saveCryoTemplate = async () => {
    if (!editingCryo) return;
    const { error } = await supabase.from("cryo_followup_templates").update({
      subject: cryoSubject,
      heading: cryoHeading,
      guidance_html: cryoGuidance,
      is_active: cryoActive,
    }).eq("id", editingCryo.id);
    if (error) toast.error("Failed to save cryo template");
    else { toast.success("Cryo follow-up template saved"); setCryoDialogOpen(false); fetchCryoTemplates(); }
  };

  const sendFormToEmail = async () => {
    if (!sendFormEmail.trim() || !sendFormTemplateId) {
      toast.error("Please select a form and enter an email");
      return;
    }
    setSendFormSending(true);

    // Find or create an appointment for this email to link the form to
    const { data: existingApts } = await supabase
      .from("appointments")
      .select("id, access_token, consent_form_template_id")
      .eq("client_email", sendFormEmail.trim().toLowerCase())
      .order("appointment_date", { ascending: false })
      .limit(1);

    let appointmentId: string;

    if (existingApts && existingApts.length > 0) {
      appointmentId = existingApts[0].id;
      // Ensure the consent_form_template_id is set on the appointment
      if (existingApts[0].consent_form_template_id !== sendFormTemplateId) {
        await supabase.from("appointments").update({ consent_form_template_id: sendFormTemplateId }).eq("id", appointmentId);
      }
    } else {
      toast.error("No appointments found for this email. The patient must have at least one booking.");
      setSendFormSending(false);
      return;
    }

    const templateName = templates.find(t => t.id === sendFormTemplateId)?.title || "";

    const { error } = await supabase.functions.invoke("send-form-email", {
      body: {
        appointmentId,
        recipientEmail: sendFormEmail.trim(),
        templateName,
      },
    });

    if (error) {
      toast.error("Failed to send form email");
    } else {
      toast.success(`Form sent to ${sendFormEmail.trim()}`);
      setSendFormDialogOpen(false);
      setSendFormEmail("");
      setSendFormTemplateId(null);
    }
    setSendFormSending(false);
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const nowTime = format(new Date(), "HH:mm:ss");
  const upcomingCutoff = upcomingDaysFilter === 999
    ? "9999-12-31"
    : upcomingDaysFilter === 0
      ? today
      : format(new Date(Date.now() + upcomingDaysFilter * 86400000), "yyyy-MM-dd");
  const upcomingAll = allAppointments
    .filter((a) => {
      if (a.status === "cancelled" || a.status === "form_only") return false;
      // Exclude today entirely — today's appointments are shown in the Today section
      if (a.appointment_date <= today) return false;
      if (a.appointment_date > upcomingCutoff) return false;
      return true;
    })
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.appointment_time.localeCompare(b.appointment_time));
  const upcomingDisplay = upcomingExpanded ? upcomingAll : upcomingAll.slice(0, 5);

  const refreshAll = () => {
    fetchAppointments(); fetchTemplates(); fetchSettings(); fetchServices();
    fetchAvailableDates(); fetchEmailTemplates(); fetchSmsTemplates();
    fetchCryoTemplates(); fetchBlockedTimes(); fetchConsentStatus();
    fetchPatientCount(); fetchPatientDobs(); fetchRecallEmails(); fetchRouteCache(); fetchVisitorData();
    if (templates.length > 0) fetchConsultNoteStatus();
    toast.success("Dashboard refreshed");
  };

  // Silent dashboard refresh after each background sync — skipped if any dialog is open
  useEffect(() => {
    setOnSilentSyncComplete(() => {
      const anyDialogOpen = aptDialogOpen || rescheduleDialogOpen || rejectDialogOpen || consultFormOpen || detailDialogOpen || deleteDialogOpen || markOpenDialogOpen || rescheduleGroupPromptOpen;
      if (anyDialogOpen) return;
      // Silently refresh data without toasts
      fetchAppointments(); fetchTemplates(); fetchSettings(); fetchServices();
      fetchAvailableDates(); fetchBlockedTimes(); fetchConsentStatus();
      fetchPatientCount(); fetchPatientDobs(); fetchRecallEmails(); fetchRouteCache(); fetchVisitorData();
      if (templates.length > 0) fetchConsultNoteStatus();
    });
    return () => setOnSilentSyncComplete(null);
  }, [setOnSilentSyncComplete, aptDialogOpen, rescheduleDialogOpen, rejectDialogOpen, consultFormOpen, detailDialogOpen, deleteDialogOpen, markOpenDialogOpen, rescheduleGroupPromptOpen, templates.length]);

  // Stats calculations
  const statsData = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(addMonths(now, -1));
    const lastMonthEnd = endOfMonth(addMonths(now, -1));
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // New patients this month
    const newPatientsThisMonth = allAppointments.filter(a => {
      const email = a.client_email;
      const firstApt = allAppointments.filter(x => x.client_email === email).sort((x, y) => x.created_at.localeCompare(y.created_at))[0];
      return firstApt?.id === a.id && a.created_at >= format(thisMonthStart, "yyyy-MM-dd") && a.created_at <= format(thisMonthEnd, "yyyy-MM-dd") + "T23:59:59";
    });
    const newPatientsLastMonth = allAppointments.filter(a => {
      const email = a.client_email;
      const firstApt = allAppointments.filter(x => x.client_email === email).sort((x, y) => x.created_at.localeCompare(y.created_at))[0];
      return firstApt?.id === a.id && a.created_at >= format(lastMonthStart, "yyyy-MM-dd") && a.created_at <= format(lastMonthEnd, "yyyy-MM-dd") + "T23:59:59";
    });

    // Income this week + this month
    const activeApts = allAppointments.filter(a => a.status !== "cancelled" && a.status !== "rejected");
    const lastWeekStart = startOfWeek(addWeeks(now, -1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(addWeeks(now, -1), { weekStartsOn: 1 });
    const thisWeekIncome = activeApts
      .filter(a => a.price != null && a.appointment_date >= format(thisWeekStart, "yyyy-MM-dd") && a.appointment_date <= format(thisWeekEnd, "yyyy-MM-dd"))
      .reduce((sum, a) => sum + Number(a.price || 0), 0);
    const lastWeekIncome = activeApts
      .filter(a => a.price != null && a.appointment_date >= format(lastWeekStart, "yyyy-MM-dd") && a.appointment_date <= format(lastWeekEnd, "yyyy-MM-dd"))
      .reduce((sum, a) => sum + Number(a.price || 0), 0);
    const thisMonthIncome = activeApts
      .filter(a => a.price != null && a.appointment_date >= format(thisMonthStart, "yyyy-MM-dd") && a.appointment_date <= format(thisMonthEnd, "yyyy-MM-dd"))
      .reduce((sum, a) => sum + Number(a.price || 0), 0);
    const lastMonthIncome = activeApts
      .filter(a => a.price != null && a.appointment_date >= format(lastMonthStart, "yyyy-MM-dd") && a.appointment_date <= format(lastMonthEnd, "yyyy-MM-dd"))
      .reduce((sum, a) => sum + Number(a.price || 0), 0);

    // Pending vs booked this week
    const pending = allAppointments.filter(a => a.status === "requested" || a.status === "pending").length;
    const bookedThisWeek = activeApts.filter(a => a.appointment_date >= format(thisWeekStart, "yyyy-MM-dd") && a.appointment_date <= format(thisWeekEnd, "yyyy-MM-dd")).length;
    const bookedLastWeek = activeApts.filter(a => a.appointment_date >= format(lastWeekStart, "yyyy-MM-dd") && a.appointment_date <= format(lastWeekEnd, "yyyy-MM-dd")).length;

    // Tax year income (April 6 to April 5)
    const currentYear = now.getFullYear();
    const taxYearStart = now.getMonth() >= 3 && (now.getMonth() > 3 || now.getDate() >= 6)
      ? `${currentYear}-04-06`
      : `${currentYear - 1}-04-06`;
    const taxYearIncome = activeApts
      .filter(a => a.price != null && a.appointment_date >= taxYearStart)
      .reduce((sum, a) => sum + Number(a.price || 0), 0);
    const taxSaving = Math.round(taxYearIncome * 0.4 * 100) / 100;

    return {
      newPatientsThisMonth: newPatientsThisMonth.length,
      newPatientsLastMonth: newPatientsLastMonth.length,
      totalPatients,
      thisWeekIncome, lastWeekIncome, thisMonthIncome, lastMonthIncome,
      pending, bookedThisWeek, bookedLastWeek,
      taxYearIncome, taxSaving,
    };
  }, [allAppointments, totalPatients]);

  const [statsCollapsed, setStatsCollapsed] = useState(true);
  const [todayAptsCollapsed, setTodayAptsCollapsed] = useState(false);
  const [completedTodayOpen, setCompletedTodayOpen] = useState(false);
  const [expandedCompletedIds, setExpandedCompletedIds] = useState<Set<string>>(new Set());
  const [completedBreakIds, setCompletedBreakIds] = useState<Set<string>>(new Set());
  const [expandedBreakIds, setExpandedBreakIds] = useState<Set<string>>(new Set());
  const [timedAptIds, setTimedAptIds] = useState<Set<string>>(new Set());

  // Auto-timing: starts on "Mark Arrived", stops on status -> "completed".
  const startArrivalTiming = async (aptId: string) => {
    try {
      const { data: existing } = await (supabase as any)
        .from("appointment_timings")
        .select("id")
        .eq("appointment_id", aptId)
        .is("ended_at", null)
        .limit(1);
      if (existing && existing.length > 0) return; // already running
      await (supabase as any).from("appointment_timings").insert({
        appointment_id: aptId,
        started_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("startArrivalTiming failed", e);
    }
  };

  const closeArrivalTiming = async (aptId: string) => {
    try {
      const { data: open } = await (supabase as any)
        .from("appointment_timings")
        .select("id, started_at")
        .eq("appointment_id", aptId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1);
      if (!open || open.length === 0) return;
      const row = open[0];
      const ended = new Date();
      const duration = Math.max(0, Math.floor((ended.getTime() - new Date(row.started_at).getTime()) / 1000));
      await (supabase as any)
        .from("appointment_timings")
        .update({ ended_at: ended.toISOString(), duration_seconds: duration })
        .eq("id", row.id);
      setTimedAptIds(prev => new Set([...prev, aptId]));
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      toast.success(`Appointment timed: ${mins}m ${secs}s`);
    } catch (e) {
      console.error("closeArrivalTiming failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar border-b border-sidebar-border">
        <div className="container mx-auto flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
          <div className="shrink-0">
            <h1 className="font-serif text-base sm:text-lg tracking-wide text-sidebar-foreground uppercase leading-tight">
              Parkly<span className="text-amber-400 font-semibold">Scope</span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-widest uppercase leading-none">Mobile Clinic System</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
              <ShieldCheck className="h-2.5 w-2.5" /> Secured by Lovable
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {/* Online/Offline indicator */}
            <div className={cn("flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium", isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
              {isOnline ? <Wifi className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} /> : <WifiOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} />}
              <span>{isOnline ? "Online" : "Offline"}</span>
            </div>
            {/* Desktop-only extras */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "hidden sm:inline-flex text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent relative",
                pendingCount > 0 && "text-amber-400 hover:text-amber-300"
              )}
              onClick={async () => { await sync(); refreshAll(); }}
              disabled={isSyncing}
              title={lastSyncAt ? `Last synced: ${format(parseISO(lastSyncAt), "HH:mm dd/MM")}` : "Sync data"}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : pendingCount > 0 ? (
                <CloudUpload className="h-4 w-4 mr-1" strokeWidth={2.5} />
              ) : (
                <CloudDownload className="h-4 w-4 mr-1" strokeWidth={2.5} />
              )}
              <span>{isSyncing ? "Syncing..." : pendingCount > 0 ? `Sync (${pendingCount})` : "Sync"}</span>
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={refreshAll} title="Refresh Dashboard">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent" asChild title="View Site">
              <a href="/" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-5 w-5" /></a>
            </Button>
            <StartDayButton variant="icon" />
            <Button variant="ghost" size="sm" className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent px-2 sm:px-3" onClick={signOut}>
              <LogOut className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Mobile Sync Banner */}
        {/* Mobile sync merged into phone booking row below */}

        {/* Phone Booking + Sync row */}
        <div className="mb-4 flex items-center gap-2">
          <Button
            onClick={() => setPhoneBookingOpen(true)}
            className="flex-1 sm:flex-none bg-amber-700 hover:bg-amber-600 text-white font-semibold shadow-md"
            size="sm"
          >
            <Phone className="h-4 w-4 mr-1.5" />
            Phone Booking
          </Button>
          <button
            onClick={async () => { await sync(); refreshAll(); }}
            disabled={isSyncing}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all",
              !isOnline
                ? "bg-red-800 border border-red-600 text-white"
                : pendingCount > 0
                  ? "bg-amber-800 border border-amber-600 text-white"
                  : "bg-emerald-800 border border-emerald-600 text-white"
            )}
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : !isOnline ? <WifiOff className="h-3.5 w-3.5" /> : pendingCount > 0 ? <CloudUpload className="h-3.5 w-3.5" /> : <CloudDownload className="h-3.5 w-3.5" />}
            {isSyncing ? "Syncing…" : !isOnline ? "Offline" : pendingCount > 0 ? `Sync (${pendingCount})` : "Synced ✓"}
          </button>
        </div>

        {/* Business Statistics removed */}

        {/* Today's Appointments moved to Schedule tab */}

        {/* Unread chatbot conversations banner */}
        {unreadChatCount > 0 && (
          <button
            type="button"
            onClick={() => { setActiveTab("messages"); setMessagesSubView("chatbot"); }}
            className="mb-4 w-full flex items-center gap-3 rounded-lg border border-secondary/50 bg-secondary/10 hover:bg-secondary/20 transition-colors px-4 py-3 text-left"
          >
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground shrink-0">
              <MessageSquare className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {unreadChatCount} new chatbot {unreadChatCount === 1 ? "conversation" : "conversations"} to review
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Tap to open Messages → Chatbot
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {allAppointments.filter((a) => a.status === "requested" || a.status === "pending").length > 0 && (
          <Card className="mb-6 border-orange-500/30 bg-orange-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-base text-orange-600">
                <CalendarDays className="h-5 w-5" />
                Pending Requests ({allAppointments.filter((a) => a.status === "requested" || a.status === "pending").length})
              </CardTitle>
              <CardDescription>These bookings need your approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allAppointments
                  .filter((a) => a.status === "requested" || a.status === "pending")
                  .map((apt) => {
                    const localityWord = getLocalityWord(apt);
                    const dupMatch = getDuplicateMatch(apt as any);
                    const sugDur = getSuggestedDurationFor(apt.client_email, (apt as any).service_id || null);
                    return (
                    <div
                      key={apt.id}
                      className="flex flex-col gap-3 rounded-lg border border-orange-500/40 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => openDetailView(apt)}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-xs font-bold text-orange-600">
                          {format(parseISO(apt.appointment_date), "dd")}
                        </div>
                        <div>
                          <div className="mb-1 flex items-center gap-1.5">
                            {localityWord && (
                              <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                                {localityWord}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <button className="underline decoration-dotted underline-offset-2 hover:text-secondary transition-colors text-left" onClick={(e) => { e.stopPropagation(); openInlinePatient(apt.client_email); }}>{apt.client_name}</button>
                            {getPatientAge(apt.client_email) !== null && <span className="text-xs text-muted-foreground font-normal">({getPatientAge(apt.client_email)})</span>}
                            {patientAlerts[apt.client_email] && (
                              <span title={patientAlerts[apt.client_email]!} className="inline-flex"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /></span>
                            )}
                            {apt.notes?.includes("Additional attendees:") && (
                              <span title="Multiple people attending" className="inline-flex items-center gap-0.5 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
                                <Users className="h-3 w-3" /> Group
                              </span>
                            )}
                            {recallEmails.has(apt.client_email?.toLowerCase()) && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400 animate-pulse">
                                <RefreshCw className="h-3 w-3" /> Recall
                              </span>
                            )}
                            {sugDur && sugDur.count > 0 && (
                              <span title={`Returning patient — ${sugDur.count} prior visit${sugDur.count > 1 ? "s" : ""}`} className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <RefreshCw className="h-3 w-3" /> Returning ×{sugDur.count}
                              </span>
                            )}
                            {apt.media_consent && (
                              <span title="Patient consented to photos/video for social media — share for approval before posting" className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-secondary text-secondary-foreground ring-2 ring-secondary/40 shadow-md shrink-0"><Camera className="h-3 w-3" strokeWidth={2.5} /></span>
                            )}
                          </p>
                           <p className="text-xs text-muted-foreground">
                            {getServiceWithAddons(apt)} · {format(parseISO(apt.appointment_date), "MMM d, yyyy")} at {apt.appointment_time.slice(0, 5)}
                          </p>
                          {(apt.address || apt.postcode) && (
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent((apt.address || "") + (apt.postcode && apt.address && !apt.address.toUpperCase().includes(apt.postcode.toUpperCase()) ? ", " + apt.postcode : !apt.address && apt.postcode ? apt.postcode : ""))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <MapPin className="h-3 w-3 shrink-0" />
                              {apt.address}{apt.postcode && apt.address && !apt.address.toUpperCase().includes(apt.postcode.toUpperCase()) ? `, ${apt.postcode}` : !apt.address && apt.postcode ? apt.postcode : ""}
                            </a>
                          )}
                          {apt.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">"{apt.notes}"</p>
                          )}
                          {sugDur && (
                            <p className="text-[11px] text-amber-300 font-medium mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Suggested duration: ~{sugDur.avgMin}min ({sugDur.count} prior visit{sugDur.count > 1 ? "s" : ""})
                            </p>
                          )}
                          {dupMatch && (
                            <div className="mt-1.5 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span className="flex-1">
                                Possible duplicate of <span className="font-semibold">{dupMatch.patient.client_name}</span>{" "}
                                ({dupMatch.patient.client_email}) — matched by {dupMatch.reason}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[11px]"
                                onClick={(e) => { e.stopPropagation(); linkBookingToPatient(apt.id, dupMatch.patient); }}
                              >
                                Link to record
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 sm:flex-shrink-0">
                        <Button size="sm" variant="outline" className="h-8 px-2 text-xs sm:px-3" onClick={() => {
                          setPreviewDayDate(apt.appointment_date);
                          setPreviewDayHighlightAptId(apt.id);
                        }}>
                          <CalendarDays className="mr-1 h-3 w-3" /> Preview Day
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-2 text-xs sm:px-3" onClick={() => openDetailView(apt)}>
                          <Eye className="mr-1 h-3 w-3" /> View
                        </Button>
                        <Button size="sm" className="h-8 px-2 text-xs sm:px-3 bg-success hover:bg-success/90 text-success-foreground" onClick={() => approveAppointment(apt)}>
                          <CheckCircle className="mr-1 h-3 w-3" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 px-2 text-xs sm:px-3" onClick={() => openRejectDialog(apt)}>
                          <XCircle className="mr-1 h-3 w-3" /> Reject
                        </Button>
                      </div>
                    </div>
                  )})}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clinic Visit Enquiries */}
        {clinicEnquiries.length > 0 && (
          <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-base text-blue-600">
                <Home className="h-5 w-5" />
                Clinic Visit Requests ({clinicEnquiries.length})
              </CardTitle>
              <CardDescription>Patients requesting to visit your clinic — contact them to arrange</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clinicEnquiries.map((enq) => (
                  <div key={enq.id} className="flex flex-col gap-3 rounded-lg border border-blue-500/40 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{enq.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {enq.service_name || "No service specified"} · {enq.number_of_people} {enq.number_of_people > 1 ? "people" : "person"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <a href={`mailto:${enq.client_email}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {enq.client_email}
                        </a>
                        {enq.client_phone && (
                          <a href={`tel:${enq.client_phone}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {enq.client_phone}
                          </a>
                        )}
                      </div>
                      {enq.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{enq.notes}"</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(parseISO(enq.created_at), { addSuffix: true })}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      <Button size="sm" className="h-8 px-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => {
                        const matchedService = services.find(s => s.name.toLowerCase() === (enq.service_name || "").toLowerCase());
                        setPhoneBookingPrefill({
                          name: enq.client_name,
                          email: enq.client_email,
                          phone: enq.client_phone || undefined,
                          serviceId: matchedService?.id || undefined,
                          peopleCount: enq.number_of_people || 1,
                          notes: enq.notes || undefined,
                          comeToPractitioner: true,
                        });
                        setPhoneBookingOpen(true);
                      }}>
                        <CalendarPlus className="mr-1 h-3 w-3" /> Schedule
                      </Button>
                      <Button size="sm" className="h-8 px-2 text-xs bg-success hover:bg-success/90 text-success-foreground" onClick={() => markClinicEnquiryContacted(enq.id)}>
                        <CheckCircle className="mr-1 h-3 w-3" /> Contacted
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => dismissClinicEnquiry(enq.id)}>
                        <XCircle className="mr-1 h-3 w-3" /> Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Awaiting Response - rejected with alternative offered */}
        {allAppointments.filter((a) => a.status === "rejected_awaiting").length > 0 && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-base text-amber-600">
                <Clock className="h-5 w-5" />
                Awaiting Response ({allAppointments.filter((a) => a.status === "rejected_awaiting").length})
              </CardTitle>
              <CardDescription>Alternative offered — slot held for 3 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allAppointments
                  .filter((a) => a.status === "rejected_awaiting")
                  .map((apt) => {
                    const rejectedAt = (apt as any).rejected_at ? new Date((apt as any).rejected_at) : null;
                    const expiresAt = rejectedAt ? new Date(rejectedAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null;
                    const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : null;
                    return (
                      <div
                        key={apt.id}
                        className="flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => openDetailView(apt)}>
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-600">
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{apt.client_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {getServiceName(apt.service_id)} · Alternative: {apt.alternative_date ? format(parseISO(apt.alternative_date), "MMM d, yyyy") : "N/A"} at {apt.alternative_time ? apt.alternative_time.slice(0, 5) : "N/A"}
                            </p>
                            {apt.admin_notes?.includes("[Patient declined alternative") && (
                              <Badge variant="destructive" className="mt-1 text-[10px]">Patient declined</Badge>
                            )}
                            {daysLeft !== null && (
                              <p className={cn("text-xs mt-0.5 font-medium", daysLeft <= 1 ? "text-destructive" : "text-amber-600")}>
                                {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 sm:flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={() => openDetailView(apt)}>
                            <Eye className="mr-1 h-3 w-3" /> View
                          </Button>
                          {apt.admin_notes?.includes("[Patient declined alternative") && (
                            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => openReofferDialog(apt)}>
                              <RefreshCw className="mr-1 h-3 w-3" /> Offer Alternative
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={async () => {
                            const { error } = await supabase.from("appointments").delete().eq("id", apt.id);
                            if (error) { toast.error("Failed to delete"); return; }
                            toast.success("Hold released");
                            fetchAppointments();
                          }}>
                            <Trash2 className="mr-1 h-3 w-3" /> Release
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {(() => {
          const TAB_DEFS: { value: string; label: string; icon: React.ReactNode; cls: string; indicator?: React.ReactNode }[] = [
            { value: "calendar", label: "Schedule", icon: <CalendarDays className="h-4 w-4" />, cls: "bg-blue-800/80 border-blue-500/60 data-[state=active]:bg-blue-600 data-[state=active]:border-blue-300 data-[state=active]:shadow-blue-500/30 col-span-2" },
            { value: "patients", label: "Records", icon: <Users className="h-4 w-4" />, cls: "bg-indigo-800/80 border-indigo-500/60 data-[state=active]:bg-indigo-600 data-[state=active]:border-indigo-300 data-[state=active]:shadow-indigo-500/30" },
            { value: "recalls", label: "Recalls", icon: <CalendarClock className="h-4 w-4" />, cls: "bg-teal-800/80 border-teal-500/60 data-[state=active]:bg-teal-600 data-[state=active]:border-teal-300 data-[state=active]:shadow-teal-500/30", indicator: upcomingRecalls ? <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-pulse" /> : null },
            { value: "services", label: "Services", icon: <Stethoscope className="h-4 w-4" />, cls: "bg-emerald-800/80 border-emerald-500/60 data-[state=active]:bg-emerald-600 data-[state=active]:border-emerald-300 data-[state=active]:shadow-emerald-500/30" },
            { value: "templates", label: "Templates", icon: <FileText className="h-4 w-4" />, cls: "bg-violet-800/80 border-violet-500/60 data-[state=active]:bg-violet-600 data-[state=active]:border-violet-300 data-[state=active]:shadow-violet-500/30" },
            { value: "messages", label: "Msgs", icon: <Send className="h-4 w-4" />, cls: "bg-sky-800/80 border-sky-500/60 data-[state=active]:bg-sky-600 data-[state=active]:border-sky-300 data-[state=active]:shadow-sky-500/30", indicator: upcomingMessages ? <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-pulse" /> : null },
            { value: "notices", label: "Notices", icon: <Megaphone className="h-4 w-4" />, cls: "bg-orange-800/80 border-orange-500/60 data-[state=active]:bg-orange-600 data-[state=active]:border-orange-300 data-[state=active]:shadow-orange-500/30", indicator: hasLiveNotice ? <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-pulse" /> : null },
            { value: "accounts", label: "Accounts", icon: <PoundSterling className="h-4 w-4" />, cls: "bg-rose-800/80 border-rose-500/60 data-[state=active]:bg-rose-600 data-[state=active]:border-rose-300 data-[state=active]:shadow-rose-500/30" },
            { value: "mileage", label: "Mileage", icon: <Car className="h-4 w-4" />, cls: "bg-purple-800/80 border-purple-500/60 data-[state=active]:bg-purple-600 data-[state=active]:border-purple-300 data-[state=active]:shadow-purple-500/30" },
            { value: "reports", label: "Reports", icon: <BarChart3 className="h-4 w-4" />, cls: "bg-amber-800/80 border-amber-500/60 data-[state=active]:bg-amber-600 data-[state=active]:border-amber-300 data-[state=active]:shadow-amber-500/30" },
            { value: "todo", label: "Todo", icon: <ClipboardList className="h-4 w-4" />, cls: "bg-yellow-800/80 border-yellow-500/60 data-[state=active]:bg-yellow-600 data-[state=active]:border-yellow-300 data-[state=active]:shadow-yellow-500/30", indicator: todoOverdueCount > 0 ? <AlertTriangle className="h-3 w-3 text-amber-400 absolute -top-1 -right-1 animate-pulse" /> : null },
            { value: "referrals", label: "Referrals", icon: <ExternalLink className="h-4 w-4" />, cls: "bg-pink-800/80 border-pink-500/60 data-[state=active]:bg-pink-600 data-[state=active]:border-pink-300 data-[state=active]:shadow-pink-500/30" },
            { value: "audit", label: "Governance", icon: <Shield className="h-4 w-4" />, cls: "bg-cyan-800/80 border-cyan-500/60 data-[state=active]:bg-cyan-600 data-[state=active]:border-cyan-300 data-[state=active]:shadow-cyan-500/30 col-span-2", indicator: auditWarning ? <AlertTriangle className="h-3 w-3 text-amber-400 absolute -top-1 -right-1 animate-pulse" /> : null },
            { value: "settings", label: "Settings", icon: <Settings className="h-4 w-4" />, cls: "bg-slate-700/80 border-slate-500/60 data-[state=active]:bg-slate-500 data-[state=active]:border-slate-300 data-[state=active]:shadow-slate-500/30" },
          ];
          const orderedTabs = tabOrder.length > 0
            ? tabOrder.map(v => TAB_DEFS.find(t => t.value === v)).filter(Boolean) as typeof TAB_DEFS
            : TAB_DEFS;
          const missing = TAB_DEFS.filter(t => !orderedTabs.find(o => o.value === t.value));
          const finalTabs = [...orderedTabs, ...missing];

          return (
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== "patients") setPatientTabEmail(null); }}>
              <TabsList className="mb-4 w-full grid grid-cols-[repeat(8,minmax(0,1fr))] h-auto gap-1.5 sm:gap-1 p-1.5 sm:p-1.5 bg-card/95 rounded-xl border border-border">
                {finalTabs.map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "relative flex-col sm:flex-row gap-0.5 sm:gap-2 py-2 sm:py-2 px-0.5 sm:px-2 text-[9px] sm:text-sm leading-tight text-white/90 border rounded-lg transition-all",
                      "data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-lg",
                      tab.cls
                    )}
                  >
                    {tab.icon}
                    <span className="truncate">{tab.label}</span>
                    {tab.indicator}
                  </TabsTrigger>
                ))}
              </TabsList>

          {/* CALENDAR TAB */}
          {/* MERGED CALENDAR + APPOINTMENTS TAB */}
          <TabsContent value="calendar" className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-4 space-y-4">
            {/* Pending Payments Warning */}
            {pendingPayments.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3">
                <button
                  onClick={() => setPendingPaymentsExpanded(!pendingPaymentsExpanded)}
                  className="w-full flex items-center gap-2 text-left"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-sm font-semibold text-amber-300">
                    {pendingPayments.length} Unpaid Payment{pendingPayments.length !== 1 ? "s" : ""} — £{pendingPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)} outstanding
                  </span>
                  {pendingPaymentsExpanded ? <ChevronUp className="h-4 w-4 text-amber-400 ml-auto" /> : <ChevronDown className="h-4 w-4 text-amber-400 ml-auto" />}
                </button>
                {pendingPaymentsExpanded && (
                  <div className="mt-2 space-y-1.5">
                    {pendingPayments.map((p) => (
                      <div
                        key={p.appointment_id}
                        className="rounded-md bg-amber-900/20 border border-amber-800/30 px-3 py-2 text-sm"
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-amber-900/30 transition-colors rounded -mx-1 px-1"
                          onClick={() => {
                            const apt = allAppointments.find(a => a.id === p.appointment_id);
                            if (apt) {
                              (supabase as any).from("appointment_payments").select("*").eq("appointment_id", apt.id).maybeSingle().then(({ data: ep }: any) => {
                                setPaymentDialogApt(apt);
                                setPaymentDialogExisting(ep ? { id: ep.id, amount: Number(ep.amount), payment_method: ep.payment_method, payment_status: ep.payment_status, notes: ep.notes } : null);
                                setPaymentDialogOpen(true);
                              });
                            }
                          }}
                        >
                          <div>
                            <span className="font-medium text-amber-200">{p.client_name}</span>
                            <span className="text-amber-400/70 ml-2 text-xs">{p.appointment_date ? format(parseISO(p.appointment_date), "dd/MM/yy") : ""} · {getServiceName(p.service_id)}</span>
                          </div>
                          <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-xs">£{p.amount.toFixed(2)}</Badge>
                        </div>
                        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-amber-800/20">
                          <span className="text-[11px] text-amber-400/60">
                            {p.last_reminder_sent
                              ? `Reminded ${formatDistanceToNow(parseISO(p.last_reminder_sent), { addSuffix: true })}`
                              : "No reminder sent"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); sendPaymentReminder(p); }}
                            disabled={sendingReminder === p.appointment_id}
                            className="text-[11px] px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {sendingReminder === p.appointment_id ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
                            ) : (
                              <><Send className="h-3 w-3" /> Send Reminder</>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Awaiting Consultation Notes Bar */}
            {awaitingConsultApts.length > 0 && (
              <div className="rounded-lg border border-violet-500/40 bg-violet-950/30 p-3">
                <button
                  onClick={() => setAwaitingConsultExpanded(!awaitingConsultExpanded)}
                  className="w-full flex items-center gap-2 text-left"
                >
                  <Stethoscope className="h-4 w-4 text-violet-400 shrink-0" />
                  <span className="text-sm font-semibold text-violet-300">
                    {awaitingConsultApts.length} Awaiting Consultation{awaitingConsultApts.length !== 1 ? "s" : ""}
                  </span>
                  {awaitingConsultExpanded ? <ChevronUp className="h-4 w-4 text-violet-400 ml-auto" /> : <ChevronDown className="h-4 w-4 text-violet-400 ml-auto" />}
                </button>
                {awaitingConsultExpanded && (
                  <div className="mt-2 space-y-1.5">
                    {awaitingConsultApts.map((apt) => (
                      <div
                        key={apt.id}
                        className="rounded-md bg-violet-900/20 border border-violet-800/30 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-violet-200">{apt.client_name}</span>
                            <span className="text-violet-400/70 ml-2 text-xs">{format(parseISO(apt.appointment_date), "dd/MM/yy")} · {getServiceName(apt.service_id)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-violet-800/20">
                          <button
                            type="button"
                            onClick={() => {
                              const svcName = getServiceName(apt.service_id).toLowerCase();
                              const consultTemplate = templates.find(t => t.form_type === 'consultation' && t.title.toLowerCase().includes(svcName.split(' ')[0]));
                              setConsultAptId(apt.id);
                              setConsultTemplateId(consultTemplate?.id || null);
                              setConsultFormType('consultation');
                              setConsultFormOpen(true);
                            }}
                            className="text-[11px] px-2.5 py-1 rounded bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 font-medium transition-colors flex items-center gap-1"
                          >
                            <Stethoscope className="h-3 w-3" /> Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSkippedConsultIds(prev => new Set([...prev, apt.id]));
                              toast.success(`Skipped consultation for ${apt.client_name}`);
                            }}
                            className="text-[11px] px-2.5 py-1 rounded bg-violet-900/30 hover:bg-violet-900/50 text-violet-400 font-medium transition-colors flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> Skip
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailApt(apt);
                              setDetailDialogOpen(true);
                            }}
                            className="text-[11px] px-2.5 py-1 rounded bg-violet-900/30 hover:bg-violet-900/50 text-violet-400 font-medium transition-colors flex items-center gap-1 ml-auto"
                          >
                            <Eye className="h-3 w-3" /> View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Today's Appointments */}
            {(() => {
              const todayStr = format(new Date(), "yyyy-MM-dd");
              const todayApts = allAppointments
                .filter(a => a.appointment_date === todayStr && a.status !== "cancelled" && a.status !== "rejected" && a.status !== "form_only")
                .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
              const todayBlocks = blockedTimes
                .filter(bt => bt.blocked_date === todayStr)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));

              const expectedEarnings = todayApts.reduce((sum, a) => sum + (a.price || 0) + (a.travel_fee || 0), 0);

              return (
                <Collapsible open={!todayAptsCollapsed} onOpenChange={(open) => setTodayAptsCollapsed(!open)}>
                <Card className="border-teal-700/50 bg-gradient-to-br from-teal-950/80 to-teal-900/40 -mx-2 sm:mx-0">
                  <CollapsibleTrigger asChild>
                  <CardHeader className="relative pb-3 px-3 sm:px-6 cursor-pointer hover:bg-white/[0.03] transition-colors rounded-t-lg">
                    <div className="flex flex-col items-center text-center gap-1">
                      <h2 className="font-serif text-xl text-white tracking-wide">Today's Appointments</h2>
                      <p className="text-sm text-teal-300/90 font-medium">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
                      <p className="text-sm text-white/80">{todayApts.length} appointment{todayApts.length !== 1 ? "s" : ""} scheduled</p>
                      <p className="text-sm font-semibold text-teal-200">Expected earnings: £{expectedEarnings.toFixed(2)}</p>
                    </div>
                    <span className="absolute right-4 top-4">
                      {todayAptsCollapsed ? <ChevronDown className="h-4 w-4 text-teal-300/70" /> : <ChevronUp className="h-4 w-4 text-teal-300/70" />}
                    </span>
                  </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                  <CardContent className="px-2 sm:px-6">
                    {todayApts.length === 0 && todayBlocks.length === 0 ? (
                      <p className="py-4 text-center text-sm text-white/70">No appointments or blocks today</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Live tracker status bar */}
                        {(() => {
                          const completedCount = todayApts.filter(a => a.status === "completed").length;
                          const total = todayApts.length;
                          const anyLate = todayApts.some(a => {
                            const seg = computeTravelSegments([a], todayBlocks).find(s => s.toPatientName === a.client_name);
                            return false; // simplified
                          });
                          const anyOMW = todayApts.some(a => onMyWaySentIds.has(a.id) && !arrivedAptIds.has(a.id) && a.status !== "completed");
                          const anyArrived = todayApts.some(a => arrivedAptIds.has(a.id) && a.status !== "completed");
                          const anyDelay = todayApts.some(a => delaySentIds.has(a.id) && a.status !== "completed");
                          
                          let statusText = "";
                          let statusColor = "";
                          let statusIcon = "✅";
                          
                          if (completedCount === 0) {
                            statusText = `On schedule · ${total} visits today`;
                            statusColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                            statusIcon = "✅";
                          } else if (completedCount === total) {
                            statusText = "All visits completed!";
                            statusColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                            statusIcon = "🎉";
                          } else if (anyDelay) {
                            const delayApt = todayApts.find(a => delaySentIds.has(a.id) && a.status !== "completed");
                            statusText = `Running late · Delay sent to ${delayApt?.client_name || "patient"}`;
                            statusColor = "bg-amber-500/10 border-amber-500/30 text-amber-400";
                            statusIcon = "⚠️";
                          } else if (anyArrived) {
                            const arrivedApt = todayApts.find(a => arrivedAptIds.has(a.id) && a.status !== "completed");
                            statusText = `With patient · ${arrivedApt?.client_name || ""}`;
                            statusColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                            statusIcon = "📍";
                          } else if (anyOMW) {
                            const omwApt = todayApts.find(a => onMyWaySentIds.has(a.id) && !arrivedAptIds.has(a.id) && a.status !== "completed");
                            let etaText = omwApt ? onMyWayEtas[omwApt.id] : null;
                            // Live countdown for status bar
                            if (omwApt && onMyWayEtaArrivals[omwApt.id]) {
                              const rm = new Date(onMyWayEtaArrivals[omwApt.id]).getTime() - Date.now();
                              const mins = Math.max(0, Math.floor(rm / 60000));
                              const secs = Math.max(0, Math.floor((rm % 60000) / 1000));
                              etaText = rm <= 0 ? "Due now" : `${mins}:${String(secs).padStart(2, "0")}`;
                            }
                            statusText = `On my way to ${omwApt?.client_name || "next patient"}${etaText ? ` · ${etaText}` : ""}`;
                            statusColor = "bg-blue-500/10 border-blue-500/30 text-blue-400";
                            statusIcon = "🚗";
                          } else {
                            statusText = `On schedule · ${completedCount}/${total} complete`;
                            statusColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                            statusIcon = "✅";
                          }
                          
                          // Find next non-completed apt for patient view link
                          const nextActiveApt = todayApts.find(a => a.status !== "completed" && a.access_token);
                          
                          return (
                            <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5", statusColor)}>
                              <span className="text-xs">{statusIcon}</span>
                              <p className="text-[11px] font-semibold flex-1">{statusText}</p>
                              {nextActiveApt?.access_token && (
                                <span className="text-[10px] font-medium cursor-pointer underline underline-offset-2 opacity-80 hover:opacity-100" onClick={() => setTrackerPreviewToken(nextActiveApt.access_token!)}>
                                  👁 View
                                </span>
                              )}
                              <span className="text-[10px] opacity-70">LIVE</span>
                            </div>
                          );
                        })()}
                        {/* Completed Appointments — collapsed by default, opens to reveal completed tiles */}
                        {(() => {
                          const completedApts = todayApts.filter(a => a.status === "completed");
                          const completedBreaks = todayBlocks.filter(b => completedBreakIds.has(b.id));
                          if (completedApts.length === 0 && completedBreaks.length === 0) return null;
                          // Group bookings: show first member only, count whole group
                          const seenGroups = new Set<string>();
                          const completedTiles = completedApts.filter(a => {
                            if (!a.group_id) return true;
                            if (seenGroups.has(a.group_id)) return false;
                            seenGroups.add(a.group_id);
                            return true;
                          });
                          const totalCount = completedApts.length + completedBreaks.length;
                          return (
                            <Collapsible open={completedTodayOpen} onOpenChange={setCompletedTodayOpen}>
                              <CollapsibleTrigger asChild>
                                <button className="w-full flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 hover:bg-emerald-500/15 transition-colors text-left">
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                  <span className="text-[11px] font-semibold text-emerald-400 flex-1">
                                    Completed · {totalCount}
                                  </span>
                                  {completedTodayOpen
                                    ? <ChevronUp className="h-4 w-4 text-emerald-400" />
                                    : <ChevronDown className="h-4 w-4 text-emerald-400" />}
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-2">
                                  {completedTiles.map(a => {
                                    const groupSize = a.group_id ? todayApts.filter(x => x.group_id === a.group_id).length : 1;
                                    const displayName = groupSize > 1 ? `${a.client_name} +${groupSize - 1}` : a.client_name;
                                    return (
                                      <div key={a.id} className="flex items-center gap-2 rounded-md bg-card/60 border border-border px-2.5 py-1.5">
                                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{a.appointment_time.slice(0, 5)}</span>
                                        <button
                                          onClick={() => openInlinePatient(a.client_email)}
                                          className="text-[11px] font-semibold text-foreground/90 line-through truncate flex-1 text-left hover:text-secondary"
                                        >
                                          {displayName}
                                        </button>
                                        <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{getServiceName(a.service_id)}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
                                          onClick={() => openDetailView(a)}
                                        >
                                          <Eye className="h-3 w-3 mr-1" /> View
                                        </Button>
                                      </div>
                                    );
                                  })}
                                  {completedBreaks.map(b => {
                                    const label = b.reason?.includes("Lunch") ? "Lunch at base" : b.reason?.includes("Mobile") ? "Mobile break" : (b.reason || "Break");
                                    return (
                                      <div key={b.id} className="flex items-center gap-2 rounded-md bg-card/60 border border-border px-2.5 py-1.5">
                                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{b.start_time.slice(0, 5)}</span>
                                        <span className="text-[11px] font-semibold text-foreground/80 line-through truncate flex-1">{label}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
                                          onClick={() => setCompletedBreakIds(prev => { const n = new Set(prev); n.delete(b.id); return n; })}
                                        >
                                          Undo
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })()}
                        {(() => {
                          const travelSegments = computeTravelSegments(todayApts, todayBlocks);
                          const embeddedMobileStarts = new Set(travelSegments.filter(s => s.mobileBreak).map(s => s.mobileBreak!.startTime));
                          const combined: { type: 'apt' | 'block' | 'travel'; time: string; data: any }[] = [
                            ...todayBlocks
                              .filter(bt => !(bt.reason?.includes("Mobile") && embeddedMobileStarts.has(bt.start_time)))
                              .map(bt => ({ type: 'block' as const, time: bt.start_time, data: bt })),
                            ...todayApts.map(apt => ({ type: 'apt' as const, time: apt.appointment_time, data: apt })),
                          ].sort((a, b) => a.time.localeCompare(b.time));

                          const withTravel: typeof combined = [];
                          for (const item of combined) {
                            if (item.type === 'block' && item.data.reason?.includes("Lunch")) {
                              const lunchTravelTo = travelSegments.find(s => s.afterAptId?.startsWith("__to_lunch_"));
                              if (lunchTravelTo) withTravel.push({ type: 'travel', time: lunchTravelTo.departBy, data: lunchTravelTo });
                            }
                            withTravel.push(item);
                            if (item.type === 'apt') {
                              const seg = travelSegments.find(s => s.afterAptId === item.data.id);
                              if (seg) withTravel.push({ type: 'travel', time: seg.departBy, data: seg });
                            }
                            if (item.type === 'block' && item.data.reason?.includes("Lunch")) {
                              const lunchTravelFrom = travelSegments.find(s => s.afterAptId?.startsWith("__lunch_to_"));
                              if (lunchTravelFrom) withTravel.push({ type: 'travel', time: lunchTravelFrom.departBy, data: lunchTravelFrom });
                            }
                          }
                          const baseSeg = travelSegments.find(s => s.afterAptId === "__base__");
                          if (baseSeg) withTravel.unshift({ type: 'travel', time: baseSeg.departBy, data: baseSeg });

                          // Insert "Set Up Time" tiles before come_to_practitioner appointments
                          // Skip if previous appointment is also come_to_practitioner (already set up)
                          const withSetup: typeof withTravel = [];
                          for (let si = 0; si < withTravel.length; si++) {
                            const cur = withTravel[si];
                            if (cur.type === 'apt' && cur.data.come_to_practitioner) {
                              // Find previous appointment in the timeline
                              let prevAptCTP = false;
                              for (let pi = si - 1; pi >= 0; pi--) {
                                if (withTravel[pi].type === 'apt') {
                                  prevAptCTP = !!withTravel[pi].data.come_to_practitioner;
                                  break;
                                }
                              }
                              if (!prevAptCTP) {
                                const aptStartMin = parseInt(cur.data.appointment_time.slice(0, 2)) * 60 + parseInt(cur.data.appointment_time.slice(3, 5));
                                const setupStartMin = aptStartMin - 10;
                                const setupTime = `${Math.floor(setupStartMin / 60).toString().padStart(2, "0")}:${(setupStartMin % 60).toString().padStart(2, "0")}`;
                                withSetup.push({ type: 'setup' as any, time: setupTime, data: { durationMinutes: 10, forAptId: cur.data.id, forPatientName: cur.data.client_name } });
                              }
                            }
                            withSetup.push(cur);
                          }

                          const todayOpenForTimeline = availableDates.find(d => d.available_date === todayStr);
                          const todayOpenHours = todayOpenForTimeline ? { startMin: (todayOpenForTimeline.start_hour ?? settings?.start_hour ?? 9) * 60, endMin: (todayOpenForTimeline.end_hour ?? settings?.end_hour ?? 17) * 60 } : null;
                          const finalTimeline = insertDeadGaps(withSetup, todayOpenHours);

                          const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
                          return finalTimeline.map((item, idx) => item.type === 'dead_gap' ? (() => {
                            const deadStartMin = parseInt(item.time.slice(0, 2)) * 60 + parseInt(item.time.slice(3, 5));
                            const deadEndMin = deadStartMin + (item.data.gapMinutes || 0);
                            const isPast = nowMinutes >= deadEndMin;
                            const nextApt = finalTimeline.slice(idx + 1).find(t => t.type === 'apt');
                            const nextCompleted = nextApt?.data?.status === "completed";
                            const shouldMinimize = isPast || nextCompleted;
                            return shouldMinimize ? (
                              null
                            ) : (
                              <div key={`deadgap-${idx}`} className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted shrink-0">
                                  <Clock className="h-4 w-4 text-foreground" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-foreground">{item.data.unknownDrive ? "Likely dead time" : "Dead time"} — {item.data.gapMinutes} min gap</p>
                                  <p className="text-[10px] text-muted-foreground">{item.data.unknownDrive ? "Drive time unknown — likely too short" : `Too short for any service (min ${item.data.minServiceDuration} min)`}</p>
                                </div>
                              </div>
                            );
                          })() : item.type === 'free_slot' ? (() => {
                            const freeEndMin = item.data.endMin || 0;
                            const isFreePast = nowMinutes >= freeEndMin;
                            const nextFreeApt = finalTimeline.slice(idx + 1).find(t => t.type === 'apt');
                            const nextFreeCompleted = nextFreeApt?.data?.status === "completed";
                            const shouldMinimizeFree = isFreePast || nextFreeCompleted;
                            return shouldMinimizeFree ? (
                              null
                            ) : (
                              <div key={`free-${idx}`} className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted shrink-0">
                                  <CalendarCheck className="h-4 w-4 text-foreground" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-foreground">Free time — {item.data.gapMinutes} min</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {`${Math.floor(item.data.startMin / 60).toString().padStart(2, "0")}:${(item.data.startMin % 60).toString().padStart(2, "0")}`} – {`${Math.floor(item.data.endMin / 60).toString().padStart(2, "0")}:${(item.data.endMin % 60).toString().padStart(2, "0")}`}
                                    {item.data.travelMinutes > 0 ? ` (incl. ${item.data.travelMinutes} min travel)` : ""}
                                  </p>
                                </div>
                              </div>
                            );
                          })() : item.type === 'setup' ? (() => {
                            const setupStartMin = parseInt(item.time.slice(0, 2)) * 60 + parseInt(item.time.slice(3, 5));
                            const setupEndMin = setupStartMin + (item.data.durationMinutes || 10);
                            const isPast = nowMinutes >= setupEndMin;
                            const nextAptForSetup = finalTimeline.slice(idx + 1).find(t => t.type === 'apt');
                            const nextCompleted = nextAptForSetup?.data?.status === "completed";
                            const shouldMinimize = isPast || nextCompleted;
                            return shouldMinimize ? (
                              null
                            ) : (
                              <div key={`setup-${idx}`} className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 shrink-0">
                                  <Home className="h-4 w-4 text-amber-400" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-amber-300">Set Up Time</p>
                                  <p className="text-[10px] text-amber-400/70">
                                    {item.time.slice(0, 5)} – {`${Math.floor(setupEndMin / 60).toString().padStart(2, "0")}:${(setupEndMin % 60).toString().padStart(2, "0")}`} · Prepare for {item.data.forPatientName?.split(" ")[0] || "patient"}
                                  </p>
                                </div>
                              </div>
                            );
                          })() : item.type === 'travel' ? (() => {
                            const getPrevSignificantItem = () => {
                              for (let i = idx - 1; i >= 0; i--) {
                                const t = finalTimeline[i]?.type;
                                if (t !== 'dead_gap' && t !== 'free_slot' && t !== 'setup') return finalTimeline[i];
                              }
                              return null;
                            };
                            const getNextSignificantItem = () => {
                              for (let i = idx + 1; i < finalTimeline.length; i++) {
                                const t = finalTimeline[i]?.type;
                                if (t !== 'dead_gap' && t !== 'free_slot' && t !== 'setup') return finalTimeline[i];
                              }
                              return null;
                            };

                            const prevSig = getPrevSignificantItem();
                            const nextSig = getNextSignificantItem();

                            const prevCompleted = (prevSig?.type === 'apt' && prevSig.data.status === 'completed') || (prevSig?.type === 'block' && completedBreakIds.has(prevSig.data.id));
                            const nextCompleted = (nextSig?.type === 'apt' && nextSig.data.status === 'completed') || (nextSig?.type === 'block' && completedBreakIds.has(nextSig.data.id));
                            const isSandwichedCompleted = prevCompleted && nextCompleted;
                            const isBaseCompleted = item.data.afterAptId === '__base__' && nextSig?.type === 'apt' && nextSig.data.status === 'completed';
                            const isBaseToBreakCompleted = item.data.afterAptId === '__base__' && nextSig?.type === 'block' && completedBreakIds.has(nextSig.data.id);
                            // Also grey out travel leading into a completed break even if separated by dead/free time
                            const isLeadingToCompletedBreak = nextSig?.type === 'block' && completedBreakIds.has(nextSig.data.id);
                            const isGreyedOut = isSandwichedCompleted || isBaseCompleted || isBaseToBreakCompleted || isLeadingToCompletedBreak;

                            // Hide travel tile when adjacent completed apts/breaks are collapsed
                            const nextAptId = nextSig?.type === 'apt' ? nextSig.data.id : null;
                            const prevAptId = prevSig?.type === 'apt' ? prevSig.data.id : null;
                            const nextBlockId = nextSig?.type === 'block' ? nextSig.data.id : null;
                            const prevBlockId = prevSig?.type === 'block' ? prevSig.data.id : null;
                            const isHiddenByCollapse = isGreyedOut && (
                              (nextAptId && !expandedCompletedIds.has(nextAptId)) ||
                              (prevAptId && !expandedCompletedIds.has(prevAptId)) ||
                              (nextBlockId && completedBreakIds.has(nextBlockId) && !expandedBreakIds.has(nextBlockId)) ||
                              (prevBlockId && completedBreakIds.has(prevBlockId) && !expandedBreakIds.has(prevBlockId))
                            );
                            if (isHiddenByCollapse) return null;
                            // Find the next appointment this travel leads TO (skip blocks)
                            const findNextApt = () => {
                              for (let i = idx + 1; i < finalTimeline.length; i++) {
                                if (finalTimeline[i]?.type === 'apt') return finalTimeline[i].data as Appointment;
                              }
                              return null;
                            };
                            const targetApt = findNextApt();
                            const targetAptId = targetApt?.id;
                            const targetIsCompleted = targetApt?.status === "completed";
                            const isArrivedAtTarget = !!(targetAptId && arrivedAptIds.has(targetAptId));
                            const isCollapsed = isGreyedOut || isArrivedAtTarget;
                            return (
                              <>
                              <div key={`travel-${item.data.afterAptId}`} className={cn(
                                "rounded-2xl border overflow-hidden transition-colors",
                                isCollapsed
                                  ? "border-muted bg-muted/20 opacity-50"
                                  : "border-slate-700 bg-slate-900"
                              )}>
                                {(() => {
                                  // Check if we're behind schedule for this travel tile
                                  const tileArrivalIso = targetAptId ? onMyWayEtaArrivals[targetAptId] : null;
                                  const tileIsBehind = tileArrivalIso && new Date(tileArrivalIso).getTime() < Date.now() && onMyWaySentIds.has(targetAptId!) && !arrivedAptIds.has(targetAptId!) && !delaySentIds.has(targetAptId!);
                                  return tileIsBehind ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border-b border-amber-500/30 animate-pulse">
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                      <span className="text-[10px] font-bold text-amber-400 flex-1">Behind schedule — patient not notified</span>
                                      <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] font-bold border-amber-500/60 text-amber-300 hover:bg-amber-500/30 gap-1" onClick={(e) => { e.stopPropagation(); setDelayConfirmApt(targetApt!); }}>
                                        <AlertTriangle className="h-3 w-3" /> Notify?
                                      </Button>
                                    </div>
                                  ) : null;
                                })()}
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <Car className={cn("h-4 w-4 shrink-0", isCollapsed ? "text-muted-foreground" : "text-blue-400")} />
                                  <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs font-medium flex items-center gap-1", isCollapsed ? "text-muted-foreground line-through" : "text-white")}>
                                      {item.data.rawDriveMinutes != null
                                        ? `${item.data.rawDriveMinutes} min drive`
                                        : item.data.driveMinutes != null ? `${item.data.driveMinutes} min drive` : "Drive time unknown"}
                                      {item.data.distanceMiles != null ? ` · ${Number(item.data.distanceMiles).toFixed(1)} mi` : ""}
                                      {item.data.isLive && <span className="ml-1 inline-flex items-center gap-1 rounded bg-green-600 px-1 py-0 text-[9px] font-bold text-white uppercase tracking-wide">● Live</span>}
                                    </p>
                                    <p className={cn("text-[10px]", isCollapsed ? "text-muted-foreground/70 line-through" : "text-white/50")}>
                                      {item.data.bufferMinutes != null && item.data.bufferMinutes > 0 ? `+${item.data.bufferMinutes} min buffer · ` : ""}
                                      {item.data.fromPostcode && item.data.toPostcode ? `${item.data.fromPostcode} → ${item.data.toPostcode}` : ""}
                                    </p>
                                    {item.data.departBy && item.data.arriveBy && (
                                      <p className={cn("text-[10px] font-bold", isCollapsed ? "text-muted-foreground/70 line-through" : "text-white/80")}>
                                        Depart {item.data.departBy} → Arrive {item.data.arriveBy}
                                      </p>
                                    )}
                                  </div>
                                  {!isCollapsed && item.data.driveMinutes != null && (() => {
                                    const isTight = item.data.availableGapMinutes < (item.data.driveMinutes ?? 0);
                                    return isTight ? (
                                      <span className="text-[10px] font-semibold text-destructive flex items-center gap-0.5 shrink-0" title="Tight schedule — may be late">
                                        <AlertTriangle className="h-3 w-3" /> Tight
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                                {/* OMW / Delay / Arrived action buttons for the target appointment */}
                                {targetAptId && !isCollapsed && !targetIsCompleted && (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-slate-700/50 bg-slate-800/50">
                                    {!onMyWaySentIds.has(targetAptId) && !arrivedAptIds.has(targetAptId) && !targetApt?.come_to_practitioner && (
                                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px] font-semibold border-blue-500/50 text-blue-400 hover:bg-blue-500/20 gap-1" disabled={onMyWaySending === targetAptId} onClick={() => setOnMyWayConfirmApt(targetApt!)}>
                                        {onMyWaySending === targetAptId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Car className="h-3 w-3" />}
                                        On My Way
                                      </Button>
                                    )}
                                    {targetApt?.come_to_practitioner && !clinicReadySentIds.has(targetAptId) && (
                                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px] font-semibold border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 gap-1" disabled={clinicReadySending === targetAptId} onClick={() => setClinicReadyConfirmApt(targetApt!)}>
                                        {clinicReadySending === targetAptId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Home className="h-3 w-3" />}
                                        I'm Ready
                                      </Button>
                                    )}
                                    {targetApt?.come_to_practitioner && clinicReadySentIds.has(targetAptId) && (
                                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">✅ Ready — patient notified</span>
                                    )}
                                    {onMyWaySentIds.has(targetAptId) && !arrivedAptIds.has(targetAptId) && (
                                      <>
                                        {(() => {
                                          const arrivalIso = onMyWayEtaArrivals[targetAptId];
                                          if (arrivalIso) {
                                            const remainMs = new Date(arrivalIso).getTime() - Date.now();
                                            const remainMins = Math.max(0, Math.floor(remainMs / 60000));
                                            const remainSecs = Math.max(0, Math.floor((remainMs % 60000) / 1000));
                                            const countdownStr = remainMs <= 0 ? "Due now" : `${remainMins}:${String(remainSecs).padStart(2, "0")}`;
                                            return (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); setTravelHudAptId(targetAptId); setTravelHudMinimized(false); }}
                                                className={cn("text-[11px] font-mono font-bold tabular-nums hover:underline", remainMs <= 0 ? "text-destructive" : remainMins <= 2 ? "text-amber-400" : "text-blue-400")}
                                                title="Open travel view"
                                              >
                                                🚗 {countdownStr}
                                              </button>
                                            );
                                          }
                                          return <span className="text-[10px] text-blue-400 font-medium">🚗 {onMyWayEtas[targetAptId] || "Sent"}</span>;
                                        })()}
                                        <div className="flex items-center gap-0.5">
                                          <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs font-bold border-slate-600 text-slate-300 hover:bg-slate-700" title="Reduce ETA by 1 min (silent)" onClick={() => executeSilentAdjust(targetAptId, -1)}>
                                            −
                                          </Button>
                                          <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs font-bold border-slate-600 text-slate-300 hover:bg-slate-700" title="Extend ETA by 1 min (silent)" onClick={() => executeSilentAdjust(targetAptId, 1)}>
                                            +
                                          </Button>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px] font-semibold border-amber-500/50 text-amber-400 hover:bg-amber-500/20 gap-1" disabled={delaySending === targetAptId} onClick={() => setDelayConfirmApt(targetApt!)}>
                                          {delaySending === targetAptId ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                                          Delayed
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px] font-semibold border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 gap-1 ml-auto" onClick={async () => {
                                          const ok = window.confirm("Reminder: Start your voice recorder.\n\nClick OK once recording has started to mark Arrived.");
                                          if (!ok) return;
                                          setArrivedAptIds(prev => new Set([...prev, targetAptId]));
                                          try {
                                            const { error: arrivedErr } = await supabase.functions.invoke("on-my-way", {
                                              body: { appointmentId: targetAptId, markArrived: true },
                                            });
                                            if (arrivedErr) throw arrivedErr;

                                            await fetchAppointments();
                                            await startArrivalTiming(targetAptId);
                                            toast.success(`Marked as arrived at ${targetApt!.client_name}'s location`);
                                          } catch (e: any) {
                                            setArrivedAptIds(prev => {
                                              const next = new Set(prev);
                                              next.delete(targetAptId);
                                              return next;
                                            });
                                            toast.error(`Failed to mark arrived: ${e?.message || "Unknown error"}`);
                                          }
                                        }}>
                                          <MapPin className="h-3 w-3" />
                                          Arrived
                                        </Button>
                                      </>
                                    )}
                                    {arrivedAptIds.has(targetAptId) && (
                                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">📍 Arrived at {targetApt!.client_name}'s</span>
                                    )}
                                    {delaySentIds.has(targetAptId) && (
                                      <span className="text-[10px] text-amber-400 font-medium ml-1">❗ Delay sent</span>
                                    )}
                                  </div>
                                )}
                                {item.data.mobileBreak && !isCollapsed && (
                                  <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 border-t border-emerald-500/20">
                                    <Coffee className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase">Mobile Break</p>
                                    <p className="text-[10px] text-emerald-300">{item.data.mobileBreak.startTime.slice(0,5)}–{item.data.mobileBreak.endTime.slice(0,5)}</p>
                                  </div>
                                )}
                              </div>
                              </>
                            );
                          })() : item.type === 'block' ?
                          (() => {
                            const isBreak = item.data.reason?.includes("Lunch") || item.data.reason?.includes("Mobile");
                            const isBreakCompleted = isBreak && completedBreakIds.has(item.data.id);
                            const isBreakExpanded = expandedBreakIds.has(item.data.id);
                            const showCompact = isBreakCompleted && !isBreakExpanded;

                            // Hide completed breaks from main timeline — they live in the Completed Appointments dropdown
                            if (isBreakCompleted && !isBreakExpanded) return null;

                            return (
                            <div key={item.data.id} className={cn(
                              "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
                              isBreakCompleted
                                ? "border-muted bg-muted/20 cursor-pointer"
                                : isBreak
                                  ? "border-emerald-500/30 bg-emerald-950/20"
                                  : "border-red-500/30 bg-red-950/20",
                              isBreak && "cursor-pointer"
                            )}
                            onClick={() => {
                              if (!isBreak) return;
                              if (isBreakCompleted) {
                                setExpandedBreakIds(prev => { const n = new Set(prev); if (n.has(item.data.id)) n.delete(item.data.id); else n.add(item.data.id); return n; });
                              }
                            }}
                            >
                              <div className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-md shrink-0",
                                isBreakCompleted ? "bg-muted" : isBreak ? "bg-emerald-500/20" : "bg-red-500/20"
                              )}>
                                {showCompact ? <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" /> : item.data.reason?.includes("Lunch") ? <span className="text-sm">🍽️</span> : item.data.reason?.includes("Mobile") ? <Coffee className="h-3.5 w-3.5 text-emerald-400" /> : item.data.reason === "Annual Leave" ? <span className="text-sm">🌴</span> : item.data.reason === "On Call" ? <span className="text-sm">📞</span> : <span className="text-xs font-bold text-red-400">{item.data.start_time.slice(0, 5)}</span>}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={cn(
                                  "text-xs font-bold leading-tight",
                                  isBreakCompleted ? "text-muted-foreground line-through" : isBreak ? "text-emerald-400" : item.data.reason === "Annual Leave" ? "text-sky-400" : item.data.reason === "On Call" ? "text-teal-400" : "text-red-400"
                                )}>
                                  {item.data.reason?.includes("Lunch") ? "LUNCH AT BASE" : item.data.reason?.includes("Mobile") ? "MOBILE BREAK" : item.data.reason === "Annual Leave" ? "🌴 Annual Leave" : item.data.reason === "On Call" ? "📞 On Call" : `Blocked: ${item.data.start_time.slice(0, 5)} – ${item.data.end_time.slice(0, 5)}`}
                                </p>
                                {!showCompact && (
                                  <p className={cn("text-[11px] leading-tight", isBreakCompleted ? "text-muted-foreground/60 line-through" : "text-white/60")}>{item.data.reason === "Annual Leave" || item.data.reason === "On Call" ? "All day" : `${item.data.start_time.slice(0, 5)} – ${item.data.end_time.slice(0, 5)}`}</p>
                                )}
                              </div>
                              {isBreak && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn("h-7 px-2 text-xs shrink-0", isBreakCompleted ? "text-muted-foreground" : "text-emerald-400 hover:text-emerald-300")}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompletedBreakIds(prev => {
                                      const n = new Set(prev);
                                      if (n.has(item.data.id)) { n.delete(item.data.id); setExpandedBreakIds(p => { const x = new Set(p); x.delete(item.data.id); return x; }); }
                                      else n.add(item.data.id);
                                      return n;
                                    });
                                  }}
                                >
                                  {isBreakCompleted ? "Undo" : "✓ Done"}
                                </Button>
                              )}
                            </div>
                            );
                          })()
                           : (() => {
                            const apt = item.data as Appointment;
                            const localityWord = getLocalityWord(apt);
                            const isCompleted = apt.status === "completed";
                            const isGrouped = !!apt.group_id;
                            const groupMembers = isGrouped ? todayApts.filter(a => a.group_id === apt.group_id).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)) : [];
                            const isFirstInGroup = isGrouped && groupMembers[0]?.id === apt.id;
                            const hasConsent = !!(apt.consent_form_template_id || services.find(s => s.id === apt.service_id)?.consent_form_template_id);
                            const consentDone = consentCompletedIds.has(apt.id);
                            const consultDone = consultNoteCompletedIds.has(apt.id);
                            const dp = apt.price != null ? Number(apt.price) : null;
                            const tf = apt.travel_fee != null && Number(apt.travel_fee) > 0 ? Number(apt.travel_fee) : null;

                            // Skip non-first group members — they're rendered inside the first member's tile
                            if (isGrouped && !isFirstInGroup) return null;

                            // Hide fully-completed appointments from the inline timeline —
                            // they appear in the "Completed Appointments" dropdown above.
                            if (isCompleted && (!isGrouped || groupMembers.every(m => m.status === "completed"))) {
                              return null;
                            }

                            // GROUP TILE — consolidated view with per-person completion
                            if (isGrouped && groupMembers.length > 1) {
                              const allCompleted = groupMembers.every(m => m.status === "completed");
                              const someCompleted = groupMembers.some(m => m.status === "completed");
                              const groupTotal = groupMembers.reduce((sum, m) => sum + (m.price != null ? Number(m.price) : 0), 0);
                              const groupTravelFee = groupMembers.reduce((sum, m) => sum + (m.travel_fee != null && Number(m.travel_fee) > 0 ? Number(m.travel_fee) : 0), 0);
                              const firstTime = groupMembers[0].appointment_time.slice(0, 5);
                              const lastMember = groupMembers[groupMembers.length - 1];

                              return (
                                <div key={apt.id} className={cn(
                                  "rounded-2xl border overflow-hidden transition-colors border-l-4 border-l-secondary",
                                  allCompleted ? "border-muted bg-muted/20" : "border-orange-500/40 bg-slate-800/80"
                                )}>
                                  {/* Group header */}
                                  <div className="px-2.5 sm:px-3 py-2 sm:py-2.5 bg-secondary/10 border-b border-secondary/20">
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-secondary uppercase tracking-wide">
                                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Group · {groupMembers.length} people
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {groupTotal > 0 && (
                                          <span className="text-[10px] sm:text-xs font-bold text-secondary">
                                            £{(groupTotal + groupTravelFee).toFixed(0)}{groupTravelFee > 0 ? ` +£${groupTravelFee.toFixed(0)} travel` : ""}
                                          </span>
                                        )}
                                        <div className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold",
                                          allCompleted ? "bg-green-600/20 text-green-400" : someCompleted ? "bg-amber-600/20 text-amber-400" : "bg-blue-600/20 text-blue-400"
                                        )}>
                                          <CheckCircle className="h-2.5 w-2.5" />
                                          {groupMembers.filter(m => m.status === "completed").length}/{groupMembers.length}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-secondary/80">
                                        <Clock className="h-3 w-3" />
                                        {firstTime} – {getEndTime(lastMember)}
                                      </div>
                                      {localityWord && (
                                        <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-foreground">
                                          {localityWord}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Per-person rows */}
                                  <div className="divide-y divide-white/5">
                                    {groupMembers.map((member) => {
                                      const mCompleted = member.status === "completed";
                                      const mConsentDone = consentCompletedIds.has(member.id);
                                      const mConsultDone = consultNoteCompletedIds.has(member.id);
                                      const mHasConsent = !!(member.consent_form_template_id || services.find(s => s.id === member.service_id)?.consent_form_template_id);
                                      const mPrice = member.price != null ? Number(member.price) : null;

                                      return (
                                        <div key={member.id} className={cn(
                                          "px-2.5 sm:px-3 py-2 sm:py-2.5 transition-colors",
                                          mCompleted ? "bg-green-600/5" : "hover:bg-white/5"
                                        )}>
                                          <div className="flex items-center gap-2">
                                            {/* Color indicator */}
                                            <div className={cn("w-1 self-stretch rounded-full shrink-0",
                                              mCompleted ? "bg-green-500" : member.status === "confirmed" ? "bg-blue-500" : "bg-amber-500"
                                            )} />
                                            {/* Time */}
                                            <div className={cn("flex flex-col items-center justify-center rounded-lg px-1.5 py-0.5 min-w-[40px] sm:min-w-[48px]",
                                              mCompleted ? "bg-green-600/10" : "bg-blue-500/10"
                                            )}>
                                              <span className={cn("text-[10px] sm:text-xs font-bold", mCompleted ? "text-green-400" : "text-white")}>{member.appointment_time.slice(0, 5)}</span>
                                            </div>
                                            {/* Name + service */}
                                            <div className="flex-1 min-w-0">
                                              <p className={cn("text-xs sm:text-sm font-bold flex items-center gap-1", mCompleted ? "text-green-400 line-through" : "text-white")}>
                                                <button className="truncate underline decoration-dotted underline-offset-2 hover:text-secondary transition-colors text-left" onClick={(e) => { e.stopPropagation(); openInlinePatient(member.client_email); }}>
                                                  {member.client_name}
                                                </button>
                                                {getPatientAge(member.client_email) !== null && <span className="text-[10px] text-white/50 font-normal shrink-0">({getPatientAge(member.client_email)})</span>}
                                                {patientAlerts[member.client_email] && (
                                                  <span title={patientAlerts[member.client_email]!} className="inline-flex shrink-0"><AlertTriangle className="h-3.5 w-3.5 text-red-500" strokeWidth={3} /></span>
                                                )}
                                              </p>
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={cn("text-[9px] sm:text-[10px]", mCompleted ? "text-green-400/60 line-through" : "text-white/60")}>{getServiceWithAddons(member)}</span>
                                                {mPrice != null && mPrice > 0 && <span className="text-[9px] font-bold text-emerald-400">£{mPrice.toFixed(0)}</span>}
                                              </div>
                                            </div>
                                            {/* Status badges + complete button */}
                                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                              {mHasConsent && (
                                                <span className={cn("inline-flex items-center rounded px-1 py-0.5 text-[8px] sm:text-[9px] font-bold text-white",
                                                  mConsentDone ? "bg-green-600" : "bg-red-600"
                                                )}>
                                                  {mConsentDone ? "C✓" : "C✗"}
                                                </span>
                                              )}
                                              {mConsultDone && (
                                                <span className="inline-flex items-center rounded px-1 py-0.5 text-[8px] sm:text-[9px] font-bold text-white bg-green-600">
                                                  N✓
                                                </span>
                                              )}
                                              <Button variant="outline" size="sm" className={cn("min-w-0 p-0 h-7 w-7 sm:h-8 sm:w-8 shrink-0",
                                                mCompleted ? "bg-green-600 text-white border-green-600 hover:bg-green-700" : "border-white/20 text-white/70 hover:bg-white/10"
                                              )} onClick={() => promptStatusChange(member, mCompleted ? "confirmed" : "completed")}>
                                                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Group action bar */}
                                  <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 border-t border-white/10 bg-white/[0.03]" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-white/60 hover:text-white hover:bg-white/10 shrink-0">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-52">
                                        <DropdownMenuItem onClick={() => openDetailView(apt)}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openEditAppointment(apt)}><Pencil className="h-4 w-4 mr-2" /> Edit Group</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openReschedule(apt)}><CalendarClock className="h-4 w-4 mr-2" /> Reschedule</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {!allCompleted && (
                                          <DropdownMenuItem onClick={async () => {
                                            for (const m of groupMembers.filter(m => m.status !== "completed")) {
                                              await supabase.from("appointments").update({ status: "completed" }).eq("id", m.id);
                                              logPatientActivity(m.client_email, "status_change", `Appointment status changed to completed: ${getServiceName(m.service_id)} on ${m.appointment_date}`);
                                            }
                                            toast.success("All group members completed");
                                            fetchAppointments();
                                          }}>
                                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Complete All
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => openPaymentForApt(apt)}>
                                          <PoundSterling className="h-4 w-4 mr-2 text-emerald-500" /> Record Payment
                                        </DropdownMenuItem>
                                        {!onMyWaySentIds.has(apt.id) && !apt.come_to_practitioner && (
                                          <DropdownMenuItem onClick={() => setOnMyWayConfirmApt(apt)}>
                                            <Car className="h-4 w-4 mr-2 text-blue-500" /> On My Way
                                          </DropdownMenuItem>
                                        )}
                                        {apt.come_to_practitioner && !clinicReadySentIds.has(apt.id) && (
                                          <DropdownMenuItem onClick={() => setClinicReadyConfirmApt(apt)}>
                                            <Home className="h-4 w-4 mr-2 text-emerald-500" /> I'm Ready (notify patient)
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    {/* Quick consultation buttons for each member */}
                                    <div className="flex-1 flex items-center gap-1 overflow-x-auto">
                                      {groupMembers.map((member) => {
                                        const mConsultDone = consultNoteCompletedIds.has(member.id);
                                        return (
                                          <Button key={member.id} variant="outline" size="sm" className={cn("text-[10px] sm:text-xs h-7 sm:h-8 px-2 min-w-0 shrink-0",
                                            mConsultDone && "border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                                          )} onClick={() => {
                                            const svcName = getServiceName(member.service_id).toLowerCase();
                                            const consultTemplate = templates.find(t => t.form_type === 'consultation' && t.title.toLowerCase().includes(svcName.split(' ')[0]));
                                            setConsultAptId(member.id); setConsultTemplateId(consultTemplate?.id || null); setConsultFormType('consultation'); setConsultFormOpen(true);
                                          }}>
                                            {mConsultDone ? <CheckCircle className="h-3 w-3 mr-0.5" /> : <Stethoscope className="h-3 w-3 mr-0.5" />}
                                            <span className="truncate">{member.client_name.split(' ')[0]}</span>
                                          </Button>
                                        );
                                      })}
                                    </div>
                                    <Button variant="outline" size="sm" className="text-xs h-7 sm:h-8 px-2 shrink-0" onClick={() => openDetailView(apt)}>
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>

                                  {/* Address row */}
                                  {apt.address && (
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.address + (apt.postcode && !apt.address.toUpperCase().includes(apt.postcode.toUpperCase()) ? ", " + apt.postcode : ""))}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block px-2.5 sm:px-3 py-1.5 border-t border-white/5 hover:bg-white/5 transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <p className="text-[10px] sm:text-xs text-white/70 flex items-center gap-1">
                                        <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                                        <span className="truncate underline underline-offset-2">{apt.address}</span>
                                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50" />
                                      </p>
                                    </a>
                                  )}
                                </div>
                              );
                            }

                            // SINGLE TILE — regular non-group appointment (unchanged)
                            return (
                              <div
                                key={apt.id}
                                className={cn(
                                  "rounded-2xl border overflow-hidden transition-colors",
                                  isCompleted ? "border-muted bg-muted/20 cursor-pointer" : "border-orange-500/40 bg-slate-800/80",
                                )}
                              >
                                {/* Main tile body */}
                                <div className={cn(isCompleted && !expandedCompletedIds.has(apt.id) ? "px-2 py-1 sm:px-2.5 sm:py-1.5 space-y-0" : "p-2.5 sm:p-4 space-y-1.5 sm:space-y-2.5")} onClick={() => isCompleted ? setExpandedCompletedIds(prev => { const next = new Set(prev); if (next.has(apt.id)) next.delete(apt.id); else next.add(apt.id); return next; }) : openDetailView(apt)}>
                                  {/* Row 1: Time block + Name + Complete button (always visible) */}
                                  <div className={cn("flex items-center", isCompleted && !expandedCompletedIds.has(apt.id) ? "gap-1.5 sm:gap-2" : "gap-2 sm:gap-3")}>
                                    <div className={cn("flex flex-col items-center justify-center rounded-lg sm:rounded-xl leading-tight",
                                      isCompleted && !expandedCompletedIds.has(apt.id) ? "px-1.5 py-0.5 sm:px-2 sm:py-1 min-w-[44px] sm:min-w-[52px] rounded-md" : "px-2 py-1 sm:px-3 sm:py-2 min-w-[52px] sm:min-w-[68px]",
                                      isCompleted ? "bg-muted" : "bg-blue-500/20 border border-blue-500/30"
                                    )}>
                                      <span className={cn("font-bold", isCompleted && !expandedCompletedIds.has(apt.id) ? "text-[10px] sm:text-xs text-muted-foreground" : "text-xs sm:text-sm", isCompleted ? "text-muted-foreground" : "text-white")}>{apt.appointment_time.slice(0, 5)}</span>
                                      {(expandedCompletedIds.has(apt.id) || !isCompleted) && <span className={cn("text-[10px]", isCompleted ? "text-muted-foreground/70" : "text-white/70")}>–{getEndTime(apt)}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      {localityWord && !isCompleted && (
                                        <span className="mb-1 inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                                          {localityWord}
                                        </span>
                                      )}
                                      <p className={cn("font-bold text-white flex items-center gap-1 sm:gap-1.5", isCompleted && !expandedCompletedIds.has(apt.id) ? "text-[10px] sm:text-[11px] line-through text-muted-foreground" : "text-xs sm:text-sm", isCompleted && expandedCompletedIds.has(apt.id) && "line-through text-muted-foreground")}>
                                        <button className="truncate underline decoration-dotted underline-offset-2 hover:text-secondary transition-colors text-left" onClick={(e) => { e.stopPropagation(); openInlinePatient(apt.client_email); }}>{apt.client_name}</button>
                                        {!isCompleted && getPatientAge(apt.client_email) !== null && <span className="text-[10px] sm:text-xs text-white/60 font-normal shrink-0">({getPatientAge(apt.client_email)})</span>}
                                        {!isCompleted && apt.media_consent && (
                                          <span title="Patient consented to photos/video for social media — share for approval before posting" className="inline-flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-secondary text-secondary-foreground ring-2 ring-secondary/40 shadow-md shrink-0 animate-pulse"><Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} /></span>
                                        )}
                                        {!isCompleted && patientAlerts[apt.client_email] && (
                                          <span title={patientAlerts[apt.client_email]!} className="inline-flex shrink-0"><AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" strokeWidth={3} /></span>
                                        )}
                                      </p>
                                      {(expandedCompletedIds.has(apt.id) || !isCompleted) && <p className={cn("text-[10px] sm:text-xs truncate", isCompleted ? "line-through text-muted-foreground" : "text-white/70")}>{getServiceWithAddons(apt)}</p>}
                                    </div>
                                    {/* Timer + Complete buttons */}
                                    <div className="flex items-center gap-1 sm:gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      {onMyWaySentIds.has(apt.id) && !isCompleted && (
                                        (() => {
                                          const arrIso = onMyWayEtaArrivals[apt.id];
                                          if (arrIso) {
                                            const rm = new Date(arrIso).getTime() - Date.now();
                                            const mins = Math.max(0, Math.floor(rm / 60000));
                                            const secs = Math.max(0, Math.floor((rm % 60000) / 1000));
                                            const cd = rm <= 0 ? "Due" : `${mins}:${String(secs).padStart(2, "0")}`;
                                            return <span className={cn("text-[10px] font-mono font-bold tabular-nums shrink-0", rm <= 0 ? "text-destructive" : mins <= 2 ? "text-amber-400" : "text-blue-400")} title="Live ETA countdown">🚗 {cd}</span>;
                                          }
                                          return <span className="text-[10px] text-blue-400 font-medium shrink-0" title="On my way sent">🚗 {onMyWayEtas[apt.id] || "✓"}</span>;
                                        })()
                                      )}
                                      {arrivedAptIds.has(apt.id) && !isCompleted && (
                                        <span className="text-[10px] text-emerald-400 font-medium shrink-0" title="Arrived">📍 Arrived</span>
                                      )}
                                      {timedAptIds.has(apt.id) && !isCompleted && (
                                        <span className="text-[10px] text-emerald-400 font-medium px-1">⏱✓</span>
                                      )}
                                      <Button variant="outline" size="sm" className={cn("min-w-0 p-0 shrink-0", isCompleted && !expandedCompletedIds.has(apt.id) ? "h-6 w-6 sm:h-7 sm:w-7" : "h-8 w-8 sm:h-10 sm:w-10", apt.status === "completed" ? "bg-green-600 text-white border-green-600 hover:bg-green-700" : "")} onClick={() => {
                                        promptStatusChange(apt, apt.status === "completed" ? "confirmed" : "completed");
                                      }}>
                                        <CheckCircle className={cn(isCompleted && !expandedCompletedIds.has(apt.id) ? "h-3 w-3 sm:h-3.5 sm:w-3.5" : "h-4 w-4 sm:h-5 sm:w-5")} />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Expanded content - hidden when completed (unless expanded) */}
                                  {(!isCompleted || expandedCompletedIds.has(apt.id)) && (
                                    <>
                                      {/* Row 2: Status pills */}
                                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <span className={cn("inline-flex items-center rounded-md sm:rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white cursor-pointer hover:opacity-80 transition-opacity",
                                              apt.status === "confirmed" ? "bg-green-600" :
                                              apt.status === "pending" ? "bg-amber-600" :
                                              apt.status === "completed" ? "bg-blue-600" :
                                              "bg-slate-600"
                                            )}>
                                              {apt.status}
                                            </span>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-44 p-1" align="start">
                                            <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Change Status</p>
                                            {["confirmed", "pending", "completed"].filter(s => s !== apt.status).map(newStatus => (
                                              <Button key={newStatus} variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => promptStatusChange(apt, newStatus)}>
                                                {newStatus === "completed" ? <CheckCircle className="h-3.5 w-3.5 mr-2" /> : newStatus === "confirmed" ? <CalendarCheck className="h-3.5 w-3.5 mr-2" /> : <Clock className="h-3.5 w-3.5 mr-2" />}
                                                {newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}
                                              </Button>
                                            ))}
                                          </PopoverContent>
                                        </Popover>
                                        {hasConsent && (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <span className={cn("inline-flex items-center rounded-md sm:rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white cursor-pointer hover:opacity-80 transition-opacity",
                                                consentDone ? "bg-green-600" : isNoEmail(apt.client_email) ? "bg-cyan-600" : "bg-red-600"
                                              )}>
                                                {consentDone ? "Consent ✓" : isNoEmail(apt.client_email) ? "Consent at Apt" : "Consent ✗"}
                                              </span>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-52 p-2" align="start">
                                              {consentDone ? (
                                                <p className="text-xs text-muted-foreground">✅ Consent form has been completed.</p>
                                              ) : isNoEmail(apt.client_email) ? (
                                                <div className="space-y-2">
                                                  <p className="text-xs text-muted-foreground">📋 Patient has no email — consent form will be completed in person at the appointment.</p>
                                                  <Button size="sm" className="w-full text-xs h-8" onClick={async () => {
                                                    const templateId = apt.consent_form_template_id || services.find(s => s.id === apt.service_id)?.consent_form_template_id;
                                                    if (!templateId) return;
                                                    const { error } = await supabase.from("consent_form_responses").insert({
                                                      appointment_id: apt.id,
                                                      consent_form_template_id: templateId,
                                                      responses: { _manual: true, note: "Consent completed in person at appointment" },
                                                      status: "completed",
                                                      submitter_name: apt.client_name,
                                                    });
                                                    if (error) { toast.error("Failed"); return; }
                                                    toast.success("Consent marked complete");
                                                    logPatientActivity(apt.client_email, "consent_manual", `Consent completed in person for ${getServiceName(apt.service_id)}`);
                                                    setConsentCompletedIds(prev => new Set([...prev, apt.id]));
                                                    fetchAppointments();
                                                  }}>
                                                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Consent Complete
                                                  </Button>
                                                </div>
                                              ) : (
                                                <div className="space-y-2">
                                                  <p className="text-xs text-muted-foreground">⚠️ Consent not yet completed. Daily reminder emails are being sent.</p>
                                                  <Button size="sm" className="w-full text-xs h-8" onClick={async () => {
                                                    const templateId = apt.consent_form_template_id || services.find(s => s.id === apt.service_id)?.consent_form_template_id;
                                                    if (!templateId) return;
                                                    const { error } = await supabase.from("consent_form_responses").insert({
                                                      appointment_id: apt.id,
                                                      consent_form_template_id: templateId,
                                                      responses: { _manual: true, note: "Manually marked complete by practitioner" },
                                                      status: "completed",
                                                      submitter_name: apt.client_name,
                                                    });
                                                    if (error) { toast.error("Failed"); return; }
                                                    await supabase.from("scheduled_communications")
                                                      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                                                      .eq("appointment_id", apt.id)
                                                      .eq("trigger_type", "consent_reminder")
                                                      .eq("status", "pending");
                                                    toast.success("Consent marked complete — emails stopped");
                                                    logPatientActivity(apt.client_email, "consent_manual", `Consent manually marked complete for ${getServiceName(apt.service_id)}`);
                                                    setConsentCompletedIds(prev => new Set([...prev, apt.id]));
                                                    fetchAppointments();
                                                  }}>
                                                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Consent Complete
                                                  </Button>
                                                </div>
                                              )}
                                            </PopoverContent>
                                          </Popover>
                                        )}
                                        {(() => {
                                          const dictGranted = apt.dictation_consent !== false;
                                          return (
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <span className={cn(
                                                  "inline-flex items-center gap-1 rounded-md sm:rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white cursor-pointer hover:opacity-80 transition-opacity",
                                                  dictGranted ? "bg-purple-600" : "bg-red-600"
                                                )}>
                                                  {dictGranted ? <Mic className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <MicOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                                                  {dictGranted ? "Dictation ✓" : "No Dictation"}
                                                </span>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-60 p-2 space-y-2" align="start">
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
                                                    fetchAppointments();
                                                  }}
                                                >
                                                  {dictGranted ? <><MicOff className="h-3.5 w-3.5 mr-1" /> Mark as Not Granted</> : <><Mic className="h-3.5 w-3.5 mr-1" /> Restore Consent</>}
                                                </Button>
                                              </PopoverContent>
                                            </Popover>
                                          );
                                        })()}
                                        {dp != null && (
                                          <span className="inline-flex items-center rounded-md sm:rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white bg-emerald-600">
                                            £{dp % 1 === 0 ? dp.toFixed(0) : dp.toFixed(2)}{tf ? ` +£${tf % 1 === 0 ? tf.toFixed(0) : tf.toFixed(2)}` : ""}
                                          </span>
                                        )}
                                        {(apt as any).ready_from_time && (
                                          <span className="inline-flex items-center rounded-md sm:rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white bg-cyan-600 gap-1">
                                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Ready from {(apt as any).ready_from_time.slice(0, 5)}
                                          </span>
                                        )}
                                        {apt.access_token && !isCompleted && (
                                          <span className={`inline-flex items-center rounded-md sm:rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white gap-1 cursor-pointer transition-colors ${(apt as any).tracking_opened_at ? "bg-emerald-600 hover:bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500"}`} onClick={(e) => { e.stopPropagation(); setTrackerPreviewToken(apt.access_token!); }}>
                                            <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Patient View
                                          </span>
                                        )}
                                        {recallEmails.has(apt.client_email?.toLowerCase()) && !isCompleted && (
                                          <span className="inline-flex items-center rounded-md sm:rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white bg-violet-600 gap-1 animate-pulse" title="Patient was on recall list — ask about rebooking">
                                            <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Recall
                                          </span>
                                        )}
                                      </div>

                                      {/* Row 3: Address */}
                                      {apt.address && (
                                        <a
                                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.address + (apt.postcode && !apt.address.toUpperCase().includes(apt.postcode.toUpperCase()) ? ", " + apt.postcode : ""))}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block rounded-md sm:rounded-lg bg-white/10 px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-white/15 transition-colors"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <p className="text-xs sm:text-sm text-white flex items-center gap-1 sm:gap-1.5">
                                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 opacity-70" />
                                            <span className="truncate underline underline-offset-2">{apt.address}</span>
                                            <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 opacity-50" />
                                          </p>
                                        </a>
                                      )}

                                      {/* Row 4: AI summary */}
                                      <div className={cn("rounded-md sm:rounded-lg bg-amber-500/15 px-2 sm:px-3 py-1.5 sm:py-2.5", apt.ai_consent_summary && "cursor-pointer hover:bg-amber-500/25 transition-colors")} onClick={(e) => { if (apt.ai_consent_summary) { e.stopPropagation(); setAiSummaryDialogData({ name: apt.client_name, summary: apt.ai_consent_summary }); setAiSummaryDialogOpen(true); } }}>
                                        <p className="text-xs sm:text-sm text-amber-200 leading-relaxed flex items-center gap-1 sm:gap-1.5">
                                          {getAiKeywords(apt.ai_consent_summary)
                                            ? <>💡 {getAiKeywords(apt.ai_consent_summary)} {apt.ai_consent_summary && <Eye className="h-3.5 w-3.5 shrink-0 opacity-60" />}</>
                                            : consentDone
                                              ? <>💡 Consent completed — no AI summary</>
                                              : <>⚠️ No consent form completed</>
                                          }
                                        </p>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Action bar - show when not completed, or when completed and expanded */}
                                {(!isCompleted || expandedCompletedIds.has(apt.id)) && (
                                  <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-3 border-t border-white/10 bg-white/[0.03]" onClick={(e) => e.stopPropagation()}>
                                    {/* Options menu */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 text-white/60 hover:text-white hover:bg-white/10 shrink-0">
                                          <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-52">
                                        <DropdownMenuItem onClick={() => openDetailView(apt)}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openEditAppointment(apt)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => {
                                          const svcName = getServiceName(apt.service_id).toLowerCase();
                                          const consultTemplate = templates.find(t => t.form_type === 'consultation' && t.title.toLowerCase().includes(svcName.split(' ')[0]));
                                          setConsultAptId(apt.id); setConsultTemplateId(consultTemplate?.id || null); setConsultFormType('consultation'); setConsultFormOpen(true);
                                        }}><Stethoscope className="h-4 w-4 mr-2" /> Consultation Form</DropdownMenuItem>
                                        <DropdownMenuItem onClick={async () => {
                                          const { data: patient } = await supabase.from('patients').select('id, client_name, client_email, client_phone, date_of_birth').eq('client_email', apt.client_email).maybeSingle();
                                          if (patient) {
                                            const svcName = getServiceName(apt.service_id).toLowerCase();
                                            setHearingTabPatient(patient);
                                            setActiveTab('services');
                                          } else { toast.error('Patient record not found'); }
                                        }}><Ear className="h-4 w-4 mr-2" /> Hearing Screening</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openInlinePatient(apt.client_email)}><FileText className="h-4 w-4 mr-2" /> Patient Record</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openPaymentForApt(apt)}>
                                          <PoundSterling className="h-4 w-4 mr-2 text-emerald-500" /> Record Payment
                                        </DropdownMenuItem>
                                        {apt.status !== "completed" && !onMyWaySentIds.has(apt.id) && !apt.come_to_practitioner && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem disabled={onMyWaySending === apt.id} onClick={() => setOnMyWayConfirmApt(apt)}>
                                              {onMyWaySending === apt.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Car className="h-4 w-4 mr-2 text-blue-500" />} On My Way (notify patient)
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        {apt.status !== "completed" && apt.come_to_practitioner && !clinicReadySentIds.has(apt.id) && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem disabled={clinicReadySending === apt.id} onClick={() => setClinicReadyConfirmApt(apt)}>
                                              {clinicReadySending === apt.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Home className="h-4 w-4 mr-2 text-emerald-500" />} I'm Ready (notify patient)
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        {apt.come_to_practitioner && clinicReadySentIds.has(apt.id) && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem disabled>
                                              <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> "Ready" sent ✓
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        {onMyWaySentIds.has(apt.id) && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem disabled={delaySending === apt.id} onClick={() => setDelayConfirmApt(apt)}>
                                              {delaySending === apt.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />} Send Delay Update (refresh ETA)
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        <DropdownMenuSeparator />
                                        {apt.status !== "completed" ? (
                                          <DropdownMenuItem onClick={() => promptStatusChange(apt, "completed")}>
                                            <CheckCircle className="h-4 w-4 mr-2" /> Mark Appointment Complete
                                          </DropdownMenuItem>
                                        ) : (
                                          <DropdownMenuItem onClick={() => promptStatusChange(apt, "confirmed")}>
                                            <RefreshCw className="h-4 w-4 mr-2" /> Uncomplete Appointment
                                          </DropdownMenuItem>
                                        )}
                                        {apt.consent_form_template_id && !consentCompletedIds.has(apt.id) && (
                                          <DropdownMenuItem onClick={async () => {
                                            const { error } = await supabase.from("consent_form_responses").insert({
                                              appointment_id: apt.id,
                                              consent_form_template_id: apt.consent_form_template_id!,
                                              responses: { _manual: true, note: "Manually marked complete by practitioner" },
                                              status: "completed",
                                              submitter_name: apt.client_name,
                                            });
                                            if (error) { toast.error("Failed to mark consent complete"); return; }
                                            await supabase.from("scheduled_communications")
                                              .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                                              .eq("appointment_id", apt.id)
                                              .eq("trigger_type", "consent_reminder")
                                              .eq("status", "pending");
                                            toast.success("Consent marked as complete — reminder emails stopped");
                                            logPatientActivity(apt.client_email, "consent_manual", `Consent manually marked complete for ${getServiceName(apt.service_id)}`);
                                            setConsentCompletedIds(prev => new Set([...prev, apt.id]));
                                            fetchAppointments();
                                          }}>
                                            <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> Mark Consent Complete
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => sendManualReviewRequest(apt)}>
                                          <Star className="h-4 w-4 mr-2 text-amber-500" /> Send Review Request
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => resendMorningTracking(apt)}>
                                          <RotateCw className="h-4 w-4 mr-2 text-blue-500" /> Resend Morning Tracking
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={async () => { await supabase.from("appointments").delete().eq("id", apt.id); toast.success("Deleted"); fetchAppointments(); }}>
                                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button variant="outline" size="sm" className={cn("text-sm h-9 px-3 flex-1 min-w-0 overflow-hidden", consultDone && "border-green-500 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800")} onClick={() => {
                                      const svcName = getServiceName(apt.service_id).toLowerCase();
                                      const consultTemplate = templates.find(t => t.form_type === 'consultation' && t.title.toLowerCase().includes(svcName.split(' ')[0]));
                                      setConsultAptId(apt.id); setConsultTemplateId(consultTemplate?.id || null); setConsultFormType('consultation'); setConsultFormOpen(true);
                                    }}>
                                      {consultDone ? <><CheckCircle className="h-4 w-4 shrink-0" /><span className="truncate">Consultation</span></> :
                                       consentDone ? <><Stethoscope className="h-4 w-4 shrink-0" /><span className="truncate">Load</span></> :
                                       <><Stethoscope className="h-4 w-4 shrink-0" /><span className="truncate">Start</span></>}
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-sm h-9 px-3 flex-1 min-w-0 overflow-hidden" onClick={() => openDetailView(apt)}>
                                      <Eye className="h-4 w-4 shrink-0" /><span className="truncate">Details</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })());
                        })()}
                      </div>
                    )}
                    {/* Available Slots Summary removed from Today view - kept in Calendar day view only */}
                  </CardContent>
                  </CollapsibleContent>
                </Card>
                </Collapsible>
              );
            })()}

            {/* Calendar & Schedule */}
            {(() => {
              const calToday = new Date();
              const calTodayStr = format(calToday, "yyyy-MM-dd");

              // Full month view
              const calMonth = selectedDate || calToday;
              const monthStart = startOfMonth(calMonth);
              const monthEnd = endOfMonth(calMonth);
              const calWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
              const calWeekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
              const allDaysInMonth = eachDayOfInterval({ start: calWeekStart, end: calWeekEnd });
              const currentMonth = getMonth(calMonth);

              // Index data by date
              const aptsByDate: Record<string, Appointment[]> = {};
              for (const apt of allAppointments.filter(a => a.status !== "cancelled" && a.status !== "rejected")) {
                if (!aptsByDate[apt.appointment_date]) aptsByDate[apt.appointment_date] = [];
                aptsByDate[apt.appointment_date].push(apt);
              }

              // Calculate income per date
              const incomeByDate: Record<string, number> = {};
              for (const [dateStr, apts] of Object.entries(aptsByDate)) {
                incomeByDate[dateStr] = apts.reduce((sum, apt) => sum + (apt.price != null ? Number(apt.price) : 0) + (apt.travel_fee != null ? Number(apt.travel_fee) : 0), 0);
              }

              // Calculate month total income
              const monthTotalIncome = allDaysInMonth
                .filter(day => getMonth(day) === currentMonth)
                .reduce((sum, day) => sum + (incomeByDate[format(day, "yyyy-MM-dd")] || 0), 0);

              const openDatesSet = new Set(availableDates.filter(d => d.is_available).map(d => d.available_date));
              const blocksByDateCal: Record<string, BlockedTime[]> = {};
              for (const bt of blockedTimes) {
                if (!blocksByDateCal[bt.blocked_date]) blocksByDateCal[bt.blocked_date] = [];
                blocksByDateCal[bt.blocked_date].push(bt);
              }

              // Selected date for detail view
              const selDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
              const selDayApts = selDateStr ? (aptsByDate[selDateStr] || []).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)) : [];
              const selDayCancelledApts = selDateStr ? allAppointments.filter(a => a.appointment_date === selDateStr && a.status === "cancelled").sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)) : [];
              const selDayBlocks = selDateStr ? (blocksByDateCal[selDateStr] || []).sort((a, b) => a.start_time.localeCompare(b.start_time)) : [];
              const selDayOpen = selDateStr ? availableDates.find(d => d.available_date === selDateStr) : null;

              return (
                <div className="space-y-4">
                  {/* Calendar Title */}
                  <h2 className="font-serif text-2xl font-bold text-center tracking-tight text-foreground">My Schedule</h2>

                  {/* Calendar subscribe moved to day action bar */}

                  <div className="flex flex-col gap-4 lg:flex-row">
                    {/* Left: 4-Week Overview */}
                    <div className="lg:w-[420px] space-y-4">
                      <Card>
                        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(addMonths(selectedDate || new Date(), -1))}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <CardTitle className="text-xl font-serif font-bold">
                            {format(monthStart, "MMMM yyyy")}
                          </CardTitle>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(addMonths(selectedDate || new Date(), 1))}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                          <div className="grid grid-cols-7 gap-1 text-center mb-1">
                            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => (
                              <span key={i} className="text-[10px] text-muted-foreground font-medium">{d}</span>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {allDaysInMonth.map(day => {
                              const ds = format(day, "yyyy-MM-dd");
                              const aptCount = aptsByDate[ds]?.length || 0;
                              const isOpen = openDatesSet.has(ds);
                              const dayBlocks = blocksByDateCal[ds] || [];
                              const hasBlocks = dayBlocks.length > 0;
                              const hasBreaks = dayBlocks.some(bt => bt.reason?.includes("Lunch") || bt.reason?.includes("Mobile"));
                                 const hasCastleView = dayBlocks.some(bt => bt.reason === "Castle View");
                                 const hasSickDay = dayBlocks.some(bt => bt.reason === "Sick Day" || !!bt.reason?.startsWith("Sick Day"));
                                const hasAnnualLeave = dayBlocks.some(bt => bt.reason === "Annual Leave");
                                const hasOnCall = dayBlocks.some(bt => bt.reason === "On Call");
                              const hasRealBlocks = dayBlocks.some(bt => !bt.reason?.includes("Lunch") && !bt.reason?.includes("Mobile") && bt.reason !== "Castle View" && bt.reason !== "Sick Day" && !bt.reason?.startsWith("Sick Day") && bt.reason !== "Annual Leave" && bt.reason !== "On Call");
                              const isClosed = !isOpen;
                              const isSelected = selectedDate && isSameDay(day, selectedDate);
                              const isPast = isBefore(day, startOfDay(calToday));
                              const isOutsideMonth = getMonth(day) !== currentMonth;
                              const dayIncome = incomeByDate[ds] || 0;
                              const hasBookings = aptCount > 0;
                              return (
                                <button
                                  key={ds}
                                  onClick={() => setSelectedDate(day)}
                                  className={cn(
                                    "h-16 w-full rounded-md text-xs font-medium transition-colors relative flex flex-col items-center justify-center gap-0",
                                    isPast && "opacity-40",
                                    isOutsideMonth && "opacity-30",
                                    isToday(day) && "ring-2 ring-primary",
                                    isSelected && "ring-2 ring-white",
                                    // Open = vibrant green
                                    isOpen && !hasSickDay && !hasAnnualLeave && !hasCastleView && "bg-emerald-500/25 text-emerald-100 border-2 border-emerald-400/60",
                                    // Sick day = orange tint
                                    hasSickDay && "bg-orange-500/20 text-orange-100 border-2 border-orange-400/50",
                                    // Annual leave = bright yellow/gold
                                    hasAnnualLeave && !hasSickDay && "bg-yellow-500/30 text-yellow-100 border-2 border-yellow-400/60",
                                    // On call = teal
                                    hasOnCall && !hasSickDay && !hasAnnualLeave && !hasCastleView && isClosed && "bg-teal-500/20 text-teal-100 border-2 border-teal-400/50",
                                    // Castle View = vivid indigo/violet
                                    hasCastleView && !hasSickDay && !hasAnnualLeave && isClosed && "bg-indigo-500/25 text-indigo-100 border-2 border-indigo-400/50",
                                    // Closed (no special blocks) = rose/red
                                    isClosed && !hasCastleView && !hasSickDay && !hasAnnualLeave && !hasOnCall && "bg-rose-500/20 text-rose-200 border-2 border-rose-400/40",
                                    "hover:opacity-80",
                                  )}
                                   title={`${format(day, "MMM d")}${isOpen ? " · Open" : " · Closed"}${hasCastleView ? " · Castle View" : ""}${hasSickDay ? " · Sick Day" : ""}${hasAnnualLeave ? " · Annual Leave" : ""}${hasOnCall ? " · On Call" : ""}${aptCount > 0 ? ` · ${aptCount} booking${aptCount > 1 ? "s" : ""}` : ""}${dayIncome > 0 ? ` · £${dayIncome.toFixed(0)}` : ""}`}
                                >
                                  <span className="text-[11px] font-semibold leading-tight">{format(day, "d")}</span>
                                  <div className="flex gap-0.5 items-center">
                                    {hasSickDay && <span className="text-[8px]">🤒</span>}
                                    {hasOnCall && !hasSickDay && <span className="text-[8px]">📞</span>}
                                    {aptCount > 0 && <span className="text-[7px] font-bold text-foreground">{aptCount}</span>}
                                  </div>
                                  {!isOutsideMonth && hasBookings && (
                                    <span className="text-[8px] font-bold text-foreground leading-none">£{dayIncome.toFixed(0)}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Month total income */}
                          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <PoundSterling className="h-4 w-4 text-foreground" />
                              <span className="text-sm font-semibold text-foreground">{format(monthStart, "MMMM")} Expected Income</span>
                            </div>
                            <span className="text-lg font-bold text-foreground">£{monthTotalIncome.toFixed(2)}</span>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex flex-wrap gap-3">
                              <div className="flex items-center gap-1.5 text-[10px]"><div className="h-2.5 w-2.5 rounded-sm bg-emerald-500/25 border-2 border-emerald-400/60" /><span>Open</span></div>
                              <div className="flex items-center gap-1.5 text-[10px]"><div className="h-2.5 w-2.5 rounded-sm bg-rose-500/20 border-2 border-rose-400/40" /><span>Closed</span></div>
                              <div className="flex items-center gap-1.5 text-[10px]"><div className="h-2.5 w-2.5 rounded-sm bg-yellow-500/30 border-2 border-yellow-400/60" /><span>Leave</span></div>
                              <div className="flex items-center gap-1.5 text-[10px]"><div className="h-2.5 w-2.5 rounded-sm bg-indigo-500/25 border-2 border-indigo-400/50" /><span>Castle View</span></div>
                              <div className="flex items-center gap-1.5 text-[10px]"><span className="text-[8px]">🤒</span><span>Sick</span></div>
                              <div className="flex items-center gap-1.5 text-[10px]"><span className="text-[8px]">📞</span><span>On Call</span></div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => setSelectedDate(undefined)}>Today</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Right: Day detail / appointment list */}
                    <div className="flex-1 space-y-4">
                      <h3 className="font-serif text-xl font-bold text-center tracking-tight text-foreground">Selected Day Schedule</h3>
                      {selDateStr ? (
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="space-y-2">
                              <CardTitle className="font-serif text-base">
                                {format(selectedDate!, "EEEE, MMMM d, yyyy")}
                              </CardTitle>
                              {/* Status summary badges */}
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                {selDayOpen ? (
                                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 gap-1">
                                    <CalendarCheck className="h-3 w-3" />
                                    Open {selDayOpen.start_hour != null ? `${fmtHourMin(selDayOpen.start_hour)}–${fmtHourMin(selDayOpen.end_hour ?? 17)}` : ""}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive gap-1">
                                    <Ban className="h-3 w-3" />Closed
                                  </Badge>
                                )}
                                {selDayApts.length > 0 && (
                                  <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground gap-1">
                                    {selDayApts.length} appt{selDayApts.length > 1 ? "s" : ""}
                                  </Badge>
                                )}
                                {selDayBlocks.some(bt => bt.reason === "Castle View") && (
                                  <Badge variant="outline" className="border-violet-500/40 bg-violet-500/10 text-violet-400 gap-1">
                                    <Building2 className="h-3 w-3" />Castle View
                                  </Badge>
                                )}
                                {selDayBlocks.some(bt => bt.reason === "Sick Day" || bt.reason?.startsWith("Sick Day")) && (
                                  (() => {
                                    const sb = selDayBlocks.find(bt => bt.reason === "Sick Day" || bt.reason?.startsWith("Sick Day"));
                                    const note = sb?.reason?.startsWith("Sick Day:") ? sb.reason.slice("Sick Day:".length).trim() : "";
                                    return <Badge variant="outline" className="border-orange-500/40 bg-orange-500/10 text-orange-400 gap-1" title={note || undefined}>🤒 Sick{note ? ` · ${note}` : ""}</Badge>;
                                  })()
                                )}
                                {selDayBlocks.some(bt => bt.reason === "Annual Leave") && (
                                  <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-400 gap-1">🌴 Leave</Badge>
                                )}
                                {selDayBlocks.some(bt => bt.reason === "On Call") && (
                                  <Badge variant="outline" className="border-teal-500/40 bg-teal-500/10 text-teal-400 gap-1">📞 On Call</Badge>
                                )}
                                {selDayBlocks.filter(bt => !["Castle View","Sick Day","Annual Leave","On Call"].includes(bt.reason || "") && !bt.reason?.startsWith("Sick Day")).length > 0 && (
                                  <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive gap-1">
                                    <Ban className="h-3 w-3" />{selDayBlocks.filter(bt => !["Castle View","Sick Day","Annual Leave","On Call"].includes(bt.reason || "") && !bt.reason?.startsWith("Sick Day")).length} block{selDayBlocks.filter(bt => !["Castle View","Sick Day","Annual Leave","On Call"].includes(bt.reason || "") && !bt.reason?.startsWith("Sick Day")).length > 1 ? "s" : ""}
                                  </Badge>
                                )}
                              </div>
                              {/* Edit Day dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 gap-1 text-muted-foreground hover:text-foreground">
                                    <span className="flex items-center gap-1"><Settings className="h-3 w-3" /> Edit Day</span>
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="bg-popover w-56">
                                  <DropdownMenuItem onClick={() => {
                                    if (selDayOpen) { toggleAvailableDate(selectedDate!); } else {
                                      setMarkOpenStartHour(settings?.start_hour ?? 9);
                                      setMarkOpenEndHour(settings?.end_hour ?? 17);
                                      setMarkOpenDialogOpen(true);
                                    }
                                  }}>
                                    {selDayOpen ? <XCircle className="h-4 w-4 mr-2 text-destructive" /> : <CalendarCheck className="h-4 w-4 mr-2 text-emerald-500" />}
                                    {selDayOpen ? "Mark as Closed" : "Mark as Open"}
                                  </DropdownMenuItem>
                                  {selDayOpen && (
                                    <DropdownMenuItem onClick={() => {
                                      setMarkOpenStartHour(selDayOpen.start_hour ?? settings?.start_hour ?? 9);
                                      setMarkOpenEndHour(selDayOpen.end_hour ?? settings?.end_hour ?? 17);
                                      setMarkOpenDialogOpen(true);
                                    }}>
                                      <Clock className="h-4 w-4 mr-2 text-amber-500" /> Edit Open Hours
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openNewAppointment(selectedDate!)}>
                                    <Plus className="h-4 w-4 mr-2 text-blue-500" /> Add Appointment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => addBreak("lunch", selDateStr!)}>
                                    <span className="mr-2">🍽️</span> Lunch Break
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => addBreak("mobile", selDateStr!)}>
                                    <Coffee className="h-4 w-4 mr-2 text-emerald-500" /> Mobile Break
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setEditingBlockId(null); setBlockDate(selDateStr!);
                                    setBlockStartTime("09:00"); setBlockEndTime("17:00");
                                    setBlockReason(""); setBlockRepeatType("none");
                                    setBlockRepeatUntil(""); setBlockRepeatForever(false);
                                    setBlockDialogOpen(true);
                                  }}>
                                    <Ban className="h-4 w-4 mr-2 text-destructive" /> Blocked Time
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {(() => {
                                    const hasCVBlock = selDayBlocks.some(bt => bt.reason === "Castle View");
                                    return (
                                      <DropdownMenuItem onClick={async () => {
                                        if (!selDateStr) return;
                                        if (hasCVBlock) {
                                          for (const b of selDayBlocks.filter(bt => bt.reason === "Castle View")) await supabase.from("blocked_times").delete().eq("id", b.id);
                                          toast.success("Castle View removed"); fetchBlockedTimes();
                                        } else {
                                          setBlockDate(selDateStr); setBlockStartTime("07:00"); setBlockEndTime("19:15");
                                          setBlockReason("Castle View"); setBlockRepeatType("none");
                                          setBlockRepeatUntil(""); setBlockRepeatForever(false);
                                          setEditingBlockId(null); setBlockDialogOpen(true);
                                        }
                                      }}>
                                        <Building2 className="h-4 w-4 mr-2 text-violet-500" />
                                        {hasCVBlock ? "Remove Castle View" : "Castle View"}
                                      </DropdownMenuItem>
                                    );
                                  })()}
                                   {(() => {
                                     const has = selDayBlocks.some(bt => bt.reason === "Sick Day" || bt.reason?.startsWith("Sick Day"));
                                    return (
                                      <DropdownMenuItem onClick={async () => {
                                        if (!selDateStr) return;
                                        if (has) {
                                           for (const b of selDayBlocks.filter(bt => bt.reason === "Sick Day" || bt.reason?.startsWith("Sick Day"))) await supabase.from("blocked_times").delete().eq("id", b.id);
                                          toast.success("Sick Day removed"); fetchBlockedTimes();
                                        } else {
                                           const note = window.prompt("Reason for sick day (shown on calendar):", "");
                                           if (note === null) return;
                                           const trimmed = note.trim();
                                           const reasonText = trimmed ? `Sick Day: ${trimmed}` : "Sick Day";
                                          if (selDayOpen) { await supabase.from("available_dates").delete().eq("id", selDayOpen.id); fetchAvailableDates(); }
                                           const { error } = await supabase.from("blocked_times").insert({ blocked_date: selDateStr, start_time: "00:00:00", end_time: "23:59:00", reason: reasonText, repeat_type: "none" });
                                          if (error) toast.error("Failed"); else { toast.success("Marked as Sick Day"); fetchBlockedTimes(); }
                                        }
                                      }}>
                                        <span className="mr-2">🤒</span> {has ? "Remove Sick Day" : "Sick Day"}
                                      </DropdownMenuItem>
                                    );
                                  })()}
                                  {(() => {
                                    const has = selDayBlocks.some(bt => bt.reason === "Annual Leave");
                                    return (
                                      <DropdownMenuItem onClick={async () => {
                                        if (!selDateStr) return;
                                        if (has) {
                                          for (const b of selDayBlocks.filter(bt => bt.reason === "Annual Leave")) await supabase.from("blocked_times").delete().eq("id", b.id);
                                          toast.success("Annual Leave removed"); fetchBlockedTimes();
                                        } else {
                                          const { error } = await supabase.from("blocked_times").insert({ blocked_date: selDateStr, start_time: "00:00:00", end_time: "23:59:00", reason: "Annual Leave", repeat_type: "none" });
                                          if (error) toast.error("Failed"); else { toast.success("Marked as Annual Leave"); fetchBlockedTimes(); }
                                        }
                                      }}>
                                        <span className="mr-2">🌴</span> {has ? "Remove Annual Leave" : "Annual Leave"}
                                      </DropdownMenuItem>
                                    );
                                  })()}
                                  {(() => {
                                    const has = selDayBlocks.some(bt => bt.reason === "On Call");
                                    return (
                                      <DropdownMenuItem onClick={async () => {
                                        if (!selDateStr) return;
                                        if (has) {
                                          for (const b of selDayBlocks.filter(bt => bt.reason === "On Call")) await supabase.from("blocked_times").delete().eq("id", b.id);
                                          toast.success("On Call removed"); fetchBlockedTimes();
                                        } else {
                                          const { error } = await supabase.from("blocked_times").insert({ blocked_date: selDateStr, start_time: "00:00:00", end_time: "23:59:00", reason: "On Call", repeat_type: "none" });
                                          if (error) toast.error("Failed"); else { toast.success("Marked as On Call"); fetchBlockedTimes(); }
                                        }
                                      }}>
                                        <span className="mr-2">📞</span> {has ? "Remove On Call" : "On Call"}
                                      </DropdownMenuItem>
                                    );
                                  })()}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    if (!selectedDate || !selDateStr) return;
                                    const doc = new jsPDF({ orientation: "landscape" });
                                    const dateLabel = format(selectedDate, "EEEE, MMMM d, yyyy");
                                    doc.setFontSize(16); doc.text("ParklyScope — Day Schedule", 14, 15);
                                    doc.setFontSize(11); doc.text(dateLabel, 14, 22);
                                    doc.setFontSize(8); doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 27);
                                    const pdfTravelSegments = computeTravelSegments(selDayApts, selDayBlocks);
                                    const combined: { type: 'apt' | 'block'; time: string; data: any }[] = [
                                      ...selDayBlocks.map(bt => ({ type: 'block' as const, time: bt.start_time, data: bt })),
                                      ...selDayApts.map(apt => ({ type: 'apt' as const, time: apt.appointment_time, data: apt })),
                                    ].sort((a, b) => a.time.localeCompare(b.time));
                                    const pdfCombined: { type: 'apt' | 'block' | 'travel'; time: string; data: any }[] = [];
                                    for (const item of combined) {
                                      pdfCombined.push(item);
                                      if (item.type === 'apt') {
                                        const seg = pdfTravelSegments.find(s => s.afterAptId === item.data.id);
                                        if (seg) pdfCombined.push({ type: 'travel', time: seg.departBy, data: seg });
                                      }
                                    }
                                    const pdfBaseSeg = pdfTravelSegments.find(s => s.afterAptId === "__base__");
                                    if (pdfBaseSeg) pdfCombined.unshift({ type: 'travel', time: pdfBaseSeg.departBy, data: pdfBaseSeg });
                                    if (pdfCombined.length === 0) {
                                      doc.setFontSize(10); doc.text("No appointments or blocked times for this day.", 14, 36);
                                    } else {
                                      const rows = pdfCombined.map(item => {
                                        if (item.type === 'travel') {
                                          const seg = item.data;
                                          return [`🚗 ${seg.departBy} → ${seg.arriveBy}`, "TRAVEL", `${seg.rawDriveMinutes != null ? seg.rawDriveMinutes + " min drive" : "Unknown"} · ${seg.bufferMinutes ? seg.bufferMinutes + " min buffer" : "0 min buffer"}${seg.distanceMiles != null ? " · " + Number(seg.distanceMiles).toFixed(1) + " mi" : ""}`, `${seg.fromPostcode} → ${seg.toPostcode}`, "—", "—", "—"];
                                        }
                                        if (item.type === 'block') {
                                          const bLabel = item.data.reason?.includes("Lunch") ? "BREAK — LUNCH AT BASE" : item.data.reason?.includes("Mobile") ? "BREAK — MOBILE" : "BLOCKED";
                                          return [item.data.start_time.slice(0, 5) + " – " + item.data.end_time.slice(0, 5), bLabel, item.data.reason || "—", "—", "—", "—", "—"];
                                        }
                                        const apt = item.data as Appointment;
                                        const svcName = getServiceWithAddons(apt);
                                        const svc = services.find(s => s.id === apt.service_id);
                                        const duration = getGroupDuration(apt);
                                        const age = getPatientAge(apt.client_email);
                                        const alert = patientAlerts[apt.client_email];
                                        const consentDone = consentCompletedIds.has(apt.id);
                                        const consultDone = consultNoteCompletedIds.has(apt.id);
                                        const hasConsent = !!(apt.consent_form_template_id || svc?.consent_form_template_id);
                                        const isGroup = apt.notes?.includes("Additional attendees:");
                                        const nameCol = apt.client_name + (age !== null ? ` (${age})` : "") + (isGroup ? " [GROUP]" : "");
                                        const contactCol = [apt.client_email, apt.client_phone].filter(Boolean).join("\n");
                                        const priceCol = apt.price != null ? `£${Number(apt.price).toFixed(2)}` + (apt.travel_fee != null && Number(apt.travel_fee) > 0 ? ` (incl £${Number(apt.travel_fee).toFixed(2)} travel)` : "") : "—";
                                        const statusParts: string[] = [apt.status.toUpperCase()];
                                        if (hasConsent) statusParts.push(consentDone ? "Consent: ✓" : isNoEmail(apt.client_email) ? "Consent at Apt" : "Consent: ✗");
                                        if (consultDone) statusParts.push("Consult: ✓");
                                        const notesArr = [apt.notes, alert ? `⚠ ALERT: ${alert}` : "", apt.admin_notes ? `Admin: ${apt.admin_notes}` : ""].filter(Boolean);
                                        return [apt.appointment_time.slice(0, 5), nameCol, svcName + ` (${duration}min)`, contactCol, apt.address || "—", priceCol, statusParts.join(" | ") + (notesArr.length ? "\n" + notesArr.join("\n") : "")];
                                      });
                                      autoTable(doc, {
                                        startY: 32, head: [["Time", "Patient", "Service", "Contact", "Address", "Price", "Status / Notes"]], body: rows,
                                        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
                                        headStyles: { fillColor: [59, 130, 246], fontSize: 7 },
                                        columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 35 }, 2: { cellWidth: 30 }, 3: { cellWidth: 40 }, 4: { cellWidth: 45 }, 5: { cellWidth: 22 }, 6: { cellWidth: 78 } },
                                        didParseCell: (data: any) => {
                                          if (data.section === 'body' && data.row.raw?.[1] === 'BLOCKED') { data.cell.styles.fillColor = [254, 226, 226]; data.cell.styles.textColor = [185, 28, 28]; data.cell.styles.fontStyle = 'bold'; }
                                          if (data.section === 'body' && data.row.raw?.[1] === 'TRAVEL') { data.cell.styles.fillColor = [219, 234, 254]; data.cell.styles.textColor = [29, 78, 216]; data.cell.styles.fontStyle = 'italic'; }
                                        },
                                      });
                                    }
                                    doc.save(`parklyscope-schedule-${selDateStr}.pdf`);
                                    toast.success("PDF exported");
                                  }}>
                                    <FileDown className="h-4 w-4 mr-2 text-emerald-500" /> Export PDF
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {/* Route Optimisation Hint */}
                            {(() => {
                              const aptsWithCoords = selDayApts.filter(a =>
                                a.status !== "cancelled" && a.status !== "rejected" &&
                                a.latitude != null && a.longitude != null
                              );
                              if (aptsWithCoords.length < 3) return null;

                              // Haversine distance in miles between two coords
                              const dist = (la1: number, lo1: number, la2: number, lo2: number) => {
                                const toRad = (d: number) => (d * Math.PI) / 180;
                                const R = 3958.8;
                                const dLat = toRad(la2 - la1);
                                const dLon = toRad(lo2 - lo1);
                                const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLon / 2) ** 2;
                                return 2 * R * Math.asin(Math.sqrt(a));
                              };

                              // Base location: DT2 8DG approx
                              const BASE = { lat: 50.7359, lon: -2.4847 };
                              const points = aptsWithCoords.map(a => ({
                                id: a.id, name: a.client_name.split(" ")[0],
                                time: a.appointment_time.slice(0, 5),
                                lat: Number(a.latitude), lon: Number(a.longitude),
                              }));

                              const totalDist = (order: typeof points) => {
                                let total = dist(BASE.lat, BASE.lon, order[0].lat, order[0].lon);
                                for (let i = 1; i < order.length; i++) {
                                  total += dist(order[i - 1].lat, order[i - 1].lon, order[i].lat, order[i].lon);
                                }
                                total += dist(order[order.length - 1].lat, order[order.length - 1].lon, BASE.lat, BASE.lon);
                                return total;
                              };

                              const currentMiles = totalDist(points);

                              // Greedy nearest-neighbour optimal-ish route from base
                              const remaining = [...points];
                              const optimised: typeof points = [];
                              let curLat = BASE.lat, curLon = BASE.lon;
                              while (remaining.length > 0) {
                                let bestIdx = 0, bestD = Infinity;
                                for (let i = 0; i < remaining.length; i++) {
                                  const d = dist(curLat, curLon, remaining[i].lat, remaining[i].lon);
                                  if (d < bestD) { bestD = d; bestIdx = i; }
                                }
                                const next = remaining.splice(bestIdx, 1)[0];
                                optimised.push(next);
                                curLat = next.lat; curLon = next.lon;
                              }

                              const optimisedMiles = totalDist(optimised);
                              const milesSaved = currentMiles - optimisedMiles;

                              // Only show if a meaningful saving (>= 3 miles) AND order differs
                              const sameOrder = points.every((p, i) => p.id === optimised[i].id);
                              if (sameOrder || milesSaved < 3) return null;

                              const currentSeq = points.map(p => `${p.time} ${p.name}`).join(" → ");
                              const suggestedSeq = optimised.map(p => p.name).join(" → ");

                              // Route tip emails disabled — display in-UI only

                              return (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 space-y-2">
                                  <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                                        Route tip — save ~{milesSaved.toFixed(1)} miles
                                      </p>
                                      <p className="text-[11px] text-blue-700/90 dark:text-blue-300/90 mt-1">
                                        <span className="opacity-70">Current:</span> {currentSeq}
                                      </p>
                                      <p className="text-[11px] text-blue-700/90 dark:text-blue-300/90 mt-0.5">
                                        <span className="opacity-70">Suggested:</span> {suggestedSeq}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}


                            {(() => {
                              const travelSegments = computeTravelSegments(selDayApts, selDayBlocks);
                              const embeddedMobileStarts = new Set(travelSegments.filter(s => s.mobileBreak).map(s => s.mobileBreak!.startTime));
                              const combined: { type: 'apt' | 'block' | 'travel'; time: string; data: any }[] = [
                                ...selDayBlocks
                                  .filter(bt => !(bt.reason?.includes("Mobile") && embeddedMobileStarts.has(bt.start_time)))
                                  .map(bt => ({ type: 'block' as const, time: bt.start_time, data: bt })),
                                ...selDayApts.map(apt => ({ type: 'apt' as const, time: apt.appointment_time, data: apt })),
                              ].sort((a, b) => a.time.localeCompare(b.time));

                              const withTravel: typeof combined = [];
                              for (const item of combined) {
                                if (item.type === 'block' && item.data.reason?.includes("Lunch")) {
                                  const lunchTravelTo = travelSegments.find(s => s.afterAptId?.startsWith("__to_lunch_"));
                                  if (lunchTravelTo) withTravel.push({ type: 'travel', time: lunchTravelTo.departBy, data: lunchTravelTo });
                                }
                                withTravel.push(item);
                                if (item.type === 'apt') {
                                  const seg = travelSegments.find(s => s.afterAptId === item.data.id);
                                  if (seg) withTravel.push({ type: 'travel', time: seg.departBy, data: seg });
                                }
                                if (item.type === 'block' && item.data.reason?.includes("Lunch")) {
                                  const lunchTravelFrom = travelSegments.find(s => s.afterAptId?.startsWith("__lunch_to_"));
                                  if (lunchTravelFrom) withTravel.push({ type: 'travel', time: lunchTravelFrom.departBy, data: lunchTravelFrom });
                                }
                              }
                              const baseSeg = travelSegments.find(s => s.afterAptId === "__base__");
                              if (baseSeg) withTravel.unshift({ type: 'travel', time: baseSeg.departBy, data: baseSeg });

                              // Insert "Set Up Time" tiles before come_to_practitioner appointments
                              const withSetup: typeof withTravel = [];
                              for (let si = 0; si < withTravel.length; si++) {
                                const cur = withTravel[si];
                                if (cur.type === 'apt' && cur.data.come_to_practitioner) {
                                  let prevAptCTP = false;
                                  for (let pi = si - 1; pi >= 0; pi--) {
                                    if (withTravel[pi].type === 'apt') {
                                      prevAptCTP = !!withTravel[pi].data.come_to_practitioner;
                                      break;
                                    }
                                  }
                                  if (!prevAptCTP) {
                                    const aptStartMin = parseInt(cur.data.appointment_time.slice(0, 2)) * 60 + parseInt(cur.data.appointment_time.slice(3, 5));
                                    const setupStartMin = aptStartMin - 10;
                                    const setupTime = `${Math.floor(setupStartMin / 60).toString().padStart(2, "0")}:${(setupStartMin % 60).toString().padStart(2, "0")}`;
                                    withSetup.push({ type: 'setup' as any, time: setupTime, data: { durationMinutes: 10, forAptId: cur.data.id, forPatientName: cur.data.client_name } });
                                  }
                                }
                                withSetup.push(cur);
                              }

                              const dayOpenHours = selDayOpen ? { startMin: (selDayOpen.start_hour ?? settings?.start_hour ?? 9) * 60, endMin: (selDayOpen.end_hour ?? settings?.end_hour ?? 17) * 60 } : null;
                              const finalTimeline = insertDeadGaps(withSetup, dayOpenHours);

                              return finalTimeline.map((item, idx) => item.type === 'dead_gap' ? (() => {
                                const nextApt = finalTimeline.slice(idx + 1).find(t => t.type === 'apt');
                                const nextCompleted = nextApt?.data?.status === "completed";
                                return nextCompleted ? (
                                <div key={`deadgap-${idx}`} className="flex items-center gap-2 rounded-lg border border-muted bg-muted/20 px-3 py-1 mx-2 opacity-50">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <p className="text-[10px] text-muted-foreground line-through">{item.data.unknownDrive ? "Likely dead time" : "Dead time"} — {item.data.gapMinutes} min</p>
                                </div>
                                ) : (
                                <div key={`deadgap-${idx}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 mx-2">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
                                    <Clock className="h-3.5 w-3.5 text-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-semibold text-foreground">{item.data.unknownDrive ? "Likely dead time" : "Dead time"} — {item.data.gapMinutes} min gap</p>
                                    <p className="text-[10px] text-muted-foreground">{item.data.unknownDrive ? "Drive time unknown — likely too short" : `Too short for any service (min ${item.data.minServiceDuration} min)`}</p>
                                  </div>
                                </div>
                                );
                              })() : item.type === 'free_slot' ? (() => {
                                const freeEndMin = item.data.endMin || 0;
                                const calNow = new Date();
                                const calNowMin = calNow.getHours() * 60 + calNow.getMinutes();
                                const isSelToday = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                const isFreePast = isSelToday && calNowMin >= freeEndMin;
                                const nextFreeApt = finalTimeline.slice(idx + 1).find(t => t.type === 'apt');
                                const nextFreeCompleted = nextFreeApt?.data?.status === "completed";
                                const shouldMinimizeFree = isFreePast || nextFreeCompleted;
                                return shouldMinimizeFree ? (
                                  <div key={`free-${idx}`} className="flex items-center gap-2 rounded-lg border border-muted bg-muted/20 px-3 py-1 mx-2 opacity-50">
                                    <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <p className="text-[10px] text-muted-foreground line-through">Free time — {item.data.gapMinutes} min</p>
                                  </div>
                                ) : (
                                  <div key={`free-${idx}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 mx-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
                                      <CalendarCheck className="h-3.5 w-3.5 text-foreground" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-[10px] font-semibold text-foreground">
                                        Free time — {item.data.gapMinutes} min
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {`${Math.floor(item.data.startMin / 60).toString().padStart(2, "0")}:${(item.data.startMin % 60).toString().padStart(2, "0")}`} – {`${Math.floor(item.data.endMin / 60).toString().padStart(2, "0")}:${(item.data.endMin % 60).toString().padStart(2, "0")}`}
                                        {item.data.travelMinutes > 0 ? ` (incl. ${item.data.travelMinutes} min travel)` : ""}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })() : item.type === 'setup' ? (() => {
                                const setupStartMin = parseInt(item.time.slice(0, 2)) * 60 + parseInt(item.time.slice(3, 5));
                                const setupEndMin = setupStartMin + (item.data.durationMinutes || 10);
                                const nextAptForSetup = finalTimeline.slice(idx + 1).find(t => t.type === 'apt');
                                const nextCompleted = nextAptForSetup?.data?.status === "completed";
                                return nextCompleted ? (
                                  <div key={`setup-${idx}`} className="flex items-center gap-2 rounded-lg border border-muted bg-muted/20 px-3 py-1 mx-2 opacity-50">
                                    <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <p className="text-[10px] text-muted-foreground line-through">Set Up Time — {item.data.durationMinutes} min</p>
                                  </div>
                                ) : (
                                  <div key={`setup-${idx}`} className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 mx-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/20 shrink-0">
                                      <Home className="h-3.5 w-3.5 text-amber-400" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-semibold text-amber-300">Set Up Time</p>
                                      <p className="text-[10px] text-amber-400/70">
                                        {item.time.slice(0, 5)} – {`${Math.floor(setupEndMin / 60).toString().padStart(2, "0")}:${(setupEndMin % 60).toString().padStart(2, "0")}`} · Prepare for {item.data.forPatientName?.split(" ")[0] || "patient"}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })() : item.type === 'travel' ? (() => {
                                const getPrevSig = () => {
                                  for (let i = idx - 1; i >= 0; i--) {
                                    const t = finalTimeline[i]?.type;
                                    if (t !== 'dead_gap' && t !== 'free_slot' && t !== 'setup') return finalTimeline[i];
                                  }
                                  return null;
                                };
                                const getNextSig = () => {
                                  for (let i = idx + 1; i < finalTimeline.length; i++) {
                                    const t = finalTimeline[i]?.type;
                                    if (t !== 'dead_gap' && t !== 'free_slot' && t !== 'setup') return finalTimeline[i];
                                  }
                                  return null;
                                };
                                const prevSig = getPrevSig();
                                const nextSig = getNextSig();
                                const prevCompleted = (prevSig?.type === 'apt' && prevSig.data.status === 'completed') || (prevSig?.type === 'block' && prevSig.data.reason?.includes("Lunch"));
                                const nextCompleted = (nextSig?.type === 'apt' && nextSig.data.status === 'completed') || (nextSig?.type === 'block' && nextSig.data.reason?.includes("Lunch"));
                                const isSandwichedCompleted = prevCompleted && nextCompleted;
                                const isBaseCompleted = item.data.afterAptId === '__base__' && nextSig?.type === 'apt' && nextSig.data.status === 'completed';
                                const isBaseToBreakCompleted = item.data.afterAptId === '__base__' && nextSig?.type === 'block';
                                const isLeadingToCompletedApt = nextSig?.type === 'apt' && nextSig.data.status === 'completed';
                                const isGreyedOut = isSandwichedCompleted || isBaseCompleted || isBaseToBreakCompleted || isLeadingToCompletedApt;
                                return (
                                <>
                                <div key={`travel-${item.data.afterAptId}`} className={cn(
                                  "flex items-center gap-2 rounded-2xl border px-3 py-2 mx-2",
                                  isGreyedOut
                                    ? "border-muted bg-muted/20 opacity-50"
                                    : "border-slate-700 bg-slate-900"
                                )}>
                                  <Car className={cn("h-4 w-4 shrink-0", isGreyedOut ? "text-muted-foreground" : "text-blue-400")} />
                                  <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs font-medium", isGreyedOut ? "text-muted-foreground line-through" : "text-white")}>
                                      {item.data.rawDriveMinutes != null ? `${item.data.rawDriveMinutes} min drive` : item.data.driveMinutes != null ? `${item.data.driveMinutes} min drive` : "Drive time unknown"} to {item.data.toPatientName || "next patient"}{item.data.distanceMiles != null ? ` · ${Number(item.data.distanceMiles).toFixed(1)} mi` : ""}{item.data.isLive ? <span className="ml-1 inline-flex items-center gap-1 rounded bg-green-600 px-1 py-0 text-[9px] font-bold text-white uppercase tracking-wide">● Live</span> : null}
                                    </p>
                                    <p className={cn("text-[10px]", isGreyedOut ? "text-muted-foreground/70 line-through" : "text-white/50")}>
                                      {item.data.bufferMinutes != null && item.data.bufferMinutes > 0 ? `+${item.data.bufferMinutes} min buffer · ` : ""}{item.data.fromPostcode} → {item.data.toPostcode}
                                    </p>
                                    {item.data.departBy && item.data.arriveBy && (
                                      <p className={cn("text-[10px] font-bold", isGreyedOut ? "text-muted-foreground/70 line-through" : "text-white/80")}>
                                        Depart {item.data.departBy} → Arrive {item.data.arriveBy}
                                      </p>
                                    )}
                                  </div>
                                  {!isGreyedOut && item.data.driveMinutes != null && (() => {
                                    const isTight = item.data.availableGapMinutes < (item.data.driveMinutes ?? 0);
                                    return isTight ? (
                                      <span className="text-[10px] font-semibold text-destructive flex items-center gap-0.5" title="Tight schedule — may be late">
                                        <AlertTriangle className="h-3 w-3" /> Tight
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                                </>
                                );
                              })() : item.type === 'block' ? (() => {
                                const isBreak = item.data.reason?.includes("Lunch") || item.data.reason?.includes("Mobile");
                                const isNote = item.data.reason === "Annual Leave" || item.data.reason === "On Call";
                                return (
                                <div key={item.data.id} className={cn(
                                  "flex items-center gap-3 rounded-lg border p-3",
                                  isBreak ? "border-emerald-500/30 bg-emerald-950/20" : isNote ? (item.data.reason === "Annual Leave" ? "border-sky-500/30 bg-sky-500/10" : "border-teal-500/30 bg-teal-500/10") : "border-destructive/20 bg-destructive/5"
                                )}>
                                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", isBreak ? "bg-emerald-500/20" : isNote ? "bg-background/60" : "bg-destructive/10")}>
                                    {isBreak
                                      ? (item.data.reason?.includes("Lunch") ? <span className="text-lg">🍽️</span> : <Coffee className="h-4 w-4 text-emerald-400" />)
                                      : isNote ? <span className="text-lg">{item.data.reason === "Annual Leave" ? "🌴" : "📞"}</span>
                                      : <Ban className="h-4 w-4 text-destructive" />
                                    }
                                  </div>
                                  <div className="flex-1">
                                    <p className={cn("text-sm font-medium", isBreak ? "text-emerald-400" : isNote ? (item.data.reason === "Annual Leave" ? "text-sky-600 dark:text-sky-400" : "text-teal-600 dark:text-teal-400") : "text-destructive")}>
                                      {item.data.reason?.includes("Lunch") ? "BREAK — LUNCH AT BASE" : item.data.reason?.includes("Mobile") ? "BREAK — MOBILE" : isNote ? item.data.reason : `Blocked: ${item.data.start_time.slice(0, 5)} – ${item.data.end_time.slice(0, 5)}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{isNote ? "All day · Bookings still available" : `${item.data.start_time.slice(0, 5)} – ${item.data.end_time.slice(0, 5)}${item.data.reason && !isBreak ? ` · ${item.data.reason}` : ""}`}</p>
                                    {item.data.repeat_group_id && <p className="text-xs text-muted-foreground flex items-center gap-1"><Repeat className="h-3 w-3" /> Recurring ({item.data.repeat_type})</p>}
                                  </div>
                                  <div className="flex gap-0.5">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit this block" onClick={() => openEditBlock(item.data)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    {item.data.repeat_group_id && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete entire series" onClick={() => removeBlockedGroup(item.data.repeat_group_id!)}>
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title={item.data.repeat_group_id ? "Delete this one only" : "Delete"} onClick={() => removeBlockedTime(item.data.id)}>
                                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                                );
                              })() : (
                                (() => {
                                const isCompleted = item.data.status === "completed";
                                const localityWord = getLocalityWord(item.data);
                                const upcomingGroupMembers = item.data.group_id ? allAppointments.filter(a => a.group_id === item.data.group_id && a.status !== "cancelled" && a.status !== "rejected").sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)) : [];
                                const isUpcomingFirstInGroup = upcomingGroupMembers.length > 1 && upcomingGroupMembers[0]?.id === item.data.id;
                                const isUpcomingGroup = upcomingGroupMembers.length > 1;
                                const upcomingGroupTotal = upcomingGroupMembers.reduce((sum, m) => sum + (m.price != null ? Number(m.price) : 0), 0);
                                const upcomingGroupTravel = upcomingGroupMembers.reduce((sum, m) => sum + (m.travel_fee != null && Number(m.travel_fee) > 0 ? Number(m.travel_fee) : 0), 0);
                                // Skip non-first group members in upcoming view
                                if (isUpcomingGroup && !isUpcomingFirstInGroup) return null;
                                return (
                                <div key={item.data.id} className={cn(
                                  "rounded-lg sm:rounded-xl border cursor-pointer transition-all overflow-hidden",
                                  isCompleted ? "opacity-50 border-muted bg-muted/20" : "border-orange-500/40 bg-card",
                                  !isCompleted && isUpcomingGroup ? "hover:bg-secondary/10 border-l-4 border-l-secondary" : !isCompleted ? "hover:bg-muted/50" : ""
                                )} onClick={() => !isCompleted && openDetailView(item.data)}>
                                  {/* Group header */}
                                  {isUpcomingGroup && (
                                     <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-secondary/20 border-b border-secondary/40">
                                      <div className="flex items-center justify-between">
                                         <span className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-secondary-foreground uppercase tracking-wide">
                                          <Users className="h-3 w-3" /> Group · {upcomingGroupMembers.length} people
                                        </span>
                                        {upcomingGroupTotal > 0 && (
                                           <span className="text-[10px] sm:text-xs font-bold text-secondary-foreground">
                                            Total: £{(upcomingGroupTotal + upcomingGroupTravel).toFixed(0)}
                                          </span>
                                        )}
                                      </div>
                                       <p className="text-[10px] text-secondary-foreground/90 truncate mt-0.5">
                                         {[...upcomingGroupMembers].sort((a, b) => Number(isNoEmail(a.client_email)) - Number(isNoEmail(b.client_email))).map(m => m.client_name).join(", ")}
                                       </p>
                                    </div>
                                  )}
                                  <div className="p-2 sm:p-3">
                                  {/* Top row: time pill + name + options */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                                      <div className="flex flex-col items-center shrink-0 gap-0.5">
                                         <div className={cn("flex flex-col items-center justify-center rounded-md sm:rounded-lg px-1.5 sm:px-2.5 py-1 sm:py-1.5 leading-tight min-w-[46px] sm:min-w-[58px]", isCompleted ? "bg-muted" : isUpcomingGroup ? "bg-secondary/10" : "bg-primary/10")}>
                                           <span className={cn("text-[10px] sm:text-xs font-bold whitespace-nowrap", isCompleted ? "text-muted-foreground" : "text-foreground")}>{item.data.appointment_time.slice(0, 5)}</span>
                                           <span className={cn("text-[8px] sm:text-[9px] font-medium whitespace-nowrap", isCompleted ? "text-muted-foreground" : "text-foreground/70")}>to {getEndTime(isUpcomingGroup ? upcomingGroupMembers[upcomingGroupMembers.length - 1] : item.data)}</span>
                                        </div>
                                        {!isCompleted && (() => {
                                          const dp = isUpcomingGroup ? (upcomingGroupTotal + upcomingGroupTravel) : (item.data.price ?? services.find(s => s.id === item.data.service_id)?.price ?? null);
                                          if (dp == null || dp === 0) return null;
                                           return (
                                            <div className={cn("flex flex-col items-center justify-center rounded-md sm:rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 leading-tight min-w-[46px] sm:min-w-[52px] bg-emerald-500/10 border border-emerald-500/20")}>
                                              <span className="text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400">£{Number(dp).toFixed(0)}</span>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        {localityWord && !isCompleted && (
                                          <span className="mb-1 inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                                            {localityWord}
                                          </span>
                                        )}
                                        <p className={cn("text-[11px] sm:text-xs font-semibold leading-tight flex items-center gap-1 flex-wrap", isCompleted && "line-through text-muted-foreground")}>
                                          <span>{isUpcomingGroup ? [...upcomingGroupMembers].sort((a, b) => Number(isNoEmail(a.client_email)) - Number(isNoEmail(b.client_email))).map(m => m.client_name).join(' & ') : item.data.client_name}</span>
                                          {!isCompleted && !isUpcomingGroup && getPatientAge(item.data.client_email) !== null && <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">({getPatientAge(item.data.client_email)})</span>}
                                          {!isCompleted && item.data.media_consent && (
                                            <span title="Patient consented to photos/video for social media — share for approval before posting" className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-secondary text-secondary-foreground ring-2 ring-secondary/40 shadow-md shrink-0"><Camera className="h-3 w-3" strokeWidth={2.5} /></span>
                                          )}
                                        </p>
                                        <p className={cn("text-[9px] sm:text-[10px] mt-0.5 leading-snug", isCompleted ? "line-through text-muted-foreground" : "text-muted-foreground")}>
                                          {isUpcomingGroup ? upcomingGroupMembers.map(m => `${getServiceName(m.service_id)} · £${(m.price ?? 0).toFixed(0)}`).join(" | ") : getServiceName(item.data.service_id)}
                                        </p>
                                        {!isCompleted && item.data.address && (
                                          <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.data.address + (item.data.postcode && !item.data.address.toUpperCase().includes(item.data.postcode.toUpperCase()) ? ", " + item.data.postcode : ""))}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block rounded-md bg-muted/50 px-1.5 sm:px-2 py-0.5 sm:py-1 mt-1 hover:bg-muted transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <p className="text-[9px] sm:text-[10px] text-foreground flex items-center gap-1">
                                              <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 opacity-70" />
                                              <span className="truncate underline underline-offset-2">{item.data.address}</span>
                                              <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 opacity-50" />
                                            </p>
                                          </a>
                                        )}
                                        {!isCompleted && <div className={cn("rounded-md bg-amber-500/10 px-1.5 sm:px-2 py-0.5 sm:py-1 mt-1", item.data.ai_consent_summary && "cursor-pointer hover:bg-amber-500/20 transition-colors")} onClick={(e) => { if (item.data.ai_consent_summary) { e.stopPropagation(); setAiSummaryDialogData({ name: item.data.client_name, summary: item.data.ai_consent_summary }); setAiSummaryDialogOpen(true); } }}>
                                          <p className="text-[9px] sm:text-[10px] text-amber-700 dark:text-amber-300 leading-snug flex items-center gap-1">
                                            {getAiKeywords(item.data.ai_consent_summary)
                                              ? <>💡 {getAiKeywords(item.data.ai_consent_summary)} {item.data.ai_consent_summary && <Eye className="h-3 w-3 shrink-0 opacity-60" />}</>
                                              : consentCompletedIds.has(item.data.id)
                                                ? <>💡 Consent completed — no AI summary</>
                                                : isNoEmail(item.data.client_email)
                                                  ? <>📋 Consent to be completed at appointment</>
                                                  : <>⚠️ No consent form completed</>
                                            }
                                          </p>
                                        </div>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7">
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                          <DropdownMenuItem onClick={() => openDetailView(item.data)}>
                                            <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => openEditAppointment(item.data)}>
                                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Appointment
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => openReschedule(item.data)}>
                                            <CalendarClock className="h-3.5 w-3.5 mr-2" /> Reschedule
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => {
                                            const svcName = getServiceName(item.data.service_id).toLowerCase();
                                            const consultTemplate = templates.find(t => t.form_type === 'consultation' && t.title.toLowerCase().includes(svcName.split(' ')[0]));
                                            setConsultAptId(item.data.id);
                                            setConsultTemplateId(consultTemplate?.id || null);
                                            setConsultFormType('consultation');
                                            setConsultFormOpen(true);
                                          }}>
                                            <Stethoscope className={cn("h-3.5 w-3.5 mr-2", consultNoteCompletedIds.has(item.data.id) ? "text-success" : "")} /> Consultation Form
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => openInlinePatient(item.data.client_email)}>
                                            <Users className="h-3.5 w-3.5 mr-2" /> Patient Record
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => openPaymentForApt(item.data)}>
                                            <PoundSterling className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Record Payment
                                          </DropdownMenuItem>
                                          {item.data.status !== "completed" && selectedDate && isToday(selectedDate) && !onMyWaySentIds.has(item.data.id) && !item.data.come_to_practitioner && (
                                            <>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem disabled={onMyWaySending === item.data.id} onClick={() => setOnMyWayConfirmApt(item.data)}>
                                                {onMyWaySending === item.data.id ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Car className="h-3.5 w-3.5 mr-2 text-blue-500" />} On My Way
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                          {item.data.status !== "completed" && selectedDate && isToday(selectedDate) && item.data.come_to_practitioner && !clinicReadySentIds.has(item.data.id) && (
                                            <>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem disabled={clinicReadySending === item.data.id} onClick={() => setClinicReadyConfirmApt(item.data)}>
                                                {clinicReadySending === item.data.id ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Home className="h-3.5 w-3.5 mr-2 text-emerald-500" />} I'm Ready (notify patient)
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                          {onMyWaySentIds.has(item.data.id) && (
                                            <>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem disabled>
                                                <CheckCircle className="h-3.5 w-3.5 mr-2 text-emerald-500" /> "On my way" sent ✓
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                          {item.data.come_to_practitioner && clinicReadySentIds.has(item.data.id) && (
                                            <>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem disabled>
                                                <CheckCircle className="h-3.5 w-3.5 mr-2 text-emerald-500" /> "Ready" sent ✓
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                          <DropdownMenuSeparator />
                                          {item.data.status !== "completed" ? (
                                            <DropdownMenuItem onClick={() => promptStatusChange(item.data, "completed")}>
                                              <CheckCircle className="h-3.5 w-3.5 mr-2" /> Mark Appointment Complete
                                            </DropdownMenuItem>
                                          ) : (
                                            <DropdownMenuItem onClick={() => promptStatusChange(item.data, "confirmed")}>
                                              <RefreshCw className="h-3.5 w-3.5 mr-2" /> Uncomplete Appointment
                                            </DropdownMenuItem>
                                          )}
                                          {(item.data.consent_form_template_id || services.find(s => s.id === item.data.service_id)?.consent_form_template_id) && !consentCompletedIds.has(item.data.id) && (
                                            <DropdownMenuItem onClick={async () => {
                                              const templateId = item.data.consent_form_template_id || services.find(s => s.id === item.data.service_id)?.consent_form_template_id;
                                              if (!templateId) return;
                                              const { error } = await supabase.from("consent_form_responses").insert({
                                                appointment_id: item.data.id,
                                                consent_form_template_id: templateId,
                                                responses: { _manual: true, note: "Manually marked complete by practitioner" },
                                                status: "completed",
                                                submitter_name: item.data.client_name,
                                              });
                                              if (error) { toast.error("Failed to mark consent complete"); return; }
                                              await supabase.from("scheduled_communications")
                                                .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                                                .eq("appointment_id", item.data.id)
                                                .eq("trigger_type", "consent_reminder")
                                                .eq("status", "pending");
                                              toast.success("Consent marked as complete — reminder emails stopped");
                                              logPatientActivity(item.data.client_email, "consent_manual", `Consent manually marked complete for ${getServiceName(item.data.service_id)}`);
                                              setConsentCompletedIds(prev => new Set([...prev, item.data.id]));
                                              fetchAppointments();
                                            }}>
                                              <CheckCircle className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Mark Consent Complete
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => sendManualReviewRequest(item.data)}>
                                            <Star className="h-3.5 w-3.5 mr-2 text-amber-500" /> Send Review Request
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => resendMorningTracking(item.data)}>
                                            <RotateCw className="h-3.5 w-3.5 mr-2 text-blue-500" /> Resend Morning Tracking
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(item.data)}>
                                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                  {/* Bottom row: price + badges */}
                                  <div className="flex items-center gap-1.5 mt-1.5 ml-[62px] flex-wrap" onClick={(e) => e.stopPropagation()}>
                                    {item.data.price != null && (() => {
                                      const svc = services.find(s => s.id === item.data.service_id);
                                      const originalPrice = svc?.price ? Number(svc.price) : null;
                                      const actualPrice = Number(item.data.price);
                                      const hasDiscount = item.data.group_id && originalPrice && originalPrice > actualPrice;
                                      return (
                                        <span className="text-xs font-medium text-foreground">
                                          {hasDiscount ? <><span className="line-through text-muted-foreground">£{originalPrice.toFixed(2)}</span> <span className="text-success">£{actualPrice.toFixed(2)}</span></> : `£${actualPrice.toFixed(2)}`}
                                          {item.data.travel_fee != null && Number(item.data.travel_fee) > 0 && <span className="text-muted-foreground font-normal"> +£{Number(item.data.travel_fee).toFixed(2)} travel</span>}
                                        </span>
                                      );
                                    })()}
                                    {item.data.group_id && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-secondary/10 text-secondary border-secondary/30">
                                        <Users className="h-2.5 w-2.5 mr-0.5" /> Group
                                      </Badge>
                                    )}
                                    {consultNoteCompletedIds.has(item.data.id) && <Stethoscope className="h-3 w-3 text-success" />}
                                    {(item.data.consent_form_template_id || services.find(s => s.id === item.data.service_id)?.consent_form_template_id) && (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80", consentCompletedIds.has(item.data.id) ? "bg-success/10 text-success border-success/30" : isNoEmail(item.data.client_email) ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-destructive/10 text-destructive border-destructive/30")}>
                                            {consentCompletedIds.has(item.data.id) ? "Consent ✓" : isNoEmail(item.data.client_email) ? "Consent at Apt" : "Consent ✗"}
                                          </Badge>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-52 p-2" align="start">
                                          {consentCompletedIds.has(item.data.id) ? (
                                            <p className="text-xs text-muted-foreground">✅ Consent completed.</p>
                                          ) : (
                                            <div className="space-y-2">
                                              <p className="text-xs text-muted-foreground">⚠️ Not completed. Daily reminders active.</p>
                                              <Button size="sm" className="w-full text-xs h-8" onClick={async () => {
                                                const templateId = item.data.consent_form_template_id || services.find(s => s.id === item.data.service_id)?.consent_form_template_id;
                                                if (!templateId) return;
                                                const { error } = await supabase.from("consent_form_responses").insert({
                                                  appointment_id: item.data.id,
                                                  consent_form_template_id: templateId,
                                                  responses: { _manual: true, note: "Manually marked complete by practitioner" },
                                                  status: "completed",
                                                  submitter_name: item.data.client_name,
                                                });
                                                if (error) { toast.error("Failed"); return; }
                                                await supabase.from("scheduled_communications")
                                                  .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                                                  .eq("appointment_id", item.data.id)
                                                  .eq("trigger_type", "consent_reminder")
                                                  .eq("status", "pending");
                                                toast.success("Consent marked complete — emails stopped");
                                                logPatientActivity(item.data.client_email, "consent_manual", `Consent manually marked complete for ${getServiceName(item.data.service_id)}`);
                                                setConsentCompletedIds(prev => new Set([...prev, item.data.id]));
                                                fetchAppointments();
                                              }}>
                                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Complete
                                              </Button>
                                            </div>
                                          )}
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80", statusColors[item.data.status])}>{item.data.status}</Badge>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-44 p-1" align="start">
                                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Change Status</p>
                                        {["confirmed", "pending", "completed"].filter(s => s !== item.data.status).map(newStatus => (
                                          <Button key={newStatus} variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => promptStatusChange(item.data, newStatus)}>
                                            {newStatus === "completed" ? <CheckCircle className="h-3.5 w-3.5 mr-2" /> : newStatus === "confirmed" ? <CalendarCheck className="h-3.5 w-3.5 mr-2" /> : <Clock className="h-3.5 w-3.5 mr-2" />}
                                            {newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}
                                          </Button>
                                        ))}
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                  </div>
                                </div>
                                );
                              })()));
                              })()}
                            {selDayApts.length === 0 && selDayBlocks.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-6">
                                {selDayOpen ? "No bookings yet for this day." : "No activity on this day."}
                              </p>
                            )}

                            {/* Available Slots Summary - Day View */}
                            {(() => {
                              const avail = computeAvailableSlots(selDateStr!, selDayApts, selDayBlocks, selDayOpen);
                              if (!selDayOpen) return null;
                              return (
                                <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => { setSlotsDetailDate(selDateStr!); setSlotsDetailData(avail); setSlotsDetailOpen(true); }}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                                        <CalendarPlus className="h-3.5 w-3.5 text-primary" />
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold">
                                          {avail.slots > 0 ? `${avail.slots} available slot${avail.slots !== 1 ? "s" : ""} remaining` : "Fully booked"}
                                        </p>
                                        {avail.slots > 0 && (
                                          <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {avail.slotTimes.slice(0, 6).join(", ")}{avail.slotTimes.length > 6 ? ` +${avail.slotTimes.length - 6} more` : ""} · <span className="underline">View all</span>
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    {avail.slots > 0 && (
                                      <Badge variant="outline" className="text-xs">{avail.slots}</Badge>
                                    )}
                                  </div>
                                  {avail.suggestion && (
                                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
                                      <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                      <p className="text-[10px] text-amber-700 dark:text-amber-300">💡 {avail.suggestion}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Cancelled Appointments Section */}
                            {selDayCancelledApts.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-destructive/20">
                                <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                  <XCircle className="h-3.5 w-3.5" /> Cancelled ({selDayCancelledApts.length})
                                </p>
                                <div className="space-y-1.5">
                                  {selDayCancelledApts.map(apt => (
                                    <div
                                      key={apt.id}
                                      className="flex items-center justify-between rounded-lg border border-destructive/10 bg-destructive/5 p-2.5 cursor-pointer hover:bg-destructive/10 transition-colors opacity-60"
                                      onClick={() => openDetailView(apt)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-xs font-bold text-destructive flex-col leading-tight">
                                          <span className="line-through">{apt.appointment_time.slice(0, 5)}</span>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium line-through text-muted-foreground">{apt.client_name}</p>
                                          <p className="text-xs text-muted-foreground line-through">{getServiceName(apt.service_id)}{apt.price != null ? ` · £${Number(apt.price).toFixed(2)}` : ""}</p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className={cn("text-xs", statusColors.cancelled)}>cancelled</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ) : (
                        /* Default: show all appointments list */
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="font-serif text-base">All Appointments</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {allAppointments.length === 0 ? (
                              <p className="py-12 text-center text-muted-foreground">No appointments found</p>
                            ) : (
                              <>
                                {/* Current & Future Appointments */}
                                {(() => {
                                  const todayStr = format(new Date(), "yyyy-MM-dd");
                                  const currentApts = allAppointments.filter(a => a.appointment_date >= todayStr);
                                  const pastApts = allAppointments.filter(a => a.appointment_date < todayStr);

                                  const renderAptCard = (apt: Appointment) => {
                                    const localityWord = getLocalityWord(apt);
                                    return (
                                    <div
                                      key={apt.id}
                                      className="flex items-center justify-between rounded-lg border border-orange-500/40 bg-card p-2.5 sm:p-3 cursor-pointer hover:bg-muted/50 transition-colors gap-2"
                                      onClick={() => openDetailView(apt)}
                                    >
                                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                        <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary shrink-0">
                                          {format(parseISO(apt.appointment_date), "dd")}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          {localityWord && (
                                            <span className="mb-1 inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                                              {localityWord}
                                            </span>
                                          )}
                                          <p className="text-sm font-medium flex items-center gap-1 flex-wrap">
                                            {apt.client_name}
                                            {getPatientAge(apt.client_email) !== null && <span className="text-xs text-muted-foreground font-normal">({getPatientAge(apt.client_email)})</span>}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                                            {getServiceName(apt.service_id)} · {format(parseISO(apt.appointment_date), "MMM d")}
                                          </p>
                                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
                                              {apt.appointment_time.slice(0, 5)}–{getEndTime(apt)}
                                            </span>
                                            {apt.price != null && (
                                              <span className="inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                                                £{Number(apt.price).toFixed(2)}
                                              </span>
                                            )}
                                            {(apt.consent_form_template_id || services.find(s => s.id === apt.service_id)?.consent_form_template_id) && (
                                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", consentCompletedIds.has(apt.id) ? "bg-success/10 text-success border-success/30" : isNoEmail(apt.client_email) ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-destructive/10 text-destructive border-destructive/30")}>
                                                {consentCompletedIds.has(apt.id) ? "Consent ✓" : isNoEmail(apt.client_email) ? "Consent at Apt" : "Consent ✗"}
                                              </Badge>
                                            )}
                                            {consultNoteCompletedIds.has(apt.id) && <Stethoscope className="h-3 w-3 text-success" />}
                                          </div>
                                          {apt.address && (
                                            <a
                                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.address + (apt.postcode && !apt.address.toUpperCase().includes(apt.postcode.toUpperCase()) ? ", " + apt.postcode : ""))}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="block rounded-md bg-muted/50 px-2 py-1 mt-1 hover:bg-muted transition-colors"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <p className="text-[10px] text-foreground flex items-center gap-1">
                                                <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                                                <span className="truncate underline underline-offset-2">{apt.address}</span>
                                                <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                                              </p>
                                            </a>
                                          )}
                                          <div className={cn("rounded-md bg-amber-500/10 px-2 py-1 mt-1", apt.ai_consent_summary && "cursor-pointer hover:bg-amber-500/20 transition-colors")} onClick={(e) => { if (apt.ai_consent_summary) { e.stopPropagation(); setAiSummaryDialogData({ name: apt.client_name, summary: apt.ai_consent_summary }); setAiSummaryDialogOpen(true); } }}>
                                            <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-snug flex items-center gap-1">
                                              {getAiKeywords(apt.ai_consent_summary)
                                                ? <>💡 {getAiKeywords(apt.ai_consent_summary)} {apt.ai_consent_summary && <Eye className="h-3 w-3 shrink-0 opacity-60" />}</>
                                                : consentCompletedIds.has(apt.id)
                                                  ? <>💡 Consent completed — no AI summary</>
                                                  : isNoEmail(apt.client_email)
                                                    ? <>📋 Consent to be completed at appointment</>
                                                    : <>⚠️ No consent form completed</>
                                              }
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColors[apt.status])}>{apt.status}</Badge>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                                            <DropdownMenuItem onClick={() => openDetailView(apt)}>
                                              <Eye className="mr-2 h-4 w-4" /> View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openEditAppointment(apt)}>
                                              <Pencil className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            {(apt.status === "requested" || apt.status === "pending") && (
                                              <>
                                                <DropdownMenuItem onClick={() => approveAppointment(apt)}>
                                                  <CheckCircle className="mr-2 h-4 w-4 text-success" /> Approve
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openRejectDialog(apt)}>
                                                  <XCircle className="mr-2 h-4 w-4 text-destructive" /> Reject
                                                </DropdownMenuItem>
                                              </>
                                            )}
                                            <DropdownMenuItem onClick={() => openReschedule(apt)}>
                                              <CalendarClock className="mr-2 h-4 w-4" /> Reschedule
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                              const svcName = getServiceName(apt.service_id).toLowerCase();
                                              const consultTemplate = templates.find(t => t.form_type === 'consultation' && t.title.toLowerCase().includes(svcName.split(' ')[0]));
                                              setConsultAptId(apt.id);
                                              setConsultTemplateId(consultTemplate?.id || null);
                                              setConsultFormType('consultation');
                                              setConsultFormOpen(true);
                                            }}>
                                              <Stethoscope className={cn("mr-2 h-4 w-4", consultNoteCompletedIds.has(apt.id) ? "text-success" : "text-muted-foreground")} /> Consultation
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openPaymentForApt(apt)}>
                                              <PoundSterling className="mr-2 h-4 w-4 text-emerald-500" /> Record Payment
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {apt.status !== "completed" ? (
                                              <DropdownMenuItem onClick={async () => {
                                                const r = await offlineMutation({ table: "appointments", operation: "update", data: { status: "completed" }, matchColumn: "id", matchValue: apt.id, successMessage: "Marked as completed" });
                                                if (r.success) {
                                                  fetchAppointments();
                                                  if (!r.queued) {
                                                    const svc = services.find(s => s.id === apt.service_id);
                                                    if (svc?.name?.toLowerCase().includes("cryotherapy")) {
                                                      supabase.functions.invoke("send-cryo-aftercare", { body: { appointmentId: apt.id } });
                                                    }
                                                    // Only show payment dialog if no payment already recorded
                                                    const { data: existingPay } = await (supabase as any).from("appointment_payments").select("*").eq("appointment_id", apt.id).maybeSingle();
                                                    if (!existingPay) {
                                                      setPaymentDialogApt(apt);
                                                      setPaymentDialogExisting(null);
                                                      setPaymentDialogOpen(true);
                                                    }
                                                  }
                                                }
                                              }}>
                                                <CheckCircle className="mr-2 h-4 w-4" /> Mark Appointment Complete
                                              </DropdownMenuItem>
                                            ) : (
                                              <DropdownMenuItem onClick={async () => {
                                                const r = await offlineMutation({ table: "appointments", operation: "update", data: { status: "confirmed" }, matchColumn: "id", matchValue: apt.id, successMessage: "Appointment reopened" });
                                                if (r.success) fetchAppointments();
                                              }}>
                                                <RefreshCw className="mr-2 h-4 w-4" /> Uncomplete Appointment
                                              </DropdownMenuItem>
                                            )}
                                            {(apt.consent_form_template_id || services.find(s => s.id === apt.service_id)?.consent_form_template_id) && !consentCompletedIds.has(apt.id) && (
                                              <DropdownMenuItem onClick={async () => {
                                                const templateId = apt.consent_form_template_id || services.find(s => s.id === apt.service_id)?.consent_form_template_id;
                                                if (!templateId) return;
                                                const { error } = await supabase.from("consent_form_responses").insert({
                                                  appointment_id: apt.id,
                                                  consent_form_template_id: templateId,
                                                  responses: { _manual: true, note: "Manually marked complete by practitioner" },
                                                  status: "completed",
                                                  submitter_name: apt.client_name,
                                                });
                                                if (error) { toast.error("Failed to mark consent complete"); return; }
                                                await supabase.from("scheduled_communications")
                                                  .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                                                  .eq("appointment_id", apt.id)
                                                  .eq("trigger_type", "consent_reminder")
                                                  .eq("status", "pending");
                                                toast.success("Consent marked as complete — reminder emails stopped");
                                                logPatientActivity(apt.client_email, "consent_manual", `Consent manually marked complete for ${getServiceName(apt.service_id)}`);
                                                setConsentCompletedIds(prev => new Set([...prev, apt.id]));
                                                fetchAppointments();
                                              }}>
                                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> Mark Consent Complete
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => sendSmsReminder(apt)} disabled={!apt.client_phone}>
                                              <MessageSquare className="mr-2 h-4 w-4" /> Send SMS
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => sendManualReviewRequest(apt)}>
                                              <Star className="mr-2 h-4 w-4 text-amber-500" /> Send Review Request
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => resendMorningTracking(apt)}>
                                              <RotateCw className="mr-2 h-4 w-4 text-blue-500" /> Resend Morning Tracking
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openDeleteDialog(apt)} className="text-destructive">
                                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  )};

                                  return (
                                    <>
                                      {currentApts.length > 0 && (
                                        <div className="space-y-2">
                                          {currentApts.map(renderAptCard)}
                                        </div>
                                      )}

                                      {pastApts.length > 0 && (
                                        <div className="mt-4">
                                          <Button
                                            variant="ghost"
                                            className="w-full justify-between text-muted-foreground hover:text-foreground"
                                            onClick={() => setPastAptsExpanded(!pastAptsExpanded)}
                                          >
                                            <span className="flex items-center gap-2 text-sm font-medium">
                                              <Clock className="h-4 w-4" /> Past Appointments ({pastApts.length})
                                            </span>
                                            {pastAptsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                          </Button>
                                          {pastAptsExpanded && (
                                            <div className="space-y-2 mt-2">
                                              {pastApts.map(renderAptCard)}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      )}
                  </div>
                </div>

                </div>
              );
            })()}

            {/* BLOCKED TIMES MANAGEMENT */}
            <div className="space-y-4 mt-4">
              <Collapsible>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="font-serif text-sm flex items-center gap-2">
                          <Ban className="h-4 w-4" /> Blocked Times
                        </CardTitle>
                        <CardDescription>Block specific time slots to prevent bookings.</CardDescription>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      {blockedTimes.filter(b => !isBefore(parseISO(b.blocked_date), startOfDay(new Date()))).length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">No blocked times. Select a date above and use "Add Blocked Time".</p>
                      ) : (
                        <div className="space-y-2">
                          {blockedTimes
                            .filter(b => !isBefore(parseISO(b.blocked_date), startOfDay(new Date())))
                            .map((bt) => (
                            <div key={bt.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                                  <Ban className="h-4 w-4 text-destructive" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {format(parseISO(bt.blocked_date), "EEEE, MMM d, yyyy")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {bt.start_time.slice(0, 5)} – {bt.end_time.slice(0, 5)}
                                    {bt.reason && ` · ${bt.reason}`}
                                    {bt.repeat_type !== "none" && (
                                      <span className="ml-1 text-xs">
                                        <Repeat className="inline h-3 w-3 mr-0.5" />
                                        {bt.repeat_type}{bt.repeat_until ? ` until ${format(parseISO(bt.repeat_until), "MMM d")}` : ""}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {bt.repeat_group_id && (
                                  <Button variant="outline" size="sm" className="text-xs" onClick={() => removeBlockedGroup(bt.repeat_group_id!)}>
                                    <Trash2 className="mr-1 h-3 w-3" /> Remove All
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => removeBlockedTime(bt.id)} title="Remove this block only">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Calendar Subscription */}
            <div className="mt-4">
              <Collapsible>
              <Card>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between">
                      <CardTitle className="font-serif text-sm flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" /> Calendar Subscriptions
                      </CardTitle>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-blue-600">📘 My Calendar (Full Details)</p>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed`.replace(/^https?:\/\//, "webcal://")}
                        className="text-xs font-mono bg-muted"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20"
                        onClick={() => {
                          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed`.replace(/^https?:\/\//, "webcal://");
                          navigator.clipboard.writeText(url);
                          toast.success("Copied!");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-pink-600">🩷 Associate Calendar (Confidential)</p>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed-associate`.replace(/^https?:\/\//, "webcal://")}
                        className="text-xs font-mono bg-muted"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-pink-500/10 text-pink-600 border-pink-500/30 hover:bg-pink-500/20"
                        onClick={() => {
                          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed-associate`.replace(/^https?:\/\//, "webcal://");
                          navigator.clipboard.writeText(url);
                          toast.success("Copied!");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Shows initials & town only. No patient names or contact details.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-green-600">🚗 Travel Times</p>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed-travel`.replace(/^https?:\/\//, "webcal://")}
                        className="text-xs font-mono bg-muted"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20"
                        onClick={() => {
                          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed-travel`.replace(/^https?:\/\//, "webcal://");
                          navigator.clipboard.writeText(url);
                          toast.success("Copied!");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Separate calendar for travel times — set a different colour on your iPhone.</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">iPhone: Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → paste URL</p>
                </CardContent>
                </CollapsibleContent>
              </Card>
              </Collapsible>
            </div>

            {/* Mark as Open / Edit Open Hours Dialog */}
            <Dialog open={markOpenDialogOpen} onOpenChange={setMarkOpenDialogOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{selectedDate && availableDates.find(d => d.available_date === format(selectedDate, "yyyy-MM-dd")) ? "Edit Open Hours" : "Mark as Open"}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Set working hours for <span className="font-medium text-foreground">{selectedDate ? format(selectedDate, "EEEE, MMMM d") : ""}</span>
                </p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Time</Label>
                    <Select value={String(markOpenStartHour)} onValueChange={v => setMarkOpenStartHour(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 61 }, (_, i) => 6 + i * 0.25).filter(h => h <= 21).map(h => {
                          const hrs = Math.floor(h);
                          const mins = Math.round((h - hrs) * 60);
                          return <SelectItem key={h} value={String(h)}>{String(hrs).padStart(2, "0")}:{String(mins).padStart(2, "0")}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Time</Label>
                    <Select value={String(markOpenEndHour)} onValueChange={v => setMarkOpenEndHour(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 61 }, (_, i) => 6 + i * 0.25).filter(h => h <= 21).map(h => {
                          const hrs = Math.floor(h);
                          const mins = Math.round((h - hrs) * 60);
                          return <SelectItem key={h} value={String(h)}>{String(hrs).padStart(2, "0")}:{String(mins).padStart(2, "0")}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {markOpenStartHour >= markOpenEndHour && (
                  <p className="text-xs text-destructive">End hour must be after start hour</p>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setMarkOpenDialogOpen(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    disabled={markOpenStartHour >= markOpenEndHour}
                    onClick={async () => {
                      if (!selectedDate) return;
                      const dateStr = format(selectedDate, "yyyy-MM-dd");
                      const existing = availableDates.find(d => d.available_date === dateStr);
                      if (existing) {
                        // Update existing hours
                        await updateAvailableDateHours(existing.id, markOpenStartHour, markOpenEndHour);
                      } else {
                        // Insert new
                        const { error } = await supabase.from("available_dates").insert({
                          available_date: dateStr,
                          start_hour: markOpenStartHour,
                          end_hour: markOpenEndHour,
                        });
                        if (error) toast.error("Failed to add date");
                        else { toast.success(`${format(selectedDate, "MMM d")} marked open (${fmtHourMin(markOpenStartHour)}–${fmtHourMin(markOpenEndHour)})`); fetchAvailableDates(); }
                      }
                      setMarkOpenDialogOpen(false);
                    }}
                  >
                    <CalendarCheck className="mr-1.5 h-3.5 w-3.5" /> Confirm
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={blockDialogOpen} onOpenChange={(open) => { setBlockDialogOpen(open); if (!open) setEditingBlockId(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif flex items-center gap-2">
                    <Ban className="h-5 w-5 text-destructive" /> {editingBlockId ? "Edit Blocked Time" : "Block Time"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time *</Label>
                      <Input type="time" value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time *</Label>
                      <Input type="time" value={blockEndTime} onChange={(e) => setBlockEndTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (optional)</Label>
                    <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="e.g. Lunch break, Training, Holiday" maxLength={200} />
                  </div>
                  {!editingBlockId && (
                    <>
                      <div className="space-y-2">
                        <Label>Repeat</Label>
                        <Select value={blockRepeatType} onValueChange={setBlockRepeatType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No repeat</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                            <SelectItem value="custom">Custom interval…</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {blockRepeatType === "custom" && (
                        <div className="space-y-2">
                          <Label>Repeat every (days) *</Label>
                          <Input type="number" min={2} max={365} value={blockCustomIntervalDays} onChange={(e) => setBlockCustomIntervalDays(parseInt(e.target.value) || 14)} />
                        </div>
                      )}
                      {blockRepeatType !== "none" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Switch checked={blockRepeatForever} onCheckedChange={(v) => { setBlockRepeatForever(v); if (v) setBlockRepeatUntil(""); }} />
                            <Label className="mb-0">Repeat forever</Label>
                          </div>
                          {!blockRepeatForever && (
                            <>
                              <Label>Repeat Until *</Label>
                              <Input type="date" value={blockRepeatUntil} onChange={(e) => setBlockRepeatUntil(e.target.value)} min={blockDate} />
                            </>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {blockRepeatForever
                              ? `Will create slots every ${blockRepeatType === "weekly" ? "week" : blockRepeatType === "biweekly" ? "2 weeks" : blockRepeatType === "custom" ? `${blockCustomIntervalDays} days` : "day"} for 2 years ahead.`
                              : `This will create individual blocked slots every ${blockRepeatType === "weekly" ? "week" : blockRepeatType === "biweekly" ? "2 weeks" : blockRepeatType === "custom" ? `${blockCustomIntervalDays} days` : "day"} until this date.`}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  <Button onClick={editingBlockId ? updateBlockedTime : addBlockedTime} className="w-full" disabled={!blockDate || !blockStartTime || !blockEndTime || (!editingBlockId && blockRepeatType !== "none" && !blockRepeatForever && !blockRepeatUntil)}>
                    {editingBlockId ? "Update Block" : blockRepeatType !== "none" ? "Block Recurring Time" : "Block Time"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Available Slots Detail Dialog */}
            <Dialog open={slotsDetailOpen} onOpenChange={setSlotsDetailOpen}>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-serif flex items-center gap-2">
                    <CalendarPlus className="h-5 w-5 text-primary" />
                    Available Slots — {slotsDetailDate ? format(parseISO(slotsDetailDate), "EEEE, d MMMM") : ""}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  {slotsDetailData.slots > 0
                    ? `${slotsDetailData.slots} bookable time slot${slotsDetailData.slots !== 1 ? "s" : ""} remaining. Tap a slot to take action.`
                    : "No available slots for this day."}
                </p>
                {slotsDetailData.suggestion && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                    <TrendingUp className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">💡 {slotsDetailData.suggestion}</p>
                  </div>
                )}
                {slotsDetailData.slots > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {slotsDetailData.slotTimes.map(slot => (
                      <DropdownMenu key={slot}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between text-sm font-mono h-10 bg-background hover:bg-primary/10 hover:border-primary/40">
                            <Clock className="h-3.5 w-3.5 text-primary mr-1.5" />
                            {slot}
                            <ChevronDown className="h-3 w-3 ml-auto opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 z-50 bg-popover border shadow-lg">
                          <DropdownMenuItem onClick={() => {
                            setSlotsDetailOpen(false);
                            setEditingApt(null);
                            setAptName(""); setAptEmail(""); setAptPhone("");
                            setAptDate(slotsDetailDate); setAptTime(slot);
                            setAptNotes(""); setAptAddress(""); setAptServiceId(null); setAptStatus("confirmed");
                            setAptPrice(""); setPatientSuggestions([]); setShowPatientSuggestions(false);
                            setAptSendNotification(true); setAptTimeOverride(false); setAptHasEmail(true);
                            setAptLatitude(null); setAptLongitude(null); setAptTravelFee(null); setAptTravelDistance(null); setAptLocality("");
                            setAptPostcode(""); setAptMapVisible(false); setAptAddressList([]); setAptManualAddress(false);
                            setAptAdditionalPeople([]);
                            setAptDialogOpen(true);
                          }}>
                            <Plus className="h-4 w-4 mr-2" /> Book Appointment
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setSlotsDetailOpen(false);
                            setBreakPickerType("lunch");
                            setBreakPickerDate(slotsDetailDate);
                            setBreakDuration(60);
                            setBreakSelectedSlot(slot);
                            setBreakPickerOpen(true);
                          }}>
                            <Coffee className="h-4 w-4 mr-2" /> Add Lunch Break
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSlotsDetailOpen(false);
                            setBreakPickerType("mobile");
                            setBreakPickerDate(slotsDetailDate);
                            setBreakDuration(30);
                            setBreakSelectedSlot(slot);
                            setBreakPickerOpen(true);
                          }}>
                            <Clock className="h-4 w-4 mr-2" /> Add Mobile Break
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={async () => {
                            const endMinutes = parseInt(slot.slice(0, 2)) * 60 + parseInt(slot.slice(3, 5)) + 60;
                            const endStr = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;
                            const { error } = await supabase.from("blocked_times").insert({
                              blocked_date: slotsDetailDate,
                              start_time: slot + ":00",
                              end_time: endStr + ":00",
                              reason: "Blocked",
                              repeat_type: "none",
                            });
                            if (error) { toast.error("Failed to block time"); return; }
                            toast.success(`Blocked ${slot} – ${endStr}`);
                            fetchBlockedTimes();
                            // Refresh the dialog data
                            const dateOpen = availableDates.find(d => d.available_date === slotsDetailDate);
                            const dayApts = allAppointments.filter(a => a.appointment_date === slotsDetailDate && a.status !== "cancelled" && a.status !== "rejected");
                            const dayBlks = blockedTimes.filter(b => b.blocked_date === slotsDetailDate);
                            setSlotsDetailData(computeAvailableSlots(slotsDetailDate, dayApts, dayBlks, dateOpen));
                          }}>
                            <Ban className="h-4 w-4 mr-2" /> Block This Time
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Break Slot Picker Dialog */}
            <Dialog open={breakPickerOpen} onOpenChange={setBreakPickerOpen}>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-serif flex items-center gap-2">
                    <Coffee className="h-5 w-5 text-emerald-500" /> {breakPickerType === "lunch" ? "Add Lunch Break" : "Add Mobile Break"}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Pick a time slot for <span className="font-medium text-foreground">{breakPickerDate ? format(parseISO(breakPickerDate), "EEEE, MMMM d") : ""}</span>
                </p>
                
                {/* Duration selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Break Duration</Label>
                  <div className="flex gap-2">
                    {[30, 45, 60, 90].map(d => (
                      <Button
                        key={d}
                        size="sm"
                        variant={breakDuration === d ? "default" : "outline"}
                        className="text-xs flex-1"
                        onClick={() => { setBreakDuration(d); setBreakSelectedSlot(null); }}
                      >
                        {d} min
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Slot grid */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Available Slots</Label>
                  {computeBreakSlots.filter(s => s.available).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No available {breakDuration}-minute slots on this day.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 max-h-60 overflow-y-auto">
                      {computeBreakSlots.map(slot => (
                        <Button
                          key={slot.time}
                          size="sm"
                          variant={breakSelectedSlot === slot.time ? "default" : "outline"}
                          disabled={!slot.available}
                          className={cn(
                            "text-xs h-9",
                            slot.available 
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20 dark:text-emerald-300" 
                              : "opacity-40 line-through",
                            breakSelectedSlot === slot.time && "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
                          )}
                          onClick={() => setBreakSelectedSlot(slot.time)}
                          title={slot.available ? `${slot.time}–${slot.endTime}` : `Conflicts with ${slot.conflict}`}
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {breakSelectedSlot && (
                  <p className="text-sm text-muted-foreground">
                    Selected: <span className="font-medium text-foreground">{breakSelectedSlot}–{computeBreakSlots.find(s => s.time === breakSelectedSlot)?.endTime}</span> ({breakDuration} min)
                  </p>
                )}

                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => setBreakPickerOpen(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    disabled={!breakSelectedSlot}
                    onClick={confirmBreakSlot}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Coffee className="mr-1.5 h-3.5 w-3.5" /> Add Break
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={aptDialogOpen} onOpenChange={setAptDialogOpen}>
              <DialogContent className="max-w-lg w-[calc(100vw-1rem)] max-h-[85vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="font-serif">{editingApt ? "Edit Appointment" : "New Appointment"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 min-w-0 [&_*]:min-w-0">
                  {/* 1. Presenting Complaint / Notes — at the very top */}
                  <div className={cn("space-y-2 rounded-md border p-3", !aptHasEmail ? "border-blue-200 dark:border-blue-800 bg-blue-500/5" : "border-muted")}>
                    <div className="flex items-center gap-2">
                      <Label>Presenting Complaint / Notes {!aptHasEmail ? "*" : ""}</Label>
                      {!aptHasEmail && (
                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300">
                          <Phone className="h-2.5 w-2.5 mr-1" /> Verbal Consent
                        </Badge>
                      )}
                    </div>
                    <Textarea value={aptNotes} onChange={(e) => setAptNotes(e.target.value)} maxLength={1000} rows={3} placeholder="Describe the patient's issue, symptoms, medical history, allergies etc." />
                    <p className="text-[10px] text-muted-foreground">
                      {!aptHasEmail ? "This replaces the consent form. " : ""}AI will generate a clinical summary from these notes.
                    </p>
                  </div>

                  {/* 2. Client Name & Phone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 relative">
                      <Label>Client Name *</Label>
                      <Input value={aptName} onChange={(e) => { setAptName(e.target.value); if (!editingApt) searchPatients(e.target.value); }} maxLength={100} autoComplete="off" />
                      {showPatientSuggestions && patientSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                          {patientSuggestions.map((p, idx) => (
                            <button key={idx} className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors border-b last:border-b-0" onClick={() => selectPatient(p)}>
                              <p className="font-medium">{p.client_name}</p>
                              <p className="text-xs text-muted-foreground">{p.client_email}{p.client_phone ? ` · ${p.client_phone}` : ""}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input type="tel" value={aptPhone} onChange={(e) => setAptPhone(e.target.value)} maxLength={20} />
                    </div>
                  </div>

                  {/* 3. Service */}
                  <div className="space-y-2">
                    <Label>Service</Label>
                    <Select value={aptServiceId || "none"} onValueChange={(v) => {
                      const svcId = v === "none" ? null : v;
                      setAptServiceId(svcId);
                      if (svcId) {
                        const svc = services.find(s => s.id === svcId);
                        if (svc?.price != null) setAptPrice(String(svc.price));
                        if (svc?.duration_minutes) setAptDurationOverride(String(svc.duration_minutes));
                      }
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No service</SelectItem>
                        {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Postcode & Address */}
                  <div className="space-y-3">
                    {/* Postcode search first */}
                    <div className="space-y-2">
                      <Label>Postcode (for mileage & map)</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={aptPostcode}
                            onChange={(e) => setAptPostcode(e.target.value.toUpperCase())}
                            placeholder="e.g. DT1 1JJ"
                            className="pl-9 uppercase"
                            maxLength={10}
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!aptPostcode.trim() || aptTravelLoading}
                          onClick={async () => {
                            const pc = aptPostcode.trim();
                            if (!pc) return;
                            setAptTravelLoading(true);
                            try {
                              const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-fee-check`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
                                body: JSON.stringify({ postcode: pc }),
                              });
                              if (resp.ok) {
                                const data = await resp.json();
                                setAptTravelFee(data.travel_fee ?? 0);
                                setAptTravelDistance(data.distance_miles ?? null);
                                if (data.locality) setAptLocality(data.locality);
                              }
                              if (window.google?.maps) {
                                setAptGeocoding(true);
                                const geocoder = new window.google.maps.Geocoder();
                                geocoder.geocode({ address: pc, componentRestrictions: { country: "gb" } }, (results: any, status: any) => {
                                  if (status === "OK" && results?.[0]) {
                                    const pos = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };
                                    setAptLatitude(pos.lat);
                                    setAptLongitude(pos.lng);
                                    setAptMapVisible(true);
                                  }
                                  setAptGeocoding(false);
                                });
                              } else if (googleMapsKey) {
                                const script = document.createElement("script");
                                script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places`;
                                script.async = true;
                                script.onload = () => {
                                  setAptGeocoding(true);
                                  const geocoder = new window.google.maps.Geocoder();
                                  geocoder.geocode({ address: pc, componentRestrictions: { country: "gb" } }, (results: any, status: any) => {
                                    if (status === "OK" && results?.[0]) {
                                      const pos = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };
                                      setAptLatitude(pos.lat);
                                      setAptLongitude(pos.lng);
                                      setAptMapVisible(true);
                                    }
                                    setAptGeocoding(false);
                                  });
                                };
                                document.head.appendChild(script);
                              }
                              // Also fetch address list for this postcode
                              setAptAddressLoading(true);
                              setAptManualAddress(false);
                              try {
                                const addrResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/address-lookup`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
                                  body: JSON.stringify({ postcode: pc }),
                                });
                                if (addrResp.ok) {
                                  const addrData = await addrResp.json();
                                  setAptAddressList(addrData.addresses || []);
                                  if (!addrData.addresses?.length) setAptManualAddress(true);
                                }
                              } catch { /* ignore */ } finally {
                                setAptAddressLoading(false);
                              }
                            } catch (e: any) {
                              toast.error("Failed to check postcode");
                            } finally {
                              setAptTravelLoading(false);
                            }
                          }}
                        >
                          {aptTravelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Car className="h-4 w-4 mr-1" /> Check Mileage &amp; Map</>}
                        </Button>
                      </div>
                    </div>

                    {/* Travel fee result */}
                    {aptTravelDistance != null && (
                      <div className={cn("rounded-lg p-3 text-sm border", aptTravelFee && aptTravelFee > 0 ? "bg-warning/10 border-warning/30" : "bg-success/10 border-success/30")}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{aptTravelFee && aptTravelFee > 0 ? `Travel fee: £${aptTravelFee.toFixed(2)}` : "No travel fee 🎉"}</p>
                            <p className="text-xs text-muted-foreground">{aptTravelDistance} miles from base</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Label className="text-xs whitespace-nowrap">Override £</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              className="w-20 h-8 text-sm"
                              value={aptTravelFee ?? ""}
                              onChange={(e) => setAptTravelFee(e.target.value === "" ? null : parseFloat(e.target.value))}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Geocoding indicator */}
                    {aptGeocoding && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Locating on map...</p>}

                    {/* Satellite Map */}
                    {aptMapVisible && aptLatitude && aptLongitude && googleMapsKey && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Confirm location (drag pin to adjust — address won't change)</p>
                          <Button type="button" variant="ghost" size="sm" className="text-xs h-6" onClick={() => setAptMapVisible(false)}>Hide</Button>
                        </div>
                        <div
                          className="h-[200px] w-full overflow-hidden rounded-lg border"
                          ref={(el) => {
                            if (!el || !window.google?.maps || el.dataset.initialized) return;
                            el.dataset.initialized = "true";
                            const map = new window.google.maps.Map(el, {
                              center: { lat: aptLatitude!, lng: aptLongitude! },
                              zoom: 16,
                              mapTypeId: "hybrid",
                              disableDefaultUI: true,
                              zoomControl: true,
                            });
                            const marker = new window.google.maps.Marker({
                              position: { lat: aptLatitude!, lng: aptLongitude! },
                              map,
                              draggable: true,
                              title: "Drag to fine-tune location",
                            });
                            marker.addListener("dragend", () => {
                              const pos = marker.getPosition();
                              if (pos) {
                                setAptLatitude(pos.lat());
                                setAptLongitude(pos.lng());
                              }
                            });
                          }}
                        />
                      </div>
                    )}

                    {!aptMapVisible && aptLatitude && aptLongitude && (
                      <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setAptMapVisible(true)}>
                        <MapPin className="mr-1 h-3 w-3" /> Show map
                      </Button>
                    )}

                    {/* Come to Me Button */}
                    <Button
                      variant={aptComeToPractitioner ? "default" : "outline"}
                      size="sm"
                      className="w-full gap-2 text-sm"
                      onClick={() => {
                        const next = !aptComeToPractitioner;
                        setAptComeToPractitioner(next);
                        if (next) {
                          setAptAddress("22 St Martins Close, Broadmayne, Dorchester");
                          setAptPostcode("DT2 8DG");
                          setAptLatitude(50.6888);
                          setAptLongitude(-2.4422);
                          setAptTravelFee(0);
                          setAptTravelDistance(0);
                          setAptLocality("Broadmayne");
                        } else {
                          setAptAddress("");
                          setAptPostcode("");
                          setAptLatitude(null);
                          setAptLongitude(null);
                          setAptTravelFee(null);
                          setAptTravelDistance(null);
                          setAptLocality("");
                        }
                      }}
                    >
                      <Home className="h-4 w-4" />
                      {aptComeToPractitioner ? "✓ Coming to My Home" : "Patient Coming to Me"}
                    </Button>
                    {aptComeToPractitioner && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <Home className="h-4 w-4 text-primary" /> Practitioner's Home
                        </p>
                        <p className="text-xs text-muted-foreground">22 St Martins Close, Broadmayne, DT2 8DG</p>
                        <p className="text-[10px] text-muted-foreground">ℹ️ Use "I'm Ready" on appointment day to notify patient with tracking & directions.</p>
                      </div>
                    )}

                    {/* Address */}
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Textarea value={aptAddress} onChange={(e) => setAptAddress(e.target.value)} placeholder="Home address..." maxLength={500} rows={2} />
                    </div>
                  </div>

                  {/* 5. Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !aptDate && "text-muted-foreground")}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {aptDate ? format(parseISO(aptDate), "MMM d, yyyy") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={aptDate ? parseISO(aptDate) : undefined}
                            onSelect={(d) => { if (d) { setAptDate(format(d, "yyyy-MM-dd")); setAptTime(""); } }}
                            modifiers={{ open: openDatesSet }}
                            modifiersClassNames={{ open: "!bg-success/20 !text-success font-semibold" }}
                            disabled={(d) => isBefore(d, startOfDay(new Date()))}
                          />
                          <div className="px-3 pb-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-success/20 border border-success/40" /> Open</span>
                            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted border" /> Closed</span>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Time *</Label>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <input type="checkbox" checked={aptTimeOverride} onChange={(e) => setAptTimeOverride(e.target.checked)} className="h-3 w-3 rounded" />
                          Override
                        </label>
                      </div>
                      {aptTimeOverride ? (
                        <Input type="time" value={aptTime} onChange={(e) => setAptTime(e.target.value)} />
                      ) : aptAvailableSlots.length > 0 ? (
                        <div>
                          {aptAvailableSlots.some(s => s.status === "recommended") && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1.5 flex items-center gap-1">⭐ Yellow = recommended (less travel / fewer gaps)</p>
                          )}
                          <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto rounded-md border p-2">
                            {aptAvailableSlots.map(slot => {
                              const isSelected = aptTime === slot.time;
                              const isTaken = slot.status === "taken";
                              const isRecommended = slot.status === "recommended";
                              return (
                                <Button
                                  key={slot.time}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={cn(
                                    "text-xs h-7 font-medium",
                                    isTaken && !aptTimeOverride && "bg-destructive/15 text-destructive line-through opacity-60 border-destructive/30 hover:bg-destructive/20",
                                    isTaken && aptTimeOverride && !isSelected && "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20",
                                    !isTaken && !isRecommended && !isSelected && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25",
                                    isRecommended && !isSelected && "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/30 ring-1 ring-amber-500/30",
                                  )}
                                  disabled={isTaken && !aptTimeOverride}
                                  onClick={() => setAptTime(slot.time)}
                                >
                                  {slot.time}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ) : aptDate ? (
                        <p className="text-xs text-muted-foreground py-2">No available slots for this date</p>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2">Select a date first</p>
                      )}
                    </div>
                  </div>

                  {/* 5b. Duration & End Time (edit only) */}
                  {editingApt && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Duration (mins)</Label>
                        <Input
                          type="number"
                          min={5}
                          max={480}
                          step={5}
                          value={aptDurationOverride}
                          onChange={(e) => setAptDurationOverride(e.target.value)}
                          placeholder="e.g. 60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
                          {aptTime && aptDurationOverride ? (() => {
                            const [h, m] = aptTime.split(":").map(Number);
                            const totalMins = h * 60 + m + parseInt(aptDurationOverride);
                            const endH = Math.floor(totalMins / 60) % 24;
                            const endM = totalMins % 60;
                            return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
                          })() : "—"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6. Price */}
                  <div className="space-y-2">
                    <Label>Price (£)</Label>
                    <Input type="number" step="0.01" value={aptPrice} onChange={(e) => setAptPrice(e.target.value)} placeholder="e.g. 45.00" min={0} />
                  </div>

                  {/* 6b. Recurring Appointment */}
                  {!editingApt && (
                    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Repeat className="h-4 w-4 text-primary" /> Recurring Appointment
                        </Label>
                        <Switch checked={aptRecurring} onCheckedChange={setAptRecurring} />
                      </div>
                      {aptRecurring && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Repeat every</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {[2, 4, 6, 8, 10, 12].map(w => (
                                <button
                                  key={w}
                                  type="button"
                                  onClick={() => setAptRecurringWeeks(w)}
                                  className={cn(
                                    "px-3 py-1.5 text-xs rounded-full border transition-colors",
                                    aptRecurringWeeks === w
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted/50 text-foreground border-border hover:bg-muted"
                                  )}
                                >
                                  {w} weeks
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Number of future appointments</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {[1, 2, 3, 4, 5, 6].map(c => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setAptRecurringCount(c)}
                                  className={cn(
                                    "px-3 py-1.5 text-xs rounded-full border transition-colors",
                                    aptRecurringCount === c
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted/50 text-foreground border-border hover:bg-muted"
                                  )}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                          {aptDate && (
                            <div className="rounded-md border bg-background p-2 text-xs space-y-1">
                              <p className="font-medium">Preview — {aptRecurringCount + 1} appointments total:</p>
                              {Array.from({ length: aptRecurringCount + 1 }, (_, i) => {
                                const d = i === 0 ? parseISO(aptDate) : addWeeks(parseISO(aptDate), aptRecurringWeeks * i);
                                return (
                                  <p key={i} className="text-muted-foreground">
                                    {i === 0 ? "→ " : "  "}{format(d, "EEEE d MMM yyyy")}{i === 0 ? " (this booking)" : ""}
                                    {aptPrice ? ` — £${aptPrice}` : ""}
                                  </p>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recurring series indicator when editing */}
                  {editingApt?.recurring_group_id && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Part of a recurring series</p>
                        <p className="text-xs text-muted-foreground">Every {editingApt.recurring_interval_weeks} weeks · Editing this appointment only</p>
                      </div>
                    </div>
                  )}

                   {/* 7. Additional People */}
                   <div className="space-y-3 rounded-lg border border-secondary/20 bg-secondary/5 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-secondary" /> {editingApt ? "Group Members" : "Additional People"}
                        </Label>
                        {aptAdditionalPeople.length < 2 && (
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setAptAdditionalPeople(prev => [...prev, { name: "", email: "", phone: "" }])}>
                            <UserPlus className="h-3 w-3" /> Add Person
                          </Button>
                        )}
                      </div>

                      {/* Show existing group members when editing */}
                      {editingApt && aptExistingGroupMembers.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Existing members</p>
                          {aptExistingGroupMembers.map(m => (
                            <div key={m.id} className="rounded-md border bg-muted/30 p-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-xs font-medium truncate flex-1 min-w-0">{m.client_name}</span>
                                <Badge variant="outline" className="text-[9px] h-4">{m.status}</Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={async () => {
                                    if (!confirm(`Remove ${m.client_name} from this group? This cancels their appointment.`)) return;
                                    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", m.id);
                                    if (error) { toast.error("Failed to remove"); return; }
                                    setAptExistingGroupMembers(prev => prev.filter(x => x.id !== m.id));
                                    toast.success("Removed from group");
                                    fetchAppointments();
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <Input
                                value={m.client_name}
                                onChange={(e) => setAptExistingGroupMembers(prev => prev.map(x => x.id === m.id ? { ...x, client_name: e.target.value } : x))}
                                onBlur={async (e) => {
                                  await supabase.from("appointments").update({ client_name: e.target.value }).eq("id", m.id);
                                }}
                                className="h-7 text-xs"
                                placeholder="Name"
                              />
                              <Input
                                value={m.client_phone || ""}
                                onChange={(e) => setAptExistingGroupMembers(prev => prev.map(x => x.id === m.id ? { ...x, client_phone: e.target.value } : x))}
                                onBlur={async (e) => {
                                  await supabase.from("appointments").update({ client_phone: e.target.value }).eq("id", m.id);
                                }}
                                className="h-7 text-xs"
                                placeholder="Phone"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {aptAdditionalPeople.length === 0 && aptExistingGroupMembers.length === 0 && (
                        <p className="text-xs text-muted-foreground">No additional people — single person booking</p>
                      )}
                      {aptAdditionalPeople.length === 0 && editingApt && aptExistingGroupMembers.length > 0 && (
                        <p className="text-xs text-muted-foreground">Click "Add Person" to add more people to this group</p>
                      )}
                      {aptAdditionalPeople.map((person, i) => (
                        <div key={i} className="rounded-md border bg-background p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">New Person {aptExistingGroupMembers.length + i + 2}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setAptAdditionalPeople(prev => prev.filter((_, j) => j !== i))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Relationship (if name unknown)</Label>
                            <div className="flex flex-wrap gap-1">
                              {["Dad","Mum","Son","Daughter","Partner","Husband","Wife","Friend","Family Member","Carer"].map(rel => (
                                <Button
                                  key={rel}
                                  type="button"
                                  variant={person.relationship_label === rel ? "default" : "outline"}
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() => {
                                    const u = [...aptAdditionalPeople];
                                    const newLabel = u[i].relationship_label === rel ? undefined : rel;
                                    const autoName = newLabel && aptName.trim() ? `${newLabel} of ${aptName.trim()}` : u[i].name;
                                    u[i] = { ...u[i], relationship_label: newLabel, name: newLabel ? autoName : u[i].name };
                                    setAptAdditionalPeople(u);
                                  }}
                                >
                                  {rel}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <Input placeholder="Full name *" value={person.name} onChange={(e) => { const u = [...aptAdditionalPeople]; u[i] = { ...u[i], name: e.target.value }; setAptAdditionalPeople(u); }} className="h-8 text-sm" maxLength={100} />
                          <Input placeholder="Email (optional)" type="email" value={person.email} onChange={(e) => { const u = [...aptAdditionalPeople]; u[i] = { ...u[i], email: e.target.value }; setAptAdditionalPeople(u); }} className="h-8 text-sm" />
                          <Input placeholder="Phone" type="tel" value={person.phone} onChange={(e) => { const u = [...aptAdditionalPeople]; u[i] = { ...u[i], phone: e.target.value }; setAptAdditionalPeople(u); }} className="h-8 text-sm" maxLength={20} />
                        </div>
                      ))}
                    </div>

                  {/* 8. Consent - email or verbal */}
                  <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Consent</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm font-medium">Does the patient have an email?</Label>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant={aptHasEmail ? "default" : "outline"} size="sm" className="h-7 px-3 text-xs" onClick={() => { setAptHasEmail(true); }}>Yes</Button>
                        <Button type="button" variant={!aptHasEmail ? "default" : "outline"} size="sm" className="h-7 px-3 text-xs" onClick={() => { setAptHasEmail(false); setAptEmail(""); }}>No</Button>
                      </div>
                    </div>
                    {aptHasEmail && (
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={aptEmail} onChange={(e) => setAptEmail(e.target.value)} maxLength={255} placeholder="patient@example.com" />
                        <p className="text-[10px] text-muted-foreground">
                          A consent form will be sent to this email for the patient to complete before their appointment.
                        </p>
                      </div>
                    )}
                    {!aptHasEmail && (
                      <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-2.5">
                        <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          Verbal consent will be recorded — ensure presenting complaint is filled in above.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={aptStatus} onValueChange={setAptStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="requested">Requested</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {!editingApt && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="send-notification-checkbox"
                        checked={aptSendNotification}
                        onChange={(e) => setAptSendNotification(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="send-notification-checkbox" className="text-sm font-normal cursor-pointer">
                        Send confirmation email/text to patient
                      </Label>
                    </div>
                  )}
                  <Button onClick={saveAppointment} className="w-full">
                    {editingApt ? "Save Changes" : "Create Appointment"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Recurring Edit Prompt Dialog */}
            <AlertDialog open={recurringEditPromptOpen} onOpenChange={setRecurringEditPromptOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif flex items-center gap-2">
                    <Repeat className="h-5 w-5 text-primary" /> Edit Recurring Appointment
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This appointment is part of a recurring series (every {pendingRecurringEdit?.recurring_interval_weeks} weeks). Would you like to edit just this appointment, or apply changes to all future appointments in the series?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-2 py-2">
                  <button
                    onClick={() => setRecurringEditChoice("this")}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      recurringEditChoice === "this" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <p className="text-sm font-medium">This appointment only</p>
                    <p className="text-xs text-muted-foreground">Changes apply to just this one booking</p>
                  </button>
                  <button
                    onClick={() => setRecurringEditChoice("future")}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      recurringEditChoice === "future" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <p className="text-sm font-medium">This and all future appointments</p>
                    <p className="text-xs text-muted-foreground">Changes apply to this and all upcoming appointments in the series</p>
                  </button>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    if (pendingRecurringEdit) {
                      doOpenEditAppointment(pendingRecurringEdit);
                    }
                    setRecurringEditPromptOpen(false);
                  }}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif">{isReoffer ? "Offer New Alternative" : "Reject Appointment"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {isReoffer ? "Offering a new alternative to" : "Rejecting appointment for"} <strong>{rejectingApt?.client_name}</strong> — {getServiceName(rejectingApt?.service_id || null)}
                  </p>
                  <div className="space-y-2">
                    <Label>Message to client</Label>
                    <Textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="Reason for rejection or additional notes..." rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Suggest alternative date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !rejectAltDate && "text-muted-foreground")}>
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {rejectAltDate ? format(parseISO(rejectAltDate), "MMM d, yyyy") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={rejectAltDate ? parseISO(rejectAltDate) : undefined}
                          onSelect={(d) => { if (d) { setRejectAltDate(format(d, "yyyy-MM-dd")); setRejectAltTime(""); } }}
                          modifiers={{ open: openDatesSet }}
                          modifiersClassNames={{ open: "!bg-success/20 !text-success font-semibold" }}
                          disabled={(d) => isBefore(d, startOfDay(new Date()))}
                        />
                        <div className="px-3 pb-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-success/20 border border-success/40" /> Open</span>
                          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted border" /> Closed</span>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {rejectAltDate && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Suggest alternative time</Label>
                        <div className="flex items-center gap-2">
                          <Checkbox id="reject-override" checked={rejectTimeOverride} onCheckedChange={(c) => setRejectTimeOverride(!!c)} />
                          <Label htmlFor="reject-override" className="text-xs font-normal text-muted-foreground cursor-pointer">Manual Override</Label>
                        </div>
                      </div>
                      {rejectTimeOverride ? (
                        <Input type="time" value={rejectAltTime} onChange={(e) => setRejectAltTime(e.target.value)} />
                      ) : rejectAvailableSlots.length > 0 ? (
                        <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto rounded-md border p-2">
                          {rejectAvailableSlots.map(slot => (
                            <Button
                              key={slot.time}
                              type="button"
                              variant={rejectAltTime === slot.time ? "default" : "outline"}
                              size="sm"
                              className={cn("text-xs h-7", !slot.available && "opacity-40 line-through")}
                              disabled={!slot.available}
                              onClick={() => setRejectAltTime(slot.time)}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No available slots for this date</p>
                      )}
                    </div>
                  )}
                  <Button onClick={rejectAppointment} variant={isReoffer ? "default" : "destructive"} className="w-full">
                    {isReoffer ? "Send New Alternative" : "Reject & Notify Client"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Reschedule Dialog */}
            <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif flex items-center gap-2">
                    <CalendarClock className="h-5 w-5" /> Reschedule Appointment
                  </DialogTitle>
                </DialogHeader>
                {rescheduleApt && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Rescheduling <strong>{rescheduleApt.client_name}</strong>'s appointment
                      (currently {format(parseISO(rescheduleApt.appointment_date), "MMM d, yyyy")} at {rescheduleApt.appointment_time.slice(0, 5)})
                    </p>
                    <div className="space-y-2">
                      <Label>New Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !rescheduleDate && "text-muted-foreground")}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {rescheduleDate ? format(parseISO(rescheduleDate), "MMM d, yyyy") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={rescheduleDate ? parseISO(rescheduleDate) : undefined}
                            onSelect={(d) => { if (d) { setRescheduleDate(format(d, "yyyy-MM-dd")); setRescheduleTime(""); } }}
                            modifiers={{ open: openDatesSet }}
                            modifiersClassNames={{ open: "!bg-success/20 !text-success font-semibold" }}
                            disabled={(d) => isBefore(d, startOfDay(new Date()))}
                          />
                          <div className="px-3 pb-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-success/20 border border-success/40" /> Open</span>
                            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted border" /> Closed</span>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>New Time *</Label>
                        <div className="flex items-center gap-2">
                          <Checkbox id="reschedule-override" checked={rescheduleTimeOverride} onCheckedChange={(c) => setRescheduleTimeOverride(!!c)} />
                          <Label htmlFor="reschedule-override" className="text-xs font-normal text-muted-foreground cursor-pointer">Override</Label>
                        </div>
                      </div>
                      {rescheduleTimeOverride ? (
                        <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
                      ) : rescheduleAvailableSlots.length > 0 ? (
                        <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto rounded-md border p-2">
                          {rescheduleAvailableSlots.map(slot => (
                            <Button
                              key={slot.time}
                              type="button"
                              variant={rescheduleTime === slot.time ? "default" : "outline"}
                              size="sm"
                              className={cn("text-xs h-7", !slot.available && "opacity-40 line-through")}
                              disabled={!slot.available}
                              onClick={() => setRescheduleTime(slot.time)}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      ) : rescheduleDate ? (
                        <p className="text-xs text-muted-foreground py-2">No available slots for this date</p>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2">Select a date first</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={rescheduleNotify} onCheckedChange={setRescheduleNotify} />
                      <Label className="font-normal">Email patient with new appointment details</Label>
                    </div>
                    <Button onClick={saveReschedule} className="w-full" disabled={!rescheduleDate || !rescheduleTime}>
                      Reschedule Appointment
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Group Reschedule Prompt */}
            <Dialog open={rescheduleGroupPromptOpen} onOpenChange={setRescheduleGroupPromptOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-serif flex items-center gap-2">
                    <Users className="h-5 w-5 text-secondary" /> Group Booking
                  </DialogTitle>
                </DialogHeader>
                {rescheduleApt && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>{rescheduleApt.client_name}</strong> is part of a group booking. Would you like to reschedule just this person, or the entire group?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => handleGroupRescheduleChoice("single")}>
                        <UserCheck className="h-5 w-5" />
                        <span className="text-xs font-medium">Just This Person</span>
                      </Button>
                      <Button variant="default" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => handleGroupRescheduleChoice("all")}>
                        <Users className="h-5 w-5" />
                        <span className="text-xs font-medium">Entire Group</span>
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif flex items-center gap-2 text-destructive">
                    <Trash2 className="h-5 w-5" /> Delete Appointment
                  </DialogTitle>
                </DialogHeader>
                {deletingApt && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to delete <strong>{deletingApt.client_name}</strong>'s appointment on{" "}
                      <strong>{format(parseISO(deletingApt.appointment_date), "MMM d, yyyy")}</strong> at{" "}
                      <strong>{deletingApt.appointment_time.slice(0, 5)}</strong>?
                    </p>
                    <div className="space-y-2">
                      <Label>Reason for deletion <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                      <Textarea
                        placeholder="e.g. Patient cancelled, duplicate booking, no-show..."
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">If provided, this will be added as a note on the patient's profile.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="delete-send-email"
                        checked={deleteSendEmail}
                        onCheckedChange={(v) => setDeleteSendEmail(v === true)}
                      />
                      <Label htmlFor="delete-send-email" className="text-sm font-normal">
                        Send cancellation email to {deletingApt.client_name}
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={confirmDeleteAppointment}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* AI Summary Quick-View Dialog */}
            <Dialog open={aiSummaryDialogOpen} onOpenChange={setAiSummaryDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <Stethoscope className="h-5 w-5" /> AI Clinical Summary
                  </DialogTitle>
                </DialogHeader>
                {aiSummaryDialogData && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">{aiSummaryDialogData.name}</p>
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiSummaryDialogData.summary}</p>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
              <DialogContent className="max-h-[95vh] max-w-md flex flex-col p-0 gap-0">
                {detailApt && (
                  <>
                    {/* Compact header with name + status next to name */}
                    <div className="bg-primary/5 px-4 pt-4 pb-3 border-b space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-serif text-base font-bold truncate">
                          <button
                            className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors"
                            onClick={() => openInlinePatient(detailApt.client_email)}
                          >
                            {detailApt.client_name}
                          </button>
                          {getPatientAge(detailApt.client_email) !== null && (
                            <span className="text-xs text-muted-foreground font-normal ml-1">({getPatientAge(detailApt.client_email)})</span>
                          )}
                        </h2>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", statusColors[detailApt.status])}>{detailApt.status}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0"
                          title="Download PDF"
                          onClick={() => {
                            const doc = new jsPDF();
                            doc.setFontSize(16);
                            doc.text("ParklyScope · Appointment Summary", 14, 20);
                            doc.setFontSize(10);
                            doc.text(`Date: ${format(parseISO(detailApt.appointment_date), "EEEE, MMMM d, yyyy")}`, 14, 32);
                            doc.text(`Time: ${detailApt.appointment_time.slice(0, 5)}`, 14, 38);
                            doc.text(`Patient: ${detailApt.client_name}`, 14, 44);
                            doc.text(`Service: ${getServiceName(detailApt.service_id)}`, 14, 50);
                            doc.text(`Email: ${detailApt.client_email}`, 14, 56);
                            doc.text(`Phone: ${detailApt.client_phone || "N/A"}`, 14, 62);
                            doc.text(`Address: ${detailApt.address || "N/A"}`, 14, 68);
                            doc.text(`Price: ${detailApt.price != null ? `£${Number(detailApt.price).toFixed(2)}` : "N/A"}`, 14, 74);
                            if (detailApt.travel_fee != null && Number(detailApt.travel_fee) > 0) {
                              doc.text(`Travel Fee: £${Number(detailApt.travel_fee).toFixed(2)}`, 14, 80);
                            }
                            let y = 90;
                            if (detailApt.ai_consent_summary) {
                              doc.setFontSize(12);
                              doc.text("AI Clinical Summary", 14, y); y += 8;
                              doc.setFontSize(10);
                              const lines = doc.splitTextToSize(detailApt.ai_consent_summary, 180);
                              doc.text(lines, 14, y); y += lines.length * 5 + 6;
                            }
                            if (detailApt.notes) {
                              doc.setFontSize(12);
                              doc.text("Notes", 14, y); y += 8;
                              doc.setFontSize(10);
                              const noteLines = doc.splitTextToSize(detailApt.notes, 180);
                              doc.text(noteLines, 14, y);
                            }
                            doc.save(`appointment-${detailApt.client_name.replace(/\s+/g, '-').toLowerCase()}-${detailApt.appointment_date}.pdf`);
                            toast.success("PDF downloaded");
                          }}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm font-bold text-foreground">{getServiceName(detailApt.service_id)}</p>
                      {(detailApt.address || detailApt.postcode) && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent((detailApt.address || "") + (detailApt.postcode && detailApt.address && !detailApt.address.toUpperCase().includes(detailApt.postcode.toUpperCase()) ? ", " + detailApt.postcode : !detailApt.address && detailApt.postcode ? detailApt.postcode : ""))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                        >
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="leading-snug">{detailApt.address}{detailApt.postcode && detailApt.address && !detailApt.address.toUpperCase().includes(detailApt.postcode.toUpperCase()) ? `, ${detailApt.postcode}` : !detailApt.address && detailApt.postcode ? detailApt.postcode : ""}</span>
                        </a>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                      {/* Alert banner */}
                      {patientAlerts[detailApt.client_email] && (
                        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                          <p className="text-xs font-medium text-destructive">{patientAlerts[detailApt.client_email]}</p>
                        </div>
                      )}
                      {recallEmails.has(detailApt.client_email?.toLowerCase()) && (
                        <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2">
                          <RefreshCw className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0 animate-pulse" />
                          <p className="text-xs font-medium text-violet-600 dark:text-violet-400">This patient was on the recall list — consider rebooking them for a follow-up</p>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <div className="rounded-lg bg-primary/5 px-3 py-2 flex-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</p>
                            <p className="text-xs font-semibold">{format(parseISO(detailApt.appointment_date), "EEE, MMM d")}</p>
                          </div>
                          <div className="rounded-lg bg-primary/5 px-3 py-2 flex-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</p>
                            <p className="text-xs font-semibold">{detailApt.appointment_time.slice(0, 5)}–{getEndTime(detailApt)}</p>
                          </div>
                        </div>
                        {(() => {
                          const displayPrice = detailApt.price ?? services.find(s => s.id === detailApt.service_id)?.price ?? null;
                          return (
                            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 flex items-center gap-2">
                              <PoundSterling className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                {displayPrice != null ? `£${Number(displayPrice).toFixed(2)}` : "Price TBC"}
                                {detailApt.travel_fee != null && Number(detailApt.travel_fee) > 0 && (
                                  <span className="font-normal text-muted-foreground"> +£{Number(detailApt.travel_fee).toFixed(2)} travel</span>
                                )}
                                {(() => {
                                  const svc = services.find(s => s.id === detailApt.service_id);
                                  const originalPrice = svc?.price ? Number(svc.price) : null;
                                  const actualPrice = detailApt.price != null ? Number(detailApt.price) : null;
                                  const hasDiscount = !!detailApt.group_id && originalPrice && actualPrice && originalPrice > actualPrice;
                                  return hasDiscount ? <span className="text-success"> · -£{(originalPrice - actualPrice).toFixed(2)} group</span> : null;
                                })()}
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Consent status badge */}
                      {(detailApt.consent_form_template_id || services.find(s => s.id === detailApt.service_id)?.consent_form_template_id) && (
                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 w-fit", consentCompletedIds.has(detailApt.id) ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30")}>
                          {consentCompletedIds.has(detailApt.id) ? "✓ Consent completed" : "⏳ Consent pending"}
                        </Badge>
                      )}

                      {/* AI Clinical Summary - always shown */}
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" /> AI Clinical Summary
                        </p>
                        {detailApt.ai_consent_summary ? (
                          <p className="text-xs text-foreground leading-relaxed">{detailApt.ai_consent_summary}</p>
                        ) : consentCompletedIds.has(detailApt.id) ? (
                          <p className="text-xs text-muted-foreground italic">Generating summary from consent form…</p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Awaiting consent form completion — summary will appear here once submitted.</p>
                        )}
                      </div>

                      {/* Contact with action buttons */}
                      <div className="rounded-lg bg-secondary/5 px-3 py-2 space-y-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contact</p>
                        <div className="flex gap-1.5">
                          {detailApt.client_phone && (
                            <a href={`tel:${detailApt.client_phone}`} className="flex items-center gap-1.5 rounded-md bg-secondary/10 border border-secondary/20 px-2.5 py-1.5 hover:bg-secondary/20 transition-colors flex-1">
                              <Phone className="h-3.5 w-3.5 text-secondary shrink-0" />
                              <span className="text-xs font-medium text-foreground">{detailApt.client_phone}</span>
                            </a>
                          )}
                          {detailApt.client_phone && (
                            <button onClick={() => { navigator.clipboard.writeText(detailApt.client_phone!); toast.success("Phone copied"); }} className="flex items-center gap-1 rounded-md bg-secondary/10 border border-secondary/20 px-2 py-1.5 hover:bg-secondary/20 transition-colors" title="Copy phone">
                              <Copy className="h-3 w-3 text-secondary" />
                            </button>
                          )}
                          {detailApt.client_phone && (
                            <a href={`sms:${detailApt.client_phone}`} className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 hover:bg-emerald-500/20 transition-colors">
                              <MessageSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              <span className="text-xs font-medium text-foreground">SMS</span>
                            </a>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <a href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(detailApt.client_email)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 hover:bg-blue-500/20 transition-colors flex-1">
                            <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <span className="text-xs font-medium text-foreground break-all">{detailApt.client_email}</span>
                          </a>
                          <button onClick={() => { navigator.clipboard.writeText(detailApt.client_email); toast.success("Email copied"); }} className="flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-1.5 hover:bg-blue-500/20 transition-colors shrink-0" title="Copy email">
                            <Copy className="h-3 w-3 text-blue-400" />
                          </button>
                        </div>
                      </div>

                      {/* Google Maps image + address using lat/lng if available */}
                      {detailApt.address && (
                        <div className="space-y-1">
                          {googleMapsKey && (
                            <a
                              href={detailApt.latitude && detailApt.longitude ? `https://www.google.com/maps/place/${detailApt.latitude},${detailApt.longitude}/@${detailApt.latitude},${detailApt.longitude},17z` : `https://maps.google.com/?q=${encodeURIComponent(detailApt.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-lg overflow-hidden border border-blue-500/10"
                            >
                              <img
                                src={detailApt.latitude && detailApt.longitude
                                  ? `https://maps.googleapis.com/maps/api/staticmap?center=${detailApt.latitude},${detailApt.longitude}&zoom=17&size=400x200&scale=2&maptype=hybrid&markers=color:red%7C${detailApt.latitude},${detailApt.longitude}&key=${googleMapsKey}`
                                  : `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(detailApt.address)}&zoom=16&size=400x200&scale=2&maptype=hybrid&markers=color:red%7C${encodeURIComponent(detailApt.address)}&key=${googleMapsKey}`}
                                alt="Map location"
                                className="w-full h-[120px] object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </a>
                          )}
                          <div className="flex items-center gap-1">
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(detailApt.address + (detailApt.postcode && !detailApt.address.toUpperCase().includes(detailApt.postcode.toUpperCase()) ? ", " + detailApt.postcode : ""))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-1 hover:underline flex-1"
                            >
                              <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <p className="text-xs text-blue-700 dark:text-blue-300">{detailApt.address}{detailApt.postcode && !detailApt.address.toUpperCase().includes(detailApt.postcode.toUpperCase()) ? `, ${detailApt.postcode}` : ""}</p>
                            </a>
                            <button onClick={() => { navigator.clipboard.writeText(detailApt.address + (detailApt.postcode && !detailApt.address!.toUpperCase().includes(detailApt.postcode.toUpperCase()) ? ", " + detailApt.postcode : "")); toast.success("Address copied"); }} className="p-1 rounded hover:bg-muted/50 transition-colors shrink-0" title="Copy address">
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                          {detailApt.latitude && detailApt.longitude && (
                            <a
                              href={`https://www.google.com/maps/place/${detailApt.latitude},${detailApt.longitude}/@${detailApt.latitude},${detailApt.longitude},17z`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-1 hover:underline"
                            >
                              <Navigation className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <p className="text-xs text-emerald-700 dark:text-emerald-300">Pin location</p>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Notes (compact) */}
                      {(detailApt.notes || detailApt.admin_notes) && (
                        <div className="rounded-lg bg-muted/50 px-3 py-2 space-y-1">
                          {detailApt.notes && <p className="text-xs"><span className="text-muted-foreground">Notes:</span> {detailApt.notes}</p>}
                          {detailApt.admin_notes && <p className="text-xs"><span className="text-muted-foreground">Admin:</span> {detailApt.admin_notes}</p>}
                        </div>
                      )}

                      {/* Birthday nearby */}
                      {(() => {
                        const dob = patientDobs[detailApt.client_email];
                        if (!dob) return null;
                        const aptDate = parseISO(detailApt.appointment_date);
                        const birthThisYear = setYear(parseISO(dob), aptDate.getFullYear());
                        const daysDiff = differenceInCalendarDays(birthThisYear, aptDate);
                        if (Math.abs(daysDiff) <= 21) {
                          return <p className="text-xs font-medium text-amber-600 bg-amber-500/5 rounded-lg px-3 py-1.5">🎂 Birthday nearby!</p>;
                        }
                        return null;
                      })()}

                      {/* Fitzpatrick Score (compact) */}
                      {(() => {
                        const fitzResponse = detailConsentResponses.find(cr => cr.responses?.["__fitzpatrick_score"] !== undefined);
                        if (!fitzResponse) return null;
                        const score = fitzResponse.responses["__fitzpatrick_score"] as number;
                        const skinType = fitzResponse.responses["__fitzpatrick_type"] as string;
                        const isHighRisk = score >= 21;
                        return (
                          <div className={cn("rounded-lg px-3 py-2 flex items-center gap-2", isHighRisk ? "bg-orange-500/10 border border-orange-500/20" : "bg-success/5 border border-success/20")}>
                            {isHighRisk ? <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" /> : <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />}
                            <p className="text-xs">
                              <span className={cn("font-medium", isHighRisk ? "text-orange-600" : "text-success")}>Fitzpatrick {skinType}</span>
                              <span className="text-muted-foreground"> · Score {score}{isHighRisk ? " · Half freeze time" : ""}</span>
                            </p>
                          </div>
                        );
                      })()}
                      {/* Alternative date suggestion */}
                      {(detailApt.alternative_date || detailApt.alternative_time) && (
                        <div className="rounded-lg bg-muted/50 border px-3 py-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Suggested Alternative</p>
                          <p className="text-xs">{detailApt.alternative_date && format(parseISO(detailApt.alternative_date), "EEE, MMM d")} {detailApt.alternative_time && `at ${detailApt.alternative_time.slice(0, 5)}`}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {consultNoteCompletedIds.has(detailApt.id) && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-success/10 text-success border-success/30">✓ Consultation</Badge>
                        )}
                        {detailConsentResponses.length > 0 && (
                          <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setViewingDetailResponse(detailConsentResponses[0])}>
                            <FileText className="h-3 w-3 mr-1" /> View Forms ({detailConsentResponses.length})
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Pending Messages */}
                    {detailPendingMsgs.length > 0 && (
                      <div className="border-t px-4 py-3 space-y-2 bg-amber-500/5">
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending Messages ({detailPendingMsgs.length})
                        </p>
                        {detailPendingMsgs.map((msg) => (
                          <div key={msg.id} className="rounded-lg border border-amber-500/20 bg-background p-2.5 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                {msg.channel === "email" ? "📧 Email" : "📱 SMS"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{msg.trigger_type?.replace(/_/g, " ")}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {(() => {
                                  const d = new Date(msg.scheduled_for);
                                  const now = new Date();
                                  const diffMs = d.getTime() - now.getTime();
                                  if (diffMs < 0) return "Sending soon…";
                                  const diffMin = Math.round(diffMs / 60000);
                                  if (diffMin < 60) return `in ${diffMin}m`;
                                  return format(d, "dd/MM HH:mm");
                                })()}
                              </span>
                            </div>

                            {editingMsgId === msg.id ? (
                              <div className="space-y-1.5">
                                {msg.channel === "email" && (
                                  <Input
                                    value={editingMsgSubject}
                                    onChange={(e) => setEditingMsgSubject(e.target.value)}
                                    placeholder="Subject"
                                    className="h-7 text-xs"
                                  />
                                )}
                                <Textarea
                                  value={editingMsgBody}
                                  onChange={(e) => setEditingMsgBody(e.target.value)}
                                  className="text-xs min-h-[60px]"
                                  placeholder={msg.channel === "email" ? "Email HTML content…" : "SMS text…"}
                                />
                                <div className="flex gap-1.5">
                                  <Button size="sm" className="h-6 text-[10px] flex-1" onClick={async () => {
                                    const updates: any = {
                                      metadata: {
                                        ...(msg.metadata || {}),
                                        ...(msg.channel === "email" ? { body_html: editingMsgBody } : { body_text: editingMsgBody }),
                                      },
                                    };
                                    if (msg.channel === "email") updates.subject = editingMsgSubject;
                                    await supabase.from("scheduled_communications").update(updates).eq("id", msg.id);
                                    setDetailPendingMsgs(prev => prev.map(m => m.id === msg.id ? { ...m, ...updates } : m));
                                    setEditingMsgId(null);
                                    toast.success("Message updated");
                                  }}>
                                    <Save className="mr-1 h-3 w-3" /> Save
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditingMsgId(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {msg.channel === "email" && msg.subject && (
                                  <p className="text-xs font-medium truncate">{msg.subject}</p>
                                )}
                                <p className="text-[11px] text-muted-foreground line-clamp-2">
                                  {msg.channel === "email"
                                    ? (msg.metadata?.body_html || "").replace(/<[^>]*>/g, "").slice(0, 150) + "…"
                                    : (msg.metadata?.body_text || msg.subject || "SMS message")}
                                </p>
                                <div className="flex gap-1.5">
                                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => {
                                    setEditingMsgId(msg.id);
                                    setEditingMsgSubject(msg.subject || "");
                                    setEditingMsgBody(
                                      msg.channel === "email"
                                        ? (msg.metadata?.body_html || "")
                                        : (msg.metadata?.body_text || "")
                                    );
                                  }}>
                                    <Pencil className="mr-1 h-3 w-3" /> Edit
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={async () => {
                                    await supabase.from("scheduled_communications")
                                      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                                      .eq("id", msg.id);
                                    setDetailPendingMsgs(prev => prev.filter(m => m.id !== msg.id));
                                    toast.success("Message cancelled");
                                  }}>
                                    <X className="mr-1 h-3 w-3" /> Cancel
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={async () => {
                                    await supabase.from("scheduled_communications")
                                      .update({ scheduled_for: new Date().toISOString() })
                                      .eq("id", msg.id);
                                    toast.success("Message will send now");
                                  }}>
                                    <Send className="mr-1 h-3 w-3" /> Send Now
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}

                        <Button variant="outline" size="sm" className="w-full h-7 text-[10px] border-dashed" onClick={async () => {
                          if (!detailApt) return;
                          const svcName = getServiceName(detailApt.service_id);
                          const dateStr = format(parseISO(detailApt.appointment_date), "dd/MM/yyyy");
                          const timeStr = detailApt.appointment_time.slice(0, 5);
                          const { data: tpl } = await supabase.from("email_templates")
                            .select("subject, body_html").eq("trigger_type", "approved").eq("is_active", true).maybeSingle();
                          const subject = (tpl?.subject || "Appointment Update — ShawScope")
                            .replace(/\{\{client_name\}\}/g, detailApt.client_name).replace(/\{\{service_name\}\}/g, svcName)
                            .replace(/\{\{date\}\}/g, dateStr).replace(/\{\{time\}\}/g, timeStr);
                          const body = (tpl?.body_html || `<p>Hi ${detailApt.client_name}, update about your appointment.</p>`)
                            .replace(/\{\{client_name\}\}/g, detailApt.client_name).replace(/\{\{service_name\}\}/g, svcName)
                            .replace(/\{\{date\}\}/g, dateStr).replace(/\{\{time\}\}/g, timeStr)
                            .replace(/\{\{address\}\}/g, detailApt.address || "N/A");
                          const newMsg = {
                            appointment_id: detailApt.id, channel: "email", trigger_type: "manual_notification",
                            recipient_name: detailApt.client_name, recipient_email: detailApt.client_email,
                            subject, scheduled_for: new Date(Date.now() + 5 * 60000).toISOString(),
                            status: "pending", metadata: { body_html: body },
                          };
                          const { data: inserted } = await supabase.from("scheduled_communications").insert(newMsg).select().single();
                          if (inserted) {
                            setDetailPendingMsgs(prev => [...prev, inserted]);
                            setEditingMsgId(inserted.id);
                            setEditingMsgSubject(subject);
                            setEditingMsgBody(body);
                            toast.success("Draft created — edit before sending");
                          }
                        }}>
                          <Plus className="mr-1 h-3 w-3" /> Draft New Message
                        </Button>
                      </div>
                    )}

                    {detailPendingMsgs.length === 0 && detailApt && detailApt.status !== "cancelled" && (
                      <div className="border-t px-4 py-2">
                        <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] text-muted-foreground" onClick={async () => {
                          const svcName = getServiceName(detailApt.service_id);
                          const dateStr = format(parseISO(detailApt.appointment_date), "dd/MM/yyyy");
                          const timeStr = detailApt.appointment_time.slice(0, 5);
                          const newMsg = {
                            appointment_id: detailApt.id, channel: "email", trigger_type: "manual_notification",
                            recipient_name: detailApt.client_name, recipient_email: detailApt.client_email,
                            subject: `Appointment Update — ${svcName} on ${dateStr}`,
                            scheduled_for: new Date(Date.now() + 5 * 60000).toISOString(),
                            status: "pending",
                            metadata: { body_html: `<p>Hi ${detailApt.client_name}, this is an update about your ${svcName} appointment on ${dateStr} at ${timeStr}.</p>` },
                          };
                          const { data: inserted } = await supabase.from("scheduled_communications").insert(newMsg).select().single();
                          if (inserted) {
                            setDetailPendingMsgs([inserted]);
                            setEditingMsgId(inserted.id);
                            setEditingMsgSubject(newMsg.subject);
                            setEditingMsgBody(newMsg.metadata.body_html);
                            toast.success("Draft created — edit and send");
                          }
                        }}>
                          <Send className="mr-1 h-3 w-3" /> Send Message to Patient
                        </Button>
                      </div>
                    )}

                    {/* Compact action bar */}
                    <div className="border-t bg-background px-4 py-2.5 flex items-center gap-2 shrink-0">
                      {(detailApt.status === "requested" || detailApt.status === "pending") && (
                        <>
                          <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => { approveAppointment(detailApt); setDetailDialogOpen(false); }}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button variant="destructive" size="sm" className="flex-1 h-8 text-xs" onClick={() => { setDetailDialogOpen(false); openRejectDialog(detailApt); }}>
                            <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                          </Button>
                        </>
                      )}
                      {detailApt.status !== "cancelled" && detailApt.status !== "requested" && detailApt.status !== "pending" && (
                        <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => {
                          promptStatusChange(detailApt, "cancelled");
                          setDetailDialogOpen(false);
                        }}>
                          <Ban className="mr-1 h-3.5 w-3.5" /> Cancel Appointment
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("h-8 text-xs", (detailApt.status !== "requested" && detailApt.status !== "pending") && "flex-1")}>
                            <MoreVertical className="mr-1 h-3.5 w-3.5" /> Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                          <DropdownMenuItem onClick={() => { openEditAppointment(detailApt); setDetailDialogOpen(false); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Appointment
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { openReschedule(detailApt); setDetailDialogOpen(false); }}>
                            <CalendarClock className="mr-2 h-4 w-4" /> Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setConsultAptId(detailApt.id); setConsultTemplateId(detailApt.consent_form_template_id); setConsultFormType('consent'); setConsultFormOpen(true); setDetailDialogOpen(false); }}>
                            <ClipboardList className="mr-2 h-4 w-4" /> Start Consent Form
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const svcName = getServiceName(detailApt.service_id).toLowerCase();
                            const consultTemplate = templates.find(t => t.form_type === 'consultation' && t.title.toLowerCase().includes(svcName.split(' ')[0]));
                            setConsultAptId(detailApt.id);
                            setConsultTemplateId(consultTemplate?.id || null);
                            setConsultFormType('consultation');
                            setConsultFormOpen(true);
                            setDetailDialogOpen(false);
                          }}>
                            <Stethoscope className="mr-2 h-4 w-4" /> {consultNoteCompletedIds.has(detailApt.id) ? "Edit Consultation" : "Start Consultation"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={async () => {
                            const consentTemplateId = detailApt.consent_form_template_id || services.find(s => s.id === detailApt.service_id)?.consent_form_template_id;
                            if (!consentTemplateId) { toast.error("No consent form linked"); return; }
                            if (!detailApt.consent_form_template_id) {
                              await supabase.from("appointments").update({ consent_form_template_id: consentTemplateId }).eq("id", detailApt.id);
                            }
                            const templateName = templates.find(t => t.id === consentTemplateId)?.title || "";
                            const { error } = await supabase.functions.invoke("send-form-email", {
                              body: { appointmentId: detailApt.id, recipientEmail: detailApt.client_email, templateName },
                            });
                            if (error) { toast.error("Failed to send consent form"); }
                            else {
                              await supabase.from("appointments").update({ consent_sent_at: new Date().toISOString() }).eq("id", detailApt.id);
                              toast.success(`Consent form sent to ${detailApt.client_email}`);
                              logPatientActivity(detailApt.client_email, "form", `Consent form sent for ${getServiceName(detailApt.service_id)} on ${detailApt.appointment_date}`);
                              fetchAppointments(); setDetailDialogOpen(false);
                            }
                          }}>
                          <Send className="mr-2 h-4 w-4" /> {detailApt.consent_sent_at ? "Resend Consent Email" : "Send Consent Email"}
                          </DropdownMenuItem>
                          {detailApt.consent_form_template_id && !consentCompletedIds.has(detailApt.id) && (
                            <DropdownMenuItem onClick={async () => {
                              // Manually mark consent as complete — inserts a minimal response and cancels reminders
                              const { error } = await supabase.from("consent_form_responses").insert({
                                appointment_id: detailApt.id,
                                consent_form_template_id: detailApt.consent_form_template_id!,
                                responses: { _manual: true, note: "Manually marked complete by practitioner" },
                                status: "completed",
                                submitter_name: detailApt.client_name,
                              });
                              if (error) { toast.error("Failed to mark consent complete"); return; }
                              // Cancel any pending consent reminders
                              await supabase.from("scheduled_communications")
                                .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                                .eq("appointment_id", detailApt.id)
                                .eq("trigger_type", "consent_reminder")
                                .eq("status", "pending");
                              toast.success("Consent marked as complete — reminder emails stopped");
                              logPatientActivity(detailApt.client_email, "consent_manual", `Consent manually marked complete for ${getServiceName(detailApt.service_id)}`);
                              setConsentCompletedIds(prev => new Set([...prev, detailApt.id]));
                              fetchAppointments();
                            }}>
                              <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> Mark Consent Complete
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => sendSmsReminder(detailApt)} disabled={!detailApt.client_phone}>
                            <MessageSquare className="mr-2 h-4 w-4" /> Send SMS Reminder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={async () => {
                            toast.loading("Resending confirmation...", { id: "resend-conf" });
                            const { error } = await supabase.functions.invoke("send-notification", {
                              body: { appointmentId: detailApt.id, type: "approved" },
                            });
                            if (error) toast.error("Failed to resend confirmation", { id: "resend-conf" });
                            else {
                              toast.success("Confirmation resent (email + SMS)", { id: "resend-conf" });
                              logPatientActivity(detailApt.client_email, "communication", `Confirmation manually resent for ${getServiceName(detailApt.service_id)} on ${detailApt.appointment_date}`);
                            }
                          }}>
                            <Send className="mr-2 h-4 w-4 text-emerald-500" /> Resend Confirmation (Email + SMS)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                              toast.loading("Sending location info...", { id: "send-loc" });
                              const { error } = await supabase.functions.invoke("send-location-info", {
                                body: { appointmentId: detailApt.id },
                              });
                              if (error) toast.error("Failed to send location info", { id: "send-loc" });
                              else {
                                toast.success("Location info sent (email + SMS)", { id: "send-loc" });
                                logPatientActivity(detailApt.client_email, "communication", `Coming to me location info sent for ${getServiceName(detailApt.service_id)} on ${detailApt.appointment_date}`);
                              }
                            }}>
                              <Home className="mr-2 h-4 w-4 text-amber-400" /> Send Coming to Me Info
                            </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => sendManualReviewRequest(detailApt)}>
                            <Star className="mr-2 h-4 w-4 text-amber-500" /> Send Review Request
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resendMorningTracking(detailApt)}>
                            <RotateCw className="mr-2 h-4 w-4 text-blue-500" /> Resend Morning Tracking
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { openDeleteDialog(detailApt); setDetailDialogOpen(false); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Appointment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>

            {/* Inline patient profile removed — now uses unified PatientsTab */}

            <Dialog open={!!viewingDetailResponse} onOpenChange={(open) => !open && setViewingDetailResponse(null)}>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-serif">{viewingDetailResponse?.template_title}</DialogTitle>
                </DialogHeader>
                {viewingDetailResponse && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Submitted: {format(parseISO(viewingDetailResponse.created_at), "MMMM d, yyyy 'at' HH:mm")}
                    </p>
                    <div className="space-y-3">
                      {Object.entries(viewingDetailResponse.responses as Record<string, any>).map(([key, value]) => (
                        <div key={key} className="rounded-lg border p-3">
                          <p className="text-xs font-medium text-muted-foreground">{key}</p>
                          <p className="text-sm mt-1">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</p>
                        </div>
                      ))}
                    </div>
                    {viewingDetailResponse.signature && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Signature</p>
                        <p className="text-sm font-medium">{viewingDetailResponse.signature}</p>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* PATIENTS TAB */}
          <TabsContent value="patients" className="rounded-lg border border-indigo-900/50 bg-indigo-950/20 p-4">
            <PatientsTab initialSearchEmail={patientTabEmail} onReturnToPreviousTab={returnToPreviousTab} />
          </TabsContent>




          {/* SERVICES TAB */}
          <TabsContent value="services" className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4">
            <div className="text-center mb-6">
              <h2 className="font-serif text-2xl font-bold text-foreground">Services</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure your available services, pricing, treatment options, and linked consent forms</p>
            </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-serif">Manage Services</CardTitle>
                <Button size="sm" onClick={openNewService}>
                  <Plus className="mr-2 h-4 w-4" /> New Service
                </Button>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">No services yet. Create one to get started.</p>
                ) : (
                  <>
                    {/* Mobile card view - collapsible */}
                    <div className="sm:hidden space-y-2">
                      {services.map((svc) => {
                        const wlCount = serviceWaitlist.filter(w => w.service_id === svc.id).length;
                        const statusLabel = svc.status === 'coming_soon' ? 'Coming Soon' : svc.status === 'active' ? 'Active' : 'Inactive';
                        const statusClass = svc.status === 'active' ? 'bg-success/10 text-success border-success/20' : svc.status === 'coming_soon' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-muted text-muted-foreground';
                        return (
                        <Collapsible key={svc.id}>
                          <div className="rounded-lg border p-3">
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                                  <p className="font-medium text-sm truncate">{svc.name}</p>
                                  <Badge variant="outline" className={cn("text-[10px] shrink-0", statusClass)}>{statusLabel}</Badge>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                                  <span>{svc.duration_minutes}m</span>
                                  <span>{svc.price ? `£${Number(svc.price).toFixed(2)}` : "—"}</span>
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="pt-2 mt-2 border-t space-y-2">
                                {svc.description && <p className="text-xs text-muted-foreground">{svc.description}</p>}
                                {svc.status === 'coming_soon' && wlCount > 0 && <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500">{wlCount} waiting</Badge>}
                                <div className="flex items-center gap-1">
                                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openEditService(svc)}>
                                    <Pencil className="h-3 w-3 mr-1" /> Edit
                                  </Button>
                                  {svc.status === 'coming_soon' && wlCount > 0 && (
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openWaitlistViewer(svc.id)}>
                                      <Users className="h-3 w-3 mr-1" /> Waitlist
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteService(svc.id)}>
                                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                        );
                      })}
                    </div>
                    {/* Desktop table view */}
                    <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Price</TableHead>
                          
                          <TableHead>Consent Form</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {services.map((svc) => {
                          const wlCount = serviceWaitlist.filter(w => w.service_id === svc.id).length;
                          const statusLabel = svc.status === 'coming_soon' ? 'Coming Soon' : svc.status === 'active' ? 'Active' : 'Inactive';
                          const statusClass = svc.status === 'active' ? 'bg-success/10 text-success border-success/20' : svc.status === 'coming_soon' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-muted text-muted-foreground';
                          return (
                          <TableRow key={svc.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{svc.name}</p>
                                {svc.description && <p className="text-sm text-muted-foreground line-clamp-1">{svc.description}</p>}
                              </div>
                            </TableCell>
                            <TableCell>{svc.duration_minutes} min</TableCell>
                            <TableCell>{svc.price ? `£${Number(svc.price).toFixed(2)}` : "—"}</TableCell>
                            <TableCell className="text-sm">{getConsentFormName(svc.consent_form_template_id)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={statusClass}>{statusLabel}</Badge>
                                {svc.status === 'coming_soon' && wlCount > 0 && (
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-amber-500" onClick={() => openWaitlistViewer(svc.id)}>
                                    <Users className="h-3 w-3 mr-1" />{wlCount}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditService(svc)} title="Edit service">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteService(svc.id)} title="Delete service">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Special Offers per Service */}
            {services.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Special Offers & Promotions</CardTitle>
                  <CardDescription>Create group discounts, seasonal deals, or bundle pricing that display on your public service pages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {services.map(svc => (
                    <ServiceOffersPanel key={svc.id} serviceId={svc.id} serviceName={svc.name} />
                  ))}
                </CardContent>
              </Card>
            )}


            {/* Service Dialog */}
            <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-serif">{editingService ? "Edit Service" : "New Service"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Service Name *</Label>
                    <Input value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder="e.g. Earwax Removal" maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} placeholder="Brief description..." maxLength={500} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input type="number" value={svcDuration} onChange={(e) => setSvcDuration(Number(e.target.value))} min={15} max={240} />
                    </div>
                    <div className="space-y-2">
                      <Label>Price (£)</Label>
                      <Input type="number" step="0.01" value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} placeholder="45.00" min={0} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Linked Consent Form</Label>
                    <Select value={svcConsentFormId || "none"} onValueChange={(v) => setSvcConsentFormId(v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No consent form</SelectItem>
                        {templates.filter(t => t.is_active && t.form_type !== 'consultation').map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">When linked, this consent form will be required when patients book this service.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sort Order</Label>
                      <Input type="number" value={svcOrder} onChange={(e) => setSvcOrder(Number(e.target.value))} min={0} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={svcStatus} onValueChange={(v) => setSvcStatus(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="coming_soon">Coming Soon (Waitlist)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Service Image Upload */}
                  <div className="space-y-2">
                    <Label>Service Image</Label>
                    {svcImageUrl ? (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                        <img src={svcImageUrl} alt="Service" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setSvcImageUrl(null)}
                          className="absolute top-1 right-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 transition-colors">
                        {uploadingServiceImage ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Click to upload image</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingServiceImage(true);
                            try {
                              const ext = file.name.split('.').pop();
                              const fileName = `service-${Date.now()}.${ext}`;
                              const { error: uploadErr } = await supabase.storage
                                .from("shawscope")
                                .upload(`service-images/${fileName}`, file, { upsert: true });
                              if (uploadErr) throw uploadErr;
                              const { data: urlData } = supabase.storage
                                .from("shawscope")
                                .getPublicUrl(`service-images/${fileName}`);
                              setSvcImageUrl(urlData.publicUrl);
                              toast.success("Image uploaded");
                            } catch (err: any) {
                              toast.error("Upload failed: " + (err.message || "Unknown error"));
                            } finally {
                              setUploadingServiceImage(false);
                            }
                          }}
                        />
                      </label>
                    )}
                    <p className="text-xs text-muted-foreground">This image will appear on the booking page service tiles.</p>
                  </div>
                  {svcStatus === 'coming_soon' && (
                    <p className="text-xs text-amber-500 bg-amber-500/10 rounded p-2">
                      ⏳ This service will show as "Coming Soon" on the booking page. Patients can join a waitlist and you'll be able to notify them when it goes live.
                    </p>
                  )}
                  <Button onClick={saveService} className="w-full">
                    {editingService ? "Save Changes" : "Create Service"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>


            {/* Waitlist Viewer Dialog */}
            <Dialog open={waitlistDialogOpen} onOpenChange={setWaitlistDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-serif">{services.find(s => s.id === waitlistServiceId)?.name} — Waitlist</DialogTitle>
                </DialogHeader>
                {(() => {
                  const entries = serviceWaitlist.filter(w => w.service_id === waitlistServiceId);
                  if (entries.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">No one on the waitlist yet.</p>;
                  return (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {entries.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between rounded border p-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{entry.client_name}</p>
                            <p className="text-xs text-muted-foreground">{entry.client_email}</p>
                            {entry.client_phone && <p className="text-xs text-muted-foreground">{entry.client_phone}</p>}
                            <p className="text-[10px] text-muted-foreground mt-1">Joined {format(parseISO(entry.created_at), "dd MMM yyyy")}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {entry.notified_at ? (
                              <Badge variant="outline" className="text-[10px] bg-success/10 text-success">Notified</Badge>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => notifyWaitlistEntry(entry)}>
                                <Mail className="h-3 w-3 mr-1" /> Notify
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteWaitlistEntry(entry.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>
            {/* Foot Care Waitlist & Poll Results */}
            {footCareWaitlist.length > 0 && (
              <Collapsible open={footCareWaitlistExpanded} onOpenChange={setFootCareWaitlistExpanded}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between rounded-lg border border-emerald-700/40 bg-emerald-950/40 p-3 hover:bg-emerald-900/40 transition-colors cursor-pointer mt-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-emerald-500/20"><Footprints className="h-4 w-4 text-emerald-400" /></div>
                      <span className="font-serif text-sm font-semibold text-emerald-200">Foot Care Waitlist</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{footCareWaitlist.length}</Badge>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-emerald-400 transition-transform ${footCareWaitlistExpanded ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="mt-2 border-emerald-800/30">
                    <CardContent className="py-4 space-y-4">
                      {/* Poll Results Summary */}
                      <div>
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-secondary" /> Pricing Poll Results
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            { key: "first_assessment", label: "First Assessment" },
                            { key: "nails_only", label: "Nails Only" },
                            { key: "routine_treatment", label: "Routine Treatment" },
                            { key: "home_visit_value", label: "Home Visit Importance" },
                          ].map(({ key, label }) => {
                            const tallies: Record<string, number> = {};
                            footCareWaitlist.forEach(e => {
                              const ans = e.poll_responses?.[key];
                              if (ans) tallies[ans] = (tallies[ans] || 0) + 1;
                            });
                            const total = Object.values(tallies).reduce((s, c) => s + c, 0);
                            const sorted = Object.entries(tallies).sort((a, b) => b[1] - a[1]);
                            return (
                              <div key={key} className="rounded-lg border border-border p-3 space-y-2">
                                <p className="text-xs font-semibold">{label}</p>
                                {sorted.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground">No responses</p>
                                ) : (
                                  sorted.map(([opt, count]) => (
                                    <div key={opt} className="flex items-center gap-2">
                                      <div className="flex-1">
                                        <div className="flex justify-between text-[10px] mb-0.5">
                                          <span>{opt}</span>
                                          <span className="text-muted-foreground">{count} ({Math.round(count / total * 100)}%)</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                          <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${count / total * 100}%` }} />
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Registrants */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Registrants ({footCareWaitlist.length})</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {footCareWaitlist.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between rounded border p-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">{entry.client_name}</p>
                                <p className="text-xs text-muted-foreground">{entry.client_email}</p>
                                {entry.client_phone && <p className="text-xs text-muted-foreground">{entry.client_phone}</p>}
                                <p className="text-[10px] text-muted-foreground mt-1">Joined {format(parseISO(entry.created_at), "dd MMM yyyy")}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={async () => {
                                await (supabase as any).from("foot_care_waitlist").delete().eq("id", entry.id);
                                setFootCareWaitlist(prev => prev.filter(e => e.id !== entry.id));
                                toast.success("Removed");
                              }}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}
            {/* Hearing Screening Section */}
            <div className="border-t border-emerald-700/30 pt-6 mt-6">
              <HearingScreeningTab 
                preSelectedPatient={hearingTabPatient}
                onClearPreSelected={() => setHearingTabPatient(null)}
              />
            </div>
          </TabsContent>

          {/* TEMPLATES TAB (merged Forms + Comms) */}
          <TabsContent value="templates" className="rounded-lg border border-violet-900/50 bg-violet-950/20 p-4 space-y-4">
            <div className="text-center mb-4">
              <h2 className="font-serif text-2xl font-bold text-foreground">Templates</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage consent forms, email templates, SMS templates, and cryo aftercare sequences</p>
            </div>

            {/* ── SEND FORM TO PATIENT ── */}
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between rounded-lg border border-violet-700/40 bg-violet-950/40 p-3 hover:bg-violet-900/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-violet-500/20"><Send className="h-4 w-4 text-violet-400" /></div>
                    <span className="font-serif text-sm font-semibold text-violet-200">Send Form to Patient</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-violet-400" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2 border-violet-800/30">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardDescription>Manually send any form to a patient's email for them to complete.</CardDescription>
                    <Button size="sm" onClick={() => setSendFormDialogOpen(true)}>
                      <Send className="mr-2 h-4 w-4" /> Send Form
                    </Button>
                  </CardHeader>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* ── CONSENT FORMS ── */}
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between rounded-lg border border-violet-700/40 bg-violet-950/40 p-3 hover:bg-violet-900/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-violet-500/20"><FileText className="h-4 w-4 text-violet-400" /></div>
                    <span className="font-serif text-sm font-semibold text-violet-200">Consent Forms</span>
                    <Badge variant="outline" className="text-[10px] border-violet-600/40 text-violet-300">{templates.filter(t => t.form_type !== 'consultation').length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-violet-400" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2 border-violet-800/30">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardDescription>Forms that patients must complete before treatment.</CardDescription>
                    <Button size="sm" onClick={() => { setEditingTemplate(null); setFormDialogOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" /> New Consent Form
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {templates.filter(t => t.form_type !== 'consultation').length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">No consent forms yet.</p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {templates.filter(t => t.form_type !== 'consultation').map((t) => {
                          const fields = Array.isArray(t.fields) ? t.fields : [];
                          return (
                            <Card key={t.id}>
                              <CardContent className="pt-6">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h3 className="font-medium">{t.title}</h3>
                                    {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {fields.length} fields · Created {format(parseISO(t.created_at), "MMM d, yyyy")}
                                    </p>
                                    {services.filter(s => s.consent_form_template_id === t.id).length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {services.filter(s => s.consent_form_template_id === t.id).map(s => (
                                          <Badge key={s.id} variant="secondary" className="text-xs">{s.name}</Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" title="Send to patient" onClick={() => { setSendFormTemplateId(t.id); setSendFormDialogOpen(true); }}>
                                      <Send className="h-4 w-4 text-secondary" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => openEditTemplate(t)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteTemplate(t.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                                {fields.length > 0 && (
                                  <div className="border-t pt-3 mt-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Form Fields:</p>
                                    <div className="space-y-1">
                                      {fields.map((f: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between text-xs rounded bg-muted/50 px-2 py-1.5">
                                          <span>{f.label || "Untitled"}</span>
                                          <Badge variant="outline" className="text-[10px] capitalize">{f.type || "text"}</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* ── CONSULTATION FORMS ── */}
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between rounded-lg border border-indigo-700/40 bg-indigo-950/40 p-3 hover:bg-indigo-900/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-indigo-500/20"><Stethoscope className="h-4 w-4 text-indigo-400" /></div>
                    <span className="font-serif text-sm font-semibold text-indigo-200">Consultation Forms</span>
                    <Badge variant="outline" className="text-[10px] border-indigo-600/40 text-indigo-300">{templates.filter(t => t.form_type === 'consultation').length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-indigo-400" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2 border-indigo-800/30">
                  <CardHeader>
                    <CardDescription>Procedure forms completed by the practitioner during appointments — your clinical records.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {templates.filter(t => t.form_type === 'consultation').length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">No consultation forms yet.</p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {templates.filter(t => t.form_type === 'consultation').map((t) => {
                          const fields = Array.isArray(t.fields) ? t.fields : [];
                          return (
                            <Card key={t.id}>
                              <CardContent className="pt-6">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h3 className="font-medium">{t.title}</h3>
                                    {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {fields.length} fields · Created {format(parseISO(t.created_at), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openEditTemplate(t)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                {fields.length > 0 && (
                                  <div className="border-t pt-3 mt-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Form Fields:</p>
                                    <div className="space-y-1">
                                      {fields.map((f: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between text-xs rounded bg-muted/50 px-2 py-1.5">
                                          <span>{f.label || "Untitled"}</span>
                                          <Badge variant="outline" className="text-[10px] capitalize">{f.type || "text"}</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* ── EMAIL TEMPLATES ── */}
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between rounded-lg border border-cyan-700/40 bg-cyan-950/40 p-3 hover:bg-cyan-900/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-cyan-500/20"><Mail className="h-4 w-4 text-cyan-400" /></div>
                    <span className="font-serif text-sm font-semibold text-cyan-200">Email Templates</span>
                    <Badge variant="outline" className="text-[10px] border-cyan-600/40 text-cyan-300">{emailTemplates.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-cyan-400" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2 border-cyan-800/30">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardDescription>Customize the emails sent when certain events happen.</CardDescription>
                    <Button size="sm" onClick={openNewEmail}>
                      <Plus className="mr-1 h-4 w-4" /> New Email
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {emailTemplates.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">No email templates found.</p>
                    ) : (
                      <div className="space-y-3">
                        {emailTemplates.map((tpl) => (
                          <div key={tpl.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm">{triggerTypeLabels[tpl.trigger_type] || tpl.trigger_type}</h3>
                                <Badge variant="outline" className={tpl.is_active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                                  {tpl.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              {tpl.description && <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>}
                              <p className="text-xs text-muted-foreground mt-1">Subject: {tpl.subject}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" title="Send Test" onClick={() => sendTestEmail(tpl)}>
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEditEmail(tpl)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteEmailTemplate(tpl.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* ── SMS TEMPLATES ── */}
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between rounded-lg border border-sky-700/40 bg-sky-950/40 p-3 hover:bg-sky-900/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-sky-500/20"><Phone className="h-4 w-4 text-sky-400" /></div>
                    <span className="font-serif text-sm font-semibold text-sky-200">SMS Templates</span>
                    <Badge variant="outline" className="text-[10px] border-sky-600/40 text-sky-300">{smsTemplates.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sky-400" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2 border-sky-800/30">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardDescription>Customize the text messages sent to patients.</CardDescription>
                    <Button size="sm" onClick={openNewSms}>
                      <Plus className="mr-1 h-4 w-4" /> New SMS
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {smsTemplates.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">No SMS templates found.</p>
                    ) : (
                      <div className="space-y-3">
                        {smsTemplates.map((tpl) => (
                          <div key={tpl.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm">{smsTriggerTypeLabels[tpl.trigger_type] || tpl.trigger_type}</h3>
                                <Badge variant="outline" className={tpl.is_active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                                  {tpl.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              {tpl.description && <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>}
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.body_text}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" title="Send Test SMS" onClick={() => sendTestSms(tpl)}>
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEditSms(tpl)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteSmsTemplate(tpl.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* ── CRYO FOLLOW-UP TEMPLATES ── */}
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between rounded-lg border border-teal-700/40 bg-teal-950/40 p-3 hover:bg-teal-900/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-teal-500/20"><Stethoscope className="h-4 w-4 text-teal-400" /></div>
                    <span className="font-serif text-sm font-semibold text-teal-200">Cryo Follow-Up Emails</span>
                    <Badge variant="outline" className="text-[10px] border-teal-600/40 text-teal-300">{cryoTemplates.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-teal-400" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2 border-teal-800/30">
                  <CardHeader>
                    <CardDescription>Weekly aftercare check-in emails sent automatically to cryotherapy patients over 4 weeks.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cryoTemplates.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">No cryo follow-up templates found.</p>
                    ) : (
                      <div className="space-y-3">
                        {cryoTemplates.map((tpl) => (
                          <div key={tpl.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm">Week {tpl.week_number} — {tpl.heading}</h3>
                                <Badge variant="outline" className={tpl.is_active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                                  {tpl.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Subject: {tpl.subject}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" title="Send Test Email" onClick={() => sendTestCryoEmail(tpl)}>
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEditCryo(tpl)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* ── TEST FORMS ── */}
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between rounded-lg border border-amber-700/40 bg-amber-950/40 p-3 hover:bg-amber-900/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-amber-500/20"><ClipboardList className="h-4 w-4 text-amber-400" /></div>
                    <span className="font-serif text-sm font-semibold text-amber-200">Test Forms & Previews</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-amber-400" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2 border-amber-800/30">
                  <CardHeader>
                    <CardDescription>Send yourself a test consent or consultation form email to verify the flow.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={sendTestConsentForm}>
                        <Send className="mr-2 h-4 w-4" /> Test Consent Form Email
                      </Button>
                      <Button variant="outline" onClick={() => {
                        const testUrl = `${window.location.origin}/consent/test-preview`;
                        window.open(testUrl, "_blank");
                        toast.info("Opening consent form preview — note: test tokens won't submit");
                      }}>
                        <Eye className="mr-2 h-4 w-4" /> Preview Consent Form
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Tests use the most recent appointment. The consent form email will be sent to that patient's email address with a [TEST] prefix.
                    </p>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Form Builder Dialogs */}
            <FormBuilderDialog
              open={formDialogOpen}
              onOpenChange={setFormDialogOpen}
              title=""
              description=""
              fields={[]}
              formType="consent"
              isNew
              onSave={handleFormBuilderSave}
            />
            <FormBuilderDialog
              open={editTemplateDialogOpen}
              onOpenChange={setEditTemplateDialogOpen}
              title={editTitle}
              description={editDesc}
              fields={editFields}
              formType={editingTemplate?.form_type || "consent"}
              onSave={handleFormBuilderSave}
            />

            {/* Email Template Editor */}
            <EmailTemplateEditor
              open={emailDialogOpen}
              onOpenChange={setEmailDialogOpen}
              triggerType={emailTriggerType}
              subject={emailSubject}
              bodyHtml={emailBody}
              description={emailDesc}
              isActive={emailActive}
              isNew={isNewEmail}
              triggerTypeLabels={triggerTypeLabels}
              availableVars={availableVars}
              onSave={saveEmailTemplate}
              onSendTest={editingEmail ? () => sendTestEmail(editingEmail) : undefined}
            />

            {/* SMS Template Editor */}
            <SmsTemplateEditor
              open={smsDialogOpen}
              onOpenChange={setSmsDialogOpen}
              triggerType={smsTriggerType}
              bodyText={smsBody}
              description={smsDesc}
              isActive={smsActive}
              isNew={isNewSms}
              triggerTypeLabels={smsTriggerTypeLabels}
              availableVars={smsAvailableVars}
              onSave={saveSmsTemplate}
              onSendTest={editingSms ? () => sendTestSms(editingSms) : undefined}
            />

            {/* Cryo Follow-Up Template Edit Dialog */}
            <Dialog open={cryoDialogOpen} onOpenChange={setCryoDialogOpen}>
              <DialogContent className="max-h-[80vh] overflow-y-auto max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="font-serif">
                    Edit Cryo Week {editingCryo?.week_number} Follow-Up
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input value={cryoSubject} onChange={(e) => setCryoSubject(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Heading</Label>
                    <Input value={cryoHeading} onChange={(e) => setCryoHeading(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Guidance Content (HTML)</Label>
                    <Textarea value={cryoGuidance} onChange={(e) => setCryoGuidance(e.target.value)} rows={14} className="font-mono text-xs" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={cryoActive} onCheckedChange={setCryoActive} />
                    <Label>Active</Label>
                    <span className="text-xs text-muted-foreground">Inactive weeks won't be sent</span>
                  </div>
                  <Button onClick={saveCryoTemplate} className="w-full">Save Follow-Up Template</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* MESSAGES TAB (with Chatbot sub-view) */}
          <TabsContent value="messages" className="rounded-lg border border-sky-900/50 bg-sky-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">View:</Label>
              <Select value={messagesSubView} onValueChange={setMessagesSubView}>
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="messages">Messages</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="chatbot">
                    Chatbot {unreadChatCount > 0 ? `(${unreadChatCount})` : ""}
                  </SelectItem>
                </SelectContent>
              </Select>
              {messagesSubView === "chatbot" && unreadChatCount > 0 && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            {messagesSubView === "messages" ? (
              <MessagesTab />
            ) : messagesSubView === "marketing" ? (
              <MarketingTab />
            ) : (
              <ChatLogsTab onUnreadCountChange={setUnreadChatCount} />
            )}
          </TabsContent>

          {/* RECALLS TAB */}
          <TabsContent value="recalls" className="rounded-lg border border-teal-900/50 bg-teal-950/20 p-4">
            <RecallsTab />
          </TabsContent>

          {/* ACCOUNTS TAB */}
          <TabsContent value="accounts" className="rounded-lg border border-rose-900/50 bg-rose-950/20 p-4">
            <AccountsTab />
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 space-y-6">
            <ReportsTab />
          </TabsContent>

          {/* MILEAGE TAB */}
          <TabsContent value="mileage" className="rounded-lg border border-purple-900/50 bg-purple-950/20 p-4">
            <MileageTab />
          </TabsContent>

          {/* NOTICES TAB */}
          <TabsContent value="notices" className="rounded-lg border border-orange-900/50 bg-orange-950/20 p-4">
            <NoticesTab />
          </TabsContent>

          {/* TODO TAB */}
          <TabsContent value="todo" className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-4">
            <TodoTab onOpenPatient={openInlinePatient} onOverdueCountChange={(count) => setTodoOverdueCount(count)} />
          </TabsContent>

          {/* REFERRALS TAB */}
          <TabsContent value="referrals" className="rounded-lg border border-pink-900/50 bg-pink-950/20 p-4">
            <ReferralsTab />
          </TabsContent>

          {/* CLINICAL AUDIT TAB */}
          <TabsContent value="audit" className="rounded-lg border border-cyan-900/50 bg-cyan-950/20 p-4">
            <GovernanceTab />
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="rounded-lg border border-border bg-card/50 p-4">
            <div className="text-center mb-6">
              <h2 className="font-serif text-2xl font-bold text-foreground">Settings</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure business hours, booking rules, and system preferences</p>
            </div>
            <div className="mb-4">
              <AppearanceSettings />
            </div>
            <Card>
              <CardHeader><CardTitle className="font-serif">Business Settings</CardTitle></CardHeader>
              <CardContent>
                {settings && (
                  <div className="max-w-md space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Default Start Hour</Label>
                        <Select value={String(settings.start_hour)} onValueChange={(v) => setSettings({ ...settings, start_hour: Number(v) })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Array.from({ length: 24 }, (_, i) => (<SelectItem key={i} value={String(i)}>{i.toString().padStart(2, "0")}:00</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Default End Hour</Label>
                        <Select value={String(settings.end_hour)} onValueChange={(v) => setSettings({ ...settings, end_hour: Number(v) })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Array.from({ length: 24 }, (_, i) => (<SelectItem key={i} value={String(i)}>{i.toString().padStart(2, "0")}:00</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Default hours are used when adding new available dates. You can override hours per date in the Availability tab.</p>
                    <div className="space-y-2">
                      <Label>Travel Buffer (extra minutes per mile)</Label>
                      <Input type="number" step="0.1" value={settings.travel_buffer_per_mile} onChange={(e) => setSettings({ ...settings, travel_buffer_per_mile: Number(e.target.value) })} min={0} max={5} />
                      <p className="text-xs text-muted-foreground">Extra buffer added on top of calculated drive time, proportional to distance. This buffer <strong>blocks out time</strong> in the schedule — it's included in total travel time when calculating available slots.</p>
                      <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-foreground">Example: 5-mile trip with ~10 min drive</p>
                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="font-mono">0.1 min/mi</span><span>→ 0.5 min buffer → 10.5 min blocked <span className="text-destructive font-medium">(no safety margin)</span></span>
                          <span className="font-mono">0.5 min/mi</span><span>→ 2.5 min buffer → 12.5 min blocked <span className="text-muted-foreground">(light cushion)</span></span>
                          <span className="font-mono font-bold text-foreground">1.0 min/mi</span><span>→ <strong className="text-foreground">5 min buffer → 15 min blocked</strong> <span className="text-success font-medium">(recommended — covers parking & setup)</span></span>
                          <span className="font-mono">2.0 min/mi</span><span>→ 10 min buffer → 20 min blocked <span className="text-amber-600 dark:text-amber-400 font-medium">(generous — may create gaps)</span></span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/80 pt-1">For longer trips (10-15 mi), 1 min/mile gives 10-15 min buffer — good for Dorset traffic variability.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Booking Cutoff (hours before appointment)</Label>
                      <Input type="number" value={settings.booking_cutoff_hours} onChange={(e) => setSettings({ ...settings, booking_cutoff_hours: Number(e.target.value) })} min={0} max={168} />
                      <p className="text-xs text-muted-foreground">Patients cannot book a slot if it's less than this many hours away. E.g. 14 means slots within the next 14 hours won't be shown.</p>
                    </div>
                    <Button onClick={updateSettings}>Save Settings</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="mt-4">
              <AdminAuthenticatorSettings />
            </div>
            <Card className="mt-4">
              <CardHeader><CardTitle className="font-serif flex items-center gap-2"><GripVertical className="h-4 w-4" /> Tab Order</CardTitle>
                <CardDescription>Drag to rearrange dashboard tabs. Changes save automatically.</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                   const DEFAULT_ORDER = ["calendar","patients","recalls","services","templates","messages","notices","accounts","mileage","reports","todo","referrals","audit","settings"];
                  const TAB_LABELS: Record<string,{label:string;cls:string}> = {
                    calendar:{label:"Schedule",cls:"bg-blue-800/80 border-blue-500/60"},
                    patients:{label:"Records",cls:"bg-indigo-800/80 border-indigo-500/60"},
                    recalls:{label:"Recalls",cls:"bg-teal-800/80 border-teal-500/60"},
                    services:{label:"Services",cls:"bg-emerald-800/80 border-emerald-500/60"},
                    templates:{label:"Templates",cls:"bg-violet-800/80 border-violet-500/60"},
                    messages:{label:"Msgs",cls:"bg-sky-800/80 border-sky-500/60"},
                    accounts:{label:"Accounts",cls:"bg-rose-800/80 border-rose-500/60"},
                    mileage:{label:"Mileage",cls:"bg-purple-800/80 border-purple-500/60"},
                    reports:{label:"Reports",cls:"bg-amber-800/80 border-amber-500/60"},
                    todo:{label:"Todo",cls:"bg-yellow-800/80 border-yellow-500/60"},
                    notices:{label:"Notices",cls:"bg-orange-800/80 border-orange-500/60"},
                    referrals:{label:"Referrals",cls:"bg-pink-800/80 border-pink-500/60"},
                    audit:{label:"Governance",cls:"bg-cyan-800/80 border-cyan-500/60"},
                    settings:{label:"Settings",cls:"bg-slate-700/80 border-slate-500/60"},
                  };
                  const currentOrder = tabOrder.length > 0 ? tabOrder : DEFAULT_ORDER;
                  const moveTab = (idx: number, dir: -1 | 1) => {
                    const newOrder = [...currentOrder];
                    const target = idx + dir;
                    if (target < 0 || target >= newOrder.length) return;
                    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
                    setTabOrder(newOrder);
                    localStorage.setItem('admin_tab_order', JSON.stringify(newOrder));
                  };
                  return (
                    <div className="space-y-1">
                      {currentOrder.map((val, idx) => {
                        const info = TAB_LABELS[val];
                        if (!info) return null;
                        return (
                          <div key={val} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-white text-sm", info.cls)}>
                            <span className="text-xs text-muted-foreground w-5 text-center font-mono">{idx + 1}</span>
                            <GripVertical className="h-3.5 w-3.5 text-white/50" />
                            <span className="flex-1 font-medium">{info.label}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveTab(idx, -1)} disabled={idx === 0}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveTab(idx, 1)} disabled={idx === currentOrder.length - 1}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => { setTabOrder([]); localStorage.removeItem('admin_tab_order'); toast.success("Tab order reset to default"); }}>
                        Reset to Default
                      </Button>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
            </Tabs>
          );
        })()}

        <ConsultationFormDialog
          open={consultFormOpen}
          onOpenChange={setConsultFormOpen}
          appointmentId={consultAptId}
          preselectedTemplateId={consultTemplateId}
          formType={consultFormType}
          onComplete={() => { fetchAppointments(); fetchConsentStatus(); fetchConsultNoteStatus(); }}
        />

        <PhoneBookingWizard
          open={phoneBookingOpen}
          onOpenChange={(v) => { setPhoneBookingOpen(v); if (!v) setPhoneBookingPrefill(null); }}
          services={services}
          settings={settings}
          availableDates={availableDates}
          onComplete={() => { fetchAppointments(); fetchPatientDobs(); fetchPatientCount(); }}
          prefill={phoneBookingPrefill}
        />

        <HearingScreeningDialog
          open={hearingScreeningOpen}
          onOpenChange={(open) => {
            setHearingScreeningOpen(open);
            if (!open) setHearingPatient(null);
          }}
          patientId={hearingPatient?.id}
          patientName={hearingPatient?.client_name}
          patientDob={hearingPatient?.date_of_birth}
          patientEmail={hearingPatient?.client_email}
          consultationId={hearingConsultationId}
          serviceContext={hearingServiceContext}
          onComplete={() => { fetchAppointments(); }}
        />

        {/* Status Change Confirmation Dialog */}
        <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
          <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif">Change Appointment Status</AlertDialogTitle>
              <AlertDialogDescription>
                Change <strong>{statusChangeApt?.client_name}</strong>'s appointment to <strong>{statusChangeNewStatus}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            {statusChangeNewStatus === "completed" ? (
              <div className="space-y-2 py-2">
                <div className="flex items-center gap-3">
                  <Checkbox id="review-request" checked={statusChangeReviewRequest} onCheckedChange={(c) => setStatusChangeReviewRequest(!!c)} />
                  <Label htmlFor="review-request" className="text-sm cursor-pointer">Send review request to patient</Label>
                </div>
                <p className="text-xs text-muted-foreground ml-7">Patient will receive a review request via email &amp; SMS with links to Google and Facebook.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 py-2">
                  <div className="flex items-center gap-3">
                    <Checkbox id="notify-patient-email" checked={statusChangeNotify} onCheckedChange={(c) => setStatusChangeNotify(!!c)} />
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="notify-patient-email" className="text-sm cursor-pointer">Send email notification</Label>
                    {statusChangeNotify && statusChangePreviewHtml && (
                      <Button variant="ghost" size="sm" className="text-xs h-7 ml-auto" onClick={() => setStatusChangeShowPreview(!statusChangeShowPreview)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> {statusChangeShowPreview ? "Hide" : "Preview"}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="notify-patient-sms" checked={statusChangeNotifySms} onCheckedChange={(c) => setStatusChangeNotifySms(!!c)} disabled={!statusChangeApt?.client_phone} />
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="notify-patient-sms" className={cn("text-sm cursor-pointer", !statusChangeApt?.client_phone && "text-muted-foreground")}>
                      Send SMS notification
                    </Label>
                    {!statusChangeApt?.client_phone && (
                      <span className="text-[10px] text-muted-foreground italic">No phone number</span>
                    )}
                  </div>
                </div>
                {statusChangeNotify && statusChangeShowPreview && statusChangePreviewHtml && (
                  <div className="flex-1 overflow-y-auto border rounded-lg">
                    <div className="bg-muted/30 px-3 py-1.5 border-b">
                      <p className="text-[10px] text-muted-foreground">Subject: <strong className="text-foreground">{statusChangePreviewSubject}</strong></p>
                      <p className="text-[10px] text-muted-foreground">To: {statusChangeApt?.client_email}</p>
                    </div>
                    <div className="p-3 bg-white rounded-b-lg" dangerouslySetInnerHTML={{ __html: statusChangePreviewHtml }} />
                  </div>
                )}
                {statusChangeNotify && !statusChangePreviewHtml && (
                  <p className="text-xs text-muted-foreground italic">No email template found for this status change. A default notification will be sent.</p>
                )}
              </>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeStatusChange}>
                {statusChangeNewStatus === "completed" 
                  ? (statusChangeReviewRequest ? "Complete & Send Review" : "Complete")
                  : ((statusChangeNotify || statusChangeNotifySms) ? "Confirm & Send" : "Confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* On My Way Confirmation Dialog */}
        <AlertDialog open={!!onMyWayConfirmApt} onOpenChange={(open) => { if (!open) { setOnMyWayConfirmApt(null); setOnMyWayEtaMode("google"); setOnMyWayManualMinutes(10); setOnMyWaySkipNotify(false); } }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif">Notify Patient: On My Way</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>Send an "On my way" notification to <strong>{onMyWayConfirmApt?.client_name}</strong> with a live tracking link.</p>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Arrival estimate</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant={onMyWayEtaMode === "google" ? "default" : "outline"} size="sm" className="w-full" onClick={() => setOnMyWayEtaMode("google")}>
                        <Navigation className="h-3.5 w-3.5 mr-1.5" /> Google Live ETA
                      </Button>
                      <Button type="button" variant={onMyWayEtaMode === "manual" ? "default" : "outline"} size="sm" className="w-full" onClick={() => setOnMyWayEtaMode("manual")}>
                        <Clock className="h-3.5 w-3.5 mr-1.5" /> Set Manually
                      </Button>
                    </div>
                    {onMyWayEtaMode === "google" && (
                      <p className="text-xs text-muted-foreground">Google will calculate a live ETA based on current traffic conditions.</p>
                    )}
                    {onMyWayEtaMode === "manual" && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {[5, 10, 15, 20, 25].map((m) => (
                            <Button key={m} type="button" variant={onMyWayManualMinutes === m ? "default" : "outline"} size="sm" className="min-w-[52px]" onClick={() => setOnMyWayManualMinutes(m)}>
                              {m} min
                            </Button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Custom:</Label>
                          <Input type="number" min={1} max={120} value={onMyWayManualMinutes} onChange={(e) => setOnMyWayManualMinutes(Math.max(1, parseInt(e.target.value) || 1))} className="h-8 w-20 text-sm" />
                          <span className="text-xs text-muted-foreground">minutes</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Checkbox id="omw-skip-notify" checked={onMyWaySkipNotify} onCheckedChange={(c) => setOnMyWaySkipNotify(!!c)} />
                    <Label htmlFor="omw-skip-notify" className="text-sm cursor-pointer">Don't notify patient (silent — countdown only)</Label>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onMyWayConfirmApt && executeOnMyWay(onMyWayConfirmApt.id)}>
                <Car className="h-4 w-4 mr-2" /> {onMyWaySkipNotify ? "Start Countdown" : "Send Notification"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clinic Ready Confirmation Dialog */}
        <AlertDialog open={!!clinicReadyConfirmApt} onOpenChange={(open) => { if (!open) { setClinicReadyConfirmApt(null); setClinicReadyTimeMode("now"); } }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif">Notify Patient: I'm Ready</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>Send a "We're ready for you" notification to <strong>{clinicReadyConfirmApt?.client_name}</strong> with a tracking link and location details.</p>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Ready from when?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant={clinicReadyTimeMode === "now" ? "default" : "outline"} size="sm" className="w-full" onClick={() => setClinicReadyTimeMode("now")}>
                        <Clock className="h-3.5 w-3.5 mr-1.5" /> Now
                      </Button>
                      <Button type="button" variant={clinicReadyTimeMode === "specific" ? "default" : "outline"} size="sm" className="w-full" onClick={() => setClinicReadyTimeMode("specific")}>
                        <Clock className="h-3.5 w-3.5 mr-1.5" /> Specific Time
                      </Button>
                    </div>
                    {clinicReadyTimeMode === "now" && (
                      <p className="text-xs text-muted-foreground">The patient will be told they can arrive immediately.</p>
                    )}
                    {clinicReadyTimeMode === "specific" && (
                      <div className="space-y-2">
                        <Input type="time" value={clinicReadySpecificTime} onChange={(e) => setClinicReadySpecificTime(e.target.value)} className="h-10 text-lg font-mono" />
                        <p className="text-xs text-muted-foreground">The patient will be told they can arrive from this time.</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800"><strong>What the patient receives:</strong> An SMS and email letting them know they can arrive anytime from the selected time up to their booked appointment. They'll also get a tracking link and a link to your address & directions.</p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => clinicReadyConfirmApt && executeClinicReady(clinicReadyConfirmApt.id)}>
                <Home className="h-4 w-4 mr-2" /> Send "We're Ready"
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delay Update Confirmation Dialog */}
        <AlertDialog open={!!delayConfirmApt} onOpenChange={(open) => { if (!open) { setDelayConfirmApt(null); setDelayEtaMinutes(10); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif">Send Delay Update</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>Send a delay update to <strong>{delayConfirmApt?.client_name}</strong> with your estimated time of arrival.</p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">How long until you arrive?</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[5, 10, 15, 20, 25].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setDelayEtaMinutes(mins)}
                          className={cn(
                            "rounded-lg border-2 py-3 text-center font-semibold text-sm transition-all",
                            delayEtaMinutes === mins
                              ? "border-secondary bg-secondary/10 text-secondary"
                              : "border-border bg-card text-foreground hover:border-secondary/40"
                          )}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => delayConfirmApt && executeDelayUpdate(delayConfirmApt.id, delayEtaMinutes)}>
                <AlertTriangle className="h-4 w-4 mr-2" /> Send — ETA {delayEtaMinutes} mins
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Day Preview Dialog for pending requests */}
        <Dialog open={!!previewDayDate} onOpenChange={(open) => { if (!open) { setPreviewDayDate(null); setPreviewDayHighlightAptId(null); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Day Preview — {previewDayDate ? format(parseISO(previewDayDate), "EEEE, MMMM d, yyyy") : ""}
              </DialogTitle>
            </DialogHeader>
            {previewDayDate && (() => {
              const pvDateStr = previewDayDate;
              const pvDayApts = allAppointments
                .filter(a => a.appointment_date === pvDateStr && a.status !== "cancelled" && a.status !== "rejected")
                .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
              const pvDayBlocks = blockedTimes
                .filter(bt => bt.blocked_date === pvDateStr)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
              const pvDayOpen = availableDates.find(d => d.available_date === pvDateStr);

              const pvTravelSegments = computeTravelSegments(pvDayApts, pvDayBlocks);
              const pvEmbeddedMobileStarts = new Set(pvTravelSegments.filter(s => s.mobileBreak).map(s => s.mobileBreak!.startTime));
              const pvCombined: { type: 'apt' | 'block' | 'travel'; time: string; data: any }[] = [
                ...pvDayBlocks
                  .filter(bt => !(bt.reason?.includes("Mobile") && pvEmbeddedMobileStarts.has(bt.start_time)))
                  .map(bt => ({ type: 'block' as const, time: bt.start_time, data: bt })),
                ...pvDayApts.map(apt => ({ type: 'apt' as const, time: apt.appointment_time, data: apt })),
              ].sort((a, b) => a.time.localeCompare(b.time));

              const pvWithTravel: typeof pvCombined = [];
              for (const item of pvCombined) {
                if (item.type === 'block' && item.data.reason?.includes("Lunch")) {
                  const seg = pvTravelSegments.find(s => s.afterAptId?.startsWith("__to_lunch_"));
                  if (seg) pvWithTravel.push({ type: 'travel', time: seg.departBy, data: seg });
                }
                pvWithTravel.push(item);
                if (item.type === 'apt') {
                  const seg = pvTravelSegments.find(s => s.afterAptId === item.data.id);
                  if (seg) pvWithTravel.push({ type: 'travel', time: seg.departBy, data: seg });
                }
                if (item.type === 'block' && item.data.reason?.includes("Lunch")) {
                  const seg = pvTravelSegments.find(s => s.afterAptId?.startsWith("__lunch_to_"));
                  if (seg) pvWithTravel.push({ type: 'travel', time: seg.departBy, data: seg });
                }
              }
              const pvBaseSeg = pvTravelSegments.find(s => s.afterAptId === "__base__");
              if (pvBaseSeg) pvWithTravel.unshift({ type: 'travel', time: pvBaseSeg.departBy, data: pvBaseSeg });

              const pvOpenHours = pvDayOpen ? { startMin: (pvDayOpen.start_hour ?? settings?.start_hour ?? 9) * 60, endMin: (pvDayOpen.end_hour ?? settings?.end_hour ?? 17) * 60 } : null;
              const pvTimeline = insertDeadGaps(pvWithTravel, pvOpenHours);

              return (
                <div className="space-y-2">
                  {/* Day summary header */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pb-2 border-b border-border">
                    {pvDayOpen && <span className="flex items-center gap-1"><CalendarCheck className="h-3 w-3 text-success" />Open {pvDayOpen.start_hour != null ? `${fmtHourMin(pvDayOpen.start_hour)}–${fmtHourMin(pvDayOpen.end_hour ?? 17)}` : ""}</span>}
                    {!pvDayOpen && <span className="text-destructive">Day not open</span>}
                    {pvDayApts.length > 0 && <span>{pvDayApts.length} appt{pvDayApts.length > 1 ? "s" : ""}</span>}
                    {pvDayBlocks.filter(bt => bt.reason !== "Castle View" && bt.reason !== "Annual Leave" && bt.reason !== "On Call").length > 0 && <span className="flex items-center gap-1 text-destructive"><Ban className="h-3 w-3" />{pvDayBlocks.filter(bt => bt.reason !== "Castle View" && bt.reason !== "Annual Leave" && bt.reason !== "On Call").length} block{pvDayBlocks.filter(bt => bt.reason !== "Castle View" && bt.reason !== "Annual Leave" && bt.reason !== "On Call").length > 1 ? "s" : ""}</span>}
                  </div>

                  {pvTimeline.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      {pvDayOpen ? "No bookings yet for this day." : "No activity on this day."}
                    </p>
                  )}

                  {pvTimeline.map((item, idx) => {
                    if (item.type === 'dead_gap') {
                      const nextApt = pvTimeline.slice(idx + 1).find(t => t.type === 'apt');
                      const nextCompleted = nextApt?.data?.status === "completed";
                      return nextCompleted ? (
                        <div key={`dg-${idx}`} className="flex items-center gap-2 rounded-lg border border-muted bg-muted/20 px-3 py-1 opacity-50">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <p className="text-[10px] text-muted-foreground line-through">{item.data.unknownDrive ? "Likely dead time" : "Dead time"} — {item.data.gapMinutes} min</p>
                        </div>
                      ) : (
                        <div key={`dg-${idx}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                          <Clock className="h-3.5 w-3.5 text-foreground shrink-0" />
                          <p className="text-[10px] text-foreground font-medium">{item.data.unknownDrive ? "Likely dead time" : "Dead time"} — {item.data.gapMinutes} min</p>
                        </div>
                      );
                    }
                    if (item.type === 'free_slot') return (
                      <div key={`fs-${idx}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                        <CalendarCheck className="h-3.5 w-3.5 text-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold text-foreground">Free time — {item.data.gapMinutes} min</p>
                          <p className="text-[10px] text-muted-foreground">{`${Math.floor(item.data.startMin / 60).toString().padStart(2, "0")}:${(item.data.startMin % 60).toString().padStart(2, "0")}`} – {`${Math.floor(item.data.endMin / 60).toString().padStart(2, "0")}:${(item.data.endMin % 60).toString().padStart(2, "0")}`}</p>
                        </div>
                      </div>
                    );
                    if (item.type === 'travel') return (
                      <div key={`tr-${idx}`} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
                        <Car className="h-4 w-4 text-blue-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white">
                            {item.data.rawDriveMinutes != null ? `${item.data.rawDriveMinutes} min` : "?"} drive to {item.data.toPatientName || "next"}
                            {item.data.distanceMiles != null ? ` · ${Number(item.data.distanceMiles).toFixed(1)} mi` : ""}
                          </p>
                          <p className="text-[10px] text-white/50">{item.data.fromPostcode} → {item.data.toPostcode}</p>
                          {item.data.departBy && item.data.arriveBy && (
                            <p className="text-[10px] font-bold text-white/80">Depart {item.data.departBy} → Arrive {item.data.arriveBy}</p>
                          )}
                        </div>
                      </div>
                    );
                    if (item.type === 'block') {
                      const isBreak = item.data.reason?.includes("Lunch") || item.data.reason?.includes("Mobile");
                      return (
                        <div key={`bl-${idx}`} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", isBreak ? "border-emerald-500/30 bg-emerald-950/20" : "border-destructive/20 bg-destructive/5")}>
                          {isBreak ? <Coffee className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <Ban className="h-3.5 w-3.5 text-destructive shrink-0" />}
                          <div>
                            <p className={cn("text-xs font-medium", isBreak ? "text-emerald-400" : "text-destructive")}>
                              {item.data.reason?.includes("Lunch") ? "LUNCH AT BASE" : item.data.reason?.includes("Mobile") ? "MOBILE BREAK" : `Blocked: ${item.data.reason || ""}`}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{item.data.start_time.slice(0, 5)} – {item.data.end_time.slice(0, 5)}</p>
                          </div>
                        </div>
                      );
                    }
                    // Appointment
                    const isHighlighted = item.data.id === previewDayHighlightAptId;
                    const isPending = item.data.status === "pending" || item.data.status === "requested";
                    const localityWord = getLocalityWord(item.data);
                    const duration = getGroupDuration(item.data);
                    const endMins = parseInt(item.data.appointment_time.slice(0, 2)) * 60 + parseInt(item.data.appointment_time.slice(3, 5)) + duration;
                    const endTimeStr = `${Math.floor(endMins / 60).toString().padStart(2, "0")}:${(endMins % 60).toString().padStart(2, "0")}`;
                    return (
                      <div key={item.data.id} className={cn(
                        "rounded-lg border p-3 transition-all",
                        isHighlighted
                          ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30"
                          : isPending
                            ? "border-orange-500/30 bg-orange-500/5"
                            : "border-orange-500/40 bg-card"
                      )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground bg-muted/60 rounded px-1.5 py-0.5">{item.data.appointment_time.slice(0, 5)}</span>
                              <span className="text-[10px] text-muted-foreground">– {endTimeStr}</span>
                              <span className="text-[10px] text-muted-foreground">({duration} min)</span>
                              {localityWord && (
                                <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">{localityWord}</span>
                              )}
                            </div>
                            <p className={cn("text-xs font-semibold mt-1", isHighlighted ? "text-orange-600 dark:text-orange-400" : "text-foreground")}>
                              {item.data.client_name}
                              {isHighlighted && <span className="ml-2 text-[10px] font-bold bg-orange-500 text-white rounded px-1.5 py-0.5 uppercase">Pending Review</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{getServiceWithAddons(item.data)}</p>
                            {(item.data.address || item.data.postcode) && (
                              <a
                                href={`https://maps.google.com/?q=${encodeURIComponent((item.data.address || "") + (item.data.postcode && item.data.address && !item.data.address.toUpperCase().includes(item.data.postcode.toUpperCase()) ? ", " + item.data.postcode : !item.data.address && item.data.postcode ? item.data.postcode : ""))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                {item.data.address}{item.data.postcode && item.data.address && !item.data.address.toUpperCase().includes(item.data.postcode.toUpperCase()) ? `, ${item.data.postcode}` : !item.data.address && item.data.postcode ? item.data.postcode : ""}
                              </a>
                            )}
                          </div>
                          <Badge variant="outline" className={cn("text-[10px] shrink-0", statusColors[item.data.status])}>{item.data.status}</Badge>
                        </div>
                      </div>
                    );
                  })}

                  {/* Available slots summary */}
                  {pvDayOpen && (() => {
                    const avail = computeAvailableSlots(pvDateStr, pvDayApts, pvDayBlocks, pvDayOpen);
                    return (
                      <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-center gap-2">
                          <CalendarPlus className="h-3.5 w-3.5 text-primary" />
                          <p className="text-xs font-semibold">
                            {avail.slots > 0 ? `${avail.slots} available slot${avail.slots !== 1 ? "s" : ""} remaining` : "Fully booked"}
                          </p>
                        </div>
                        {avail.slots > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">{avail.slotTimes.slice(0, 8).join(", ")}{avail.slotTimes.length > 8 ? ` +${avail.slotTimes.length - 8} more` : ""}</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2 border-t border-border mt-3">
                    <Button size="sm" className="flex-1 bg-success hover:bg-success/90 text-success-foreground" onClick={() => {
                      const apt = allAppointments.find(a => a.id === previewDayHighlightAptId);
                      if (apt) { approveAppointment(apt); setPreviewDayDate(null); setPreviewDayHighlightAptId(null); }
                    }}>
                      <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => {
                      const apt = allAppointments.find(a => a.id === previewDayHighlightAptId);
                      if (apt) { openRejectDialog(apt); setPreviewDayDate(null); setPreviewDayHighlightAptId(null); }
                    }}>
                      <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedDate(parseISO(previewDayDate!));
                      setActiveTab("calendar");
                      setPreviewDayDate(null);
                      setPreviewDayHighlightAptId(null);
                    }}>
                      Open Full View
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      {/* Patient Tracker Preview Sheet */}
      <Sheet open={!!trackerPreviewToken} onOpenChange={(open) => { if (!open) setTrackerPreviewToken(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4" /> Patient Visit Tracker Preview
            </SheetTitle>
          </SheetHeader>
          {trackerPreviewToken && (
            <iframe
              src={`/visit-tracking/${trackerPreviewToken}`}
              className="w-full h-[calc(100vh-60px)] border-0"
              title="Patient tracker preview"
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        appointment={paymentDialogApt}
        serviceName={paymentDialogApt ? getServiceName(paymentDialogApt.service_id) : ""}
        onPaymentRecorded={() => {
          fetchPendingPayments();
          fetchAppointments();
        }}
        onSkipPayment={() => {
          fetchAppointments();
        }}
        existingPayment={paymentDialogExisting}
      />

      {/* Travel HUD - fullscreen */}
      {travelHudAptId && !travelHudMinimized && (() => {
        const hudApt = allAppointments.find(a => a.id === travelHudAptId);
        if (!hudApt) return null;
        const hudArrival = onMyWayEtaArrivals[travelHudAptId];
        if (!hudArrival) return null;
        return (
          <TravelHUD
            appointmentId={travelHudAptId}
            clientName={hudApt.client_name}
            serviceName={getServiceName(hudApt.service_id)}
            address={hudApt.address}
            postcode={hudApt.postcode}
            phone={hudApt.client_phone}
            arrivalIso={hudArrival}
            onSilentAdjust={executeSilentAdjust}
            onDelay={(apt) => { setTravelHudMinimized(true); setDelayConfirmApt(apt); }}
            onArrived={async (aptId) => {
              setArrivedAptIds(prev => new Set([...prev, aptId]));
              try {
                await supabase.functions.invoke("on-my-way", {
                  body: { appointmentId: aptId, markArrived: true },
                });
                await fetchAppointments();
                await startArrivalTiming(aptId);
                toast.success(`Marked as arrived at ${hudApt.client_name}'s location`);
              } catch (e: any) {
                setArrivedAptIds(prev => {
                  const next = new Set(prev);
                  next.delete(aptId);
                  return next;
                });
                toast.error(`Failed: ${e?.message || "Unknown error"}`);
              }
            }}
            onMinimize={() => setTravelHudMinimized(true)}
            onClose={() => resetTravelCountdown(travelHudAptId)}
            appointment={hudApt}
            isArrived={arrivedAptIds.has(travelHudAptId)}
            googleMapsKey={googleMapsKey || undefined}
          />
        );
      })()}

      {/* Travel HUD - minimized pill */}
      {travelHudAptId && travelHudMinimized && (() => {
        const hudApt = allAppointments.find(a => a.id === travelHudAptId);
        const hudArrival = onMyWayEtaArrivals[travelHudAptId];
        if (!hudApt || !hudArrival) return null;
        const rm = Math.max(0, Math.floor((new Date(hudArrival).getTime() - Date.now()) / 1000));
        const m = Math.floor(rm / 60);
        const s = rm % 60;
        const isDue = rm <= 0;
        const isArr = arrivedAptIds.has(travelHudAptId);
        return (
          <button
            onClick={() => setTravelHudMinimized(false)}
            className={cn(
              "fixed bottom-4 left-4 z-[90] flex items-center gap-2.5 rounded-full px-5 py-3 shadow-2xl border-2 transition-all hover:scale-105 active:scale-100",
              isArr
                ? "bg-emerald-950 border-emerald-500/50"
                : isDue
                  ? "bg-red-950 border-red-500/50"
                  : "bg-slate-900 border-blue-500/50"
            )}
          >
            <Car className={cn("h-5 w-5", isArr ? "text-emerald-400" : isDue ? "text-red-400" : "text-blue-400")} />
            <span className={cn("text-xl font-mono font-black tabular-nums", isArr ? "text-emerald-400" : isDue ? "text-red-400" : m <= 2 ? "text-amber-400" : "text-blue-400")}>
              {isArr ? "Arrived" : isDue ? "Due" : `${m}:${String(s).padStart(2, "0")}`}
            </span>
            <span className="text-xs text-muted-foreground">{hudApt.client_name.split(" ")[0]}</span>
          </button>
        );
      })()}
      </div>
    </div>
  );
};

export { PaymentDialog };
export default AdminDashboard;
