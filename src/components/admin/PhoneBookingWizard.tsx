import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, addWeeks, startOfWeek, addDays, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Phone, MapPin, ChevronLeft, ChevronRight, Loader2, Users, CheckCircle,
  AlertTriangle, ArrowRight, ArrowLeft, Sparkles, X, Minimize2, Maximize2, Clock, XCircle, Map, Navigation, MessageSquare, ShieldAlert, Pencil, Mail, FileText, Home
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { offlineMutation } from "@/lib/offlineMutation";
import { useBookingHold } from "@/hooks/useBookingHold";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
  sort_order: number;
  consent_form_template_id: string | null;
  status?: string;
}


interface AvailableDateRow {
  id: string;
  available_date: string;
  start_hour: number | null;
  end_hour: number | null;
  is_available: boolean;
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

interface SlotInfo {
  time: string;
  available: boolean;
  status?: "taken" | "available" | "recommended";
  driveMinutes?: number;
  distanceMiles?: number;
  recommendReason?: "after-apt" | "before-apt";
}

interface PhoneBookingPrefill {
  name?: string;
  email?: string;
  phone?: string;
  serviceId?: string;
  peopleCount?: number;
  notes?: string;
  comeToPractitioner?: boolean;
}

interface PhoneBookingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  settings: BizSettings | null;
  availableDates: AvailableDateRow[];
  onComplete: () => void;
  prefill?: PhoneBookingPrefill | null;
}

// Helper: check if phone is a UK mobile (07/+447) vs landline
const isMobileNumber = (ph: string | null | undefined): boolean => {
  if (!ph) return false;
  const cleaned = ph.replace(/\s/g, "");
  return /^(\+?447|07)\d{8,9}$/.test(cleaned);
};

const SECTION_LABELS = ["Patient & Location", "Date & Time", "Reason for Visit", "Confirm & Book"];

const DRAFT_STORAGE_KEY = "phone_booking_draft_v1";

const loadDraft = (): Record<string, any> | null => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch { return null; }
};
const clearDraft = () => { try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {} };

const PhoneBookingWizard = ({
  open, onOpenChange, services, settings, availableDates, onComplete, prefill
}: PhoneBookingWizardProps) => {
  const [minimized, setMinimized] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [helpfulDirections, setHelpfulDirections] = useState("");
  const [showDirections, setShowDirections] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  // Step 1: Location & Service
  const [postcode, setPostcode] = useState("");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [peopleCount, setPeopleCount] = useState(1);
  const [sameServiceForAll, setSameServiceForAll] = useState(true);
  const [personServiceIds, setPersonServiceIds] = useState<Record<number, string | null>>({});

  // Step 2: Week calendar
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekSlots, setWeekSlots] = useState<Record<string, SlotInfo[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [timeOverride, setTimeOverride] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [localAvailDates, setLocalAvailDates] = useState<AvailableDateRow[]>([]);
  const [localClosedDates, setLocalClosedDates] = useState<Set<string>>(new Set());

  // Travel fee
  const [travelFee, setTravelFee] = useState<number | null>(null);
  const [travelDistance, setTravelDistance] = useState<number | null>(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const [phoneLocality, setPhoneLocality] = useState("");
  const [travelChecked, setTravelChecked] = useState(false);
  const [outOfArea, setOutOfArea] = useState(false);
  const [travelFeeOverride, setTravelFeeOverride] = useState(false);

  // Step 3: Patient details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hasEmail, setHasEmail] = useState(true);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [additionalPeople, setAdditionalPeople] = useState<{ name: string; email: string; phone: string }[]>([]);
  const [sendNotification, setSendNotification] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [selectedConsentTemplateId, setSelectedConsentTemplateId] = useState("");
  const [verbalConsent, setVerbalConsent] = useState(false);
  const [consentDelivery, setConsentDelivery] = useState<"email" | "sms" | "both">("email");
  const [dictationInformed, setDictationInformed] = useState(false);
  const [skipConsent, setSkipConsent] = useState(false);
  const [consentTemplates, setConsentTemplates] = useState<any[]>([]);
  const [comeToPractitioner, setComeToPractitioner] = useState(false);

  // Step 4: Reason for visit
  const [notes, setNotes] = useState("");

  // Patient search
  const [patientSuggestions, setPatientSuggestions] = useState<{ client_name: string; client_email: string; client_phone: string | null; address: string | null; postcode?: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");

  // Address lookup
  const [addressList, setAddressList] = useState<string[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<{ address: string; postcode: string | null; lat: number | null; lng: number | null }[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GPS & Map
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const scriptLoaded = useRef(false);

  // Saving
  const [saving, setSaving] = useState(false);

  // Price
  const [price, setPrice] = useState("");

  // Suggested duration from prior visits (same service)
  const [suggestedDuration, setSuggestedDuration] = useState<{ avgMin: number; lastMin: number | null; count: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setSuggestedDuration(null);
      if (!email || !serviceId) return;
      const { data: apts } = await supabase
        .from("appointments")
        .select("id, appointment_date")
        .eq("client_email", email.toLowerCase().trim())
        .eq("service_id", serviceId)
        .in("status", ["confirmed", "completed"])
        .order("appointment_date", { ascending: false })
        .limit(20);
      if (cancelled || !apts || apts.length === 0) return;
      const ids = apts.map((a: any) => a.id);
      const { data: timings } = await supabase
        .from("appointment_timings")
        .select("appointment_id, duration_seconds")
        .in("appointment_id", ids)
        .not("duration_seconds", "is", null);
      if (cancelled || !timings || timings.length === 0) return;
      const byApt: Record<string, number> = {};
      for (const t of timings as any[]) {
        if (t.duration_seconds > 0) byApt[t.appointment_id] = t.duration_seconds;
      }
      const ordered = apts.map((a: any) => byApt[a.id]).filter((s): s is number => !!s);
      if (ordered.length === 0) return;
      const avgSec = ordered.reduce((a, b) => a + b, 0) / ordered.length;
      setSuggestedDuration({
        avgMin: Math.max(5, Math.ceil(avgSec / 60 / 5) * 5),
        lastMin: Math.round(ordered[0] / 60),
        count: ordered.length,
      });
    };
    run();
    return () => { cancelled = true; };
  }, [email, serviceId]);


  const [showValidation, setShowValidation] = useState(false);
  const [skipValidation, setSkipValidation] = useState(false);

  // Section refs for scrolling
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);

  // Phone bookings have unlimited time — no hold/countdown is created.
  // Stubs preserve the existing call sites without reserving a slot.
  const holdId: string | null = null;
  const holdSecondsLeft = 0;
  const createHold = useCallback(async (_date: string, _time: string, _duration: number) => {}, []);
  const releaseHold = useCallback(async () => {}, []);
  const updateHoldContact = useCallback(async (_info: { client_name?: string; client_email?: string; client_phone?: string }) => {}, []);
  const formatCountdown = useCallback(() => "", []);

  // Auto-enable SMS confirmation when a mobile number is entered
  useEffect(() => {
    if (isMobileNumber(phone)) {
      setSendSms(true);
    }
  }, [phone]);

  // Validation
  const missingFields = useMemo(() => {
    const missing: { label: string; ref: React.RefObject<HTMLDivElement> }[] = [];
    if (!name.trim() || name.trim().length < 2) missing.push({ label: "Patient Name", ref: section1Ref });
    if (!postcode.trim() || postcode.trim().length < 5) missing.push({ label: "Postcode", ref: section1Ref });
    if (!serviceId) missing.push({ label: "Service", ref: section1Ref });
    if (!selectedDate) missing.push({ label: "Date", ref: section2Ref });
    if (!selectedTime && !(timeOverride && customTime)) missing.push({ label: "Time", ref: section2Ref });
    return missing;
  }, [name, postcode, serviceId, selectedDate, selectedTime, timeOverride, customTime]);


  // Reset on open
  useEffect(() => {
    if (open) {
      const draft = !prefill ? loadDraft() : null;
      if (draft) {
        // Restore saved draft instead of clearing
        setPostcode(draft.postcode ?? "");
        setServiceId(draft.serviceId ?? null);
        setPeopleCount(draft.peopleCount ?? 1);
        setSameServiceForAll(draft.sameServiceForAll ?? true);
        setPersonServiceIds(draft.personServiceIds ?? {});
        setWeekStart(draft.weekStart ? new Date(draft.weekStart) : startOfWeek(new Date(), { weekStartsOn: 1 }));
        setWeekSlots({});
        setSelectedDate(draft.selectedDate ?? "");
        setSelectedTime(draft.selectedTime ?? "");
        setTimeOverride(draft.timeOverride ?? false);
        setCustomTime(draft.customTime ?? "");
        setTravelFee(draft.travelFee ?? null);
        setTravelDistance(draft.travelDistance ?? null);
        setTravelLoading(false);
        setTravelChecked(draft.travelChecked ?? false);
        setOutOfArea(draft.outOfArea ?? false);
        setTravelFeeOverride(draft.travelFeeOverride ?? false);
        setPhoneLocality(draft.phoneLocality ?? "");
        setName(draft.name ?? "");
        setEmail(draft.email ?? "");
        setHasEmail(draft.hasEmail ?? true);
        setPhone(draft.phone ?? "");
        setAddress(draft.address ?? "");
        setNotes(draft.notes ?? "");
        setAdditionalPeople(draft.additionalPeople ?? []);
        setSendNotification(draft.sendNotification ?? true);
        setSendSms(draft.sendSms ?? false);
        setSelectedConsentTemplateId(draft.selectedConsentTemplateId ?? "");
        setVerbalConsent(draft.verbalConsent ?? false);
        setDictationInformed(draft.dictationInformed ?? false);
        setSkipConsent(draft.skipConsent ?? false);
        setPatientSuggestions([]);
        setShowSuggestions(false);
        setPatientSearch(draft.patientSearch ?? "");
        setSelectedPatientName(draft.selectedPatientName ?? "");
        setAddressList([]);
        setManualAddress(draft.manualAddress ?? false);
        setAddressQuery(draft.addressQuery ?? "");
        setAddressSuggestions([]);
        setAddressSearching(false);
        setLatitude(draft.latitude ?? null);
        setLongitude(draft.longitude ?? null);
        setMapVisible(draft.latitude != null && draft.longitude != null);
        setSaving(false);
        setPrice(draft.price ?? "");
        setShowValidation(false);
        setSkipValidation(false);
        setShowDirections(false);
        setMapFullscreen(false);
        setComeToPractitioner(draft.comeToPractitioner ?? false);
        setShowCancelConfirm(false);
        googleMapRef.current = null;
        markerRef.current = null;
        toast.info("Resumed your saved phone booking draft");
        return;
      }
      setPostcode("");
      setServiceId(null);
      setPeopleCount(1);
      setSameServiceForAll(true);
      setPersonServiceIds({});
      setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
      setWeekSlots({});
      setSelectedDate("");
      setSelectedTime("");
      setTimeOverride(false);
      setCustomTime("");
      setTravelFee(null);
      setTravelDistance(null);
      setTravelLoading(false);
      setTravelChecked(false);
      setOutOfArea(false);
      setTravelFeeOverride(false);
      setName("");
      setEmail("");
      setHasEmail(true);
      setPhone("");
      setAddress("");
      setNotes("");
      setAdditionalPeople([]);
      setSendNotification(true);
      setSendSms(false);
      setSelectedConsentTemplateId("");
      setVerbalConsent(false);
      setDictationInformed(false);
      setSkipConsent(false);
      setPatientSuggestions([]);
      setShowSuggestions(false);
      setPatientSearch("");
      setSelectedPatientName("");
      setAddressList([]);
      setManualAddress(false);
      setAddressQuery("");
      setAddressSuggestions([]);
      setAddressSearching(false);
      setLatitude(null);
      setLongitude(null);
      setMapVisible(false);
      setSaving(false);
      setPrice("");
      setShowValidation(false);
      setSkipValidation(false);
      setShowDirections(false);
      setMapFullscreen(false);
      setComeToPractitioner(false);
      setShowCancelConfirm(false);
      googleMapRef.current = null;
      markerRef.current = null;
    }
    // Apply prefill after reset
    if (open && prefill) {
      if (prefill.name) { setName(prefill.name); setPatientSearch(prefill.name); }
      if (prefill.email) setEmail(prefill.email);
      if (prefill.phone) setPhone(prefill.phone);
      if (prefill.serviceId) setServiceId(prefill.serviceId);
      if (prefill.peopleCount) setPeopleCount(prefill.peopleCount);
      if (prefill.notes) setNotes(prefill.notes);
      if (prefill.comeToPractitioner) {
        setComeToPractitioner(true);
        setAddress("22 St Martins Close, Broadmayne, Dorchester");
        setPostcode("DT2 8DG");
        setLatitude(50.6888);
        setLongitude(-2.4422);
        setMapVisible(true);
        setTravelFee(0);
        setTravelDistance(0);
        setTravelChecked(true);
        setOutOfArea(false);
        setTravelFeeOverride(true);
        setPhoneLocality("Broadmayne");
      }
    }
  }, [open, prefill]);

  // Auto-save draft to localStorage while wizard is open
  useEffect(() => {
    if (!open) return;
    // Don't save an empty draft
    const hasContent = name || postcode || phone || email || serviceId || selectedDate || notes;
    if (!hasContent) return;
    const t = setTimeout(() => {
      try {
        const draft = {
          postcode, serviceId, peopleCount, sameServiceForAll, personServiceIds,
          weekStart: weekStart.toISOString(),
          selectedDate, selectedTime, timeOverride, customTime,
          travelFee, travelDistance, travelChecked, outOfArea, travelFeeOverride, phoneLocality,
          name, email, hasEmail, phone, address, notes, additionalPeople,
          sendNotification, sendSms, selectedConsentTemplateId, verbalConsent,
          dictationInformed, skipConsent, patientSearch, selectedPatientName,
          manualAddress, addressQuery, latitude, longitude, price, comeToPractitioner,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [open, postcode, serviceId, peopleCount, sameServiceForAll, personServiceIds,
      weekStart, selectedDate, selectedTime, timeOverride, customTime,
      travelFee, travelDistance, travelChecked, outOfArea, travelFeeOverride, phoneLocality,
      name, email, hasEmail, phone, address, notes, additionalPeople,
      sendNotification, sendSms, selectedConsentTemplateId, verbalConsent,
      dictationInformed, skipConsent, patientSearch, selectedPatientName,
      manualAddress, addressQuery, latitude, longitude, price, comeToPractitioner]);

  // Merge prop dates with locally added dates
  const allAvailDates = useMemo(() => {
    const merged = [...availableDates.filter(d => !localClosedDates.has(d.available_date))];
    for (const ld of localAvailDates) {
      if (!merged.some(d => d.available_date === ld.available_date)) {
        merged.push(ld);
      }
    }
    return merged;
  }, [availableDates, localAvailDates, localClosedDates]);

  const activeServices = services.filter(s => s.is_active || s.status === 'active');
  const selectedService = services.find(s => s.id === serviceId);

  // Active service offers (admin-managed group prices, etc.)
  const [serviceOffers, setServiceOffers] = useState<Array<{ service_id: string; offer_name: string; price_text: string }>>([]);
  useEffect(() => {
    supabase.from("service_offers").select("service_id, offer_name, price_text").eq("is_active", true).then(({ data }) => {
      if (data) setServiceOffers(data as any);
    });
  }, [open]);

  // Build map of {peopleCount → price} from offers for a given service
  const groupPricesForService = useCallback((svcId: string): Record<number, number> => {
    const map: Record<number, number> = {};
    const wordToNum: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };
    for (const o of serviceOffers.filter((x) => x.service_id === svcId)) {
      const name = (o.offer_name || "").toLowerCase();
      if (!/discount|person/.test(name)) continue;
      if (/no\s*wax|no-wax/.test(name)) continue;
      let cnt: number | null = null;
      const d = name.match(/(\d+)\s*(?:person|people|pax)/);
      if (d) cnt = parseInt(d[1], 10);
      if (!cnt) for (const [w, n] of Object.entries(wordToNum)) {
        if (new RegExp(`\\b${w}\\b`).test(name)) { cnt = n; break; }
      }
      if (!cnt) continue;
      const pm = (o.price_text || "").match(/£?\s*(\d+(?:\.\d+)?)/);
      if (pm) map[cnt] = parseFloat(pm[1]);
    }
    return map;
  }, [serviceOffers]);


  // Fetch consent form templates
  useEffect(() => {
    if (!open) return;
    supabase.from("consent_form_templates").select("id, title, form_type").eq("is_active", true).neq("form_type", "consultation").then(({ data }) => {
      if (data) setConsentTemplates(data);
    });
  }, [open]);

  // Auto-pick a sensible default consent delivery channel based on contact info
  useEffect(() => {
    const hasEmailNow = !!email.trim();
    const hasMobNow = isMobileNumber(phone);
    if (!hasEmailNow && hasMobNow && consentDelivery === "email") setConsentDelivery("sms");
    else if (hasEmailNow && !hasMobNow && consentDelivery === "sms") setConsentDelivery("email");
    else if (hasEmailNow && !hasMobNow && consentDelivery === "both") setConsentDelivery("email");
    else if (!hasEmailNow && hasMobNow && consentDelivery === "both") setConsentDelivery("sms");
  }, [email, phone, consentDelivery]);

  // Fetch Google Maps API key
  useEffect(() => {
    if (apiKey) return;
    supabase.functions.invoke("google-maps-key").then(({ data }) => {
      if (data?.apiKey) setApiKey(data.apiKey);
    });
  }, [apiKey]);

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey || scriptLoaded.current) return;
    if (window.google?.maps) { scriptLoaded.current = true; return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => { scriptLoaded.current = true; };
    document.head.appendChild(script);
  }, [apiKey]);

  // Check travel fee when postcode changes
  const checkTravelFee = useCallback(async (pc: string) => {
    if (!pc.trim()) return;
    setTravelLoading(true);
    setTravelChecked(false);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-fee-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ postcode: pc }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setTravelFee(data.travel_fee ?? 0);
        setTravelDistance(data.distance_miles ?? null);
        setOutOfArea(data.out_of_area ?? false);
        setPhoneLocality(data.locality ?? "");
        setTravelChecked(true);
      }
    } catch (e) {
      console.error("Travel fee check failed:", e);
    } finally {
      setTravelLoading(false);
    }
  }, []);

  // Auto-check travel fee when postcode looks complete
  useEffect(() => {
    const isComplete = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(postcode.trim());
    if (isComplete) checkTravelFee(postcode.trim());
  }, [postcode, checkTravelFee]);

  // Geocode postcode and show map
  const geocodeAndShowMap = useCallback(async (pc: string) => {
    if (!pc.trim() || !apiKey) return;
    try {
      const resp = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(pc.trim())}&key=${apiKey}&components=country:GB`);
      const geo = await resp.json();
      if (geo.results?.[0]) {
        const loc = geo.results[0].geometry.location;
        setLatitude(loc.lat);
        setLongitude(loc.lng);
        setMapVisible(true);
      }
    } catch { /* ignore */ }
  }, [apiKey]);

  // Initialize/update map when visible
  useEffect(() => {
    if (!mapVisible || !mapRef.current || !window.google?.maps || latitude == null || longitude == null) return;
    const pos = { lat: latitude, lng: longitude };

    if (googleMapRef.current) {
      googleMapRef.current.panTo(pos);
      if (markerRef.current) markerRef.current.setPosition(pos);
      return;
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center: pos,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeId: "hybrid",
      mapTypeControl: false,
      streetViewControl: false,
    });
    const marker = new window.google.maps.Marker({
      position: pos, map, draggable: true, title: "Drag to fine-tune location",
    });
    marker.addListener("dragend", () => {
      const p = marker.getPosition();
      if (p) { setLatitude(p.lat()); setLongitude(p.lng()); }
    });
    googleMapRef.current = map;
    markerRef.current = marker;
  }, [mapVisible, latitude, longitude]);

  // Helper: filter out past times for today including travel time
  const filterPastTimesForToday = useCallback((dateStr: string, slots: SlotInfo[]): SlotInfo[] => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (dateStr !== todayStr) return slots;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    // Estimate travel time: travelDistance * 2 mins, minimum 15 min buffer
    const estTravelMins = travelDistance ? Math.round(travelDistance * 2) : 15;
    const cutoffMins = nowMins + estTravelMins + 10; // 10 min prep buffer
    return slots.filter(s => {
      if (!s.available) return false;
      const [h, m] = s.time.split(":").map(Number);
      return h * 60 + m >= cutoffMins;
    });
  }, [travelDistance]);

  // Fetch available slots for the week
  const fetchWeekSlots = useCallback(async () => {
    if (!settings || !serviceId) return;
    setLoadingSlots(true);

    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(format(addDays(weekStart, i), "yyyy-MM-dd"));
    }

    const results: Record<string, SlotInfo[]> = {};

    await Promise.all(days.map(async (dateStr) => {
      const dateAvail = allAvailDates.find(d => d.available_date === dateStr);
      if (!dateAvail) { results[dateStr] = []; return; }
      if (isBefore(parseISO(dateStr), startOfDay(new Date()))) { results[dateStr] = []; return; }

      const pc = postcode.trim() || null;
      const svc = services.find(s => s.id === serviceId);
      const duration = svc?.duration_minutes ?? settings.appointment_duration_minutes ?? 60;
      const startHour = dateAvail.start_hour ?? settings.start_hour;
      const endHour = dateAvail.end_hour ?? settings.end_hour;
      const dayStartMinutes = startHour * 60;
      const dayEndMinutes = endHour * 60;
      const toMin = (t: string) => { const p = t.split(":"); return parseInt(p[0]) * 60 + parseInt(p[1]); };

      const { data: blockedSlots } = await supabase.from("blocked_times").select("start_time, end_time, reason").eq("blocked_date", dateStr);
      const blocks = ((blockedSlots || []) as { start_time: string; end_time: string; reason: string | null }[]).filter(b => b.reason !== "Annual Leave" && b.reason !== "On Call");

      if (pc) {
        try {
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-drive-time`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ destination: pc, date: dateStr }),
          });
          const dtData = await resp.json();

          if (dtData.drive_times) {
            const existingApts = (dtData.appointments || [])
              .map((a: any) => ({ startMins: parseInt(a.time.slice(0, 2)) * 60 + parseInt(a.time.slice(3, 5)), duration: a.duration, postcode: a.postcode, come_to_practitioner: a.come_to_practitioner || false }))
              .sort((a: any, b: any) => a.startMins - b.startMins);

            const getDriveTime = (originPc: string | null): number => {
              if (!originPc) return 15;
              const key = originPc.toUpperCase().replace(/\s+/g, " ");
              return dtData.drive_times[key]?.drive_time_minutes ?? 15;
            };
            const getBuffer = (driveTimeMins: number): number => driveTimeMins > 20 ? 10 : 5;
            const roundTo5 = (mins: number) => Math.ceil(mins / 5) * 5;

            const unavailableWindows: { start: number; end: number }[] = [];
            for (let ai = 0; ai < existingApts.length; ai++) {
              const apt = existingApts[ai];
              const aptEnd = apt.startMins + apt.duration;
              const driveFromApt = getDriveTime(apt.postcode);
              const buffer = getBuffer(driveFromApt);
              // Add 10-min setup buffer before come_to_practitioner appointments
              let setupBuffer = 0;
              if (apt.come_to_practitioner) {
                const prevApt = ai > 0 ? existingApts[ai - 1] : null;
                if (!prevApt?.come_to_practitioner) setupBuffer = 10;
              }
              unavailableWindows.push({ start: apt.startMins - setupBuffer, end: aptEnd + driveFromApt + buffer });
            }

            const allSlotMins: number[] = [];
            for (let mins = dayStartMinutes; mins + duration <= dayEndMinutes; mins += 15) allSlotMins.push(mins);
            for (const apt of existingApts) {
              const aptEnd = apt.startMins + apt.duration;
              const driveFromApt = getDriveTime(apt.postcode);
              const buffer = getBuffer(driveFromApt);
              const firstAvail = roundTo5(aptEnd + driveFromApt + buffer);
              if (firstAvail + duration <= dayEndMinutes && !allSlotMins.includes(firstAvail)) allSlotMins.push(firstAvail);
            }
            const sortedSlots = Array.from(new Set(allSlotMins)).sort((a, b) => a - b);

            const slots: SlotInfo[] = [];
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

              if (isTaken) {
                slots.push({ time: timeStr, available: false, status: "taken" });
              } else {
                let isRecommended = false;
                let bestDriveMinutes: number | undefined;
                let bestDistanceMiles: number | undefined;
                let recommendReason: "after-apt" | "before-apt" | undefined;
                let gapKey: string | undefined;
                if (existingApts.length > 0) {
                  for (const apt of existingApts) {
                    const aptEnd2 = apt.startMins + apt.duration;
                    const driveFromApt = getDriveTime(apt.postcode);
                    const bufferAfter = getBuffer(driveFromApt);
                    const idealStart = roundTo5(aptEnd2 + driveFromApt + bufferAfter);
                    if (Math.abs(mins - idealStart) <= 15 && driveFromApt <= 15) {
                      isRecommended = true;
                      bestDriveMinutes = driveFromApt;
                      bestDistanceMiles = apt.postcode ? (dtData.drive_times[apt.postcode.toUpperCase().replace(/\s+/g, " ")]?.distance_miles ?? undefined) : undefined;
                      recommendReason = "after-apt";
                      gapKey = `after-${apt.startMins}`;
                      break;
                    }
                  }
                  if (!isRecommended) {
                    for (const apt of existingApts) {
                      const driveToApt = getDriveTime(apt.postcode);
                      if (slotEnd + driveToApt + getBuffer(driveToApt) <= apt.startMins && apt.startMins - slotEnd <= 30 && driveToApt <= 15) {
                        isRecommended = true;
                        bestDriveMinutes = driveToApt;
                        bestDistanceMiles = apt.postcode ? (dtData.drive_times[apt.postcode.toUpperCase().replace(/\s+/g, " ")]?.distance_miles ?? undefined) : undefined;
                        recommendReason = "before-apt";
                        gapKey = `before-${apt.startMins}`;
                        break;
                      }
                    }
                  }
                }
                slots.push({
                  time: timeStr,
                  available: true,
                  status: isRecommended ? "recommended" : "available",
                  driveMinutes: isRecommended ? bestDriveMinutes : undefined,
                  distanceMiles: isRecommended ? bestDistanceMiles : undefined,
                  recommendReason: isRecommended ? recommendReason : undefined,
                  _gapKey: isRecommended ? gapKey : undefined,
                } as SlotInfo);
              }
            }
            // Keep only best (earliest) recommended slot per gap, dedup within 15 mins
            const seenGaps = new Set<string>();
            const keptRecTimes: number[] = [];
            for (const s of slots) {
              if (s.status === "recommended") {
                const gk = (s as any)._gapKey || s.time;
                const sMins = parseInt(s.time.split(":")[0]) * 60 + parseInt(s.time.split(":")[1]);
                const tooClose = keptRecTimes.some(t => Math.abs(sMins - t) <= 15);
                if (seenGaps.has(gk) || tooClose) {
                  s.status = "available";
                  s.driveMinutes = undefined;
                  s.distanceMiles = undefined;
                  s.recommendReason = undefined;
                } else {
                  seenGaps.add(gk);
                  keptRecTimes.push(sMins);
                }
              }
            }
            // If no appointments exist, recommend the first available slot
            if (existingApts.length === 0) {
              const firstAvail = slots.find(s => s.available);
              if (firstAvail) firstAvail.status = "recommended";
            }
            // Filter past times for today
            results[dateStr] = filterPastTimesForToday(dateStr, slots);
            return;
          }
        } catch (e) {
          console.error("Dynamic slot calc failed for", dateStr);
        }
      }

      // Fallback: static
      const buffer = settings.buffer_minutes ?? 15;
      const { data: bookedData } = await supabase.rpc("get_booked_slots_with_duration", { target_date: dateStr });
      const bookedSlots = (bookedData || []) as { appointment_time: string; duration_minutes: number }[];

      const slots: SlotInfo[] = [];
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
          return (mins < bs + bd + buffer && mins + duration + buffer > bs);
        });
        if (!isBlocked) slots.push({ time: timeStr, available: !isBooked, status: isBooked ? "taken" : "available" });
      }
      // Filter past times for today
      results[dateStr] = filterPastTimesForToday(dateStr, slots);
    }));

    setWeekSlots(results);
    setLoadingSlots(false);
  }, [weekStart, settings, serviceId, postcode, allAvailDates, services, filterPastTimesForToday]);

  // Fetch slots when service selected or week changes (no step gating)
  useEffect(() => {
    if (serviceId) fetchWeekSlots();
  }, [weekStart, fetchWeekSlots]);

  // Auto-set price from service
  useEffect(() => {
    if (serviceId) {
      if (!sameServiceForAll && peopleCount > 1) {
        let total = 0;
        let allHavePrices = true;
        for (let i = 0; i < peopleCount; i++) {
          const pSvcId = personServiceIds[i] || serviceId;
          const pSvc = services.find(s => s.id === pSvcId);
          if (pSvc?.price != null) {
            total += Number(pSvc.price);
          } else {
            allHavePrices = false;
          }
        }
        setPrice(allHavePrices ? String(total) : "");
      } else {
        const svc = services.find(s => s.id === serviceId);
        if (svc?.price != null) {
          const sName = (svc.name || "").toLowerCase();
          let basePrice: number;
          if (peopleCount > 1 && sName.includes("earwax")) {
            const groupPrices = groupPricesForService(svc.id);
            basePrice = groupPrices[peopleCount] ?? svc.price;
          } else if (peopleCount > 1) {
            basePrice = Number(svc.price) * peopleCount;
          } else {
            basePrice = svc.price;
          }
          setPrice(String(basePrice));
        } else {
          setPrice("");
        }
      }
    }
  }, [serviceId, peopleCount, services, sameServiceForAll, personServiceIds, groupPricesForService]);

  // Initialize additional people array when count changes
  useEffect(() => {
    const extra = Math.max(0, peopleCount - 1);
    setAdditionalPeople(prev => {
      if (prev.length === extra) return prev;
      if (prev.length < extra) {
        return [...prev, ...Array(extra - prev.length).fill(null).map(() => ({ name: "", email: "", phone: "" }))];
      }
      return prev.slice(0, extra);
    });
  }, [peopleCount]);

  // Search patients
  const searchPatients = async (query: string) => {
    if (query.length < 2) { setPatientSuggestions([]); setShowSuggestions(false); return; }
    const safe = query.replace(/[%,()]/g, " ").trim();
    const { data } = await supabase.from("patients").select("client_name, client_email, client_phone, address").or(`client_name.ilike.%${safe}%,client_email.ilike.%${safe}%,client_phone.ilike.%${safe}%,address.ilike.%${safe}%`).limit(8);
    if (data && data.length > 0) { setPatientSuggestions(data); setShowSuggestions(true); }
    else { setPatientSuggestions([]); setShowSuggestions(false); }
  };

  const selectPatient = (p: { client_name: string; client_email: string; client_phone: string | null; address: string | null }) => {
    setName(p.client_name);
    setEmail(p.client_email);
    setSelectedPatientName(p.client_name);
    if (p.client_phone) setPhone(p.client_phone);
    if (p.address) {
      setAddress(p.address);
      const pcMatch = p.address.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
      if (pcMatch) setPostcode(pcMatch[0].toUpperCase());
    }
    setPatientSearch("");
    setShowSuggestions(false);
  };

  // Address lookup by postcode
  const lookupAddresses = async () => {
    if (!postcode.trim()) return;
    setAddressLoading(true);
    try {
      const { data } = await supabase.functions.invoke("address-lookup", {
        body: { postcode: postcode.trim() },
      });
      if (data?.addresses) setAddressList(data.addresses);
      else setAddressList([]);
    } catch { setAddressList([]); }
    finally { setAddressLoading(false); }
    geocodeAndShowMap(postcode.trim());
  };

  // Address lookup by free-text query
  const searchAddressByText = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setAddressSuggestions([]); return; }
    setAddressSearching(true);
    try {
      const { data } = await supabase.functions.invoke("address-lookup", {
        body: { query: q.trim() },
      });
      if (data?.suggestions) setAddressSuggestions(data.suggestions);
      else setAddressSuggestions([]);
    } catch { setAddressSuggestions([]); }
    finally { setAddressSearching(false); }
  }, []);

  const handleAddressQueryChange = (val: string) => {
    setAddressQuery(val);
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    addressDebounceRef.current = setTimeout(() => searchAddressByText(val), 400);
  };

  const selectAddressSuggestion = (s: { address: string; postcode: string | null; lat: number | null; lng: number | null }) => {
    setAddress(s.address);
    if (s.postcode) setPostcode(s.postcode.toUpperCase());
    if (s.lat != null && s.lng != null) {
      setLatitude(s.lat);
      setLongitude(s.lng);
      setMapVisible(true);
    }
    setAddressQuery("");
    setAddressSuggestions([]);
  };

  // Save appointment
  const handleSave = async () => {
    if (!skipValidation && missingFields.length > 0) {
      setShowValidation(true);
      toast.error("Please complete required fields or override");
      return;
    }

    setSaving(true);
    const effectiveEmail = hasEmail && email.trim() ? email.trim() : `no-email-${Date.now()}@placeholder.local`;
    const svc = services.find(s => s.id === serviceId);
    const duration = svc?.duration_minutes ?? settings?.appointment_duration_minutes ?? 60;
    const buffer = 5;

    const effectiveTime = (timeOverride && customTime) ? customTime : selectedTime;

    if (!timeOverride && navigator.onLine && selectedDate && effectiveTime) {
      const { data: hasOverlap } = await supabase.rpc("check_appointment_overlap", {
        p_date: selectedDate,
        p_time: effectiveTime + ":00",
        p_duration_minutes: duration,
        p_buffer_minutes: buffer,
      });
      if (hasOverlap) {
        toast.error("This time conflicts with an existing appointment");
        setSaving(false);
        return;
      }
    }

    const groupId = additionalPeople.length > 0 ? crypto.randomUUID() : null;

    const payload: any = {
      client_name: name.trim() || "Phone Booking",
      client_email: effectiveEmail,
      client_phone: phone.trim() || null,
      appointment_date: selectedDate || format(new Date(), "yyyy-MM-dd"),
      appointment_time: ((timeOverride && customTime) ? customTime : selectedTime || "09:00") + ":00",
      notes: [notes.trim(), helpfulDirections.trim() ? `📍 Directions: ${helpfulDirections.trim()}` : ""].filter(Boolean).join("\n") || null,
      address: address.trim() || null,
      postcode: postcode.trim().toUpperCase() || null,
      service_id: serviceId,
      status: "confirmed",
      price: price ? parseFloat(price) : null,
      latitude,
      longitude,
      travel_fee: travelFeeOverride ? 0 : (travelFee ?? 0),
      travel_distance_miles: travelDistance,
      locality: phoneLocality || null,
      ...(groupId ? { group_id: groupId } : {}),
      ...(comeToPractitioner ? { come_to_practitioner: true } : {}),
      dictation_consent: dictationInformed,
    };

    let result: { success: boolean };
    if (timeOverride) {
      // Use RPC to set admin override flag so the scheduling trigger allows overlaps
      const { error } = await supabase.rpc("admin_override_insert_appointment" as any, { p_payload: payload });
      if (error) {
        toast.error(error.message || "Failed to book appointment");
        result = { success: false };
      } else {
        toast.success("Appointment booked!");
        result = { success: true };
      }
    } else {
      result = await offlineMutation({ table: "appointments", operation: "insert", data: payload, successMessage: "Appointment booked!" });
    }

    if (result.success) {
      await releaseHold();
      const primaryEmail = effectiveEmail.toLowerCase();
      const primaryName = name.trim() || "Phone Booking";
      const { data: existingPrimary } = await supabase.from("patients").select("id").eq("client_email", primaryEmail).ilike("client_name", primaryName).maybeSingle();
      if (!existingPrimary) {
        const patientData: Record<string, any> = {
          client_name: name.trim() || "Phone Booking",
          client_email: primaryEmail,
          client_phone: phone.trim() || null,
          address: address.trim() || null,
        };
        if (latitude != null) patientData.latitude = latitude;
        if (longitude != null) patientData.longitude = longitude;
        if (helpfulDirections.trim()) patientData.notes = `📍 Directions: ${helpfulDirections.trim()}`;
        await supabase.from("patients").insert(patientData as any);
      } else {
        const updates: Record<string, any> = {};
        if (address.trim()) updates.address = address.trim();
        if (phone.trim()) updates.client_phone = phone.trim();
        if (latitude != null) updates.latitude = latitude;
        if (longitude != null) updates.longitude = longitude;
        if (helpfulDirections.trim()) {
          // Append directions to existing notes
          const { data: patientData } = await supabase.from("patients").select("notes").eq("id", existingPrimary.id).maybeSingle();
          const existingNotes = patientData?.notes || "";
          const dirLine = `📍 Directions: ${helpfulDirections.trim()}`;
          if (!existingNotes.includes(dirLine)) {
            updates.notes = existingNotes ? `${existingNotes}\n${dirLine}` : dirLine;
          }
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from("patients").update(updates).eq("id", existingPrimary.id);
        }
      }

      if (groupId) {
        const addMinutesToTime = (timeStr: string, minutes: number): string => {
          const [h, m] = timeStr.split(":").map(Number);
          const totalMins = h * 60 + m + minutes;
          const newH = Math.floor(totalMins / 60) % 24;
          const newM = totalMins % 60;
          return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
        };

        const getPersonExtraDuration = (personIdx: number): number => {
          const pServiceId = sameServiceForAll ? serviceId : (personServiceIds[personIdx] || serviceId);
          const pSvc = services.find(s => s.id === pServiceId);
          if (!pSvc) return 30;
          const sName = pSvc.name.toLowerCase();
          if (personIdx === 0) return pSvc.duration_minutes || 60;
          if (sName.includes("earwax") || sName.includes("ear wax")) return 30;
          if (sName.includes("cryotherapy")) return 15;
          if (sName.includes("wellness")) return 15;
          if (sName.includes("foot")) return pSvc.duration_minutes || 60;
          return 30;
        };

        let cumulativeOffset = getPersonExtraDuration(0);

        for (let pi = 0; pi < additionalPeople.length; pi++) {
          const person = additionalPeople[pi];
          if (!person.name.trim()) continue;
          const personEmail = person.email.trim() ? person.email.trim().toLowerCase() : `no-email-${Date.now()}-${Math.random().toString(36).slice(2)}@placeholder.local`;
          const memberServiceId = sameServiceForAll ? serviceId : (personServiceIds[pi + 1] || serviceId);
          const staggeredTime = addMinutesToTime(effectiveTime || "09:00", cumulativeOffset);
          await supabase.from("appointments").insert({
            ...payload,
            client_name: person.name.trim(),
            client_email: personEmail,
            client_phone: person.phone.trim() || null,
            service_id: memberServiceId,
            appointment_time: staggeredTime + ":00",
            price: (() => {
              const mSvc = services.find(s => s.id === memberServiceId);
              return mSvc?.price ?? null;
            })(),
            travel_fee: 0,
            travel_distance_miles: null,
            access_token: crypto.randomUUID(),
            notes: `Part of group booking with ${name.trim()}`,
          } as any);
          cumulativeOffset += getPersonExtraDuration(pi + 1);

          const { data: existingMember } = await supabase.from("patients").select("id").eq("client_email", personEmail).ilike("client_name", person.name.trim()).maybeSingle();
          if (!existingMember) {
            await supabase.from("patients").insert({
              client_name: person.name.trim(),
              client_email: personEmail,
              client_phone: person.phone.trim() || null,
              address: address.trim() || null,
            });
          }
        }
      }

      await supabase.from("patient_activity_log").insert({
        client_email: effectiveEmail.toLowerCase(),
        event_type: "booking",
        message: `📞 Phone booking: ${svc?.name || "appointment"} on ${selectedDate} at ${effectiveTime}`,
        created_by: "admin",
      });

      const isPhoneBooking = !hasEmail;
      const hasMobile = isMobileNumber(phone);
      const { data: newApts } = await supabase.from("appointments").select("id, access_token").eq("client_email", effectiveEmail.toLowerCase()).eq("appointment_date", selectedDate || format(new Date(), "yyyy-MM-dd")).eq("appointment_time", (effectiveTime || "09:00") + ":00").order("created_at", { ascending: false }).limit(1);

      if (newApts?.[0]) {
        const aptId = newApts[0].id;
        const accessToken = (newApts[0] as any).access_token as string | undefined;

        // Send confirmation notifications based on user selections
        // If email confirmation was requested but no email exists, fallback to SMS if mobile available
        const shouldSendEmail = sendNotification && hasEmail;
        const shouldSendSms = (sendSms && hasMobile) || (sendNotification && !hasEmail && hasMobile);
        if (shouldSendEmail || shouldSendSms) {
          await supabase.functions.invoke("send-notification", {
            body: {
              appointmentId: aptId,
              type: "approved",
              channels: { email: shouldSendEmail, sms: shouldSendSms },
            },
          });
        }

        // Handle consent form based on user selections
        const effectiveConsentId = selectedConsentTemplateId && selectedConsentTemplateId !== "__none__" ? selectedConsentTemplateId : null;
        if (!skipConsent) {
          if (verbalConsent) {
            // Record verbal consent
            const consentTplId = effectiveConsentId || svc?.consent_form_template_id;
            if (consentTplId) {
              await supabase.from("consent_form_responses").insert({
                appointment_id: aptId,
                consent_form_template_id: consentTplId,
                responses: { __verbal: true, ...(notes.trim() ? { presenting_complaint: notes.trim() } : {}) },
                signature: null,
                signed_at: null,
                status: "completed",
                submitter_name: name.trim(),
              } as any);
            }
            await supabase.from("patient_activity_log").insert({
              client_email: effectiveEmail,
              event_type: "verbal_consent",
              message: `📞 Verbal consent to be obtained at appointment for ${svc?.name || "appointment"}`,
              created_by: "admin",
            });
          } else if (effectiveConsentId) {
            // Send selected consent form via chosen channel(s)
            const templateName = consentTemplates.find(t => t.id === effectiveConsentId)?.title || "Consent Form";
            const wantsEmail = (consentDelivery === "email" || consentDelivery === "both") && hasEmail;
            const wantsSms = (consentDelivery === "sms" || consentDelivery === "both") && hasMobile;

            if (wantsEmail || wantsSms) {
              await supabase.from("appointments").update({
                consent_form_template_id: effectiveConsentId,
                consent_sent_at: new Date().toISOString(),
              }).eq("id", aptId);
            }

            if (wantsEmail) {
              supabase.functions.invoke("send-form-email", {
                body: { appointmentId: aptId, recipientEmail: effectiveEmail, templateName },
              });
              await supabase.from("patient_activity_log").insert({
                client_email: effectiveEmail,
                event_type: "consent_sent",
                message: `📧 Consent form "${templateName}" sent for ${svc?.name || "appointment"}`,
                created_by: "admin",
              });
            }

            if (wantsSms && accessToken) {
              const dateStr = format(parseISO(selectedDate!), "dd/MM/yyyy");
              const timeStr = (effectiveTime || "").slice(0, 5);
              const consentUrl = `https://shawscope.co.uk/consent/${accessToken}`;
              const firstName = name.trim().split(" ")[0] || "there";
              const smsBody = `Hi ${firstName}, please complete your ${templateName} for your ShawScope appointment on ${dateStr} at ${timeStr}: ${consentUrl}\n— Matt, ShawScope (no reply)`;
              await supabase.from("scheduled_communications").insert({
                appointment_id: aptId,
                channel: "sms",
                trigger_type: "consent_form_sms",
                recipient_name: name.trim(),
                recipient_phone: phone.trim(),
                recipient_email: effectiveEmail || null,
                subject: "Consent form SMS",
                scheduled_for: new Date().toISOString(),
                status: "pending",
                metadata: { body_text: smsBody },
              } as any);
              await supabase.from("patient_activity_log").insert({
                client_email: effectiveEmail,
                event_type: "consent_sent",
                message: `📱 Consent form "${templateName}" SMS sent for ${svc?.name || "appointment"}`,
                created_by: "admin",
              });
            }
          }
        }
        // If skipConsent is true, ensure no consent fields are set on the appointment
        // (they shouldn't be since we never set them above, but clear any defaults)
        if (skipConsent) {
          await supabase.from("appointments").update({
            consent_form_template_id: null,
            consent_sent_at: null,
          }).eq("id", aptId);
        }

        // Send location info for "come to practitioner" bookings
        if (comeToPractitioner) {
          supabase.functions.invoke("send-location-info", { body: { appointmentId: aptId } });
        }
      }

      clearDraft();
      onOpenChange(false);
      onComplete();
    }
    setSaving(false);
  };

  // Week days for the calendar
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const isAvail = allAvailDates.some(d => d.available_date === dateStr);
      const isPast = isBefore(date, startOfDay(new Date()));
      const slots = weekSlots[dateStr] || [];
      const availSlots = slots.filter(s => s.available);
      const recommendedSlots = slots.filter(s => s.status === "recommended");
      return { date, dateStr, isAvail, isPast, slots, availSlots, recommendedSlots };
    });
  }, [weekStart, weekSlots, allAvailDates]);

  const openDays = weekDays.filter(d => d.isAvail && !d.isPast);
  const closedDays = weekDays.filter(d => !d.isAvail || d.isPast);

  // Get opening times for available days
  const getOpeningTimes = (dateStr: string) => {
    const dateAvail = allAvailDates.find(d => d.available_date === dateStr);
    if (!dateAvail || !settings) return null;
    const startH = dateAvail.start_hour ?? settings.start_hour;
    const endH = dateAvail.end_hour ?? settings.end_hour;
    const fmtTime = (h: number) => {
      const hours = Math.floor(h);
      const mins = Math.round((h - hours) * 60);
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };
    return { label: `${fmtTime(startH)}–${fmtTime(endH)}`, startH, endH };
  };

  // Close a day
  const closeDay = async (dateStr: string) => {
    setLocalAvailDates(prev => prev.filter(d => d.available_date !== dateStr));
    setLocalClosedDates(prev => new Set(prev).add(dateStr));
    await supabase.from("available_dates").delete().eq("available_date", dateStr);
    toast.success(`${format(parseISO(dateStr), "EEEE d MMM")} closed`);
    fetchWeekSlots();
  };

  // Update opening hours for a day
  const updateDayHours = async (dateStr: string, startH: number, endH: number) => {
    setLocalAvailDates(prev => prev.map(d =>
      d.available_date === dateStr ? { ...d, start_hour: startH, end_hour: endH } : d
    ));
    await supabase.from("available_dates").update({ start_hour: startH, end_hour: endH }).eq("available_date", dateStr);
    toast.success("Hours updated");
    fetchWeekSlots();
  };

  // Generate hour options
  const hourOptions = useMemo(() => {
    const opts: { value: number; label: string }[] = [];
    for (let h = 6; h <= 21; h += 0.25) {
      const hours = Math.floor(h);
      const mins = Math.round((h - hours) * 60);
      opts.push({ value: h, label: `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}` });
    }
    return opts;
  }, []);

  // Smart capacity suggestions
  const capacitySuggestions = useMemo(() => {
    if (!settings || !serviceId) return [];
    const svc = services.find(s => s.id === serviceId);
    const duration = svc?.duration_minutes ?? settings.appointment_duration_minutes ?? 60;
    const buffer = settings.buffer_minutes ?? 15;
    const suggestions: { dateStr: string; dayLabel: string; direction: "earlier" | "later"; adjustment: number; extraSlots: number; newStartH?: number; newEndH?: number }[] = [];

    for (const day of openDays) {
      const { dateStr, slots } = day;
      const openTimes = getOpeningTimes(dateStr);
      if (!openTimes) continue;
      const { startH, endH } = openTimes;

      for (const adj of [0.25, 0.5]) {
        const newStart = startH - adj;
        if (newStart < 6) continue;
        const newStartMins = newStart * 60;
        const currentStartMins = startH * 60;
        let extra = 0;
        for (let m = newStartMins; m + duration <= currentStartMins; m += 15) {
          const firstTaken = slots.find(s => s.status === "taken");
          if (firstTaken) {
            const takenMins = parseInt(firstTaken.time.split(":")[0]) * 60 + parseInt(firstTaken.time.split(":")[1]);
            if (m + duration + buffer > takenMins) break;
          }
          extra++;
        }
        if (extra > 0) {
          suggestions.push({ dateStr, dayLabel: format(day.date, "EEE d"), direction: "earlier", adjustment: adj * 60, extraSlots: extra, newStartH: newStart, newEndH: endH });
          break;
        }
      }

      for (const adj of [0.25, 0.5]) {
        const newEnd = endH + adj;
        if (newEnd > 21) continue;
        const newEndMins = newEnd * 60;
        const currentEndMins = endH * 60;
        let extra = 0;
        for (let m = currentEndMins; m + duration <= newEndMins; m += 15) {
          const lastTaken = [...slots].reverse().find(s => s.status === "taken");
          if (lastTaken) {
            const takenMins = parseInt(lastTaken.time.split(":")[0]) * 60 + parseInt(lastTaken.time.split(":")[1]);
            const takenEnd = takenMins + duration + buffer;
            if (m < takenEnd) continue;
          }
          extra++;
        }
        if (extra > 0) {
          suggestions.push({ dateStr, dayLabel: format(day.date, "EEE d"), direction: "later", adjustment: adj * 60, extraSlots: extra, newStartH: startH, newEndH: newEnd });
          break;
        }
      }
    }

    return suggestions;
  }, [openDays, settings, serviceId, services]);

  if (!open) return null;

  // Minimized floating bar
  if (minimized) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground rounded-full shadow-2xl px-5 py-2.5 flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform"
        onClick={() => setMinimized(false)}
      >
        <Phone className="h-4 w-4" />
        <span className="text-sm font-medium">Phone Booking</span>
        {name && <span className="text-xs opacity-80">({name})</span>}
        {holdSecondsLeft > 0 && <span className={cn("text-xs font-mono", holdSecondsLeft <= 60 && "text-red-200")}>{formatCountdown()}</span>}
        <Maximize2 className="h-4 w-4 ml-1 opacity-70" />
      </div>
    );
  }

  // Section header component
  const SectionHeader = ({ num, label, sRef }: { num: number; label: string; sRef?: React.RefObject<HTMLDivElement> }) => (
    <div ref={sRef as any} className="flex items-center gap-3 pt-5 pb-2 first:pt-0">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0 border border-primary shadow">{num}</div>
      <span className="text-base font-bold text-white">{label}</span>
      <div className="flex-1 h-px bg-primary/40" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header — simplified */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b bg-card flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Phone className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-base sm:text-lg font-semibold whitespace-nowrap">Phone Booking</h2>
        </div>
        {/* Quick status badges */}
        <div className="flex items-center gap-1.5 flex-1 justify-center overflow-hidden">
          {name && <Badge variant="secondary" className="text-[10px] h-5 truncate max-w-24">{name}</Badge>}
          {selectedDate && <Badge variant="secondary" className="text-[10px] h-5">{format(parseISO(selectedDate), "d MMM")}</Badge>}
          {(selectedTime || (timeOverride && customTime)) && <Badge variant="secondary" className="text-[10px] h-5">{timeOverride && customTime ? customTime : selectedTime}</Badge>}
          {holdSecondsLeft > 0 && (
            <Badge variant={holdSecondsLeft <= 60 ? "destructive" : "default"} className="text-[10px] h-5 font-mono">
              {formatCountdown()}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMinimized(true)} title="Minimise">
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setShowCancelConfirm(true)} title="Cancel booking">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close phone booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Save your progress to resume later, or discard it entirely. Saved drafts stay until you finish or discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">Go Back</AlertDialogCancel>
            <Button
              variant="secondary"
              onClick={async () => { setShowCancelConfirm(false); await releaseHold(); onOpenChange(false); toast.success("Draft saved — reopen Phone Booking to resume"); }}
            >
              Save & Close
            </Button>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => { setShowCancelConfirm(false); clearDraft(); await releaseHold(); onOpenChange(false); }}>
              Discard Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main content — single scrollable page with all sections */}
      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-8 space-y-1">

          {/* ═══════ SECTION 1: Patient & Location ═══════ */}
          <SectionHeader num={1} label="Patient & Location" sRef={section1Ref} />
          <div className="space-y-4">
            {/* Patient Search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> Search Existing Patient</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    searchPatients(e.target.value);
                  }}
                  placeholder="Name, email or phone..."
                  className="pl-9"
                  autoFocus
                />
              </div>
              {showSuggestions && patientSuggestions.length > 0 && (
                <div className="border rounded-lg overflow-hidden bg-card shadow-md">
                  {patientSuggestions.map((p, i) => {
                    const pcMatch = p.address?.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
                    return (
                      <button
                        key={i}
                        className="w-full text-left px-3 py-2.5 hover:bg-accent border-b last:border-b-0 transition-colors"
                        onClick={() => selectPatient(p)}
                      >
                        <p className="text-sm font-medium">{p.client_name}</p>
                        <p className="text-xs text-muted-foreground">{p.client_email}{p.client_phone ? ` · ${p.client_phone}` : ""}</p>
                        {pcMatch && <p className="text-xs text-primary font-medium mt-0.5">📍 {pcMatch[0].toUpperCase()}</p>}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedPatientName && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">{selectedPatientName}</span>
                  <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => {
                    setSelectedPatientName("");
                    setName(""); setEmail(""); setPhone(""); setAddress(""); setPostcode("");
                  }}>Clear</Button>
                </div>
              )}
            </div>

            <div className="relative flex items-center">
              <div className="flex-1 border-t border-border" />
              <span className="px-3 text-xs text-muted-foreground">or enter details manually</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Patient Name */}
            <div className="space-y-1.5 relative">
              <Label className="text-sm font-medium">Patient Name *</Label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); if (!selectedPatientName) searchPatients(e.target.value); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Full name..."
              />
              {!selectedPatientName && showSuggestions && patientSuggestions.length > 0 && (
                <div className="absolute z-50 w-full bg-popover border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {patientSuggestions.map((p, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0"
                      onMouseDown={() => selectPatient(p)}
                    >
                      <p className="font-medium">{p.client_name}</p>
                      <p className="text-xs text-muted-foreground">{p.client_email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone & Email row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07..." type="tel" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Email</Label>
                  <div className="flex items-center gap-1.5">
                    <Switch id="has-email-0" checked={hasEmail} onCheckedChange={setHasEmail} className="scale-75" />
                    <Label htmlFor="has-email-0" className="text-[10px] text-muted-foreground">Has email</Label>
                  </div>
                </div>
                {hasEmail ? (
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@example.com" type="email" />
                ) : (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">No email — consent at appointment</p>
                )}
              </div>
            </div>

            <div className="relative flex items-center">
              <div className="flex-1 border-t border-border" />
              <span className="px-3 text-xs text-muted-foreground">address & location</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Come to Me Button */}
            <Button
              variant={comeToPractitioner ? "default" : "outline"}
              size="sm"
              className={cn(
                "w-full gap-2 text-sm",
                comeToPractitioner && "bg-primary text-primary-foreground"
              )}
              onClick={() => {
                const next = !comeToPractitioner;
                setComeToPractitioner(next);
                if (next) {
                  setAddress("22 St Martins Close, Broadmayne, Dorchester");
                  setPostcode("DT2 8DG");
                  setLatitude(50.6888);
                  setLongitude(-2.4422);
                  setMapVisible(true);
                  setTravelFee(0);
                  setTravelDistance(0);
                  setTravelChecked(true);
                  setOutOfArea(false);
                  setTravelFeeOverride(true);
                  setPhoneLocality("Broadmayne");
                } else {
                  setAddress("");
                  setPostcode("");
                  setLatitude(null);
                  setLongitude(null);
                  setMapVisible(false);
                  setTravelFee(null);
                  setTravelDistance(null);
                  setTravelChecked(false);
                  setTravelFeeOverride(false);
                  setPhoneLocality("");
                }
              }}
            >
              <Home className="h-4 w-4" />
              {comeToPractitioner ? "✓ Coming to My Home" : "Patient Coming to Me"}
            </Button>

            {comeToPractitioner && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Home className="h-4 w-4 text-primary" /> Practitioner's Home
                </p>
                <p className="text-xs text-muted-foreground">22 St Martins Close, Broadmayne, DT2 8DG</p>
                <p className="text-xs text-muted-foreground">📌 What3Words: ///pizzeria.fuel.grit</p>
                <p className="text-[10px] text-muted-foreground mt-1">ℹ️ No tracking/OMW notification will be sent. Location info email & SMS sent after booking.</p>
              </div>
            )}

            {/* Address Search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Find Address
              </Label>
              <p className="text-xs text-muted-foreground">Type an address, street name, or postcode to search</p>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={addressQuery}
                  onChange={(e) => handleAddressQueryChange(e.target.value)}
                  placeholder="e.g. 12 High Street Dorchester or DT4 7TJ..."
                  className="pl-9"
                />
                {addressSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />}
              </div>
              {addressSuggestions.length > 0 && (
                <div className="border rounded-lg overflow-hidden bg-card shadow-md max-h-48 overflow-y-auto">
                  {addressSuggestions.map((s, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent border-b last:border-b-0 transition-colors"
                      onClick={() => selectAddressSuggestion(s)}
                    >
                      <p className="text-sm">{s.address}</p>
                      {s.postcode && <p className="text-xs text-primary font-medium">📍 {s.postcode}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Postcode + Address fields */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Postcode *</Label>
                <Input
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                  placeholder="e.g. DT4 7TJ"
                  className="uppercase"
                  maxLength={10}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Full Address</Label>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full address..."
                  rows={2}
                />
              </div>
            </div>

            {/* Postcode address picker */}
            {postcode.trim().length >= 5 && !address.trim() && (
              <div className="space-y-1">
                <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={lookupAddresses} disabled={addressLoading}>
                  {addressLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                  Find addresses at {postcode.trim()}
                </Button>
                {addressList.length > 0 && (
                  <div className="border rounded-lg max-h-40 overflow-y-auto bg-card">
                    {addressList.map((a, i) => (
                      <button key={i} className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-0 transition-colors"
                        onClick={() => { setAddress(`${a}, ${postcode.trim().toUpperCase()}`); geocodeAndShowMap(postcode.trim()); setAddressList([]); }}>
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Travel fee result */}
            {travelLoading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking travel...</p>}
            {travelChecked && !outOfArea && travelFee !== null && (
              <div className={cn("rounded-lg p-3 text-sm", travelFee > 0 ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" : "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800")}>
                {travelFee > 0 ? (
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                      <MapPin className="h-3.5 w-3.5" /> {travelDistance}mi · Travel: <strong>£{travelFee.toFixed(2)}</strong>
                    </p>
                    <div className="flex items-center gap-2">
                      <Switch id="waive-travel" checked={travelFeeOverride} onCheckedChange={setTravelFeeOverride} className="scale-75" />
                      <Label htmlFor="waive-travel" className="text-xs text-amber-700 dark:text-amber-400">Waive</Label>
                    </div>
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-3.5 w-3.5" /> {travelDistance}mi — Free travel zone{phoneLocality ? ` (${phoneLocality})` : ""}
                  </p>
                )}
              </div>
            )}
            {travelChecked && outOfArea && (
              <div className="rounded-lg border-2 border-destructive/50 bg-destructive/10 p-3 text-sm">
                <p className="flex items-center gap-2 text-destructive font-semibold">
                  <AlertTriangle className="h-4 w-4" /> Out of service area ({travelDistance}mi)
                </p>
                <p className="text-xs text-destructive/80 mt-1">This postcode is beyond the 15-mile radius</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs border-destructive/30 hover:bg-destructive/10"
                  onClick={() => { setOutOfArea(false); setTravelFeeOverride(true); }}
                >
                  Override — book anyway
                </Button>
              </div>
            )}

            {/* Map */}
            {mapVisible && latitude != null && longitude != null && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">📍 Drag pin to pinpoint location</Label>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] ml-auto" onClick={() => setMapFullscreen(!mapFullscreen)}>
                    {mapFullscreen ? "Shrink" : "Expand"}
                  </Button>
                </div>
                <div ref={mapRef} className={cn("w-full rounded-lg border overflow-hidden", mapFullscreen ? "h-80" : "h-40")} />
              </div>
            )}

            {/* Helpful Directions */}
            <div className="space-y-1">
              <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1" onClick={() => {
                const next = !showDirections;
                setShowDirections(next);
                // Auto-show map when opening directions if we have a postcode but no map yet
                if (next && !mapVisible && postcode.trim()) {
                  geocodeAndShowMap(postcode.trim());
                }
              }}>
                <Navigation className="h-3 w-3" /> {showDirections ? "Hide" : "Add"} helpful directions
              </button>
              {showDirections && (
                <Textarea
                  value={helpfulDirections}
                  onChange={(e) => setHelpfulDirections(e.target.value)}
                  placeholder="e.g. Blue door, park on the left..."
                  rows={2}
                  className="text-sm"
                />
              )}
            </div>

            {/* Service Selection */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Service *</Label>
              <Select value={serviceId || ""} onValueChange={(v) => setServiceId(v)}>
                <SelectTrigger><SelectValue placeholder="Select service..." /></SelectTrigger>
                <SelectContent>
                  {activeServices.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes}min{s.price != null ? ` · £${s.price}` : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suggestedDuration && (
                <p className="text-xs text-amber-300 font-medium flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  Suggested: ~{suggestedDuration.avgMin}min based on {suggestedDuration.count} prior visit{suggestedDuration.count > 1 ? "s" : ""}
                  {suggestedDuration.lastMin !== null && ` (last: ${suggestedDuration.lastMin}m)`}
                </p>
              )}
            </div>

            {/* People count */}
            <div className="flex items-center gap-3">
              <Label className="text-sm">People:</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map(n => (
                  <Button key={n} variant={peopleCount === n ? "default" : "outline"} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => setPeopleCount(n)}>
                    {n}
                  </Button>
                ))}
              </div>
              {peopleCount > 1 && (
                <div className="flex items-center gap-2 ml-auto">
                  <Switch id="same-svc" checked={sameServiceForAll} onCheckedChange={setSameServiceForAll} className="scale-75" />
                  <Label htmlFor="same-svc" className="text-xs">Same service</Label>
                </div>
              )}
            </div>

            {/* Per-person service selection */}
            {!sameServiceForAll && peopleCount > 1 && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">Service per person</p>
                {Array.from({ length: peopleCount }).map((_, i) => {
                  const label = i === 0 ? (name.trim() || "Person 1") : `Person ${i + 1}`;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs w-20 truncate">{label}</span>
                      <Select value={personServiceIds[i] || ""} onValueChange={(v) => setPersonServiceIds(prev => ({ ...prev, [i]: v }))}>
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Service..." /></SelectTrigger>
                        <SelectContent>
                          {activeServices.map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Additional people */}
            {additionalPeople.length > 0 && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium flex items-center gap-1.5"><Users className="h-4 w-4" /> Additional People</p>
                {additionalPeople.map((person, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input placeholder="Name *" value={person.name} onChange={(e) => {
                      const updated = [...additionalPeople];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setAdditionalPeople(updated);
                    }} />
                    <Input placeholder="Email" value={person.email} onChange={(e) => {
                      const updated = [...additionalPeople];
                      updated[i] = { ...updated[i], email: e.target.value };
                      setAdditionalPeople(updated);
                    }} />
                    <Input placeholder="Phone" value={person.phone} onChange={(e) => {
                      const updated = [...additionalPeople];
                      updated[i] = { ...updated[i], phone: e.target.value };
                      setAdditionalPeople(updated);
                    }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ═══════ SECTION 2: Date & Time ═══════ */}
          <SectionHeader num={2} label="Date & Time" sRef={section2Ref} />
          {!serviceId ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Select a service above to see available times</p>
          ) : (
            <div className="space-y-3">
              {/* Week navigation */}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setWeekStart(addWeeks(weekStart, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold">
                  {format(weekStart, "d MMM")} — {format(addDays(weekStart, 6), "d MMM yyyy")}
                </span>
                <Button variant="outline" size="sm" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Closed days */}
              {closedDays.filter(d => !d.isPast).length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Closed:</span>
                  {closedDays.filter(d => !d.isPast).map(d => (
                    <Button
                      key={d.dateStr}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 border-dashed hover:bg-primary/10 hover:border-primary hover:text-primary"
                      onClick={async () => {
                        const startH = settings?.start_hour ?? 9;
                        const endH = settings?.end_hour ?? 17;
                        const newRow: AvailableDateRow = {
                          id: crypto.randomUUID(),
                          available_date: d.dateStr,
                          is_available: true,
                          start_hour: startH,
                          end_hour: endH,
                        };
                        setLocalAvailDates(prev => [...prev, newRow]);
                        await supabase.from("available_dates").insert({
                          available_date: d.dateStr,
                          is_available: true,
                          start_hour: startH,
                          end_hour: endH,
                        });
                        toast.success(`${format(d.date, "EEEE d MMM")} opened`);
                        fetchWeekSlots();
                      }}
                    >
                      + Open {format(d.date, "EEE d")}
                    </Button>
                  ))}
                </div>
              )}
              {closedDays.filter(d => d.isPast).length > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
                  Past: {closedDays.filter(d => d.isPast).map(d => format(d.date, "EEE")).join(", ")}
                </div>
              )}

              {/* Smart capacity suggestions */}
              {!loadingSlots && capacitySuggestions.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Smart Capacity Suggestions
                  </p>
                  {capacitySuggestions.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {s.direction === "earlier" ? "Open" : "Close"} <span className="font-medium">{s.dayLabel}</span> {s.adjustment}min {s.direction} → <span className="font-semibold">+{s.extraSlots} slot{s.extraSlots > 1 ? "s" : ""}</span>
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                        onClick={() => {
                          if (s.newStartH != null && s.newEndH != null) {
                            updateDayHours(s.dateStr, s.newStartH, s.newEndH);
                          }
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading slots...</span>
                </div>
              ) : (
                <div className={cn(
                  "grid gap-2",
                  openDays.length <= 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" :
                  openDays.length <= 5 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" :
                  "grid-cols-3 sm:grid-cols-4 lg:grid-cols-7"
                )}>
                  {openDays.map(({ date, dateStr, availSlots, recommendedSlots, slots }) => {
                    const openTimes = getOpeningTimes(dateStr);
                    const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
                    return (
                      <div key={dateStr} className={cn(
                        "rounded-lg border flex flex-col overflow-hidden bg-card",
                        selectedDate === dateStr && "ring-2 ring-primary"
                      )}>
                        {/* Day header with clear opening times + edit button */}
                        <div className="text-center py-2 border-b bg-muted/30 flex-shrink-0 w-full">
                          <p className="text-xs uppercase text-muted-foreground font-semibold">{format(date, "EEEE")}</p>
                          <p className="text-lg font-bold text-foreground">{format(date, "d MMM")}</p>
                          {isToday && <Badge variant="default" className="text-[9px] h-4 px-1.5 mb-0.5">Today</Badge>}
                          {openTimes && (
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 font-medium">
                                <Clock className="h-2.5 w-2.5" /> {openTimes.label}
                              </Badge>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="h-5 w-5 rounded-md hover:bg-muted flex items-center justify-center transition-colors" title="Edit hours">
                                    <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-3" align="center">
                                  <div className="space-y-3">
                                    <p className="text-sm font-semibold">{format(date, "EEEE d MMM")}</p>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Opening hours</Label>
                                      <div className="flex items-center gap-2">
                                        <Select
                                          value={String(openTimes?.startH ?? settings?.start_hour ?? 9)}
                                          onValueChange={(v) => updateDayHours(dateStr, parseFloat(v), openTimes?.endH ?? settings?.end_hour ?? 17)}
                                        >
                                          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            {hourOptions.map(o => (
                                              <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <span className="text-xs text-muted-foreground">to</span>
                                        <Select
                                          value={String(openTimes?.endH ?? settings?.end_hour ?? 17)}
                                          onValueChange={(v) => updateDayHours(dateStr, openTimes?.startH ?? settings?.start_hour ?? 9, parseFloat(v))}
                                        >
                                          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            {hourOptions.map(o => (
                                              <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="w-full text-xs h-8"
                                      onClick={() => closeDay(dateStr)}
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-1.5" /> Close this day
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                          <p className="text-[10px] text-primary font-medium mt-0.5">{availSlots.length} available</p>
                        </div>
                        {/* Time slots */}
                        <div className="flex-1 p-2 space-y-1">
                          {(() => {
                            // Find THE single shortest-distance recommended slot
                            let shortestIdx = -1;
                            let shortestDist = Infinity;
                            if (recommendedSlots.length > 1) {
                              recommendedSlots.forEach((s, i) => {
                                if (s.distanceMiles != null && s.distanceMiles < shortestDist) {
                                  shortestDist = s.distanceMiles;
                                  shortestIdx = i;
                                }
                              });
                            }

                            const recNodes = recommendedSlots.map((slot, i) => {
                              const isShortest = i === shortestIdx;
                              return (
                                <button
                                  key={`rec-${slot.time}`}
                                  onClick={() => { setSelectedDate(dateStr); setSelectedTime(slot.time); const svc = services.find(s => s.id === serviceId); createHold(dateStr, slot.time, svc?.duration_minutes ?? 60); }}
                                  className={cn(
                                    "w-full text-xs py-2 px-2 rounded-md text-center font-medium transition-colors",
                                    selectedDate === dateStr && selectedTime === slot.time
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60"
                                  )}
                                  title={slot.driveMinutes != null ? `${slot.driveMinutes} min drive${slot.distanceMiles != null ? ` · ${slot.distanceMiles} mi` : ""}` : "Recommended — minimises gaps"}
                                >
                                  <span className="flex items-center justify-center gap-1">
                                    {isShortest ? "📍" : "⭐"} {slot.time}
                                    {isShortest && <span className="text-[8px] opacity-80">· Shorter distance</span>}
                                    {!isShortest && slot.driveMinutes != null && <span className="text-[8px] opacity-70">· {slot.driveMinutes} min drive</span>}
                                  </span>
                                </button>
                              );
                            });

                            const otherSlots = slots.filter(s => s.available && s.status !== "recommended");

                            return (
                              <>
                                {recNodes.length > 0 && (
                                  <div className="space-y-1 mb-1.5">
                                    <p className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold px-0.5">Recommended</p>
                                    {recNodes}
                                  </div>
                                )}
                                {otherSlots.length > 0 && (
                                  <div className="space-y-0.5">
                                    {recNodes.length > 0 && <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold px-0.5 pt-1">Other times</p>}
                                    <div className="grid grid-cols-2 gap-1">
                                      {otherSlots.map(slot => (
                                        <button
                                          key={slot.time}
                                          onClick={() => { setSelectedDate(dateStr); setSelectedTime(slot.time); const svc = services.find(s => s.id === serviceId); createHold(dateStr, slot.time, svc?.duration_minutes ?? 60); }}
                                          className={cn(
                                            "text-xs py-1.5 rounded-md text-center transition-colors",
                                            selectedDate === dateStr && selectedTime === slot.time
                                              ? "bg-primary text-primary-foreground"
                                              : "bg-secondary/50 hover:bg-secondary text-foreground"
                                          )}
                                        >
                                          {slot.time}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {availSlots.length === 0 && !loadingSlots && (
                                  <div className="space-y-2 py-2">
                                    <p className="text-[10px] text-muted-foreground text-center">No slots available</p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="w-full text-xs h-8 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                                      onClick={() => {
                                        setSelectedDate(dateStr);
                                        setSelectedTime("");
                                        setTimeOverride(true);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3 mr-1.5" /> Set custom time
                                    </Button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Custom time override */}
              {selectedDate && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      <Label htmlFor="time-override" className="text-sm font-medium text-amber-700 dark:text-amber-400">Custom time (override)</Label>
                    </div>
                    <Switch id="time-override" checked={timeOverride} onCheckedChange={(v) => { setTimeOverride(v); if (v) setSelectedTime(""); }} className="scale-90" />
                  </div>
                  {timeOverride && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="h-9 w-36 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Bypasses overlap checks</p>
                    </div>
                  )}
                </div>
              )}

              {/* Selection summary */}
              {selectedDate && (selectedTime || (timeOverride && customTime)) && (
                <div className="rounded-lg border bg-primary/5 p-3 text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>
                    <strong>{format(parseISO(selectedDate), "EEEE d MMM")}</strong> at <strong>{timeOverride && customTime ? customTime : selectedTime}</strong>
                    {timeOverride && <Badge variant="outline" className="ml-2 text-[10px] h-5 border-amber-500/40 text-amber-600">Override</Badge>}
                  </span>
                  {travelChecked && travelFee !== null && travelFee > 0 && (
                    <span className="ml-auto text-amber-600 text-xs">+£{travelFee.toFixed(2)} travel</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════ SECTION 3: Reason for Visit ═══════ */}
          <SectionHeader num={3} label="Reason for Visit" sRef={section3Ref} />
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground/70">Describe what the patient told you. AI will generate a clinical summary on the booking tile.</p>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Both ears blocked for 2 weeks, tried olive oil drops, no improvement..."
              rows={4}
            />
          </div>

          {/* ═══════ SECTION 4: Confirm & Book ═══════ */}
          <SectionHeader num={4} label="Confirm & Book" sRef={section4Ref} />
          <div className="space-y-3">
            {/* Countdown timer */}
            {holdSecondsLeft > 0 && (
              <div className={cn(
                "rounded-lg p-3 flex items-center justify-between text-sm font-medium text-white",
                holdSecondsLeft > 300 ? "bg-primary/80 border border-primary" :
                holdSecondsLeft > 60 ? "bg-amber-600 border border-amber-500" :
                "bg-destructive border border-destructive"
              )}>
                <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-white" /> Slot reserved</span>
                <span className="font-mono text-base text-white">{formatCountdown()}</span>
              </div>
            )}

            {/* Booking Summary */}
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-base">Booking Summary</h3>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Service:</span>
                <div>
                  {!sameServiceForAll && peopleCount > 1 ? (
                    <div className="space-y-0.5">
                      {Array.from({ length: peopleCount }).map((_, i) => {
                        const sId = personServiceIds[i];
                        const svc = services.find(s => s.id === sId);
                        const pName = i === 0 ? (name.trim() || "Person 1") : (additionalPeople[i - 1]?.name?.trim() || `Person ${i + 1}`);
                        return (
                          <p key={i} className="text-sm font-medium">
                            <span className="text-muted-foreground font-normal">{pName}: </span>
                            {svc?.name || "—"}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="font-medium">{selectedService?.name || <span className="text-destructive">Not selected</span>}</span>
                  )}
                </div>
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{selectedDate ? format(parseISO(selectedDate), "EEEE d MMM yyyy") : <span className="text-destructive">Not selected</span>}</span>
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">
                  {(timeOverride && customTime) ? (
                    <span>{customTime} <Badge variant="outline" className="ml-1 text-[9px] h-4 border-amber-500/40 text-amber-600">Override</Badge></span>
                  ) : selectedTime ? selectedTime : <span className="text-destructive">Not selected</span>}
                </span>
                <span className="text-muted-foreground">Patient:</span>
                <span className="font-medium">{name || <span className="text-destructive">Not entered</span>}</span>
                {phone && <>
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{phone}</span>
                </>}
                {hasEmail && email && <>
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{email}</span>
                </>}
                <span className="text-muted-foreground">Address:</span>
                <span className="font-medium">{address || postcode || "—"}</span>
                {notes && <>
                  <span className="text-muted-foreground">Reason:</span>
                  <span className="font-medium line-clamp-2">{notes}</span>
                </>}
                {helpfulDirections.trim() && <>
                  <span className="text-muted-foreground">Directions:</span>
                  <span className="font-medium line-clamp-2">{helpfulDirections}</span>
                </>}
                {peopleCount > 1 && <>
                  <span className="text-muted-foreground">People:</span>
                  <span className="font-medium">{peopleCount}</span>
                </>}
                {latitude != null && longitude != null && <>
                  <span className="text-muted-foreground">GPS:</span>
                  <span className="font-medium text-xs">{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                </>}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t mt-2">
                <span className="text-muted-foreground text-sm">Price:</span>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-24"
                  type="number"
                  step="0.01"
                />
                {travelFee != null && travelFee > 0 && !travelFeeOverride && (
                  <span className="text-xs text-amber-600">+ £{travelFee.toFixed(2)} travel</span>
                )}
              </div>
            </div>

            {/* ─── Confirmations & Consent ─── */}
            <div className="space-y-2.5 border-t pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Send Confirmations</p>

              {/* Email confirmation */}
              <label className={cn(
                "flex items-center gap-2 text-sm rounded-md px-3 py-2 border transition-colors",
                !hasEmail ? "opacity-50 line-through border-muted bg-muted/30 cursor-not-allowed" :
                sendNotification ? "border-emerald-500/50 bg-emerald-500/10 cursor-pointer" : "border-border cursor-pointer hover:bg-muted/50"
              )}>
                <Checkbox
                  checked={sendNotification}
                  onCheckedChange={(v) => setSendNotification(!!v)}
                  disabled={!hasEmail}
                />
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{hasEmail ? "Send email confirmation" : "No email address"}</span>
                {hasEmail && (
                  <Badge variant={sendNotification ? "default" : "secondary"} className={cn("text-[9px] px-1.5 py-0", sendNotification ? "bg-emerald-600" : "")}>
                    {sendNotification ? "YES" : "NO"}
                  </Badge>
                )}
              </label>

              {/* SMS confirmation */}
              {(() => {
                const hasMobile = isMobileNumber(phone);
                return (
                  <label className={cn(
                    "flex items-center gap-2 text-sm rounded-md px-3 py-2 border transition-colors",
                    !hasMobile ? "opacity-50 line-through border-muted bg-muted/30 cursor-not-allowed" :
                    sendSms ? "border-emerald-500/50 bg-emerald-500/10 cursor-pointer" : "border-border cursor-pointer hover:bg-muted/50"
                  )}>
                    <Checkbox
                      checked={sendSms}
                      onCheckedChange={(v) => setSendSms(!!v)}
                      disabled={!hasMobile}
                    />
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{hasMobile ? "Send SMS confirmation" : "No mobile number (landline only)"}</span>
                    {hasMobile && (
                      <Badge variant={sendSms ? "default" : "secondary"} className={cn("text-[9px] px-1.5 py-0", sendSms ? "bg-emerald-600" : "")}>
                        {sendSms ? "YES" : "NO"}
                      </Badge>
                    )}
                  </label>
                );
              })()}

              {/* Consent form section */}
              <div className="border-t pt-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consent Form</p>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={skipConsent}
                      onCheckedChange={(v) => setSkipConsent(!!v)}
                    />
                    Skip (already done)
                  </label>
                </div>

                {!skipConsent && (
                  <>
                    {(hasEmail || isMobileNumber(phone)) ? (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Select consent form to send</Label>
                          <Select value={selectedConsentTemplateId} onValueChange={setSelectedConsentTemplateId}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="None — don't send consent form" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs italic text-muted-foreground">None — don't send</SelectItem>
                              {consentTemplates.map(t => (
                                <SelectItem key={t.id} value={t.id} className="text-xs">
                                  {t.title}
                                  {t.id === selectedService?.consent_form_template_id && " ⭐"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedService?.consent_form_template_id && (
                            <p className="text-[10px] text-muted-foreground">⭐ = default form for this service</p>
                          )}
                        </div>

                        {selectedConsentTemplateId && selectedConsentTemplateId !== "__none__" && !verbalConsent && (() => {
                          const hasMob = isMobileNumber(phone);
                          const opts: { value: "email" | "sms" | "both"; label: string; disabled: boolean }[] = [
                            { value: "email", label: "Email only", disabled: !hasEmail },
                            { value: "sms", label: "SMS only", disabled: !hasMob },
                            { value: "both", label: "Both", disabled: !hasEmail || !hasMob },
                          ];
                          return (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Send consent form via</Label>
                              <div className="grid grid-cols-3 gap-1">
                                {opts.map(o => (
                                  <button
                                    key={o.value}
                                    type="button"
                                    disabled={o.disabled}
                                    onClick={() => setConsentDelivery(o.value)}
                                    className={cn(
                                      "rounded-md border px-2 py-1.5 text-xs transition-colors",
                                      consentDelivery === o.value
                                        ? "border-secondary bg-secondary/10 text-foreground"
                                        : "border-border bg-card hover:border-secondary/40",
                                      o.disabled && "opacity-40 cursor-not-allowed",
                                    )}
                                  >
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                              {!hasEmail && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400">No email on file — only SMS available</p>
                              )}
                              {!hasMob && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400">No UK mobile on file — only Email available</p>
                              )}
                            </div>
                          );
                        })()}

                        <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-3 py-2 border border-border hover:bg-muted/50">
                          <Checkbox
                            checked={verbalConsent}
                            onCheckedChange={(v) => setVerbalConsent(!!v)}
                          />
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>Verbal consent at appointment</span>
                        </label>
                      </>
                    ) : (
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                          No email or mobile — consent form cannot be sent digitally
                        </p>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={verbalConsent}
                            onCheckedChange={(v) => setVerbalConsent(!!v)}
                          />
                          <Phone className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                          <span className="font-medium">Verbal consent needed at appointment</span>
                        </label>
                      </div>
                    )}
                  </>
                )}

                {skipConsent && (
                  <p className="text-xs text-muted-foreground italic">Consent form skipped — patient has completed previously</p>
                )}
              </div>

              {/* Dictation informed confirmation */}
              <label className={cn(
                "flex items-start gap-2 text-sm rounded-md px-3 py-2 border cursor-pointer transition-colors mt-2",
                dictationInformed ? "border-purple-500/50 bg-purple-500/10" : "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10"
              )}>
                <Checkbox
                  checked={dictationInformed}
                  onCheckedChange={(v) => setDictationInformed(!!v)}
                  className="mt-0.5"
                />
                <div className="flex-1 leading-snug">
                  <span className="font-medium">I've informed the patient about audio dictation</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Confirm you've mentioned that the appointment may be recorded via Heidi for clinical notes (not played back) and they can opt out.
                  </p>
                </div>
              </label>
            </div>

            {/* Validation errors with scroll-to + override */}
            {showValidation && missingFields.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Missing required fields
                </p>
                <div className="space-y-1">
                  {missingFields.map((f, i) => (
                    <button
                      key={i}
                      className="text-xs text-destructive hover:underline flex items-center gap-1"
                      onClick={() => f.ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                      • {f.label} — tap to scroll up
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 mt-1"
                  onClick={() => { setSkipValidation(true); setShowValidation(false); }}
                >
                  <ShieldAlert className="h-3.5 w-3.5" /> Override — book anyway
                </Button>
              </div>
            )}

            {skipValidation && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">Validation overridden — some fields may be incomplete</p>
                <Button variant="ghost" size="sm" className="h-5 text-[10px] ml-auto" onClick={() => setSkipValidation(false)}>Undo</Button>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Phone className="h-4 w-4 mr-1.5" />}
              Confirm Booking
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PhoneBookingWizard;
