import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarPlus, CalendarIcon, Clock, CheckCircle, AlertTriangle, Loader2, MapPin, Mail, MessageSquare, FileText, Phone } from "lucide-react";
import { toast } from "sonner";
import { format, addWeeks, isBefore, startOfDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useBookingHold } from "@/hooks/useBookingHold";

interface BookNextAppointmentProps {
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  address?: string | null;
  postcode?: string | null;
  currentServiceId?: string | null;
  currentServiceName?: string | null;
  onBooked?: (appointmentId: string, date: string, time: string) => void;
}

interface TimeSlot {
  time: string;
  label: string;
  available: boolean;
  status: "taken" | "available" | "recommended";
  reason?: string;
  driveMinutes?: number;
  distanceMiles?: number;
}

// Helper: check if email is a placeholder no-email address
const isNoEmail = (email: string) => email.includes("@noemail.co.uk");

// Helper: check if phone is a UK mobile (07/+447) vs landline
const isMobileNumber = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/\s/g, "");
  return /^(\+?447|07)\d{8,9}$/.test(cleaned);
};

const BookNextAppointment = ({
  clientName,
  clientEmail,
  clientPhone,
  address,
  postcode,
  currentServiceId,
  currentServiceName,
  onBooked,
}: BookNextAppointmentProps) => {
  const [expanded, setExpanded] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(currentServiceId || "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<{ date: string; time: string; appointmentId: string } | null>(null);
  const [availableDates, setAvailableDates] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [price, setPrice] = useState<string>("");
  const [routeCache, setRouteCache] = useState<any[]>([]);

  // Post-booking action states
  const [sendEmail, setSendEmail] = useState(false);
  const [sendSms, setSendSms] = useState(false);
  const [selectedConsentTemplateId, setSelectedConsentTemplateId] = useState<string>("");
  const [verbalConsent, setVerbalConsent] = useState(false);
  const [skipConsent, setSkipConsent] = useState(false);
  const [consentTemplates, setConsentTemplates] = useState<any[]>([]);
  const [sendingActions, setSendingActions] = useState(false);
  const [actionsSent, setActionsSent] = useState(false);

  const hasEmail = !isNoEmail(clientEmail);
  const hasMobile = isMobileNumber(clientPhone);

  // Booking hold
  const { holdSecondsLeft, createHold, releaseHold, formatCountdown } = useBookingHold({
    onExpired: () => {
      setSelectedTime("");
      toast.error("Hold expired — please select a new time");
    },
  });

  // Derived: open dates as Date objects for calendar modifiers
  const openDatesSet = useMemo(
    () => availableDates.filter(d => d.is_available).map(d => parseISO(d.available_date)),
    [availableDates]
  );

  // Fetch services, settings, dates, route cache
  useEffect(() => {
    if (!expanded) return;
    const fetchData = async () => {
      const [{ data: svcs }, { data: bSettings }, { data: avDates }, { data: routes }, { data: templates }] = await Promise.all([
        supabase.from("services").select("id, name, duration_minutes, price, consent_form_template_id").eq("is_active", true).order("sort_order"),
        supabase.from("business_settings").select("*").limit(1).single(),
        supabase.from("available_dates").select("available_date, is_available, start_hour, end_hour").gte("available_date", format(new Date(), "yyyy-MM-dd")),
        supabase.from("route_cache").select("*"),
        supabase.from("consent_form_templates").select("id, title, form_type").eq("is_active", true).neq("form_type", "consultation"),
      ]);
      if (svcs) setServices(svcs);
      if (bSettings) setSettings(bSettings);
      if (avDates) {
        setAvailableDates(avDates);
        setBlockedDates(avDates.filter(d => !d.is_available).map(d => d.available_date));
      }
      if (routes) setRouteCache(routes);
      if (templates) setConsentTemplates(templates);
      if (currentServiceId && svcs) {
        const svc = svcs.find(s => s.id === currentServiceId);
        if (svc?.price) setPrice(String(svc.price));
      }
    };
    fetchData();
  }, [expanded, currentServiceId]);

  // Update price when service changes
  useEffect(() => {
    if (selectedServiceId && services.length > 0) {
      const svc = services.find(s => s.id === selectedServiceId);
      if (svc?.price) setPrice(String(svc.price));
    }
  }, [selectedServiceId, services]);

  // Helper: get drive time from route cache
  const getDriveTime = (fromPc: string | null | undefined, toPc: string | null | undefined): number => {
    if (!fromPc || !toPc) return 999;
    const normalize = (p: string) => p.replace(/\s/g, "").toUpperCase();
    const a = normalize(fromPc);
    const b = normalize(toPc);
    const route = routeCache.find(r =>
      (normalize(r.origin_postcode) === a && normalize(r.destination_postcode) === b) ||
      (normalize(r.origin_postcode) === b && normalize(r.destination_postcode) === a)
    );
    return route ? route.drive_time_minutes : 999;
  };

  // Fetch available time slots with recommended logic
  useEffect(() => {
    if (!selectedDate || !settings) return;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedTime("");
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      try {
        const svc = services.find(s => s.id === selectedServiceId);
        const duration = svc?.duration_minutes || settings.appointment_duration_minutes || 60;
        const buffer = settings.buffer_minutes ?? 15;
        const travelBufferPerMile = settings.travel_buffer_per_mile ?? 0.5;

        const [{ data: bookedData }, { data: blocks }, { data: avDate }, { data: existingApts }] = await Promise.all([
          supabase.rpc("get_booked_slots_with_duration", { target_date: dateStr }),
          supabase.from("blocked_times").select("start_time, end_time, reason").eq("blocked_date", dateStr),
          supabase.from("available_dates").select("start_hour, end_hour").eq("available_date", dateStr).maybeSingle(),
          supabase.from("appointments").select("appointment_time, postcode, service_id, status")
            .eq("appointment_date", dateStr)
            .in("status", ["confirmed", "pending"]),
        ]);

        const bookedSlots = (bookedData || []) as { appointment_time: string; duration_minutes: number }[];

        const startHour = avDate?.start_hour ?? settings.start_hour ?? 9;
        const endHour = avDate?.end_hour ?? settings.end_hour ?? 17;
        const startMin = Math.round(startHour * 60);
        const endMin = Math.round(endHour * 60);

        const existingAptsInfo = (existingApts || []).map(apt => {
          const [h, m] = apt.appointment_time.split(":").map(Number);
          const svcMatch = services.find(s => s.id === apt.service_id);
          const dur = svcMatch?.duration_minutes || 60;
          return {
            startMins: h * 60 + m,
            endMins: h * 60 + m + dur,
            postcode: apt.postcode,
          };
        });

        const getBuffer = (driveMin: number) => {
          const estMiles = driveMin / 2;
          return Math.round(estMiles * travelBufferPerMile);
        };

        const roundTo5 = (n: number) => Math.round(n / 5) * 5;

        const slots: TimeSlot[] = [];

        for (let m = startMin; m + duration <= endMin; m += 15) {
          const h = Math.floor(m / 60);
          const min = m % 60;
          const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
          const label = `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(min).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;

          const slotEnd = m + duration + buffer;
          let available = true;
          let reason = "";

          for (const bk of bookedSlots) {
            const [bh, bm] = bk.appointment_time.split(":").map(Number);
            const bookedStart = bh * 60 + bm;
            const bookedEnd = bookedStart + bk.duration_minutes + buffer;
            if (m < bookedEnd && slotEnd > bookedStart) {
              available = false;
              reason = "Existing booking";
              break;
            }
          }

          if (available && blocks) {
            for (const block of blocks) {
              const reasonLower = (block.reason || "").toLowerCase();
              if (reasonLower.includes("annual leave") || reasonLower.includes("on call")) continue;
              const [bsh, bsm] = block.start_time.split(":").map(Number);
              const [beh, bem] = block.end_time.split(":").map(Number);
              const blockStart = bsh * 60 + bsm;
              const blockEnd = beh * 60 + bem;
              if (m < blockEnd && (m + duration) > blockStart) {
                available = false;
                reason = block.reason || "Blocked";
                break;
              }
            }
          }

          if (!available) {
            slots.push({ time: timeStr, label, available: false, status: "taken", reason });
            continue;
          }

          let isRecommended = false;
          let bestDriveMinutes: number | undefined;
          let bestDistanceMiles: number | undefined;
          if (existingAptsInfo.length > 0 && postcode) {
            for (const apt of existingAptsInfo) {
              const driveFromApt = getDriveTime(apt.postcode, postcode);
              const bufferAfter = getBuffer(driveFromApt);
              const idealStart = roundTo5(apt.endMins + driveFromApt + bufferAfter);
              if (Math.abs(m - idealStart) <= 15 && driveFromApt <= 15) {
                isRecommended = true;
                bestDriveMinutes = driveFromApt < 999 ? driveFromApt : undefined;
                const route = routeCache.find(r => {
                  const norm = (p: string) => p.replace(/\s/g, "").toUpperCase();
                  const a = norm(apt.postcode || ""), b = norm(postcode || "");
                  return (norm(r.origin_postcode) === a && norm(r.destination_postcode) === b) || (norm(r.origin_postcode) === b && norm(r.destination_postcode) === a);
                });
                bestDistanceMiles = route ? Number(route.distance_miles) : undefined;
                break;
              }
            }
            if (!isRecommended) {
              for (const apt of existingAptsInfo) {
                const driveToApt = getDriveTime(postcode, apt.postcode);
                if (slotEnd + driveToApt + getBuffer(driveToApt) <= apt.startMins && apt.startMins - slotEnd <= 30 && driveToApt <= 15) {
                  isRecommended = true;
                  bestDriveMinutes = driveToApt < 999 ? driveToApt : undefined;
                  const route = routeCache.find(r => {
                    const norm = (p: string) => p.replace(/\s/g, "").toUpperCase();
                    const a = norm(postcode || ""), b = norm(apt.postcode || "");
                    return (norm(r.origin_postcode) === a && norm(r.destination_postcode) === b) || (norm(r.origin_postcode) === b && norm(r.destination_postcode) === a);
                  });
                  bestDistanceMiles = route ? Number(route.distance_miles) : undefined;
                  break;
                }
              }
            }
          }

          slots.push({ time: timeStr, label, available: true, status: isRecommended ? "recommended" : "available", driveMinutes: isRecommended ? bestDriveMinutes : undefined, distanceMiles: isRecommended ? bestDistanceMiles : undefined });
        }

        setAvailableSlots(slots);
      } catch (err) {
        console.error("Failed to fetch slots:", err);
        toast.error("Failed to load available times");
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDate, selectedServiceId, settings, services, postcode, routeCache]);

  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    if (isBefore(date, startOfDay(new Date()))) return false;
    if (blockedDates.includes(dateStr)) return false;
    if (!settings) return true;
    const dayOfWeek = date.getDay();
    const daysAvailable = settings.days_available || [1, 2, 3, 4, 5];
    if (availableDates.some(d => d.available_date === dateStr && d.is_available)) return true;
    return daysAvailable.includes(dayOfWeek);
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !selectedServiceId) {
      toast.error("Please select a service, date, and time");
      return;
    }
    setBooking(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const svc = services.find(s => s.id === selectedServiceId);
      const duration = svc?.duration_minutes || 60;

      const { data: hasOverlap } = await supabase.rpc("check_appointment_overlap", {
        p_date: dateStr,
        p_time: selectedTime + ":00",
        p_duration_minutes: duration,
        p_buffer_minutes: settings?.buffer_minutes ?? 15,
      });

      if (hasOverlap) {
        toast.error("This time slot is no longer available — please choose another");
        setBooking(false);
        return;
      }

      const { data: apt, error } = await supabase
        .from("appointments")
        .insert({
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone || null,
          address: address || null,
          postcode: postcode || null,
          service_id: selectedServiceId,
          appointment_date: dateStr,
          appointment_time: selectedTime,
          status: "confirmed",
          price: price ? Number(price) : (svc?.price || null),
          admin_notes: `Follow-up appointment booked during consultation`,
        })
        .select("id")
        .single();

      if (error) throw error;

      await supabase.from("patient_activity_log").insert({
        client_email: clientEmail,
        event_type: "booking",
        message: `Follow-up ${svc?.name || "appointment"} booked for ${format(selectedDate, "dd/MM/yyyy")} at ${selectedTime}`,
        created_by: "admin",
      });

      await releaseHold();
      setBooked(true);
      setBookedDetails({ date: format(selectedDate, "dd/MM/yyyy"), time: selectedTime, appointmentId: apt.id });
      toast.success("Follow-up appointment booked!");
      onBooked?.(apt.id, dateStr, selectedTime);
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err.message || "Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  // Send post-booking actions (confirmations + consent)
  const handleSendActions = async () => {
    if (!bookedDetails) return;
    setSendingActions(true);
    const aptId = bookedDetails.appointmentId;
    const svc = services.find(s => s.id === selectedServiceId);

    try {
      // Send confirmation notifications
      if (sendEmail || sendSms) {
        await supabase.functions.invoke("send-notification", {
          body: {
            appointmentId: aptId,
            type: "approved",
            channels: { email: sendEmail, sms: sendSms },
          },
        });
        const channels = [sendEmail && "email", sendSms && "SMS"].filter(Boolean).join(" & ");
        toast.success(`Confirmation sent via ${channels}`);
      }

      // Send consent form (only if not skipped)
      if (!skipConsent && selectedConsentTemplateId && hasEmail) {
        const templateName = consentTemplates.find(t => t.id === selectedConsentTemplateId)?.title || "Consent Form";
        await supabase.from("appointments").update({
          consent_form_template_id: selectedConsentTemplateId,
          consent_sent_at: new Date().toISOString(),
        }).eq("id", aptId);

        await supabase.functions.invoke("send-form-email", {
          body: { appointmentId: aptId, recipientEmail: clientEmail, templateName },
        });

        await supabase.from("patient_activity_log").insert({
          client_email: clientEmail,
          event_type: "consent_sent",
          message: `📧 Consent form "${templateName}" sent for ${svc?.name || "appointment"}`,
          created_by: "admin",
        });
        toast.success("Consent form sent");
      }

      // Record verbal consent (only if not skipped)
      if (!skipConsent && verbalConsent) {
        const consentTemplateId = selectedConsentTemplateId || svc?.consent_form_template_id;
        if (consentTemplateId) {
          await supabase.from("consent_form_responses").insert({
            appointment_id: aptId,
            consent_form_template_id: consentTemplateId,
            responses: { __verbal: true },
            signature: null,
            signed_at: null,
            status: "completed",
            submitter_name: clientName,
          } as any);
        }
        await supabase.from("patient_activity_log").insert({
          client_email: clientEmail,
          event_type: "verbal_consent",
          message: `📞 Verbal consent to be obtained at appointment for ${svc?.name || "appointment"}`,
          created_by: "admin",
        });
        toast.success("Verbal consent noted");
      }

      setActionsSent(true);
    } catch (err: any) {
      console.error("Post-booking action error:", err);
      toast.error(err.message || "Failed to send");
    } finally {
      setSendingActions(false);
    }
  };

  // Post-booking: actions sent confirmation
  if (booked && actionsSent && bookedDetails) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-50 dark:bg-green-950/20 p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-semibold">Next Appointment Booked & Confirmed</span>
        </div>
        <p className="text-xs text-green-600 dark:text-green-400">
          {clientName} — {services.find(s => s.id === selectedServiceId)?.name || "Appointment"} on {bookedDetails.date} at {bookedDetails.time}
        </p>
        <div className="flex flex-wrap gap-1.5 text-[10px] text-green-600 dark:text-green-400">
          {sendEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email sent</span>}
          {sendSms && <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> SMS sent</span>}
          {selectedConsentTemplateId && hasEmail && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Consent form sent</span>}
          {verbalConsent && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Verbal consent noted</span>}
        </div>
      </div>
    );
  }

  // Post-booking: show action options
  if (booked && bookedDetails) {
    const selectedSvc = services.find(s => s.id === selectedServiceId);
    const serviceConsentTemplateId = selectedSvc?.consent_form_template_id;

    return (
      <div className="rounded-lg border border-green-500/30 bg-green-50 dark:bg-green-950/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-semibold">Appointment Booked</span>
        </div>
        <p className="text-xs text-green-600 dark:text-green-400">
          {clientName} — {selectedSvc?.name || "Appointment"} on {bookedDetails.date} at {bookedDetails.time}
        </p>

        <div className="border-t border-green-500/20 pt-3 space-y-2.5">
          <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Send Confirmations</p>

          {/* Email confirmation */}
          <label className={cn(
            "flex items-center gap-2 text-xs rounded-md px-2 py-2 border transition-colors",
            !hasEmail ? "opacity-50 line-through border-muted bg-muted/30 cursor-not-allowed" :
            sendEmail ? "border-emerald-500/50 bg-emerald-500/10 cursor-pointer" : "border-border cursor-pointer hover:bg-muted/50"
          )}>
            <Checkbox
              checked={sendEmail}
              onCheckedChange={(v) => setSendEmail(!!v)}
              disabled={!hasEmail}
            />
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1">{hasEmail ? "Send email confirmation" : "No email address"}</span>
            {hasEmail && (
              <Badge variant={sendEmail ? "default" : "secondary"} className={cn("text-[9px] px-1.5 py-0", sendEmail ? "bg-emerald-600" : "")}>
                {sendEmail ? "YES" : "NO"}
              </Badge>
            )}
          </label>

          {/* SMS confirmation */}
          <label className={cn(
            "flex items-center gap-2 text-xs rounded-md px-2 py-2 border transition-colors",
            !hasMobile ? "opacity-50 line-through border-muted bg-muted/30 cursor-not-allowed" :
            sendSms ? "border-emerald-500/50 bg-emerald-500/10 cursor-pointer" : "border-border cursor-pointer hover:bg-muted/50"
          )}>
            <Checkbox
              checked={sendSms}
              onCheckedChange={(v) => setSendSms(!!v)}
              disabled={!hasMobile}
            />
            <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1">{hasMobile ? "Send SMS confirmation" : "No mobile number (landline only)"}</span>
            {hasMobile && (
              <Badge variant={sendSms ? "default" : "secondary"} className={cn("text-[9px] px-1.5 py-0", sendSms ? "bg-emerald-600" : "")}>
                {sendSms ? "YES" : "NO"}
              </Badge>
            )}
          </label>

          {/* Consent form section */}
          <div className="border-t border-green-500/20 pt-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Consent Form</p>
              <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={skipConsent}
                  onCheckedChange={(v) => { setSkipConsent(!!v); if (v) { setSelectedConsentTemplateId(""); setVerbalConsent(false); } }}
                />
                Skip (already done)
              </label>
            </div>

            {!skipConsent && (
              <>
                {hasEmail ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Select consent form to send</Label>
                      <Select value={selectedConsentTemplateId} onValueChange={setSelectedConsentTemplateId}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="None — don't send consent form" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs italic text-muted-foreground">None — don't send</SelectItem>
                          {consentTemplates.map(t => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.title}
                              {t.id === serviceConsentTemplateId && " ⭐"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {serviceConsentTemplateId && (
                        <p className="text-[10px] text-muted-foreground">
                          ⭐ = default form for this service
                        </p>
                      )}
                    </div>

                    {/* Also allow verbal consent even if email exists */}
                    <label className="flex items-center gap-2 text-xs cursor-pointer rounded-md px-2 py-1.5 border border-border hover:bg-muted/50">
                      <Checkbox
                        checked={verbalConsent}
                        onCheckedChange={(v) => setVerbalConsent(!!v)}
                      />
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Verbal consent at appointment</span>
                    </label>
                  </>
                ) : (
                  /* No email — verbal consent only */
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-2">
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                      No email — consent form cannot be sent digitally
                    </p>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={verbalConsent}
                        onCheckedChange={(v) => setVerbalConsent(!!v)}
                      />
                      <Phone className="h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                      <span className="font-medium">Verbal consent needed at appointment</span>
                    </label>
                  </div>
                )}
              </>
            )}

            {skipConsent && (
              <p className="text-[10px] text-muted-foreground italic">Consent form skipped — patient has completed previously</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleSendActions}
            disabled={sendingActions || (!sendEmail && !sendSms && !selectedConsentTemplateId && !verbalConsent && !skipConsent)}
            className="flex-1"
            size="sm"
          >
            {sendingActions ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Sending...</>
            ) : (
              <><CheckCircle className="mr-2 h-3.5 w-3.5" /> Send & Confirm</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setActionsSent(true)}
          >
            Skip
          </Button>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <Button
        size="sm"
        className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
        onClick={() => setExpanded(true)}
      >
        <CalendarPlus className="mr-2 h-3.5 w-3.5" /> Book Next Appointment
      </Button>
    );
  }

  const selectedSvc = services.find(s => s.id === selectedServiceId);
  const availableCount = availableSlots.filter(s => s.available).length;
  const hasRecommended = availableSlots.some(s => s.status === "recommended");

  return (
    <div className="rounded-lg border border-primary/20 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <CalendarPlus className="h-3.5 w-3.5" /> Book Next Appointment
        </h4>
        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={async () => { await releaseHold(); setExpanded(false); }}>
          Cancel
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Pre-filled for <strong>{clientName}</strong>
        {address && <span className="ml-1">· {postcode || address.slice(0, 30)}</span>}
      </p>

      {/* Service Selection */}
      <div className="space-y-1">
        <Label className="text-xs">Service</Label>
        <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select service..." />
          </SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.name} ({s.duration_minutes}min{s.price ? ` · £${s.price}` : ""})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Override */}
      <div className="space-y-1">
        <Label className="text-xs">Price (£)</Label>
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-8 text-xs w-32"
          placeholder="0.00"
          step="0.01"
        />
      </div>

      {/* Date Selection with open/closed modifiers */}
      <div className="space-y-1">
        <Label className="text-xs">Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full h-8 text-xs justify-start", !selectedDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {selectedDate ? format(selectedDate, "EEE dd MMM yyyy") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => !isDateAvailable(date)}
              modifiers={{ open: openDatesSet }}
              modifiersClassNames={{ open: "!bg-success/20 !text-success font-semibold" }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              fromDate={new Date()}
            />
            <div className="px-3 pb-2 flex gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-success/30 inline-block" /> Open</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted inline-block opacity-50" /> Closed</span>
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick date shortcuts */}
        {selectedServiceId && (
          <div className="flex flex-wrap gap-1 pt-1">
            {[2, 4, 6, 8, 12].map((weeks) => (
              <Button
                key={weeks}
                variant="ghost"
                size="sm"
                className="h-5 text-[9px] px-1.5"
                onClick={() => {
                  const d = addWeeks(new Date(), weeks);
                  if (isDateAvailable(d)) {
                    setSelectedDate(d);
                  } else {
                    let candidate = d;
                    for (let i = 1; i <= 7; i++) {
                      const next = new Date(d);
                      next.setDate(next.getDate() + i);
                      if (isDateAvailable(next)) { candidate = next; break; }
                    }
                    setSelectedDate(candidate);
                  }
                }}
              >
                +{weeks}w
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Time Selection with recommended styling */}
      {selectedDate && (
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Time
            {loadingSlots && <Loader2 className="h-3 w-3 animate-spin" />}
            {!loadingSlots && availableSlots.length > 0 && (
              <span className="text-muted-foreground font-normal">
                ({availableCount} available)
              </span>
            )}
          </Label>

          {hasRecommended && !loadingSlots && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              ⭐ Yellow = recommended (less travel / fewer gaps)
            </p>
          )}

          {!loadingSlots && availableSlots.length === 0 && (
            <p className="text-[11px] text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> No slots available on this date
            </p>
          )}

          {!loadingSlots && availableSlots.length > 0 && (() => {
            const recommendedSlots = availableSlots.filter(s => s.status === "recommended");
            const otherAvailable = availableSlots.filter(s => s.available && s.status !== "recommended");
            const takenSlots = availableSlots.filter(s => !s.available);

            // Find shortest distance recommended slot
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

            return (
              <div className="space-y-2">
                {/* Recommended slots pinned to top */}
                {recommendedSlots.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">Recommended</p>
                    {recommendedSlots.map((slot, i) => {
                      const isSelected = selectedTime === slot.time;
                      const isShortest = i === shortestIdx;
                      return (
                        <Button
                          key={slot.time}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "w-full h-auto py-1.5 text-[11px] font-medium",
                            !isSelected && "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/30 ring-1 ring-amber-500/30",
                          )}
                          onClick={async () => {
                            setSelectedTime(slot.time);
                            if (selectedDate) {
                              const svc = services.find(s => s.id === selectedServiceId);
                              await createHold(format(selectedDate, "yyyy-MM-dd"), slot.time, svc?.duration_minutes || 60);
                            }
                          }}
                        >
                          <span className="flex items-center justify-center gap-1">
                            {isShortest ? "📍" : "⭐"} {slot.label}
                            {isShortest && <span className="text-[8px] opacity-80">· Shorter distance</span>}
                            {!isShortest && slot.driveMinutes != null && (
                              <span className="text-[8px] opacity-70">· {slot.driveMinutes} min drive{slot.distanceMiles != null ? ` · ${slot.distanceMiles} mi` : ""}</span>
                            )}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                )}

                {/* Other available + taken slots */}
                {(otherAvailable.length > 0 || takenSlots.length > 0) && (
                  <div>
                    {recommendedSlots.length > 0 && <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Other times</p>}
                    <div className="grid grid-cols-4 gap-1 max-h-36 overflow-y-auto rounded-md border p-1.5">
                      {[...otherAvailable, ...takenSlots].sort((a, b) => a.time.localeCompare(b.time)).map((slot) => {
                        const isSelected = selectedTime === slot.time;
                        const isTaken = slot.status === "taken";
                        return (
                          <Button
                            key={slot.time}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-7 text-[10px] font-medium",
                              isTaken && "bg-destructive/15 text-destructive line-through opacity-60 border-destructive/30 hover:bg-destructive/20",
                              !isTaken && !isSelected && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25",
                            )}
                            disabled={isTaken}
                            onClick={async () => {
                              setSelectedTime(slot.time);
                              if (selectedDate) {
                                const svc = services.find(s => s.id === selectedServiceId);
                                await createHold(format(selectedDate, "yyyy-MM-dd"), slot.time, svc?.duration_minutes || 60);
                              }
                            }}
                            title={slot.reason || ""}
                          >
                            {slot.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Countdown + Summary & Book */}
      {selectedDate && selectedTime && selectedServiceId && (
        <div className="space-y-2">
          {holdSecondsLeft > 0 && (
            <div className={cn(
              "rounded-md p-2 flex items-center justify-between text-[11px] font-medium",
              holdSecondsLeft > 300 ? "bg-primary/10 text-primary border border-primary/20" :
              holdSecondsLeft > 60 ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20" :
              "bg-destructive/10 text-destructive border border-destructive/20"
            )}>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Slot reserved</span>
              <span className="font-mono">{formatCountdown()}</span>
            </div>
          )}
          <div className="rounded-md border bg-background p-2.5 space-y-1.5 text-xs">
            <p className="font-medium">{clientName}</p>
            <p>{selectedSvc?.name} · {format(selectedDate, "EEE dd MMM yyyy")} at {selectedTime}</p>
            {price && <p>£{Number(price).toFixed(2)}</p>}
            {address && (
              <p className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {address}
              </p>
            )}
          </div>
        </div>
      )}

      <Button
        onClick={handleBook}
        disabled={booking || !selectedDate || !selectedTime || !selectedServiceId}
        className="w-full"
        size="sm"
      >
        {booking ? (
          <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Booking...</>
        ) : (
          <><CalendarPlus className="mr-2 h-3.5 w-3.5" /> Confirm Booking</>
        )}
      </Button>
    </div>
  );
};

export default BookNextAppointment;
