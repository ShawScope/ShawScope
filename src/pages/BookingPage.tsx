import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { enGB } from "date-fns/locale";
import { CalendarDays, Clock, CheckCircle, ArrowLeft, Stethoscope, Upload, X, Droplets, FileText, Mail, Send, UserPlus, Trash2, AlertTriangle, MapPin, XCircle, Snowflake, Loader2, Navigation, Home, ShieldCheck, Bell, Megaphone, MessageSquare, Search, PoundSterling, Camera, Ear, Phone, Footprints, Car, ChevronDown, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import AddressPicker from "@/components/AddressPicker";
import PageMeta from "@/components/PageMeta";
import shawscopeCar from "@/assets/shawscope-car.jpg";
import treatmentShowcase from "@/assets/treatment-showcase.jpeg";
import NoticeBanner from "@/components/NoticeBanner";
import TravelDisputeForm from "@/components/TravelDisputeForm";
import PaymentMethodsBadge from "@/components/PaymentMethodsBadge";
import { useServicePricing } from "@/hooks/useServicePricing";

interface BusinessSettings {
  start_hour: number;
  end_hour: number;
  buffer_minutes: number;
  appointment_duration_minutes: number;
  booking_cutoff_hours: number;
  travel_buffer_per_mile: number;
}

interface AvailableDate {
  available_date: string;
  start_hour: number | null;
  end_hour: number | null;
}

interface BlockedTime {
  blocked_date: string;
  start_time: string;
  end_time: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  consent_form_template_id: string | null;
  status: string;
  image_url: string | null;
}


interface DriveTimeResult {
  drive_times: Record<string, { drive_time_minutes: number; distance_miles: number }>;
  appointments: { time: string; duration: number; postcode: string | null }[];
  base_postcode: string;
  travel_fee: number;
  distance_miles: number;
  within_range: boolean;
}

interface TravelFeeResult {
  distance_miles: number;
  travel_fee: number;
  within_range: boolean;
  out_of_area?: boolean;
  locality?: string;
}

const BookingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { services: pricingServices, offers: pricingOffers, loading: pricingLoading } = useServicePricing();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [cancelPhase, setCancelPhase] = useState<"feedback" | "offer">("feedback");
  const [callbackName, setCallbackName] = useState("");
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackEmail, setCallbackEmail] = useState("");
  const [sendingCallback, setSendingCallback] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<string>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hasNoEmail, setHasNoEmail] = useState(false);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [mediaConsent, setMediaConsent] = useState(false);
  const [mediaConsentChoice, setMediaConsentChoice] = useState<boolean | null>(null);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [directions, setDirections] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [referralSourceOther, setReferralSourceOther] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [cryoPhotos, setCryoPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [priceAgreed, setPriceAgreed] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState("");
  const cryoFileRef = useRef<HTMLInputElement>(null);
  // Cryo intake screen (after picking cryotherapy service, before postcode step)
  const [cryoIntakeOpen, setCryoIntakeOpen] = useState(false);
  const [cryoIntakeAnswered, setCryoIntakeAnswered] = useState<null | "yes" | "no">(null);
  const [cryoQuoteContactEmail, setCryoQuoteContactEmail] = useState("");
  const [cryoQuoteContactPhone, setCryoQuoteContactPhone] = useState("");
  const [cryoQuoteNotes, setCryoQuoteNotes] = useState("");
  const [cryoQuoteSending, setCryoQuoteSending] = useState(false);
  const [cryoQuoteSent, setCryoQuoteSent] = useState(false);
  const [createdAccessToken, setCreatedAccessToken] = useState<string | null>(null);
  const [hasConsentForm, setHasConsentForm] = useState(false);
  const [consentDeferred, setConsentDeferred] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistServiceName, setWaitlistServiceName] = useState("");
  const [waitlistServiceId, setWaitlistServiceId] = useState<string>("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  // Validate DD/MM/YYYY: complete 10 chars, valid date, year between 1900 and current year
  const isValidDob = (v: string): boolean => {
    if (!v || v.length !== 10) return false;
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return false;
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const yyyy = parseInt(m[3], 10);
    const currentYear = new Date().getFullYear();
    if (yyyy < 1900 || yyyy > currentYear) return false;
    if (mm < 1 || mm > 12) return false;
    if (dd < 1 || dd > 31) return false;
    const d = new Date(yyyy, mm - 1, dd);
    return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
  };
  const [bookingFor, setBookingFor] = useState<"myself" | "other">("myself");
  const [bookerName, setBookerName] = useState("");
  const [bookerRelation, setBookerRelation] = useState("");
  const [noEmailDialogOpen, setNoEmailDialogOpen] = useState(false);
  const [isMultiple, setIsMultiple] = useState(false);
  const [additionalPeople, setAdditionalPeople] = useState<{ name: string; email: string; phone: string; dob: string }[]>([]);
  const [travelFee, setTravelFee] = useState<number>(0);
  const [travelDistance, setTravelDistance] = useState<number | null>(null);
  const [travelFeeAccepted, setTravelFeeAccepted] = useState(false);
  const [outOfArea, setOutOfArea] = useState(false);
  const [locality, setLocality] = useState("");
  const [marketingEmail, setMarketingEmail] = useState(true);
  const [marketingSms, setMarketingSms] = useState(true);
  const [cancellationAgreed, setCancellationAgreed] = useState(false);
  const [earwaxFollowUpAgreed, setEarwaxFollowUpAgreed] = useState(false);
  const [consentDelivery, setConsentDelivery] = useState<"email" | "sms" | "in_person">("email");
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showAudioLearnMore, setShowAudioLearnMore] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState<Record<string, number>>({});
  const [travelMinsByDate, setTravelMinsByDate] = useState<Record<string, number>>({});
  const [blockedSlotsByDate, setBlockedSlotsByDate] = useState<Record<string, number>>({});
  const [holdSlotsByDate, setHoldSlotsByDate] = useState<Record<string, number>>({});
  const [closedDayMessage, setClosedDayMessage] = useState<string | null>(null);

  // Booking hold state
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  // Per-person service selection
  const [personServices, setPersonServices] = useState<Record<number, Service | null>>({});
  const [sameServiceForAll, setSameServiceForAll] = useState(true);

  // New postcode-first state
  const [postcode, setPostcode] = useState("");
  const [postcodeChecked, setPostcodeChecked] = useState(false);
  const [checkingPostcode, setCheckingPostcode] = useState(false);
  const [withinRange, setWithinRange] = useState(true);
  const [comeToMe, setComeToMe] = useState(false);

  // Come-to-me request form state
  const [ctmName, setCtmName] = useState("");
  const [ctmEmail, setCtmEmail] = useState("");
  const [ctmPhone, setCtmPhone] = useState("");
  const [ctmNotes, setCtmNotes] = useState("");
  const [ctmSending, setCtmSending] = useState(false);
  const [ctmSubmitted, setCtmSubmitted] = useState(false);

  // Drive time data for dynamic slot calculation
  const [driveTimeData, setDriveTimeData] = useState<DriveTimeResult | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const isCryoService = selectedService?.name.toLowerCase().includes("cryotherapy");
  const isEarwaxService = selectedService?.name.toLowerCase().includes("earwax") || selectedService?.name.toLowerCase().includes("ear wax");
  const needsFollowUpAwareness = (() => {
    const sName = selectedService?.name.toLowerCase() || "";
    return sName.includes("earwax") || sName.includes("ear wax") || sName.includes("hearing") || sName.includes("wellness");
  })();
  
  // Calculate group price based on whether all have the same service or mixed
  // Derive earwax group prices from active service offers (admin-managed)
  const earwaxGroupPricesFromOffers = (() => {
    const map: Record<number, number> = {};
    if (!selectedService || !isEarwaxService) return map;
    const svcOffers = pricingOffers.filter((o) => o.service_id === selectedService.id);
    const wordToNum: Record<string, number> = {
      two: 2, three: 3, four: 4, five: 5, six: 6,
    };
    for (const o of svcOffers) {
      const name = (o.offer_name || "").toLowerCase();
      // Skip variant offers (e.g. "No Wax") — only use the base group discount
      if (!/discount|person/.test(name)) continue;
      if (/no\s*wax|no-wax/.test(name)) continue;
      let count: number | null = null;
      const digit = name.match(/(\d+)\s*(?:person|people|pax)/);
      if (digit) count = parseInt(digit[1], 10);
      if (!count) {
        for (const [w, n] of Object.entries(wordToNum)) {
          if (new RegExp(`\\b${w}\\b`).test(name)) { count = n; break; }
        }
      }
      if (!count) continue;
      const priceMatch = (o.price_text || "").match(/£?\s*(\d+(?:\.\d+)?)/);
      if (!priceMatch) continue;
      map[count] = parseFloat(priceMatch[1]);
    }
    return map;
  })();

  const getGroupPrice = (): number | null => {
    if (!isMultiple || additionalPeople.length === 0) return null;
    const peopleCount = additionalPeople.length + 1;
    
    if (!sameServiceForAll) {
      // Mixed services: sum individual prices
      let total = 0;
      for (let i = 0; i <= additionalPeople.length; i++) {
        const svc = personServices[i] || selectedService;
        if (svc?.price != null) total += Number(svc.price);
        else return null; // can't calculate if any price is missing
      }
      return total;
    }
    
    // Same service for all
    if (isEarwaxService) {
      return earwaxGroupPricesFromOffers[peopleCount]
        ?? (selectedService?.price ? Number(selectedService.price) * peopleCount : null);
    }
    return selectedService?.price ? Number(selectedService.price) * peopleCount : null;
  };
  const earwaxGroupPrice = getGroupPrice();

  useEffect(() => {
    supabase.from("business_settings").select("*").single().then(({ data }) => {
      if (data) setSettings(data as BusinessSettings);
    });
    supabase.from("services").select("*").in("status", ["active", "coming_soon"]).order("sort_order").then(({ data }) => {
      if (data) setServices(data as Service[]);
    });
    supabase.from("available_dates").select("available_date, start_hour, end_hour").eq("is_available", true).gte("available_date", format(new Date(), "yyyy-MM-dd")).then(({ data }) => {
      if (data) setAvailableDates(data as AvailableDate[]);
    });
    // Fetch blocked times for all future dates for calendar colouring
    supabase.from("blocked_times").select("blocked_date, start_time, end_time, reason").gte("blocked_date", format(new Date(), "yyyy-MM-dd")).then(({ data }) => {
      if (data) {
        const blocked: Record<string, number> = {};
        (data as any[]).filter(bt => bt.reason !== "Annual Leave" && bt.reason !== "On Call").forEach((bt: any) => {
          const startMins = parseInt(bt.start_time.slice(0, 2)) * 60 + parseInt(bt.start_time.slice(3, 5));
          const endMins = parseInt(bt.end_time.slice(0, 2)) * 60 + parseInt(bt.end_time.slice(3, 5));
          const blockedSlots = Math.max(1, Math.floor((endMins - startMins) / 30));
          blocked[bt.blocked_date] = (blocked[bt.blocked_date] || 0) + blockedSlots;
        });
        setBlockedSlotsByDate(blocked);
      }
    });
    // Fetch active holds for calendar colouring
    supabase.rpc("get_active_booking_holds_summary" as any).then(({ data }) => {
      if (data) {
        const holds: Record<string, number> = {};
        (data as any[]).forEach((h: any) => {
          const heldSlots = Math.max(1, Math.ceil((h.duration_minutes || 60) / 30));
          holds[h.appointment_date] = (holds[h.appointment_date] || 0) + heldSlots;
        });
        setHoldSlotsByDate(holds);
      }
    });
  }, []);

  useEffect(() => {
    if (availableDates.length === 0) {
      setBookedSlotsByDate({});
      setTravelMinsByDate({});
      return;
    }

    let cancelled = false;
    const bufferPerMile = settings?.travel_buffer_per_mile ?? 0.5;

    const loadBookedSlotsByDate = async () => {
      // Fetch booked slots AND travel distances per date in parallel
      const [slotEntries, travelEntries] = await Promise.all([
        Promise.all(
          availableDates.map(async ({ available_date }) => {
            const { data } = await supabase.rpc("get_booked_slots_with_duration", {
              target_date: available_date,
            });
            const usedSlots = ((data as { duration_minutes: number | null }[] | null) ?? []).reduce((sum, row) => {
              const durationMinutes = row.duration_minutes ?? settings?.appointment_duration_minutes ?? 60;
              return sum + Math.max(1, Math.ceil(durationMinutes / 30));
            }, 0);
            return [available_date, usedSlots] as const;
          })
        ),
        Promise.all(
          availableDates.map(async ({ available_date }) => {
            const { data } = await supabase
              .from("appointments")
              .select("travel_distance_miles")
              .eq("appointment_date", available_date)
              .not("status", "in", '("cancelled","rejected")');
            // Calculate total travel buffer minutes for all appointments on this day
            const totalTravelMins = ((data as { travel_distance_miles: number | null }[] | null) ?? []).reduce((sum, row) => {
              const dist = row.travel_distance_miles ?? 7; // conservative default ~7 miles
              // Each appointment needs: estimated drive time + per-mile buffer
              const estimatedDriveTime = Math.max(5, dist * 2); // rough: 2 min per mile
              const perMileBuffer = dist * bufferPerMile;
              return sum + estimatedDriveTime + perMileBuffer;
            }, 0);
            return [available_date, Math.round(totalTravelMins)] as const;
          })
        ),
      ]);

      if (!cancelled) {
        setBookedSlotsByDate(Object.fromEntries(slotEntries));
        setTravelMinsByDate(Object.fromEntries(travelEntries));
      }
    };

    loadBookedSlotsByDate();

    return () => {
      cancelled = true;
    };
  }, [availableDates, settings?.appointment_duration_minutes, settings?.travel_buffer_per_mile]);

  // Hold countdown timer
  useEffect(() => {
    if (!holdExpiresAt) {
      setHoldSecondsLeft(0);
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((holdExpiresAt.getTime() - Date.now()) / 1000));
      setHoldSecondsLeft(remaining);
      if (remaining <= 0) {
        // Hold expired
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        setHoldId(null);
        setHoldExpiresAt(null);
        setTime(undefined);
        setStep(7);
        toast.error("Your reserved time slot has expired. Please select a new time.");
      }
    };
    tick();
    holdTimerRef.current = setInterval(tick, 1000);
    return () => { if (holdTimerRef.current) clearInterval(holdTimerRef.current); };
  }, [holdExpiresAt]);

  // Cleanup hold on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  const createHold = async (selectedDate: Date, selectedTime: string) => {
    const duration = getEffectiveDuration();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const { data, error } = await supabase.from("booking_holds").insert({
      appointment_date: format(selectedDate, "yyyy-MM-dd"),
      appointment_time: selectedTime,
      duration_minutes: duration,
      session_id: sessionIdRef.current,
      postcode: postcode.trim().toUpperCase() || null,
      expires_at: expiresAt.toISOString(),
    } as any).select("id").single();
    if (!error && data) {
      setHoldId(data.id);
      setHoldExpiresAt(expiresAt);
    }
  };

  const releaseHold = async () => {
    if (holdId) {
      await supabase.rpc("release_booking_hold" as any, { p_hold_id: holdId, p_session_id: sessionIdRef.current });
      setHoldId(null);
      setHoldExpiresAt(null);
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    }
  };

  const updateHoldContactInfo = async () => {
    if (holdId) {
      await supabase.rpc("update_booking_hold" as any, {
        p_hold_id: holdId,
        p_session_id: sessionIdRef.current,
        p_client_name: name.trim() || null,
        p_client_email: email.trim() || null,
        p_client_phone: phone.trim() || null,
        p_postcode: null,
        p_help_email_sent: null,
      });
    }
  };

  // When date changes, fetch drive times + blocked times + active holds for dynamic slot calculation
  const [activeHolds, setActiveHolds] = useState<{ appointment_time: string; duration_minutes: number; session_id: string }[]>([]);

  useEffect(() => {
    if (!date || !postcode.trim()) return;
    const dateStr = format(date, "yyyy-MM-dd");

    setLoadingSlots(true);
    setDriveTimeData(null);

    Promise.all([
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-drive-time`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ destination: postcode.trim(), date: dateStr }),
      }).then(r => r.json()),
      supabase.from("blocked_times").select("blocked_date, start_time, end_time, reason").eq("blocked_date", dateStr),
      supabase.rpc("get_active_booking_holds_for_date" as any, { target_date: dateStr }),
    ]).then(([dtData, blockedResult, holdsResult]) => {
      setDriveTimeData(dtData as DriveTimeResult);
      if (blockedResult.data) setBlockedTimes((blockedResult.data as any[]).filter(bt => bt.reason !== "Annual Leave" && bt.reason !== "On Call") as BlockedTime[]);
      else setBlockedTimes([]);
      if (holdsResult.data) setActiveHolds(holdsResult.data as any[]);
      else setActiveHolds([]);
      setLoadingSlots(false);
    }).catch(() => {
      setLoadingSlots(false);
    });
  }, [date, postcode]);

  const checkPostcode = async (pc: string) => {
    const clean = pc.trim().toUpperCase();
    if (!clean) return;

    setCheckingPostcode(true);
    try {
      let data: TravelFeeResult | null = null;
      let lastMessage = "Could not check that postcode. Please try again.";

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-fee-check`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ postcode: clean }),
            }
          );

          const responseBody = await resp.json().catch(() => null);
          if (resp.ok) {
            data = responseBody as TravelFeeResult;
            break;
          }

          lastMessage = responseBody?.error || lastMessage;
        } catch {
          lastMessage = "Failed to check postcode";
        }

        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 600));
        }
      }

      if (!data) {
        toast.error(lastMessage);
        return;
      }

      setTravelDistance(data.distance_miles);
      setTravelFee(data.travel_fee);
      setWithinRange(data.within_range);
      setOutOfArea(data.out_of_area || false);
      setLocality(data.locality || "");
      setPostcodeChecked(true);
      if (data.out_of_area) {
        setTravelFeeAccepted(false);
      } else if (data.within_range) {
        setTravelFeeAccepted(true);
      } else {
        setTravelFeeAccepted(false);
      }
    } catch {
      toast.error("Failed to check postcode");
    } finally {
      setCheckingPostcode(false);
    }
  };

  const getDateOverrides = (d: Date) => {
    const dateStr = format(d, "yyyy-MM-dd");
    return availableDates.find((ad) => ad.available_date === dateStr);
  };

  const isTimeBlockedByBlockedTimes = (timeStr: string, durationMinutes: number) => {
    const slotStartMinutes = parseInt(timeStr.slice(0, 2)) * 60 + parseInt(timeStr.slice(3, 5));
    const slotEndMinutes = slotStartMinutes + durationMinutes;

    for (const bt of blockedTimes) {
      const blockStartMinutes = parseInt(bt.start_time.slice(0, 2)) * 60 + parseInt(bt.start_time.slice(3, 5));
      const blockEndMinutes = parseInt(bt.end_time.slice(0, 2)) * 60 + parseInt(bt.end_time.slice(3, 5));
      if (slotStartMinutes < blockEndMinutes && slotEndMinutes > blockStartMinutes) {
        return true;
      }
    }
    return false;
  };

  const getEffectiveDuration = () => {
    const base = selectedService?.duration_minutes || settings?.appointment_duration_minutes || 60;
    if (!isMultiple || additionalPeople.length === 0) return base;
    const extraPeople = additionalPeople.length;
    const sName = selectedService?.name.toLowerCase() || "";
    if (sName.includes("earwax") || sName.includes("ear wax")) return base + (30 * extraPeople);
    if (sName.includes("cryotherapy")) return base + (15 * extraPeople);
    if (sName.includes("wellness")) return base + (15 * extraPeople);
    if (sName.includes("foot")) return base + (base * extraPeople);
    return base + (30 * extraPeople);
  };

  // Round minutes to nearest 5
  const roundTo5 = (mins: number) => Math.ceil(mins / 5) * 5;

  const generateTimeSlots = (): { time: string; available: boolean; driveFromMinutes?: number; isAdjacentToExisting?: boolean }[] => {
    if (!settings || !date || !driveTimeData) return [];
    const slots: { time: string; available: boolean; driveFromMinutes?: number; isAdjacentToExisting?: boolean }[] = [];
    const duration = getEffectiveDuration();
    const dateOverride = getDateOverrides(date);
    const startHour = dateOverride?.start_hour ?? settings.start_hour;
    const endHour = dateOverride?.end_hour ?? settings.end_hour;
    const dayStartMinutes = startHour * 60;
    const dayEndMinutes = endHour * 60;

    // Get existing appointments sorted by time
    const existingApts = (driveTimeData.appointments || [])
      .map((a: any) => ({
        startMins: parseInt(a.time.slice(0, 2)) * 60 + parseInt(a.time.slice(3, 5)),
        duration: a.duration,
        postcode: a.postcode,
        come_to_practitioner: a.come_to_practitioner || false,
      }))
      .sort((a: any, b: any) => a.startMins - b.startMins);

    const destPostcode = postcode.trim().toUpperCase().replace(/\s+/g, " ");

    // Helper to get drive time and distance from an origin postcode to the patient's postcode
    const getDriveInfo = (originPc: string | null): { driveTime: number; distance: number } => {
      if (!originPc) return { driveTime: 15, distance: 10 }; // fallback
      const key = originPc.toUpperCase().replace(/\s+/g, " ");
      const info = driveTimeData.drive_times[key];
      return {
        driveTime: info?.drive_time_minutes ?? 15,
        distance: info?.distance_miles ?? 10,
      };
    };

    // Buffer = travel time + (distance × per-mile buffer)
    const bufferPerMile = settings.travel_buffer_per_mile ?? 0.5;
    const getBuffer = (originPc: string | null): number => {
      const { driveTime, distance } = getDriveInfo(originPc);
      return driveTime + Math.round(distance * bufferPerMile);
    };

    // Build a set of "unavailable windows" from existing appointments
    const unavailableWindows: { start: number; end: number }[] = [];

    for (let ai = 0; ai < existingApts.length; ai++) {
      const apt = existingApts[ai];
      const aptEnd = apt.startMins + apt.duration;
      const totalBuffer = getBuffer(apt.postcode);

      // Add 10-min setup buffer before come_to_practitioner appointments
      // unless the previous appointment is also come_to_practitioner
      let setupBuffer = 0;
      if (apt.come_to_practitioner) {
        const prevApt = ai > 0 ? existingApts[ai - 1] : null;
        if (!prevApt?.come_to_practitioner) {
          setupBuffer = 10;
        }
      }

      unavailableWindows.push({
        start: apt.startMins - setupBuffer,
        end: aptEnd + totalBuffer,
      });
    }

    // For first slot of day: total buffer from base (drive + per-mile extra)
    const totalBaseBuffer = getBuffer(driveTimeData.base_postcode);

    // Generate slots: use 15-min increments normally, but add 5-min rounded slots
    // immediately after each existing appointment
    const slotSet = new Set<number>();

    // Add normal 15-min increment slots
    for (let mins = dayStartMinutes; mins + duration <= dayEndMinutes; mins += 15) {
      slotSet.add(mins);
    }

    // Add dynamic 5-min-rounded first-available slot after each existing appointment
    for (const apt of existingApts) {
      const aptEnd = apt.startMins + apt.duration;
      const totalBuffer = getBuffer(apt.postcode);
      const firstAvailable = roundTo5(aptEnd + totalBuffer);
      if (firstAvailable + duration <= dayEndMinutes) {
        slotSet.add(firstAvailable);
      }
    }

    // Sort all slots
    const sortedSlots = Array.from(slotSet).sort((a, b) => a - b);

    // Booking cutoff: filter out slots that are too close to now
    const cutoffHours = settings.booking_cutoff_hours ?? 14;
    const now = new Date();
    const selectedDateStr = format(date, "yyyy-MM-dd");

    for (const mins of sortedSlots) {
      const h = Math.floor(mins / 60).toString().padStart(2, "0");
      const m = (mins % 60).toString().padStart(2, "0");
      const timeStr = `${h}:${m}:00`;

      // Check booking cutoff - skip slots within cutoff window
      const slotDateTime = new Date(`${selectedDateStr}T${h}:${m}:00`);
      const hoursUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilSlot < cutoffHours) continue;

      // Check if blocked
      if (isTimeBlockedByBlockedTimes(timeStr, duration)) continue;

      // Check if held by another session
      const isHeldByOther = activeHolds.some(h => {
        if (h.session_id === sessionIdRef.current) return false; // Our own hold
        const holdStart = parseInt(h.appointment_time.slice(0, 2)) * 60 + parseInt(h.appointment_time.slice(3, 5));
        const holdEnd = holdStart + (h.duration_minutes || 60);
        return mins < holdEnd && (mins + duration) > holdStart;
      });
      if (isHeldByOther) continue;

      // Check if this slot overlaps any unavailable window
      const slotEnd = mins + duration;
      let isOverlapping = false;
      for (const w of unavailableWindows) {
        if (mins < w.end && slotEnd > w.start) {
          isOverlapping = true;
          break;
        }
      }

      if (!isOverlapping) {
        // Check the new appointment wouldn't prevent reaching the next appointment
        for (const apt of existingApts) {
          if (apt.startMins > mins) {
            const totalBufferToNext = getBuffer(apt.postcode);
            const newAptEnd = mins + duration + totalBufferToNext;
            if (newAptEnd > apt.startMins) {
              isOverlapping = true;
            }
            break;
          }
        }
      }

      if (!isOverlapping) {
        let driveFromMinutes: number | undefined;
        let isAdjacentToExisting = false;
        if (existingApts.length > 0) {
          let precedingPc: string | null = driveTimeData.base_postcode;
          let precedingEndMins: number | null = null;
          for (const apt of existingApts) {
            if (apt.startMins + apt.duration <= mins) {
              precedingPc = apt.postcode;
              precedingEndMins = apt.startMins + apt.duration;
            } else { break; }
          }
          const { driveTime } = getDriveInfo(precedingPc);
          driveFromMinutes = driveTime;
          if (precedingEndMins != null && (mins - precedingEndMins) <= driveTime + 15) {
            isAdjacentToExisting = true;
          }
          for (const apt of existingApts) {
            if (apt.startMins > mins && (apt.startMins - (mins + duration)) <= 30) {
              isAdjacentToExisting = true;
              break;
            }
          }
        }
        slots.push({ time: timeStr, available: true, driveFromMinutes, isAdjacentToExisting });
      }
    }

    return slots;
  };

  const availableDateStrings = new Set(availableDates.map((ad) => ad.available_date));

  // Classify dates by availability level
  const LIMITED_SLOTS_THRESHOLD = 4; // fewer than 4 remaining = amber
  const getDateAvailabilityClass = (d: Date): "open" | "limited" | "closed" => {
    const dateStr = format(d, "yyyy-MM-dd");
    if (!availableDateStrings.has(dateStr)) return "closed";

    const dateOverride = availableDates.find(ad => ad.available_date === dateStr);
    const startH = dateOverride?.start_hour ?? settings?.start_hour ?? 9;
    const endH = dateOverride?.end_hour ?? settings?.end_hour ?? 17;
    const totalMinutes = (endH - startH) * 60;

    // Use effective service duration for slot sizing
    const effectiveDuration = getEffectiveDuration();
    const slotUnit = Math.max(30, effectiveDuration);

    // Booked appointment time (in minutes)
    const bookedMins = (bookedSlotsByDate[dateStr] || 0) * 30;
    // Actual travel buffer from per-mile calculation
    const travelMins = travelMinsByDate[dateStr] || 0;

    const blockedMins = (blockedSlotsByDate[dateStr] || 0) * 30;
    const holdMins = (holdSlotsByDate[dateStr] || 0) * 30;

    // Reduce available time by cutoff hours for today
    let cutoffMins = 0;
    const now = new Date();
    if (format(now, "yyyy-MM-dd") === dateStr) {
      const cutoffHours = settings?.booking_cutoff_hours ?? 14;
      const cutoffUntilMins = now.getHours() * 60 + now.getMinutes() + cutoffHours * 60;
      const dayStartMins = startH * 60;
      if (cutoffUntilMins > dayStartMins) {
        cutoffMins = Math.min(cutoffUntilMins - dayStartMins, totalMinutes);
      }
    }

    const usedMinutes = bookedMins + travelMins + blockedMins + holdMins + cutoffMins;
    const remainingMinutes = Math.max(0, totalMinutes - usedMinutes);
    const remainingSlots = Math.floor(remainingMinutes / slotUnit);

    if (remainingSlots <= 0) return "closed";
    if (remainingSlots < LIMITED_SLOTS_THRESHOLD) return "limited";
    return "open";
  };

  const openDates = availableDates
    .map(ad => new Date(ad.available_date + "T00:00:00"))
    .filter(d => !isBefore(d, startOfDay(new Date())) && getDateAvailabilityClass(d) === "open");

  const limitedDates = availableDates
    .map(ad => new Date(ad.available_date + "T00:00:00"))
    .filter(d => !isBefore(d, startOfDay(new Date())) && getDateAvailabilityClass(d) === "limited");

  // Fully booked dates: open days with no remaining slots
  const fullyBookedDatesArray = availableDates
    .map(ad => new Date(ad.available_date + "T00:00:00"))
    .filter(d => !isBefore(d, startOfDay(new Date())) && getDateAvailabilityClass(d) === "closed");

  // Closed dates: future dates not marked open in availability settings
  const unavailableDatesArray: Date[] = [];
  for (let i = 0; i <= 90; i++) {
    const d = addDays(startOfDay(new Date()), i);
    const dateStr = format(d, "yyyy-MM-dd");
    if (!availableDateStrings.has(dateStr)) {
      unavailableDatesArray.push(d);
    }
  }

  const isDateDisabled = (d: Date) => {
    // Only disable past dates - closed days stay clickable
    return isBefore(d, startOfDay(new Date()));
  };

  // closedDayMessage state moved to top-level hooks

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) return;
    const dateStr = format(d, "yyyy-MM-dd");
    if (!availableDateStrings.has(dateStr)) {
      // Closed day - show message
      setClosedDayMessage(`Unfortunately we are closed on ${format(d, "EEEE d MMMM")} and unable to take bookings. Please choose an available date.`);
      return;
    }
    const avail = getDateAvailabilityClass(d);
    if (avail === "closed") {
      setClosedDayMessage(`Unfortunately we are fully booked on ${format(d, "EEEE d MMMM")}. Please choose another date.`);
      return;
    }
    setClosedDayMessage(null);
    setDate(d);
    setStep(6);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !settings) return;
    // Update hold with contact info before submitting
    await updateHoldContactInfo();
    setLoading(true);

    const duration = getEffectiveDuration();

    // Server-side overlap check
    const { data: hasOverlap } = await supabase.rpc("check_appointment_overlap", {
      p_date: format(date, "yyyy-MM-dd"),
      p_time: time,
      p_duration_minutes: duration,
      p_buffer_minutes: 0, // We handle buffers dynamically now
    });

    if (hasOverlap) {
      toast.error("Sorry, this time slot is no longer available. Please choose another time.");
      setTime(undefined);
      setStep(7);
      setLoading(false);
      return;
    }

    const fullNotes = [
      notes.trim(),
      directions.trim() ? `Directions: ${directions.trim()}` : "",
      referralSource
        ? `Heard about us: ${referralSource === "other" && referralSourceOther.trim() ? `Other — ${referralSourceOther.trim()}` : referralSource}`
        : "",
      isCryoService && priceAgreed && agreedPrice ? `Agreed price: £${agreedPrice}` : "",
      isCryoService && !priceAgreed ? "Price not yet agreed — quote needed" : "",
      bookingFor === "other" && bookerName.trim() ? `Booked by: ${bookerName.trim()}${bookerRelation.trim() ? ` (${bookerRelation.trim()})` : ""}` : "",
      isMultiple && additionalPeople.filter(p => p.name.trim()).length > 0
        ? `Additional attendees: ${additionalPeople.filter(p => p.name.trim()).map(p => `${p.name.trim()} (${p.email.trim()})${p.phone.trim() ? ` Tel: ${p.phone.trim()}` : ""}${p.dob.trim() ? ` DOB: ${p.dob.trim()}` : ""}`).join(", ")}`
        : "",
      isMultiple ? `⏱ Extended appointment: ${getEffectiveDuration()} mins (multiple people)` : "",
      travelFee > 0 ? `🚗 Travel fee: £${travelFee.toFixed(2)} (${travelDistance} miles)` : "",
    ].filter(Boolean).join("\n");

    const basePrice = isCryoService
      ? (priceAgreed && agreedPrice ? parseFloat(agreedPrice) : null)
      : earwaxGroupPrice != null
        ? earwaxGroupPrice
        : (selectedService?.price ?? null);
    const totalPrice = basePrice != null ? basePrice + travelFee : null;

    const generatedToken = crypto.randomUUID();
    const groupId = isMultiple && additionalPeople.length > 0 ? crypto.randomUUID() : null;

    const effectiveDuration = getEffectiveDuration();
    // Generate unique placeholder email for no-email patients
    const submissionEmail = hasNoEmail
      ? `noemail.${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}.${crypto.randomUUID().slice(0, 8)}@noemail.co.uk`
      : email.trim();

    const { error } = await supabase.from("appointments").insert({
      client_name: name.trim(),
      client_email: submissionEmail,
      client_phone: phone.trim() || null,
      appointment_date: format(date, "yyyy-MM-dd"),
      appointment_time: time,
      notes: fullNotes || null,
      address: comeToMe ? "22 St Martins Close, Broadmayne, DT2 8DG" : (address.trim() || null),
      postcode: comeToMe ? "DT2 8DG" : (postcode.trim().toUpperCase() || null),
      service_id: selectedService?.id || null,
      price: totalPrice,
      status: "requested",
      latitude: comeToMe ? 50.6937 : latitude,
      longitude: comeToMe ? -2.3982 : longitude,
      access_token: generatedToken,
      travel_fee: comeToMe ? 0 : (travelFee > 0 ? travelFee : 0),
      travel_distance_miles: comeToMe ? 0 : travelDistance,
      group_id: groupId,
      locality: comeToMe ? "Broadmayne" : (locality || null),
      duration_minutes: groupId ? effectiveDuration : null,
      come_to_practitioner: comeToMe,
      media_consent: mediaConsent,
    } as any);

    // Create linked appointments for additional people with staggered times
    if (!error && groupId && additionalPeople.length > 0) {
      // Calculate per-person durations for staggering
      const getPersonDuration = (personIdx: number): number => {
        // personIdx 0 = primary person, 1+ = additional people
        if (personIdx === 0) {
          return selectedService?.duration_minutes || settings?.appointment_duration_minutes || 60;
        }
        // Extra person duration depends on service type
        const svc = sameServiceForAll ? selectedService : personServices[personIdx];
        if (!svc) return 30; // fallback
        const sName = svc.name.toLowerCase();
        if (sName.includes("earwax") || sName.includes("ear wax")) return 30;
        if (sName.includes("cryotherapy")) return 15;
        if (sName.includes("wellness")) return 15;
        if (sName.includes("foot")) return svc.duration_minutes || 60;
        return 30; // default extra person duration
      };

      // Helper to add minutes to a HH:MM time string
      const addMinutesToTime = (timeStr: string, minutes: number): string => {
        const [h, m] = timeStr.split(":").map(Number);
        const totalMins = h * 60 + m + minutes;
        const newH = Math.floor(totalMins / 60) % 24;
        const newM = totalMins % 60;
        return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
      };

      // Accumulate offset: primary person's duration is the first offset
      let cumulativeOffset = getPersonDuration(0);

      for (let pi = 0; pi < additionalPeople.length; pi++) {
        const person = additionalPeople[pi];
        if (!person.name.trim() || !person.email.trim()) continue;
        const personToken = crypto.randomUUID();
        const staggeredTime = addMinutesToTime(time, cumulativeOffset);
        const memberService = sameServiceForAll ? selectedService : personServices[pi + 1];
        const { error: memberErr } = await supabase.from("appointments").insert({
          client_name: person.name.trim(),
          client_email: person.email.trim(),
          client_phone: person.phone.trim() || null,
          appointment_date: format(date, "yyyy-MM-dd"),
          appointment_time: staggeredTime,
          notes: `Part of group booking with ${name.trim()}`,
          address: comeToMe ? "22 St Martins Close, Broadmayne, DT2 8DG" : (address.trim() || null),
          postcode: comeToMe ? "DT2 8DG" : (postcode.trim().toUpperCase() || null),
          service_id: memberService?.id || selectedService?.id || null,
          price: sameServiceForAll ? 0 : (memberService?.price ?? selectedService?.price ?? null),
          status: "requested",
          latitude: comeToMe ? 50.6937 : latitude,
          longitude: comeToMe ? -2.3982 : longitude,
          access_token: personToken,
          travel_fee: 0,
          travel_distance_miles: comeToMe ? 0 : null,
          group_id: groupId,
          locality: comeToMe ? "Broadmayne" : (locality || null),
          come_to_practitioner: comeToMe,
        } as any);
        if (memberErr) {
          console.error(`Failed to create group member appointment for ${person.name}:`, memberErr);
        }
        // Add this person's duration to the cumulative offset
        cumulativeOffset += getPersonDuration(pi + 1);
      }
    }

    if (error) {
      toast.error("Failed to book appointment. Please try again.");
    } else {
      // Release the hold on successful booking
      await releaseHold();
      let isoDob: string | null = null;
      if (dateOfBirth && dateOfBirth.length === 10) {
        const [dd, mm, yyyy] = dateOfBirth.split("/");
        if (dd && mm && yyyy) isoDob = `${yyyy}-${mm}-${dd}`;
      }

      const patientEmail = submissionEmail.toLowerCase();
      const patientName = name.trim();
      // Use secure RPC that validates the booking access token
      try {
        await supabase.rpc("upsert_patient_from_booking" as any, {
          p_access_token: generatedToken,
          p_client_name: patientName,
          p_client_email: patientEmail,
          p_client_phone: phone.trim() || null,
          p_address: address.trim() || null,
          p_date_of_birth: isoDob,
          p_marketing_email: marketingEmail,
          p_marketing_sms: marketingSms,
        });
      } catch (e) {
        console.error("upsert_patient_from_booking error:", e);
      }

      // Create patient records for additional group members
      if (isMultiple && additionalPeople.length > 0) {
        for (const person of additionalPeople.filter(p => p.name.trim())) {
          const memberEmail = person.email.trim()
            ? person.email.trim().toLowerCase()
            : `noemail.${person.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}.${crypto.randomUUID().slice(0, 8)}@noemail.co.uk`;
          let memberDob: string | null = null;
          if (person.dob && person.dob.length === 10) {
            const [dd, mm, yyyy] = person.dob.split("/");
            if (dd && mm && yyyy) memberDob = `${yyyy}-${mm}-${dd}`;
          }
          try {
            const { data: existingMember } = await supabase
              .from("patients")
              .select("id")
              .eq("client_email", memberEmail)
              .ilike("client_name", person.name.trim())
              .maybeSingle();
            if (existingMember) {
              const updatePayload: any = {};
              if (memberDob) updatePayload.date_of_birth = memberDob;
              if (person.phone.trim()) updatePayload.client_phone = person.phone.trim();
              if (address.trim()) updatePayload.address = address.trim();
              if (Object.keys(updatePayload).length > 0) {
                await supabase.from("patients").update(updatePayload).eq("id", existingMember.id);
              }
            } else {
              const { error: insertErr } = await supabase.from("patients").insert({
                client_name: person.name.trim(),
                client_email: memberEmail,
                client_phone: person.phone.trim() || null,
                address: address.trim() || null,
                date_of_birth: memberDob,
              });
              if (insertErr) console.error(`Failed to create patient record for ${person.name}:`, insertErr);
            }
          } catch (e) {
            console.error(`Error creating patient record for ${person.name}:`, e);
          }
        }
      }

      // Log all booking agreements as evidence
      const agreementLogs = [
        {
          client_email: email.trim().toLowerCase(),
          event_type: "policy_agreement",
          message: "✅ Agreed to Privacy Policy at booking — confirmed personal data handling per ShawScope privacy policy",
          created_by: "patient",
        },
        {
          client_email: email.trim().toLowerCase(),
          event_type: "policy_agreement",
          message: "✅ Agreed to Cancellation Policy at booking — 24-hour notice required, 50% late cancellation fee acknowledged",
          created_by: "patient",
        },
      ];
      if (needsFollowUpAwareness && earwaxFollowUpAgreed) {
        agreementLogs.push({
          client_email: email.trim().toLowerCase(),
          event_type: "policy_agreement",
          message: `✅ Agreed to Follow-Up & No Wax Awareness at booking for ${selectedService?.name} — understands follow-up may be required at £35 within 4 weeks, and that a no-wax visit becomes a £30 wellness appointment (optional hearing screen included)`,
          created_by: "patient",
        });
      }
      if (marketingEmail) {
        agreementLogs.push({
          client_email: email.trim().toLowerCase(),
          event_type: "marketing_consent",
          message: "✅ Opted in to email marketing at booking",
          created_by: "patient",
        });
      }
      if (marketingSms) {
        agreementLogs.push({
          client_email: email.trim().toLowerCase(),
          event_type: "marketing_consent",
          message: "✅ Opted in to SMS marketing at booking",
          created_by: "patient",
        });
      }
      if (mediaConsent) {
        agreementLogs.push({
          client_email: email.trim().toLowerCase(),
          event_type: "policy_agreement",
          message: "✅ Agreed to Photo/Video Consent at booking — happy to be photographed/filmed during the appointment for use on social media or website (faces can be hidden on request; consent can be withdrawn at any time)",
          created_by: "patient",
        });
      }
      await supabase.from("patient_activity_log").insert(agreementLogs);

      setCreatedAccessToken(generatedToken);
      setHasConsentForm(!!selectedService?.consent_form_template_id);
      setSubmitted(true);
      // Google Ads conversion tracking
      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("event", "ads_conversion_Book_appointment_1", {});
      }
      if (typeof (window as any).gtag_report_conversion === "function") {
        (window as any).gtag_report_conversion();
      }
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      toast.success("Booking request completed!");
      supabase.functions.invoke("send-notification", {
        body: {
          accessToken: generatedToken,
          type: "new_request",
          consentDelivery: selectedService?.consent_form_template_id ? consentDelivery : null,
          additionalAttendees: isMultiple
            ? additionalPeople.filter(p => p.name.trim() && p.email.trim()).map(p => ({
                name: p.name.trim(),
                email: p.email.trim(),
                phone: p.phone.trim() || null,
                dob: p.dob.trim() || null,
              }))
            : undefined,
        },
      });

      // Cryotherapy: attach uploaded photos to the patient record + alert admin if no price agreed yet
      if (isCryoService && cryoPhotos.length > 0) {
        try {
          const toBase64 = (file: File): Promise<string> =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(",")[1]);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          const attachments = await Promise.all(
            cryoPhotos.map(async (p) => ({
              filename: p.file.name,
              content: await toBase64(p.file),
              type: p.file.type,
              description: priceAgreed ? "Lesion photo (booking)" : "Lesion photo — quote needed",
            }))
          );
          supabase.functions.invoke("cryo-request", {
            body: {
              name: name.trim(),
              email: patientEmail,
              treatmentDescription: priceAgreed
                ? `📷 Lesion photos attached to existing booking — price agreed at £${agreedPrice}.`
                : `⚠️ NO PRICE AGREED at booking — please review attached photos and reply to patient with a quote.\nPhone: ${phone.trim() || "—"}\nEmail: ${patientEmail}`,
              attachments,
              accessToken: generatedToken,
            },
          });
        } catch (e) {
          console.error("Failed to forward cryo photos:", e);
        }
      }
      if (mediaConsent) {
        supabase.functions.invoke("media-consent-notify", {
          body: {
            client_name: name.trim(),
            client_email: submissionEmail,
            client_phone: phone.trim() || null,
            appointment_date: format(date, "yyyy-MM-dd"),
            appointment_time: time,
            service_name: selectedService?.name || null,
          },
        });
      }
    }
    setLoading(false);
  };

  const totalSteps = 7;

  if (submitted) {
    const isEarwax = selectedService?.name.toLowerCase().includes("earwax") || selectedService?.name.toLowerCase().includes("ear wax");
    const consentUrl = createdAccessToken ? `/consent/${createdAccessToken}` : null;

    return (
      <div className="booking-portal flex min-h-screen flex-col bg-background">
        <header className="bg-surface-dark">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Link to="/" className="font-serif text-lg tracking-wide text-primary-foreground uppercase">ShawScope</Link>
          </div>
        </header>
        <div className="flex-1 py-8 px-4">
          <div className="max-w-md mx-auto space-y-4">
            {/* Success header */}
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h1 className="font-serif text-2xl mb-1">Booking Request Sent!</h1>
              <p className="text-sm text-muted-foreground">{selectedService?.name}</p>
              <p className="text-base font-semibold mt-1">
                {date && format(date, "EEE, MMMM d, yyyy")} at {time && time.slice(0, 5)}
              </p>
            </motion.div>

            {/* Price summary tile */}
            {selectedService && !isCryoService && selectedService.price != null && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <PoundSterling className="h-4 w-4 text-primary" />
                  <span className="font-serif text-sm font-semibold">Price Summary</span>
                </div>
                <div className="space-y-1 text-xs">
                  {earwaxGroupPrice != null ? (
                    <>
                      <div className="flex justify-between"><span>Two-Person Earwax Removal</span><span>£{earwaxGroupPrice.toFixed(2)}</span></div>
                      {Number(selectedService.price) * 2 > earwaxGroupPrice && (
                        <div className="flex justify-between text-success"><span>Discount</span><span>−£{(Number(selectedService.price) * 2 - earwaxGroupPrice).toFixed(2)}</span></div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between"><span>{selectedService.name}</span><span>£{Number(selectedService.price).toFixed(2)}</span></div>
                  )}
                  {travelFee > 0 && (
                    <div className="flex justify-between text-muted-foreground"><span>Travel fee ({travelDistance} mi)</span><span>£{travelFee.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between font-semibold pt-1 border-t border-border/50"><span>Total</span><span>£{((earwaxGroupPrice ?? Number(selectedService.price)) + travelFee).toFixed(2)}</span></div>
                </div>
              </motion.div>
            )}
            {isCryoService && priceAgreed && agreedPrice && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <PoundSterling className="h-4 w-4 text-primary" />
                  <span className="font-serif text-sm font-semibold">Price Summary</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>Agreed price</span><span>£{parseFloat(agreedPrice).toFixed(2)}</span></div>
                  {travelFee > 0 && (
                    <div className="flex justify-between text-muted-foreground"><span>Travel fee ({travelDistance} mi)</span><span>£{travelFee.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between font-semibold pt-1 border-t border-border/50"><span>Total</span><span>£{(parseFloat(agreedPrice) + travelFee).toFixed(2)}</span></div>
                </div>
              </motion.div>
            )}

            <PaymentMethodsBadge compact className="mx-auto" />

            {/* Check junk - moved up as priority notice */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
              {consentDelivery === "in_person" && hasConsentForm ? (
                <ClipboardList className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              ) : consentDelivery === "sms" && hasConsentForm ? (
                <MessageSquare className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              ) : (
                <Mail className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              )}
              <div>
                {consentDelivery === "in_person" && hasConsentForm ? (
                  <>
                    <span className="font-serif text-sm font-semibold">📋 Paper Consent Form on the Day</span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      No problem — Matt has been notified and will bring a <strong>paper consent form</strong> to complete with you at your appointment. You'll still receive a <strong>confirmation email</strong> shortly (check junk/spam).
                    </p>
                  </>
                ) : consentDelivery === "sms" && hasConsentForm ? (
                  <>
                    <span className="font-serif text-sm font-semibold">📲 Check Your Text Messages</span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Your <strong>consent form link</strong> has been sent by SMS to your mobile. You'll also receive a <strong>confirmation email</strong> shortly — please check your junk/spam folder if you don't see it.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="font-serif text-sm font-semibold">📬 Check Your Junk/Spam Folder Today</span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      You'll receive a <strong>confirmation email</strong>{hasConsentForm ? " along with your <strong>consent form link</strong>" : ""} shortly. Please check your junk or spam folder if you don't see it — especially today.
                    </p>
                  </>
                )}
              </div>
            </motion.div>

            {/* What happens next */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-xl border bg-card p-4 flex items-start gap-3">
              <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <span className="font-serif text-sm font-semibold">What Happens Next?</span>
                <p className="text-xs text-muted-foreground mt-0.5">We'll review your request and confirm shortly via email.</p>
              </div>
            </motion.div>

            {/* Consent form */}
            {hasConsentForm && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 flex items-start gap-3">
                <FileText className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <span className="font-serif text-sm font-semibold">Consent Form Required</span>
                  <span className="text-[10px] font-semibold text-destructive flex items-center gap-0.5 mt-0.5">
                    <AlertTriangle className="h-3 w-3" /> Action needed before your appointment
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {consentDelivery === "in_person"
                      ? <>Matt will bring a <strong>paper consent form</strong> to complete at your appointment.</>
                      : <>Your consent form link is on its way by <strong>{consentDelivery === "sms" ? "text message" : "email"}</strong>.</>}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Earwax olive oil */}
            {isEarwax && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-start gap-3 mb-2">
                  <Droplets className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <span className="font-serif text-sm font-semibold">Start Using Olive Oil Drops</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                  Use <strong>olive oil ear drops 2–3 times daily</strong> as soon as possible to soften wax.
                </p>
                <div className="rounded-lg bg-warning/10 p-2.5 space-y-1 text-xs text-muted-foreground">
                  <p className="font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-warning" /> Do NOT use drops if:</p>
                  <p>🩹 Perforated eardrum · 👨‍⚕️ Advised otherwise · 🔴 Active infection</p>
                </div>
              </motion.div>
            )}

            {/* Agreements confirmed summary */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="h-4 w-4 text-success shrink-0" />
                <span className="font-serif text-sm font-semibold">Your Agreements</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                  <span>Privacy Policy agreed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                  <span>Cancellation Policy agreed (24h notice)</span>
                </div>
                {(isEarwax || selectedService?.name.toLowerCase().includes("hearing") || selectedService?.name.toLowerCase().includes("wellness")) && earwaxFollowUpAgreed && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                    <span>Follow-up awareness & pricing confirmed</span>
                  </div>
                )}
                {marketingEmail && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                    <span>Email marketing opted in</span>
                  </div>
                )}
                {marketingSms && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                    <span>SMS marketing opted in</span>
                  </div>
                )}
              </div>
            </motion.div>

            <div className="pt-2 text-center">
              <Link to="/">
                <Button variant="outline" className="w-full">Back to ShawScope</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const timeSlots = generateTimeSlots();

  return (
    <div className="booking-portal flex min-h-screen flex-col bg-background">
      <PageMeta
        title="Book a Home Visit — Earwax Removal & Cryotherapy Dorset"
        description="Book your earwax removal or cryotherapy home visit online. Covering Dorchester, Weymouth, Portland and surrounding Dorset villages. Easy scheduling, instant confirmation."
        path="/book"
      />
      {/* Dark header */}
      <header className="bg-surface-dark">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-serif text-lg tracking-wide text-primary-foreground uppercase">ShawScope</Link>
           <div className="flex items-center gap-3">
            {/* Mobile: compact progress */}
            <div className="flex sm:hidden items-center gap-2">
              <span className="text-xs font-semibold text-primary-foreground">{step}/{totalSteps}</span>
              <div className="w-20 h-1.5 rounded-full bg-primary-foreground/20 overflow-hidden">
                <div className="h-full rounded-full bg-secondary transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }} />
              </div>
            </div>
            {/* Desktop: numbered circles */}
            <div className="hidden sm:flex items-center gap-1.5">
              {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <div className={cn("h-px w-5", step > i ? "bg-secondary" : "bg-primary-foreground/20")} />}
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  step > i
                    ? "bg-secondary text-secondary-foreground"
                    : step === i + 1
                      ? "bg-primary-foreground text-surface-dark"
                      : "bg-primary-foreground/20 text-primary-foreground/50"
                )}>
                  {i + 1}
                </div>
              </div>
            ))}
            </div>
            <button
              onClick={() => setCancelDialogOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/90 text-destructive-foreground hover:bg-destructive transition-colors"
              title="Cancel Booking"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-surface-dark/95 py-3 text-center">
        <p className="text-xs tracking-widest text-primary-foreground/60 uppercase">
          {step === 1 && "How many people?"}
          {step === 2 && "Select your service"}
          {step === 3 && (comeToMe ? "Visit us" : "Enter your postcode")}
          {step === 4 && "Who's attending?"}
          {step === 5 && "Choose a date"}
          {step === 6 && "Pick your time"}
          {step === 7 && "Address & agreements"}
        </p>
      </div>

      <div className="container mx-auto flex-1 max-w-2xl px-4 py-10 pb-24 sm:pb-10">
        <AnimatePresence mode="wait">
          {/* STEP 1: How Many People? */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <NoticeBanner variant="booking" />
              <h2 className="mb-1 font-serif text-2xl text-foreground">How Many People?</h2>
              <p className="mb-6 text-sm text-muted-foreground">Select how many people will be attending this appointment</p>

              <Card className="border-0 shadow-lg">
                <CardContent className="py-6 space-y-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We understand that sometimes it's easier to book together — whether it's a partner, family member, or friend.
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(count => {
                      const selectedCount = isMultiple ? additionalPeople.length + 1 : 1;
                      const isSelected = selectedCount === count;

                      const handleSelectCount = (c: number) => {
                        if (c === 1) {
                          setIsMultiple(false);
                          setAdditionalPeople([]);
                        } else {
                          setIsMultiple(true);
                          const needed = c - 1;
                          setAdditionalPeople(prev => {
                            if (prev.length === needed) return prev;
                            if (prev.length > needed) return prev.slice(0, needed);
                            return [...prev, ...Array.from({ length: needed - prev.length }, () => ({ name: "", email: "", phone: "", dob: "" }))];
                          });
                        }
                        // Reset per-person services when count changes
                        setPersonServices({});
                        setSameServiceForAll(true);
                        setSelectedService(null);
                      };

                      return (
                        <motion.button
                          key={count}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSelectCount(count)}
                          className={cn(
                            "relative flex flex-col items-center rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                              : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                          )}
                        >
                          <div className="flex items-end justify-center gap-0.5 mb-2 mt-1">
                            {Array.from({ length: count }).map((_, i) => (
                              <svg key={i} viewBox="0 0 24 32" className={cn("transition-colors", isSelected ? "text-primary" : "text-muted-foreground/60", count === 1 ? "w-8 h-10" : count === 2 ? "w-7 h-9" : "w-6 h-8")} fill="currentColor">
                                <circle cx="12" cy="8" r="6" />
                                <path d="M2 28c0-5.523 4.477-10 10-10s10 4.477 10 10v2H2v-2z" />
                              </svg>
                            ))}
                          </div>
                          <span className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                            {count === 1 ? "Just Me" : `${count} People`}
                          </span>
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 rounded-full bg-primary p-0.5">
                              <CheckCircle className="h-4 w-4 text-primary-foreground" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* More than 3 notice */}
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
                    <UserPlus className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Need to book for <strong>more than 3 people</strong>? Please{" "}
                      <Link to="/contact" className="text-primary underline underline-offset-2 hover:text-primary/80">
                        contact us directly
                      </Link>{" "}
                      so we can arrange the best time for your group.
                    </p>
                  </div>

                  {/* Different services toggle for multiple people */}
                  {isMultiple && (
                    <div className="rounded-xl border-2 border-secondary/20 bg-secondary/5 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">Different services per person?</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Enable if each person needs a different service</p>
                        </div>
                        <Checkbox
                          checked={!sameServiceForAll}
                          onCheckedChange={(v) => {
                            setSameServiceForAll(!v);
                            if (v) {
                              setSelectedService(null);
                              setPersonServices({});
                            } else {
                              // When switching back to same, use person 0's service
                              const p0 = personServices[0];
                              if (p0) setSelectedService(p0);
                              setPersonServices({});
                            }
                          }}
                          className="h-5 w-5"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full h-12 text-base bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
                    onClick={() => setStep(2)}
                  >
                    Continue to Choose a Service
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: Select Service */}
          {step === 2 && !cryoIntakeOpen && (
            <motion.div key="step2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="mb-6 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="font-serif text-2xl">Choose a Service</h2>
                  <p className="text-sm text-muted-foreground">
                    {!sameServiceForAll && isMultiple
                      ? "Select a service for each person"
                      : "Select the service you'd like to book"}
                  </p>
                </div>
              </div>

              {/* Same service for all / single person */}
              {(sameServiceForAll || !isMultiple) && (
                <div className="grid grid-cols-1 gap-2">
                  {services.map((service) => {
                    const isComingSoon = service.status === 'coming_soon';
                    const isCryo = service.name.toLowerCase().includes("cryotherapy");
                    const isEar = service.name.toLowerCase().includes("earwax") || service.name.toLowerCase().includes("ear wax");
                    const peopleCount = isMultiple ? additionalPeople.length + 1 : 1;

                    const getGroupPrice = () => {
                      if (isCryo) return "Price TBC";
                      if (!service.price) return null;
                      if (peopleCount === 1) return `£${Number(service.price).toFixed(2)}`;
                      if (isEar) {
                        const earPrices: Record<number, number> = {};
                        const wordToNum: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };
                        for (const o of pricingOffers.filter((x) => x.service_id === service.id)) {
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
                          if (pm) earPrices[cnt] = parseFloat(pm[1]);
                        }
                        return `£${(earPrices[peopleCount] ?? Number(service.price) * peopleCount).toFixed(2)}`;
                      }
                      return `£${(Number(service.price) * peopleCount).toFixed(2)}`;
                    };

                    const isSelected = selectedService?.id === service.id;
                    const expanded = expandedServiceId === service.id;

                    const isFoot = service.name.toLowerCase().includes("foot") || service.name.toLowerCase().includes("podiat");
                    const defaultIcon = isEar ? <Ear className="h-6 w-6" /> 
                      : isCryo ? <Snowflake className="h-6 w-6" /> 
                      : isFoot ? <Footprints className="h-6 w-6" />
                      : <Stethoscope className="h-6 w-6" />;

                    return (
                      <motion.button
                        key={service.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          if (isComingSoon) {
                            setWaitlistServiceName(service.name);
                            setWaitlistServiceId(service.id);
                            setWaitlistOpen(true);
                            return;
                          }
                          setSelectedService(service);
                          setPersonServices({ 0: service });
                          if (isMultiple) {
                            const ps: Record<number, Service | null> = { 0: service };
                            for (let i = 1; i <= additionalPeople.length; i++) ps[i] = service;
                            setPersonServices(ps);
                          }
                          // For cryotherapy, branch to a dedicated photo + quote intake screen first
                          if (service.name.toLowerCase().includes("cryotherapy")) {
                            setCryoIntakeOpen(true);
                            setCryoIntakeAnswered(null);
                            setCryoQuoteSent(false);
                          } else {
                            setStep(3);
                          }
                        }}
                        className={cn(
                          "relative flex items-center gap-3 rounded-xl border-2 p-3 transition-all duration-200 cursor-pointer text-left w-full",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                            : "border-border bg-card hover:border-primary/40 hover:shadow-sm",
                          isComingSoon && "opacity-80"
                        )}
                      >
                        {/* Icon */}
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/40",
                          isSelected && "bg-primary/10"
                        )}>
                        <div className={cn("text-muted-foreground/60", isSelected && "text-primary")}>
                            {React.cloneElement(defaultIcon, { className: "h-5 w-5" })}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-semibold text-sm leading-tight transition-colors",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {service.name}
                          </h3>

                          {isComingSoon ? (
                            <span className="text-[10px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-full font-medium">Coming Soon</span>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {getGroupPrice()} · {service.duration_minutes} min{peopleCount > 1 ? " pp" : ""}
                              {isEar && peopleCount >= 2 && (() => {
                                // Only show savings if a matching active group offer exists
                                const wordToNum: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };
                                const hasGroupOffer = pricingOffers.some((o) => {
                                  if (o.service_id !== service.id) return false;
                                  const name = (o.offer_name || "").toLowerCase();
                                  if (!/discount|person/.test(name)) return false;
                                  if (/no\s*wax|no-wax/.test(name)) return false;
                                  const d = name.match(/(\d+)\s*(?:person|people|pax)/);
                                  let cnt: number | null = d ? parseInt(d[1], 10) : null;
                                  if (!cnt) for (const [w, n] of Object.entries(wordToNum)) {
                                    if (new RegExp(`\\b${w}\\b`).test(name)) { cnt = n; break; }
                                  }
                                  return cnt === peopleCount;
                                });
                                if (!hasGroupOffer) return null;
                                const saving = peopleCount === 2 ? 20 : peopleCount === 3 ? 30 : null;
                                return saving ? <span className="text-green-600 ml-1 font-medium">Save £{saving}</span> : null;
                              })()}
                            </p>
                          )}

                          {expanded && service.description && (
                            <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{service.description}</p>
                          )}
                        </div>

                        {/* Right side: info toggle + check */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          {!isComingSoon && service.description && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setExpandedServiceId(expanded ? null : service.id); }}
                              className="text-[10px] text-primary underline underline-offset-2"
                            >
                              {expanded ? "Less" : "Info"}
                            </button>
                          )}
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <CheckCircle className="h-5 w-5 text-primary" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Different service per person */}
              {!sameServiceForAll && isMultiple && (() => {
                const peopleCount = 1 + additionalPeople.length;
                const allSelected = Array.from({ length: peopleCount }).every((_, i) => personServices[i] != null);

                return (
                  <div className="space-y-6">
                    {Array.from({ length: peopleCount }).map((_, personIdx) => {
                      const personName = personIdx === 0 ? (name || "Person 1") : (additionalPeople[personIdx - 1]?.name || `Person ${personIdx + 1}`);
                      const currentService = personServices[personIdx];

                      return (
                        <div key={personIdx} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <svg viewBox="0 0 24 32" className="w-4 h-5 text-primary" fill="currentColor">
                                <circle cx="12" cy="8" r="6" />
                                <path d="M2 28c0-5.523 4.477-10 10-10s10 4.477 10 10v2H2v-2z" />
                              </svg>
                            </div>
                            <p className="font-serif text-base font-semibold">{personName}</p>
                            {currentService && <span className="text-xs text-muted-foreground">— {currentService.name}</span>}
                          </div>
                          <div className="space-y-2 pl-10">
                            {services.filter(s => s.status !== 'coming_soon').map(service => {
                              const isCryo = service.name.toLowerCase().includes("cryotherapy");
                              return (
                                <button
                                  key={service.id}
                                  onClick={() => {
                                    setPersonServices(prev => ({ ...prev, [personIdx]: service }));
                                    if (personIdx === 0) setSelectedService(service);
                                    
                                  }}
                                  className={cn(
                                    "w-full rounded-lg border-2 p-3 text-left text-sm transition-all hover:border-secondary",
                                    currentService?.id === service.id ? "border-secondary bg-secondary/5" : "border-border"
                                  )}
                                >
                                  <div className="flex justify-between">
                                    <span className="font-medium">{service.name}</span>
                                    <span className="text-muted-foreground">{isCryo ? "TBC" : service.price ? `£${Number(service.price).toFixed(2)}` : ""} · {service.duration_minutes}min</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {allSelected && (
                      <Button
                        className="w-full h-12 text-base bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
                        onClick={() => {
                          if (!selectedService && personServices[0]) setSelectedService(personServices[0]);
                          setStep(3);
                        }}
                      >
                        Continue
                      </Button>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* CRYOTHERAPY INTAKE: Photo + Price/Quote (after picking cryotherapy service) */}
          {step === 2 && cryoIntakeOpen && (
            <motion.div key="cryo-intake" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="mb-6 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setCryoIntakeOpen(false);
                    setCryoIntakeAnswered(null);
                    setCryoQuoteSent(false);
                    setSelectedService(null);
                  }}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="font-serif text-2xl">Cryotherapy — Photo & Quote</h2>
                  <p className="text-sm text-muted-foreground">A photo helps us confirm a fair price before you book.</p>
                </div>
              </div>

              {cryoQuoteSent ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="py-10 text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                      <CheckCircle className="h-7 w-7 text-success" />
                    </div>
                    <h3 className="font-serif text-xl">Quote Request Sent</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Thanks! Matt will review your photos and get back to you shortly with a price. Once you have a quote, you can return and complete your booking.
                    </p>
                    <Button variant="outline" onClick={() => { setCryoIntakeOpen(false); setSelectedService(null); setStep(2); }}>
                      Back to Services
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Photo upload tile */}
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
                        <Camera className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">Upload Photo(s) of the Lesion</h3>
                        <p className="text-xs text-muted-foreground">Clear, well-lit close-ups work best.</p>
                      </div>
                    </div>
                    <input ref={cryoFileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                      if (e.target.files) {
                        const newPhotos = Array.from(e.target.files).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
                        setCryoPhotos(prev => [...prev, ...newPhotos]);
                      }
                    }} />
                    <Button type="button" variant="outline" size="sm" onClick={() => cryoFileRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" /> Choose Photos
                    </Button>
                    {cryoPhotos.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {cryoPhotos.map((p, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border">
                            <img src={p.preview} alt={`Lesion ${i + 1}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => { URL.revokeObjectURL(p.preview); setCryoPhotos(prev => prev.filter((_, j) => j !== i)); }} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-destructive/80 text-destructive-foreground">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Question tile */}
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <PoundSterling className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">Has a price been agreed?</h3>
                        <p className="text-xs text-muted-foreground">If not, we'll send you a quote first.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={cryoIntakeAnswered === "yes" ? "default" : "outline"}
                        onClick={() => { setCryoIntakeAnswered("yes"); setPriceAgreed(true); }}
                      >
                        Yes, I have a quote
                      </Button>
                      <Button
                        type="button"
                        variant={cryoIntakeAnswered === "no" ? "default" : "outline"}
                        onClick={() => { setCryoIntakeAnswered("no"); setPriceAgreed(false); setAgreedPrice(""); }}
                      >
                        No, request a quote
                      </Button>
                    </div>
                  </div>

                  {/* YES branch: enter agreed price + continue */}
                  {cryoIntakeAnswered === "yes" && (
                    <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 space-y-3">
                      <Label htmlFor="cryo-agreed-price" className="text-sm font-semibold flex items-center gap-1.5">
                        <PoundSterling className="h-4 w-4 text-secondary" /> Agreed Price (£)
                      </Label>
                      <Input
                        id="cryo-agreed-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={agreedPrice}
                        onChange={(e) => setAgreedPrice(e.target.value)}
                        placeholder="e.g. 50.00"
                        className="h-11"
                      />
                      <Button
                        type="button"
                        className="w-full h-11"
                        disabled={!agreedPrice || parseFloat(agreedPrice) <= 0}
                        onClick={() => { setCryoIntakeOpen(false); setStep(3); }}
                      >
                        Continue to Booking
                      </Button>
                    </div>
                  )}

                  {/* NO branch: collect contact + send photos to admin for a quote */}
                  {cryoIntakeAnswered === "no" && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">Get Your Free Quote</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Give us a way to reach you — Matt will reply with a price. Once you have it, come back to book.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cryo-quote-email" className="text-xs">Your Email</Label>
                        <Input
                          id="cryo-quote-email"
                          type="email"
                          value={cryoQuoteContactEmail}
                          onChange={(e) => setCryoQuoteContactEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cryo-quote-phone" className="text-xs">Mobile Number</Label>
                        <Input
                          id="cryo-quote-phone"
                          type="tel"
                          value={cryoQuoteContactPhone}
                          onChange={(e) => setCryoQuoteContactPhone(e.target.value)}
                          placeholder="07…"
                          className="h-10"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">At least one of email or mobile is required.</p>
                      <div className="space-y-2">
                        <Label htmlFor="cryo-quote-notes" className="text-xs">Notes (optional)</Label>
                        <Textarea
                          id="cryo-quote-notes"
                          value={cryoQuoteNotes}
                          onChange={(e) => setCryoQuoteNotes(e.target.value)}
                          placeholder="Tell us a bit about the lesion(s)…"
                          rows={3}
                          className="text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full h-11"
                        disabled={
                          cryoQuoteSending ||
                          cryoPhotos.length === 0 ||
                          (!cryoQuoteContactEmail.trim() && !cryoQuoteContactPhone.trim())
                        }
                        onClick={async () => {
                          setCryoQuoteSending(true);
                          try {
                            const toBase64 = (file: File): Promise<string> =>
                              new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve((reader.result as string).split(",")[1]);
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                              });
                            const attachments = await Promise.all(
                              cryoPhotos.map(async (p) => ({
                                filename: p.file.name,
                                content: await toBase64(p.file),
                                type: p.file.type,
                                description: "Quote request photo",
                              }))
                            );
                            const desc = [
                              cryoQuoteNotes.trim(),
                              cryoQuoteContactPhone.trim() ? `Mobile: ${cryoQuoteContactPhone.trim()}` : "",
                              cryoQuoteContactEmail.trim() ? `Email: ${cryoQuoteContactEmail.trim()}` : "",
                            ].filter(Boolean).join("\n");
                            const { error } = await supabase.functions.invoke("cryo-request", {
                              body: {
                                name: cryoQuoteContactEmail.trim() ? cryoQuoteContactEmail.split("@")[0] : "Quote Request",
                                email: cryoQuoteContactEmail.trim() || "noemail@shawscope.co.uk",
                                treatmentDescription: `🟡 QUOTE REQUEST (no booking yet)\n${desc}`,
                                attachments,
                              },
                            });
                            if (error) throw error;
                            setCryoQuoteSent(true);
                            toast.success("Quote request sent!");
                          } catch (err: any) {
                            toast.error(err?.message || "Failed to send quote request");
                          } finally {
                            setCryoQuoteSending(false);
                          }
                        }}
                      >
                        {cryoQuoteSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        {cryoQuoteSending ? "Sending…" : "Send Photos & Request Quote"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: Enter Postcode */}
          {step === 3 && !comeToMe && (
            <motion.div key="step3-choice" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="mb-6 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="font-serif text-2xl">Where Would You Like To Be Seen?</h2>
                  <p className="text-sm text-muted-foreground">{selectedService?.name}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Home Visit option */}
                <Card className="border-2 border-secondary/40 bg-secondary/5 transition-all">
                  <CardContent className="p-0">
                    <div className="h-36 overflow-hidden rounded-t-xl">
                      <img src={shawscopeCar} alt="ShawScope mobile earwax removal car" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-secondary" />
                        <h3 className="font-serif text-lg font-semibold">Home Visit</h3>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        We come to you! Our primary service — Matt travels to your home with all professional ear care equipment. Comfortable, convenient, and no travel needed.
                      </p>

                      <div className="border-t border-secondary/20 pt-3 space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          We need your postcode to check your <strong>travel fee</strong> and calculate <strong>travel time</strong> for the best available slots.
                        </p>

                        <div className="space-y-2">
                          <Label htmlFor="booking-postcode" className="text-sm">Home Postcode *</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="booking-postcode"
                                value={postcode}
                                onChange={(e) => {
                                  const v = e.target.value.toUpperCase();
                                  setPostcode(v);
                                  setComeToMe(false);
                                  setPostcodeChecked(false);
                                  setTravelFeeAccepted(false);
                                  setOutOfArea(false);
                                }}
                                placeholder="e.g. DT4 7TJ"
                                className="pl-9 uppercase h-11"
                                maxLength={10}
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={() => checkPostcode(postcode)}
                              disabled={checkingPostcode || !postcode.trim() || !/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(postcode.trim())}
                              className="h-11"
                            >
                              {checkingPostcode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                            </Button>
                          </div>
                        </div>
                      </div>
                      {/* Results */}
                      <AnimatePresence mode="wait">
                        {postcodeChecked && withinRange && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl p-3 bg-green-950/30 border border-green-800">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-400" />
                              <div>
                                <p className="text-sm font-semibold text-green-300">No travel fee! 🎉</p>
                                <p className="text-xs text-green-400">You're {travelDistance} miles away — within our free travel area.</p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {postcodeChecked && !withinRange && !outOfArea && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl p-3 bg-amber-950/30 border border-amber-800">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-amber-300">
                                  Travel fee: £{travelFee.toFixed(2)}
                                </p>
                                <p className="text-xs text-amber-400 mt-1">
                                  You're {travelDistance} miles away — £2.50 per mile beyond 10 miles.
                                </p>
                                {selectedService && !isCryoService && selectedService.price != null && (
                                  <p className="text-sm font-semibold text-amber-300 mt-2">
                                    Total: £{(Number(selectedService.price) + travelFee).toFixed(2)} (£{Number(selectedService.price).toFixed(2)} + £{travelFee.toFixed(2)} travel)
                                  </p>
                                )}
                                <div className="mt-3">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={travelFeeAccepted ? "default" : "outline"}
                                    onClick={() => setTravelFeeAccepted(true)}
                                    className="text-xs"
                                  >
                                    {travelFeeAccepted ? "✓ Accepted" : "I accept the travel fee"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {postcodeChecked && outOfArea && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl p-3 bg-red-950/30 border border-red-800">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-red-300">
                                  Sorry, we don't currently cover your area
                                </p>
                                <p className="text-xs text-red-400 mt-1">
                                  You're {travelDistance} miles away, which is outside our service area.
                                </p>
                                <p className="text-xs text-red-400 mt-2">
                                  However, we may make exceptions! <a href="/contact" className="underline font-medium hover:text-red-300">Get in touch with us here</a> to let us know you're interested.
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {postcodeChecked && (
                        <TravelDisputeForm
                          postcode={postcode}
                          calculatedDistance={travelDistance}
                          calculatedFee={travelFee}
                        />
                      )}

                      {/* Travel time info */}
                      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
                        <Navigation className="inline h-3 w-3 mr-1" />
                        We aim to arrive on time, but please allow <strong>15 minutes either side</strong> of your booking time in case of travel disruption or if we are ahead of schedule.
                      </div>

                      {/* Continue button */}
                      {postcodeChecked && (withinRange || travelFeeAccepted) && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                          <Button
                            className="w-full h-12 text-base bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
                            onClick={() => setStep(4)}
                          >
                            Continue
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Come to Us option — hidden behind a collapsible toggle */}
                <details className="group self-start">
                  <summary className="list-none cursor-pointer rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground hover:border-secondary/50 hover:text-foreground transition-colors flex items-center justify-between gap-2">
                    <span>I really don't want a home visit</span>
                    <span className="text-secondary group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <Card className="mt-3 border-2 border-border cursor-pointer hover:border-secondary/60 hover:shadow-lg transition-all"
                    onClick={() => {
                      setComeToMe(true);
                      setPostcode("DT2 8DG");
                      setPostcodeChecked(true);
                      setWithinRange(true);
                      setTravelFee(0);
                      setTravelDistance(0);
                      setOutOfArea(false);
                      setLocality("Broadmayne");
                    }}>
                    <CardContent className="p-0">
                      <div className="h-36 overflow-hidden rounded-t-xl">
                        <img src="/images/clinic-lounge.jpg" alt="ShawScope home appointment lounge in Broadmayne" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Home className="h-5 w-5 text-secondary" />
                          <h3 className="font-serif text-lg font-semibold">Come to Us</h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Visit our home clinic in Broadmayne, Dorchester. No travel fee — available for first or last slots. Please read important information before booking.
                        </p>
                        <Button variant="outline" className="w-full mt-2" size="sm">
                          Find out more →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </details>
              </div>
            </motion.div>
          )}

          {/* Step 3 - Come to Me info & disclaimers */}
          {step === 3 && comeToMe && (
            <motion.div key="step3-cometome" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="mb-6 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => { setComeToMe(false); setPostcode(""); setPostcodeChecked(false); }} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="font-serif text-2xl">Visit Us in Broadmayne</h2>
                  <p className="text-sm text-muted-foreground">{selectedService?.name} · No travel fee</p>
                </div>
              </div>

              <Card className="border-0 shadow-lg">
                <CardContent className="py-6 space-y-5">
                  <div className="rounded-xl overflow-hidden">
                    <img src="/images/clinic-lounge.jpg" alt="ShawScope home appointment lounge" className="w-full h-48 object-cover rounded-xl" />
                  </div>

                  <div className="rounded-xl p-4 bg-green-950/30 border border-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <div>
                        <p className="text-sm font-semibold text-green-300">No travel fee!</p>
                        <p className="text-xs text-green-400">You'll be visiting us at our home clinic in Broadmayne, Dorchester.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Important — Please Read Before Booking
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Our clinic is located within our family home. We are primarily a home visiting service, so please be aware of the following:
                    </p>
                    <div className="grid gap-2">
                      {[
                        { icon: "🐱", text: "Cat in residence — not suitable if you have a cat allergy" },
                        { icon: "🪜", text: "Steps to access the property — there is no step-free access" },
                        { icon: "♿", text: "No disability or wheelchair access available" },
                        { icon: "🅿️", text: "Limited on-street parking — no dedicated parking space" },
                        { icon: "👶", text: "Baby at home — there may be occasional noise" },
                        { icon: "🏠", text: "This is our home, not a clinical-style premises — it's a relaxed, comfortable setting but not a traditional clinic" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-lg bg-amber-950/20 border border-amber-900/30 px-3 py-2">
                          <span className="text-base mt-0.5 shrink-0">{item.icon}</span>
                          <p className="text-xs text-amber-200/80 leading-relaxed">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
                    <Home className="inline h-3 w-3 mr-1" />
                    <strong>Availability:</strong> "Come to us" appointments are typically available for the first or last slot of the day. Once booked, we'll send you a text when we're ready for you — <strong>please don't arrive until you receive our message</strong>, or plan to arrive at your appointment time.
                  </div>

                  {/* Request Form */}
                  <div className="border-t border-border pt-5 space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Send className="h-4 w-4 text-secondary" />
                      Request a Clinic Visit
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Clinic visits are arranged directly with Matt. Please complete the form below and we'll contact you to schedule your appointment.
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="ctm-name" className="text-xs">Full Name *</Label>
                        <Input id="ctm-name" placeholder="Your name" value={ctmName} onChange={(e) => setCtmName(e.target.value)} className="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ctm-email" className="text-xs">Email *</Label>
                        <Input id="ctm-email" type="email" placeholder="you@example.com" value={ctmEmail} onChange={(e) => setCtmEmail(e.target.value)} className="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ctm-phone" className="text-xs">Phone Number</Label>
                        <Input id="ctm-phone" type="tel" placeholder="07xxx xxx xxx" value={ctmPhone} onChange={(e) => setCtmPhone(e.target.value)} className="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ctm-notes" className="text-xs">Anything we should know?</Label>
                        <Textarea id="ctm-notes" placeholder="e.g. preferred days, accessibility needs..." value={ctmNotes} onChange={(e) => setCtmNotes(e.target.value)} rows={3} />
                      </div>
                    </div>

                    {ctmSubmitted ? (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl p-4 bg-green-950/30 border border-green-800 text-center space-y-2">
                        <CheckCircle className="h-8 w-8 text-green-400 mx-auto" />
                        <p className="text-sm font-semibold text-green-300">Request Sent!</p>
                        <p className="text-xs text-green-400">We'll be in touch shortly to arrange your visit. Check your email for confirmation.</p>
                      </motion.div>
                    ) : (
                      <Button
                        className="w-full h-12 text-base bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
                        disabled={ctmSending || !ctmName.trim() || !ctmEmail.trim()}
                        onClick={async () => {
                          setCtmSending(true);
                          try {
                            const { error } = await supabase.functions.invoke("clinic-visit-enquiry", {
                              body: {
                                client_name: ctmName.trim(),
                                client_email: ctmEmail.trim(),
                                client_phone: ctmPhone.trim() || null,
                                service_name: selectedService?.name || null,
                                number_of_people: isMultiple ? additionalPeople.length + 1 : 1,
                                notes: ctmNotes.trim() || null,
                              },
                            });
                            if (error) throw error;
                            setCtmSubmitted(true);
                            toast.success("Request sent! We'll be in touch shortly.");
                          } catch (err) {
                            console.error(err);
                            toast.error("Failed to send request. Please try again or call us.");
                          } finally {
                            setCtmSending(false);
                          }
                        }}
                      >
                        {ctmSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        {ctmSending ? "Sending..." : "Submit Request"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: Who's Attending - Person Details */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="mb-6 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setStep(3)} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                   <h2 className="font-serif text-2xl">Who's Attending?</h2>
                   <p className="text-sm text-muted-foreground">{selectedService?.name}{isMultiple ? ` · ${additionalPeople.length + 1} people` : ""}</p>
                 </div>
              </div>

              <Card className="border-0 shadow-lg">
                <CardContent className="py-6 space-y-5">
                   {/* Booking for someone else - standalone section */}
                  <div className={cn(
                    "rounded-xl border-2 p-4 transition-all duration-200",
                    bookingFor === "other"
                      ? "border-secondary bg-secondary/5 shadow-md"
                      : "border-border bg-card"
                  )}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                        bookingFor === "other" ? "bg-secondary/20" : "bg-muted"
                      )}>
                        <UserPlus className={cn("h-4.5 w-4.5", bookingFor === "other" ? "text-secondary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Booking for someone else?</p>
                        <p className="text-xs text-muted-foreground">Tick if you're booking on behalf of a patient</p>
                      </div>
                      <Checkbox
                        checked={bookingFor === "other"}
                        onCheckedChange={(v) => setBookingFor(v ? "other" : "myself")}
                        className="h-5 w-5"
                      />
                    </div>
                    <AnimatePresence>
                      {bookingFor === "other" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 pt-2 border-t border-secondary/20">
                          <div className="space-y-1.5 pt-2">
                            <Label htmlFor="booker-name" className="text-xs">Your Name *</Label>
                            <Input id="booker-name" value={bookerName} onChange={(e) => setBookerName(e.target.value)} placeholder="Your full name" className="h-10" maxLength={100} />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="booker-relation" className="text-xs">Relationship to Patient</Label>
                            <Input id="booker-relation" value={bookerRelation} onChange={(e) => setBookerRelation(e.target.value)} placeholder="e.g. Partner, Parent, Carer..." className="h-10" maxLength={100} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Person 1 details */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-1">
                    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
                      <div className="flex flex-col items-center gap-1 pb-2 border-b border-primary/20">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <svg viewBox="0 0 24 32" className="w-5 h-6 text-primary" fill="currentColor">
                            <circle cx="12" cy="8" r="6" />
                            <path d="M2 28c0-5.523 4.477-10 10-10s10 4.477 10 10v2H2v-2z" />
                          </svg>
                        </div>
                        <p className="text-lg font-serif font-bold text-primary">Person 1</p>
                        {!isMultiple && <p className="text-xs text-muted-foreground">Your details</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs">{isMultiple ? "Person 1 Full Name" : bookingFor === "other" ? "Patient's Full Name" : "Full Name"} *</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={isMultiple ? "Person 1 full name" : bookingFor === "other" ? "Patient's full name" : "Full name"} className="h-10" maxLength={100} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs">{isMultiple ? "Person 1 Email" : bookingFor === "other" ? "Patient's Email" : "Email"} {!hasNoEmail ? "*" : ""}</Label>
                        <Input id="email" type="email" value={hasNoEmail ? "" : email} onChange={(e) => setEmail(e.target.value)} placeholder={isMultiple ? "Person 1 email" : bookingFor === "other" ? "Patient's email" : "Email address"} className="h-10" maxLength={255} disabled={hasNoEmail} />
                         <div
                          className="mt-1.5 flex items-center gap-2 cursor-pointer"
                          onClick={() => {
                            setHasNoEmail(!hasNoEmail);
                            if (!hasNoEmail) setEmail("");
                          }}
                        >
                          <Checkbox
                            checked={hasNoEmail}
                            className="h-4 w-4 border border-muted-foreground/50 bg-background data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-white"
                            onCheckedChange={(checked) => {
                              setHasNoEmail(!!checked);
                              if (checked) setEmail("");
                            }}
                          />
                          <span className="text-xs text-muted-foreground">I don't have an email address</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs">{isMultiple ? "Person 1 Phone" : bookingFor === "other" ? "Patient's Phone" : "Phone"}{hasNoEmail ? " *" : ""}</Label>
                        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={isMultiple ? "Person 1 phone" : bookingFor === "other" ? "Patient's phone number" : "Phone number"} className="h-10" maxLength={20} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dob" className="text-xs">{isMultiple ? "Person 1 Date of Birth" : bookingFor === "other" ? "Patient's Date of Birth" : "Date of Birth"} *</Label>
                        <Input
                          id="dob"
                          type="text"
                          inputMode="numeric"
                          placeholder="DD/MM/YYYY"
                          value={dateOfBirth}
                          onChange={(e) => {
                            let v = e.target.value.replace(/[^\d/]/g, "");
                            const digits = v.replace(/\//g, "");
                            if (digits.length >= 4) {
                              v = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
                            } else if (digits.length >= 2) {
                              v = digits.slice(0, 2) + "/" + digits.slice(2);
                            }
                            setDateOfBirth(v);
                          }}
                          className="h-10"
                          maxLength={10}
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Additional people details forms */}
                  {isMultiple && additionalPeople.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      {additionalPeople.map((person, i) => {
                         const personColors = [
                          { border: "border-secondary/30", bg: "bg-secondary/5", accent: "text-secondary", iconBg: "bg-secondary/10", divider: "border-secondary/20" },
                          { border: "border-emerald-500/30", bg: "bg-emerald-50", accent: "text-emerald-600", iconBg: "bg-emerald-100", divider: "border-emerald-500/20" },
                        ];
                        const colors = personColors[i % personColors.length];
                        return (
                          <div key={i} className={cn("rounded-xl border-2 p-5 space-y-4", colors.border, colors.bg)}>
                            <div className={cn("flex flex-col items-center gap-1 pb-2 border-b", colors.divider)}>
                              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", colors.iconBg)}>
                                <svg viewBox="0 0 24 32" className={cn("w-5 h-6", colors.accent)} fill="currentColor">
                                  <circle cx="12" cy="8" r="6" />
                                  <path d="M2 28c0-5.523 4.477-10 10-10s10 4.477 10 10v2H2v-2z" />
                                </svg>
                              </div>
                              <p className={cn("text-lg font-serif font-bold", colors.accent)}>Person {i + 2}</p>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Person {i + 2} Full Name *</Label>
                              <Input
                                value={person.name}
                                onChange={(e) => {
                                  const updated = [...additionalPeople];
                                  updated[i] = { ...updated[i], name: e.target.value };
                                  setAdditionalPeople(updated);
                                }}
                                placeholder={`Person ${i + 2} full name`}
                                className="h-10"
                                maxLength={100}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Person {i + 2} Email *</Label>
                              <Input
                                type="email"
                                value={person.email}
                                onChange={(e) => {
                                  const updated = [...additionalPeople];
                                  updated[i] = { ...updated[i], email: e.target.value };
                                  setAdditionalPeople(updated);
                                }}
                                placeholder={`Person ${i + 2} email address`}
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Person {i + 2} Phone</Label>
                              <Input
                                type="tel"
                                value={person.phone}
                                onChange={(e) => {
                                  const updated = [...additionalPeople];
                                  updated[i] = { ...updated[i], phone: e.target.value };
                                  setAdditionalPeople(updated);
                                }}
                                placeholder={`Person ${i + 2} phone number`}
                                className="h-10"
                                maxLength={20}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Person {i + 2} Date of Birth *</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="DD/MM/YYYY"
                                value={person.dob}
                                onChange={(e) => {
                                  let v = e.target.value.replace(/[^\d/]/g, "");
                                  const digits = v.replace(/\//g, "");
                                  if (digits.length >= 4) {
                                    v = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
                                  } else if (digits.length >= 2) {
                                    v = digits.slice(0, 2) + "/" + digits.slice(2);
                                  }
                                  const updated = [...additionalPeople];
                                  updated[i] = { ...updated[i], dob: v };
                                  setAdditionalPeople(updated);
                                }}
                                className="h-10"
                                maxLength={10}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}

                  {/* Duration summary */}
                  {isMultiple && additionalPeople.length > 0 && (
                    <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                      <Clock className="inline h-3 w-3 mr-1" />
                      Estimated appointment duration: <strong>{getEffectiveDuration()} minutes</strong>
                    </div>
                  )}

                   {/* No email dialog removed — replaced with inline checkbox */}

                  <Button
                    className="w-full h-12 text-base bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
                    onClick={() => setStep(5)}
                    disabled={
                      !name.trim() || (!hasNoEmail && !email.trim()) || !isValidDob(dateOfBirth) ||
                      (hasNoEmail && !phone.trim()) ||
                      (bookingFor === "other" && !bookerName.trim()) ||
                      (isMultiple && additionalPeople.length > 0 && additionalPeople.some(p => !p.name.trim() || !p.email.trim() || !isValidDob(p.dob)))
                    }
                  >
                    Continue to Select a Date
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}



          {/* STEP 5: Select Date */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="mb-6 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setStep(4)} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="font-serif text-2xl">Select a Date</h2>
                  <p className="text-sm text-muted-foreground">{selectedService?.name}</p>
                </div>
              </div>

              {/* Earwax olive oil advisory */}
              {(selectedService?.name.toLowerCase().includes("earwax") || selectedService?.name.toLowerCase().includes("ear wax")) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-5 rounded-lg border-2 border-amber-500/30 bg-amber-950/20 p-4">
                  <div className="flex items-start gap-3">
                    <Droplets className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                    <div>
                      <h3 className="font-semibold text-sm text-amber-300">Olive Oil Drops Required</h3>
                      <p className="mt-1 text-sm leading-relaxed text-amber-400/90">
                        You must have started (or plan to start) using <strong className="text-foreground">olive oil drops or spray at least 3 days before</strong> your appointment, <strong className="text-foreground">twice daily</strong>. Please choose your date accordingly.
                      </p>
                      <p className="mt-2 text-xs text-amber-500/80">
                        ⚠ Do not use drops if you have a perforated eardrum, active ear infection, or have been advised otherwise by a healthcare professional. Contact us if unsure.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Cryotherapy image advisory */}
              {isCryoService && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-5 rounded-lg border-2 border-secondary/30 bg-secondary/5 dark:bg-secondary/10 p-4">
                  <div className="flex items-start gap-3">
                    <Snowflake className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Send Us an Image First</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        For a quicker booking experience, please ensure you have <strong>sent us an image of your lesion</strong> and <strong>received a quote</strong> before selecting your date.
                      </p>
                      <Link
                        to="/cryotherapy#process"
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-secondary hover:text-secondary/80 transition-colors underline underline-offset-2"
                      >
                        View the 3-step process →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}

              <Card className="border-0 shadow-lg">
                <CardContent className="flex flex-col items-center py-6">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    disabled={isDateDisabled}
                    fromDate={new Date()}
                    toDate={addDays(new Date(), 90)}
                    className="pointer-events-auto"
                    locale={enGB}
                    weekStartsOn={1}
                    modifiers={{
                      available: openDates,
                      limited: limitedDates,
                      fullyBooked: fullyBookedDatesArray,
                      unavailable: unavailableDatesArray,
                    }}
                    modifiersClassNames={{
                      available: "booking-day-open",
                      limited: "booking-day-limited",
                      fullyBooked: "booking-day-closed",
                      unavailable: "booking-day-unavailable",
                    }}
                  />

                  {/* Closed day message */}
                  {closedDayMessage && (
                    <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">
                      <XCircle className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
                      {closedDayMessage}
                    </div>
                  )}

                  {/* Colour key */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-full bg-emerald-500/80" />
                      Available
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-full bg-amber-500/80" />
                      Limited
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-full bg-red-500/80 line-through" />
                      Fully Booked
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-full bg-muted line-through" />
                      Closed
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 6: Select Time (Dynamic Travel-Based) */}
          {step === 6 && (
            <motion.div key="step6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="mb-6 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => { setDate(undefined); setTime(undefined); setClosedDayMessage(null); setStep(5); }} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="font-serif text-2xl">Select a Time</h2>
                  <p className="text-sm text-muted-foreground">{date && format(date, "EEEE, MMMM d, yyyy")}</p>
                </div>
              </div>

              {loadingSlots ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="py-12 text-center">
                    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-secondary" />
                    <p className="text-muted-foreground">Calculating available times based on travel...</p>
                  </CardContent>
                </Card>
              ) : timeSlots.length === 0 ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="py-12 text-center">
                    <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-muted-foreground">No available times for this date.</p>
                    <Button variant="outline" className="mt-4" onClick={() => { setDate(undefined); setTime(undefined); setClosedDayMessage(null); setStep(5); }}>Choose another date</Button>
                  </CardContent>
                </Card>
              ) : (() => {
              const hasExistingApts = (driveTimeData?.appointments || []).length > 0;
                // Pick only the BEST (earliest) recommended slot per gap
                // Also deduplicate slots within 15 mins of each other (same cluster)
                let bestSlots: typeof timeSlots = [];
                if (hasExistingApts) {
                  const adjacentSlots = timeSlots.filter(s => s.isAdjacentToExisting);
                  // Keep only earliest per 30-min window
                  const gapBest = new Map<string, typeof timeSlots[0]>();
                  for (const s of adjacentSlots) {
                    const sMins = parseInt(s.time.split(":")[0]) * 60 + parseInt(s.time.split(":")[1]);
                    const gapKey = String(Math.floor(sMins / 30));
                    if (!gapBest.has(gapKey)) {
                      gapBest.set(gapKey, s);
                    }
                  }
                  const candidates = Array.from(gapBest.values());
                  // Further deduplicate: if two recommended slots are within 15 mins, keep only the earlier
                  bestSlots = [];
                  for (const s of candidates) {
                    const sMins = parseInt(s.time.split(":")[0]) * 60 + parseInt(s.time.split(":")[1]);
                    const tooClose = bestSlots.some(bs => {
                      const bMins = parseInt(bs.time.split(":")[0]) * 60 + parseInt(bs.time.split(":")[1]);
                      return Math.abs(sMins - bMins) <= 15;
                    });
                    if (!tooClose) bestSlots.push(s);
                  }
                } else {
                  // No existing appointments — recommend just the first available slot
                  const firstAvail = timeSlots.find(s => s.available);
                  if (firstAvail) bestSlots = [firstAvail];
                }
                const bestSlotTimes = new Set(bestSlots.map(s => s.time));
                const otherSlots = timeSlots.filter(s => !bestSlotTimes.has(s.time));

                const SlotButton = ({ slot }: { slot: typeof timeSlots[0] }) => (
                  <Button
                    key={slot.time}
                    variant={time === slot.time ? "default" : "outline"}
                    disabled={!slot.available}
                    className={cn(
                      "h-12 text-sm font-medium",
                      !slot.available && "line-through opacity-50 cursor-not-allowed",
                      slot.available && time !== slot.time && "hover:border-secondary hover:text-secondary"
                    )}
                    onClick={async () => { if (slot.available) { setTime(slot.time); if (date) await createHold(date, slot.time); setStep(7); } }}
                  >
                    {slot.time.slice(0, 5)}
                  </Button>
                );

                return (
                  <div className="space-y-6">
                    {bestSlots.length > 0 && (
                      <div className="rounded-xl bg-secondary/10 border-2 border-secondary/25 p-4 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/20">
                            <Navigation className="h-4 w-4 text-secondary" />
                          </div>
                          <p className="text-sm font-serif font-semibold text-secondary">⭐ Recommended Times</p>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          We'd love it if you could pick one of these times — it helps reduce our travel distance and keeps gaps out of the day, meaning we can see more patients! 🙏
                        </p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {bestSlots.map((slot) => <SlotButton key={slot.time} slot={slot} />)}
                        </div>
                      </div>
                    )}
                    {otherSlots.length > 0 && (
                      <div>
                        {bestSlots.length > 0 && (
                          <div className="mb-3 rounded-lg bg-muted/50 border border-border p-3">
                            <p className="text-sm text-muted-foreground">If none of those work, here are all other available times:</p>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {otherSlots.map((slot) => <SlotButton key={slot.time} slot={slot} />)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* STEP 7: Address & Agreements */}
          {step === 7 && (
            <motion.div key="step7" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              {/* Countdown timer banner */}
              {holdExpiresAt && holdSecondsLeft > 0 && (
                <div className={cn(
                  "mb-4 rounded-lg border px-4 py-3 flex items-center justify-between text-sm font-medium",
                  holdSecondsLeft <= 120
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : holdSecondsLeft <= 300
                      ? "border-warning/40 bg-warning/10 text-warning-foreground"
                      : "border-primary/30 bg-primary/5 text-primary"
                )}>
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Your time slot is reserved
                  </span>
                  <span className="font-mono font-bold tabular-nums">
                    {Math.floor(holdSecondsLeft / 60)}:{(holdSecondsLeft % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              )}

              <div className="mb-6 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setStep(6)} className="h-8 w-8">
                   <ArrowLeft className="h-4 w-4" />
                 </Button>
                 <div>
                   <h2 className="font-serif text-2xl">Address & Agreements</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedService?.name} · {date && format(date, "EEE, MMM d")} at {time && time.slice(0, 5)}
                  </p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">

                {/* TILE: Address */}
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Home className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Your Address</h3>
                      <p className="text-xs text-muted-foreground">Where should we visit?</p>
                    </div>
                  </div>
                  <AddressPicker
                    value={address}
                    onChange={(addr) => setAddress(addr)}
                    onLocationChange={(lat, lng) => {
                      setLatitude(lat);
                      setLongitude(lng);
                    }}
                    onPostcodeChange={() => {}}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="directions" className="text-xs flex items-center gap-1.5 text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      Helpful directions (optional)
                    </Label>
                    <Textarea id="directions" value={directions} onChange={(e) => setDirections(e.target.value)} placeholder="e.g. Where to park, side entrance, ring the bell..." maxLength={300} rows={2} className="text-sm" />
                  </div>
                </div>

                {/* TILE: Notes */}
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Additional Notes</h3>
                      <p className="text-xs text-muted-foreground">Anything else we should know? (optional)</p>
                    </div>
                  </div>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional information..." maxLength={500} rows={2} className="text-sm" />
                </div>

                {/* TILE: Media Consent (optional) */}
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
                      <Camera className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Photo / Video Consent</h3>
                      <p className="text-xs text-muted-foreground">Would you be comfortable being featured?</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <img
                      src={treatmentShowcase}
                      alt="Example earwax removal appointment"
                      loading="lazy"
                      className="h-20 w-20 rounded-lg object-cover border border-border flex-shrink-0"
                    />
                    <div className="text-xs text-foreground leading-relaxed space-y-2">
                      <p>We occasionally capture care images and videos to help others understand what to expect.</p>
                      <p className="text-muted-foreground">We can ensure faces are hidden and just the care area is shown — just let us know. Consent can be withdrawn at any time.</p>
                    </div>
                  </div>
                  <details className="group">
                    <summary className="text-xs text-secondary cursor-pointer hover:underline list-none flex items-center gap-1">
                      <span className="group-open:hidden">Read more</span>
                      <span className="hidden group-open:inline">Show less</span>
                    </summary>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                      Any photos or short video clips taken during your appointment may be shared on social media or the ShawScope website. If you'd like to see anything before it's posted, just ask — we're always happy to share first. This is completely optional and will never affect your care in any way.
                    </p>
                  </details>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setMediaConsent(true); setMediaConsentChoice(true); }}
                      className={`rounded-lg border-2 p-3 text-xs font-semibold transition-all ${mediaConsentChoice === true ? "border-secondary bg-secondary/10 text-secondary" : "border-border bg-background hover:border-secondary/50"}`}
                    >
                      Yes, I'd love to
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMediaConsent(false); setMediaConsentChoice(false); }}
                      className={`rounded-lg border-2 p-3 text-xs font-semibold transition-all ${mediaConsentChoice === false ? "border-secondary bg-secondary/10 text-secondary" : "border-border bg-background hover:border-secondary/50"}`}
                    >
                      No thank you
                    </button>
                  </div>
                  {mediaConsentChoice === true && (
                    <div className="rounded-lg bg-secondary/10 border border-secondary/30 p-3 space-y-2">
                      <p className="text-xs text-foreground leading-relaxed">
                        <strong>Thank you so much!</strong> By selecting "Yes", you're giving your full consent for ShawScope to capture and share photos and/or short video clips taken during your appointment on social media, our website and other promotional materials.
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        You can change your mind at any time and request removal of any content whenever you wish — just let us know.
                      </p>
                    </div>
                  )}
                  {mediaConsentChoice === false && (
                    <div className="rounded-lg bg-muted border border-border p-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">No problem at all</strong> — no footage will be taken. Thanks for letting us know!
                      </p>
                    </div>
                  )}
                </div>

                {isCryoService && (
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
                        <Camera className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">Lesion Photo & Quote</h3>
                        <p className="text-xs text-muted-foreground">Upload a clear photo for an accurate quote</p>
                      </div>
                    </div>
                    <div>
                      <input ref={cryoFileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                        if (e.target.files) {
                          const newPhotos = Array.from(e.target.files).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
                          setCryoPhotos(prev => [...prev, ...newPhotos]);
                        }
                      }} />
                      <Button type="button" variant="outline" size="sm" onClick={() => cryoFileRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-1" /> Choose Photos
                      </Button>
                      {cryoPhotos.length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-2">
                          {cryoPhotos.map((p, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border">
                              <img src={p.preview} alt={`Lesion ${i+1}`} className="w-full h-full object-cover" />
                              <button type="button" onClick={() => { URL.revokeObjectURL(p.preview); setCryoPhotos(prev => prev.filter((_, j) => j !== i)); }} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-destructive/80 text-destructive-foreground">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="price-agreed" checked={priceAgreed} onCheckedChange={(v) => setPriceAgreed(v === true)} />
                      <Label htmlFor="price-agreed" className="text-sm font-normal">A price has been agreed</Label>
                    </div>
                    {priceAgreed && (
                      <div className="space-y-1">
                        <Label htmlFor="agreed-price" className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <PoundSterling className="h-3 w-3" />
                          Agreed Price (£)
                        </Label>
                        <Input id="agreed-price" type="number" min="0" step="0.01" value={agreedPrice} onChange={(e) => setAgreedPrice(e.target.value)} placeholder="e.g. 50.00" className="h-10" />
                      </div>
                    )}
                  </div>
                )}

                {/* TILE: How did you hear about us */}
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">How Did You Find Us?</h3>
                    </div>
                  </div>
                  <Select value={referralSource} onValueChange={(v) => { setReferralSource(v); if (v !== "other") setReferralSourceOther(""); }}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select an option..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Search</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="recommendation">Friend / Family Recommendation</SelectItem>
                      <SelectItem value="gp">GP / Healthcare Professional</SelectItem>
                      <SelectItem value="event">Community Event</SelectItem>
                      <SelectItem value="repeat">Returning Client</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {referralSource === "other" && (
                    <Input
                      value={referralSourceOther}
                      onChange={(e) => setReferralSourceOther(e.target.value)}
                      placeholder="Please tell us how you heard about us..."
                      maxLength={150}
                      className="h-10 text-sm"
                    />
                  )}
                </div>

                {/* TILE: Privacy Agreement - compact with checkbox inline */}
                <div className={cn("rounded-xl border p-4 transition-colors", privacyAgreed ? "border-secondary/30 bg-secondary/5" : "bg-card")}>
                  <div className="flex items-start gap-3">
                    <Checkbox id="privacy" checked={privacyAgreed} onCheckedChange={(v) => setPrivacyAgreed(v === true)} className="mt-0.5" required />
                    <div className="flex-1">
                      <Label htmlFor="privacy" className="font-semibold text-sm cursor-pointer flex items-center gap-2 text-foreground">
                        <ShieldCheck className="h-4 w-4 text-secondary" />
                        I agree to the Privacy Policy & am aware of audio recording for dictation *
                      </Label>
                      <ul className="mt-2 space-y-2 text-xs text-muted-foreground leading-relaxed">
                        <li className="flex items-start gap-2">
                          <span className="text-secondary mt-0.5">•</span>
                          <span>
                            <button
                              type="button"
                              onClick={() => setShowPrivacyDialog(true)}
                              className="underline text-secondary hover:text-secondary/80 font-medium"
                            >
                              Read the Privacy Policy
                            </button>
                            {" "}— how we handle your data.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-secondary mt-0.5">•</span>
                          <div className="flex-1">
                            <span className="text-foreground font-medium">🎙️ Audio recording for dictation</span>
                            <button
                              type="button"
                              onClick={() => setShowAudioLearnMore(!showAudioLearnMore)}
                              className="ml-2 inline-flex items-center gap-1 text-secondary hover:text-secondary/80 font-medium"
                            >
                              {showAudioLearnMore ? "Show less" : "Learn more"}
                              <ChevronDown className={cn("h-3 w-3 transition-transform", showAudioLearnMore && "rotate-180")} />
                            </button>
                            {showAudioLearnMore && (
                              <div className="mt-1.5 space-y-1.5">
                                <p>
                                  Your appointment may be securely recorded using <span className="font-medium">Heidi</span>, a UK/EU GDPR-compliant clinical dictation platform. The audio is <span className="font-medium">automatically transcribed into your consultation notes and cannot be played back</span>.
                                </p>
                                <p>
                                  Recordings are encrypted in transit and at rest, never used for marketing, and deleted after transcription. This speeds up admin time and ensures everything discussed and completed is documented thoroughly and accurately.
                                </p>
                              </div>
                            )}
                            <p className="mt-1.5 font-bold text-foreground">
                              If you wish not to be audio recorded, please inform Matt before or at the start of your appointment.
                            </p>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* TILE: Cancellation Agreement - compact with checkbox inline */}
                <div className={cn("rounded-xl border p-4 transition-colors", cancellationAgreed ? "border-secondary/30 bg-secondary/5" : "bg-card")}>
                  <div className="flex items-start gap-3">
                    <Checkbox id="cancellation" checked={cancellationAgreed} onCheckedChange={(v) => setCancellationAgreed(v === true)} className="mt-0.5" required />
                    <div className="flex-1">
                      <Label htmlFor="cancellation" className="font-semibold text-sm cursor-pointer flex items-center gap-2">
                        <Bell className="h-4 w-4 text-secondary" />
                        I agree to the Cancellation Policy *
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        We require <strong>24 hours' notice</strong> to cancel or reschedule. A 50% fee may apply for late cancellations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* TILE: Follow-Up & Pricing Awareness */}
                {needsFollowUpAwareness && (
                  <div className={cn("rounded-xl border p-4 transition-colors", earwaxFollowUpAgreed ? "border-amber-500/30 bg-amber-950/20" : "bg-card")}>
                    <div className="flex items-start gap-3">
                      <Checkbox id="earwax-followup" checked={earwaxFollowUpAgreed} onCheckedChange={(v) => setEarwaxFollowUpAgreed(v === true)} className="mt-0.5" required />
                      <div className="flex-1">
                        <Label htmlFor="earwax-followup" className="font-semibold text-sm cursor-pointer flex items-center gap-2 text-foreground">
                          <Ear className="h-4 w-4 text-amber-400" />
                          Follow-Up & No Wax Awareness *
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          In rare cases a follow-up may be needed. Follow-ups are available at <strong className="text-foreground">£35</strong> within <strong className="text-foreground">4 weeks</strong> of your original appointment.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          If <strong className="text-foreground">no wax is found</strong>, the visit becomes a <strong className="text-foreground">wellness appointment</strong> charged at <strong className="text-foreground">£30</strong> to cover time and travel. A complimentary <strong className="text-foreground">hearing screen</strong> can be offered within that £30 if helpful.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowPricingDialog(true)}
                          className="text-xs text-secondary hover:underline mt-1.5 inline-flex items-center gap-1"
                        >
                          <PoundSterling className="h-3 w-3" />
                          View full pricing
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TILE: Consent form delivery preference */}
                {selectedService?.consent_form_template_id && (() => {
                  const phoneDigits = phone.trim().replace(/[\s\-()]/g, "").replace(/^\+/, "");
                  const hasMobile = /^447\d{9}$/.test(phoneDigits) || /^07\d{9}$/.test(phoneDigits);
                  const effectiveMethod = (!hasMobile && consentDelivery === "sms") ? "email" : consentDelivery;
                  return (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
                          <FileText className="h-4 w-4 text-secondary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm text-foreground">Send my consent form to…</h3>
                          <p className="text-xs text-muted-foreground">Choose where the secure link will be sent.</p>
                        </div>
                      </div>
                      {/* Editable contact details so the patient can correct them at this stage */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        <div>
                          <Label htmlFor="consent-email-edit" className="text-[11px] text-muted-foreground">Email</Label>
                          <Input
                            id="consent-email-edit"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="h-9 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="consent-phone-edit" className="text-[11px] text-muted-foreground">Mobile (UK)</Label>
                          <Input
                            id="consent-phone-edit"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="07…"
                            className="h-9 text-sm mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          onClick={() => setConsentDelivery("email")}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                            effectiveMethod === "email"
                              ? "border-secondary bg-secondary/10"
                              : "border-border bg-card hover:border-secondary/40"
                          )}
                        >
                          <Mail className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">Email</p>
                            <p className="text-xs text-muted-foreground truncate">{email.trim() || "Add your email above"}</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          disabled={!hasMobile}
                          onClick={() => hasMobile && setConsentDelivery("sms")}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                            effectiveMethod === "sms"
                              ? "border-secondary bg-secondary/10"
                              : "border-border bg-card hover:border-secondary/40",
                            !hasMobile && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <MessageSquare className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">Text message (SMS)</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {hasMobile ? phone.trim() : "Add a UK mobile number above to enable"}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConsentDelivery("in_person")}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                            effectiveMethod === "in_person"
                              ? "border-secondary bg-secondary/10"
                              : "border-border bg-card hover:border-secondary/40"
                          )}
                        >
                          <ClipboardList className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">I don't have either — do it in person</p>
                            <p className="text-xs text-muted-foreground">Matt will bring a paper consent form to your appointment.</p>
                          </div>
                        </button>
                      </div>
                      {effectiveMethod === "email" && (
                        <p className="mt-3 text-[11px] text-warning leading-relaxed flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>Please check your <strong>junk/spam folder</strong> — consent links sometimes land there.</span>
                        </p>
                      )}
                      {effectiveMethod === "in_person" && (
                        <p className="mt-3 text-[11px] text-warning leading-relaxed flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>Matt will be notified to bring a <strong>paper consent form</strong> on the day.</span>
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* TILE: Marketing */}
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Megaphone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Stay in the Loop 💌</h3>
                      <p className="text-xs text-muted-foreground">~2 updates per year. Untick to opt out.</p>
                    </div>
                  </div>
                  <div className="space-y-2 pl-12">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mkt-email" checked={marketingEmail} onCheckedChange={(v) => setMarketingEmail(v === true)} />
                      <Label htmlFor="mkt-email" className="text-sm font-normal">Email updates</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mkt-sms" checked={marketingSms} onCheckedChange={(v) => setMarketingSms(v === true)} />
                      <Label htmlFor="mkt-sms" className="text-sm font-normal">Text updates</Label>
                    </div>
                  </div>
                </div>

                {/* Price summary */}
                {selectedService && !isCryoService && selectedService.price != null && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <PoundSterling className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-semibold text-sm">Price Summary</h3>
                    </div>
                    <div className="pl-12 space-y-1">
                      {earwaxGroupPrice != null ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Two-Person Earwax Removal</span>
                            <span className="font-medium">£{earwaxGroupPrice.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">£50 each (or £80 total if one has no wax)</p>
                        </>
                      ) : selectedService.price != null ? (
                        <div className="flex justify-between text-sm">
                          <span>{selectedService.name}</span>
                          <span className="font-medium">£{Number(selectedService.price).toFixed(2)}</span>
                        </div>
                      ) : null}
                      {travelFee > 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Travel fee ({travelDistance} miles)</span>
                          <span>£{travelFee.toFixed(2)}</span>
                        </div>
                      )}
                      {(travelFee > 0 || earwaxGroupPrice != null) && (
                        <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                          <span>Total</span>
                          <span>£{((earwaxGroupPrice ?? Number(selectedService.price || 0)) + travelFee).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full h-12 text-base mt-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold" disabled={loading || !privacyAgreed || !cancellationAgreed || (needsFollowUpAwareness && !earwaxFollowUpAgreed)}>
                  {loading ? "Booking..." : "Confirm Booking"}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ShawScope. All rights reserved.
      </footer>

      {/* Coming Soon Waitlist Dialog */}
      <Dialog open={waitlistOpen} onOpenChange={setWaitlistOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Join the {waitlistServiceName} Waitlist</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Fill in your details below and we'll get in touch when availability opens up.
            </p>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="wl-name">Full Name *</Label>
              <Input id="wl-name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="wl-email">Email Address *</Label>
              <Input id="wl-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="wl-phone">Telephone (optional)</Label>
              <Input id="wl-phone" type="tel" placeholder="Your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button
              className="w-full"
              disabled={!name.trim() || !email.trim() || waitlistSubmitting}
              onClick={async () => {
                setWaitlistSubmitting(true);
                const { error } = await supabase.from("service_waitlist").insert({
                  service_id: waitlistServiceId,
                  client_name: name.trim(),
                  client_email: email.trim().toLowerCase(),
                  client_phone: phone.trim() || null,
                });
                setWaitlistSubmitting(false);
                if (error) {
                  toast.error("Failed to join waitlist. Please try again.");
                } else {
                  toast.success("You've been added to the waitlist! We'll be in touch.");
                  setWaitlistOpen(false);
                  setName(""); setEmail(""); setPhone("");
                }
              }}
            >
              {waitlistSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining...</> : <><Send className="h-4 w-4 mr-2" /> Join Waitlist</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Cancel feedback dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) { setCancelPhase("feedback"); setCancelFeedback(""); setCallbackName(""); setCallbackPhone(""); setCallbackEmail(""); }
      }}>
        <DialogContent className="max-w-sm">
          <AnimatePresence mode="wait">
            {cancelPhase === "feedback" ? (
              <motion.div key="feedback" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <DialogHeader>
                  <DialogTitle className="font-serif">We're sorry to see you go</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground mt-2">
                  We apologise if something wasn't quite right. Your feedback helps us improve — it's completely optional and anonymous.
                </p>
                <Textarea
                  value={cancelFeedback}
                  onChange={(e) => setCancelFeedback(e.target.value)}
                  placeholder="Was something unclear, difficult, or missing? (optional)"
                  className="min-h-[80px] mt-3"
                  maxLength={500}
                />
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" className="flex-1" onClick={() => setCancelDialogOpen(false)}>
                    Go Back
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={sendingFeedback}
                    onClick={async () => {
                      setSendingFeedback(true);
                      try {
                        if (cancelFeedback.trim()) {
                          await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-feedback`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                              },
                              body: JSON.stringify({ feedback: cancelFeedback.trim(), step }),
                            }
                          );
                        }
                      } catch {
                        // Silently fail
                      } finally {
                        setSendingFeedback(false);
                        setCancelPhase("offer");
                      }
                    }}
                  >
                    {sendingFeedback ? "Sending..." : "Continue"}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="offer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <DialogHeader>
                  <DialogTitle className="font-serif flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" /> Can we help?
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground mt-2">
                  We really want to help — even outside our usual hours! Leave your details and we'll reach out personally to see if there's anything we can do for you.
                </p>
                <div className="space-y-3 mt-3">
                  <div>
                    <Label className="text-xs">Your Name</Label>
                    <Input
                      value={callbackName}
                      onChange={e => setCallbackName(e.target.value)}
                      placeholder="Your name"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone Number</Label>
                    <Input
                      value={callbackPhone}
                      onChange={e => setCallbackPhone(e.target.value)}
                      placeholder="07xxx xxxxxx"
                      type="tel"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email Address</Label>
                    <Input
                      value={callbackEmail}
                      onChange={e => setCallbackEmail(e.target.value)}
                      placeholder="your@email.com"
                      type="email"
                      maxLength={255}
                    />
                  </div>
                  {!callbackPhone.trim() && !callbackEmail.trim() && callbackName.trim() && (
                    <p className="text-[11px] text-amber-500">Please provide a phone number or email so we can reach you.</p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="ghost"
                    className="flex-1 text-muted-foreground"
                    onClick={() => {
                      setCancelDialogOpen(false);
                      navigate("/");
                    }}
                  >
                    <span className="mr-1.5">👋</span> No thanks
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={sendingCallback || !callbackName.trim() || (!callbackPhone.trim() && !callbackEmail.trim())}
                    onClick={async () => {
                      setSendingCallback(true);
                      try {
                        await fetch(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-feedback`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                            },
                            body: JSON.stringify({
                              feedback: cancelFeedback.trim() || "No feedback given",
                              step,
                              callback_request: {
                                name: callbackName.trim(),
                                phone: callbackPhone.trim() || null,
                                email: callbackEmail.trim() || null,
                              },
                            }),
                          }
                        );
                        toast.success("Thank you! We'll be in touch soon.");
                      } catch {
                        toast.error("Something went wrong — please call us on 01305 340 194");
                      } finally {
                        setSendingCallback(false);
                        setCancelDialogOpen(false);
                        navigate("/");
                      }
                    }}
                  >
                    {sendingCallback ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                    Please reach out
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
      {/* Pricing Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <PoundSterling className="h-5 w-5 text-secondary" />
              Our Pricing
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pricingLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {pricingServices.map((svc) => {
                  const svcOffers = pricingOffers.filter(o => o.service_id === svc.id);
                  return (
                    <div key={svc.id} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                          <p className="text-xs text-muted-foreground">{svc.duration_minutes} minutes</p>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {svc.price != null ? `£${svc.price.toFixed(2)}` : "POA"}
                        </p>
                      </div>
                      {svc.description && (
                        <p className="text-xs text-muted-foreground mt-1">{svc.description}</p>
                      )}
                      {svcOffers.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {svcOffers.map((offer) => (
                            <div key={offer.id} className="rounded bg-secondary/10 border border-secondary/20 px-2 py-1.5">
                              <p className="text-xs font-semibold text-secondary">{offer.offer_name}</p>
                              <p className="text-xs text-foreground">{offer.price_text}</p>
                              {offer.price_note && <p className="text-[10px] text-muted-foreground">{offer.price_note}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <Ear className="h-3.5 w-3.5" />
                Hearing Screening Information
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Hearing screening is not always suitable for everyone and is dependent on ear fit suitability — it is not always possible to perform. Our hearing screening is complimentary as part of the service.
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">No wax found?</strong> Your appointment reverts to an Ear Wellness Check at <strong className="text-foreground">£30</strong> — with or without a hearing screen, dependent on ear fit suitability.
              </p>
            </div>
            <PaymentMethodsBadge compact showExample />
            <p className="text-xs text-muted-foreground text-center">
              Travel fees may apply based on your postcode.{" "}
              <Link to="/pricing" target="_blank" className="text-secondary hover:underline">
                Full pricing page →
              </Link>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-secondary" />
              Privacy Policy
            </DialogTitle>
          </DialogHeader>
          <iframe
            src="/privacy"
            title="Privacy Policy"
            className="w-full h-[70vh] border-0 bg-background"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingPage;
