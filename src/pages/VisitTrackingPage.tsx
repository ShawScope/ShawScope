import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, Clock, Car, Navigation, AlertTriangle, TrendingUp, ExternalLink, Home } from "lucide-react";
import { format, parseISO } from "date-fns";

interface DayAppointment {
  id: string;
  appointment_time: string;
  status: string;
  postcode: string | null;
  duration_minutes: number | null;
  town: string | null;
  running_late?: boolean;
}

interface EtaData {
  eta_minutes: number | null;
  eta_text: string;
  eta_arrival_time: string | null;
  is_next: boolean;
  visits_before: number;
  completed_count: number;
  total_visits: number;
  approx_lat: number | null;
  approx_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  origin_area: string;
  my_completed: boolean;
  delay_notified: boolean;
  on_my_way_sent: boolean;
  practitioner_arrived: boolean;
  ahead_of_schedule_minutes: number | null;
  running_late: boolean;
  come_to_practitioner: boolean;
  ready_from_time: string | null;
  my_appointment: {
    id: string;
    client_name: string;
    appointment_date: string;
    appointment_time: string;
  } | null;
  day_appointments: DayAppointment[];
}

export default function VisitTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eta, setEta] = useState<EtaData | null>(null);

  // Stable arrival time — only updates when server gives a significantly different ETA
  const [arrivalTarget, setArrivalTarget] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  const fetchEta = useCallback(async () => {
    if (!token) return;
    try {
      const { data, error: fnError } = await supabase.functions.invoke("visit-eta", {
        body: { token },
      });
      if (fnError) {
        setEta(prev => {
          if (!prev) setError("Unable to load tracking data.");
          return prev;
        });
      } else if (data) {
        if (data.error) {
          setError(data.error);
        } else {
          setEta(data);

          if (data.eta_arrival_time) {
            const serverArrival = new Date(data.eta_arrival_time);
            setArrivalTarget(prev => {
              if (!prev) return serverArrival;
              const nowMs = Date.now();
              const prevMs = prev.getTime();
              const serverMs = serverArrival.getTime();
              if (prevMs < nowMs - 120000) return serverArrival;
              if (serverMs > prevMs) {
                if (data.delay_notified && (serverMs - prevMs) > 60000) return serverArrival;
                return prev;
              }
              return (prevMs - serverMs) > 30000 ? serverArrival : prev;
            });
          } else {
            setArrivalTarget(null);
          }
        }
      }
    } catch {
      setEta(prev => {
        if (!prev) setError("Unable to load tracking data.");
        return prev;
      });
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchEta(); }, [fetchEta]);

  useEffect(() => {
    if (!eta?.my_appointment) return;
    const channel = supabase
      .channel(`visit-tracking-${eta.my_appointment.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "appointments", filter: `appointment_date=eq.${eta.my_appointment.appointment_date}` }, () => { fetchEta(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "communications_log", filter: `appointment_id=eq.${eta.my_appointment.id}` }, () => { fetchEta(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eta?.my_appointment?.appointment_date, eta?.my_appointment?.id, fetchEta]);

  useEffect(() => {
    if (!eta?.my_appointment || eta?.my_completed) return;
    const interval = setInterval(fetchEta, 60000);
    return () => clearInterval(interval);
  }, [eta?.my_appointment, eta?.my_completed, fetchEta]);

  useEffect(() => {
    if (!arrivalTarget) { setCountdown(""); return; }
    const tick = () => {
      const remaining = arrivalTarget.getTime() - Date.now();
      if (remaining <= 0) { setCountdown(""); return; }
      const mins = Math.floor(remaining / 60000);
      setCountdown(mins > 0 ? `~${mins} min${mins !== 1 ? "s" : ""}` : "Less than a minute");
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [arrivalTarget]);

  const hasArrived = arrivalTarget && arrivalTarget.getTime() <= Date.now();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4912A]" />
      </div>
    );
  }

  if (error || !eta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="max-w-md w-full rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="bg-[#0E1420] px-6 py-5 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="font-light text-lg tracking-[4px] text-[#E8ECF1]">SHAW</span>
              <span className="font-light text-lg tracking-[4px] text-[#D4912A]">SCOPE</span>
            </div>
          </div>
          <div className="p-6 text-center">
            <p className="text-red-600 text-sm">{error || "Unable to load tracking data."}</p>
          </div>
        </div>
      </div>
    );
  }

  const myAppointment = eta.my_appointment;
  const dayAppointments = eta.day_appointments || [];
  const myCompleted = eta.my_completed;

  if (myCompleted) {
    return (
      <div className="min-h-screen bg-white p-4 flex items-center justify-center">
        <div className="max-w-md w-full rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="bg-[#0E1420] px-6 py-5 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="font-light text-lg tracking-[4px] text-[#E8ECF1]">SHAW</span>
              <span className="font-light text-lg tracking-[4px] text-[#D4912A]">SCOPE</span>
            </div>
          </div>
          <div className="p-8 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-[#0E1420]">Visit Complete</h2>
            <p className="text-sm text-[#6B7280]">
              Your appointment with Matt has been completed. Thank you for choosing ShawScope!
            </p>
            <p className="text-xs text-[#9CA3AF] pt-2">
              This tracking page is no longer active.
            </p>
          </div>
          <div className="bg-[#0E1420] px-6 py-3 text-center">
            <p className="text-[11px] text-[#7A8494]">Dorchester, Dorset · <a href="https://shawscope.co.uk" className="text-[#D4912A] no-underline">shawscope.co.uk</a></p>
          </div>
        </div>
      </div>
    );
  }

  // ── Clinic Visit (come to practitioner) variant ──
  if (eta.come_to_practitioner) {
    const readyTime = eta.ready_from_time?.slice(0, 5);
    const aptTime = myAppointment?.appointment_time?.slice(0, 5);
    const locationInfoUrl = `/location-info/${token}`;

    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-md mx-auto">
          <div className="bg-[#0E1420] px-6 py-6 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="font-light text-xl tracking-[4px] text-[#E8ECF1]">SHAW</span>
              <span className="font-light text-xl tracking-[4px] text-[#D4912A]">SCOPE</span>
            </div>
            <p className="text-[11px] text-[#7A8494] tracking-[2px] uppercase">Your Appointment</p>
          </div>

          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-[#E5E7EB] p-5 space-y-4">
              <div className="text-center">
                <p className="text-sm text-[#6B7280]">Hi <strong className="text-[#0E1420]">{myAppointment?.client_name}</strong></p>
                <p className="text-lg font-bold text-[#0E1420] mt-1">Your appointment at our clinic</p>
              </div>

              {readyTime ? (
                <div className="py-3 px-4 rounded-xl text-center border text-emerald-700 bg-emerald-50 border-emerald-200">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold text-sm">We're ready for you! 🏠</span>
                  </div>
                  <p className="text-xs mt-1 opacity-80 font-medium">
                    You can arrive anytime from <strong>{readyTime}</strong> up to your appointment at <strong>{aptTime}</strong>
                  </p>
                </div>
              ) : (
                <div className="py-3 px-4 rounded-xl text-center border text-amber-700 bg-amber-50 border-amber-200">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-semibold text-sm">Please wait for our message</span>
                  </div>
                  <p className="text-xs mt-1 opacity-80 font-medium">
                    We'll text you when we're ready. Please plan to arrive by your appointment at <strong>{aptTime}</strong> unless you hear from us sooner.
                  </p>
                </div>
              )}

              <div className="rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] p-4 text-center space-y-2">
                <p className="text-sm font-semibold text-[#0E1420]">Can you arrive earlier?</p>
                <p className="text-xs text-[#6B7280]">If you're available sooner, let Matt know and he may be able to see you earlier.</p>
                <a href={`/visit-ready/${token}`}>
                  <Button size="sm" className="bg-[#D4912A] hover:bg-[#b87a22] text-white mt-1 rounded-lg">
                    <Clock className="h-3.5 w-3.5 mr-1.5" /> Update my available time
                  </Button>
                </a>
              </div>
            </div>

            {myAppointment && (
              <div className="rounded-xl border-2 border-[#D4912A]/30 bg-[#D4912A]/5 p-5 text-center">
                <p className="text-xs text-[#D4912A] uppercase tracking-wide font-semibold mb-1">Your Appointment</p>
                <p className="text-xl font-bold text-[#0E1420]">{aptTime}</p>
                <p className="text-xs text-[#6B7280] mt-1">{format(parseISO(myAppointment.appointment_date), "EEEE d MMMM yyyy")}</p>
              </div>
            )}

            <a href={locationInfoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#0E1420] text-white font-semibold text-sm hover:bg-[#1a2436] transition-colors">
              <ExternalLink className="h-4 w-4" /> View Address, Parking & Directions
            </a>

            <div className="text-center pb-4 pt-2">
              <p className="text-[11px] text-[#9CA3AF]">This page updates automatically</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="font-light text-xs tracking-[2px] text-[#9CA3AF]">SHAW</span>
                <span className="font-light text-xs tracking-[2px] text-[#D4912A]">SCOPE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalVisits = eta.total_visits;
  const completedVisits = dayAppointments.filter(a => a.status === "completed").length;
  const myIndex = dayAppointments.findIndex(a => a.id === myAppointment?.id);
  const myVisitNumber = myIndex + 1;
  const progressPercent = totalVisits > 0 ? (completedVisits / totalVisits) * 100 : 0;
  const isNext = eta.is_next || (completedVisits >= myIndex && !myCompleted);

  const arrivalTimeStr = arrivalTarget
    ? `${String(arrivalTarget.getHours()).padStart(2, "0")}:${String(arrivalTarget.getMinutes()).padStart(2, "0")}`
    : null;

  const getScheduleStatus = () => {
    const noLiveEta = !arrivalTarget && eta.eta_minutes == null;

    if (eta.practitioner_arrived) {
      return { text: "Matt has arrived! 🎉", subtext: "He's at your location now", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle };
    }
    if (isNext && eta.on_my_way_sent && hasArrived) {
      return { text: "He should be with you any minute!", subtext: "Please keep an eye out for him 👀", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: Car };
    }
    if (isNext && eta.on_my_way_sent && countdown) {
      return { text: "Matt is on his way!", subtext: `ETA: ${countdown} · Arriving ~${arrivalTimeStr}`, color: "text-blue-700 bg-blue-50 border-blue-200", icon: Car };
    }
    if (isNext && eta.on_my_way_sent && !noLiveEta) return { text: "You're next! Matt is on his way 🚗", subtext: null, color: "text-blue-700 bg-blue-50 border-blue-200", icon: Car };
    if (isNext && !eta.on_my_way_sent) {
      const bookedTime = myAppointment?.appointment_time?.slice(0, 5);
      return { text: "You're next!", subtext: bookedTime ? `Expected ~${bookedTime}` : null, color: "text-blue-700 bg-blue-50 border-blue-200", icon: Clock };
    }
    if (eta.running_late && !eta.on_my_way_sent) {
      return { text: "Matt appears to be running slightly late", subtext: "He'll be on his way to you shortly", color: "text-amber-700 bg-amber-50 border-amber-200", icon: AlertTriangle };
    }
    const anyLate = dayAppointments.some(a => a.running_late && a.status !== "completed");
    if (anyLate && !eta.on_my_way_sent && !isNext) {
      return { text: "Matt is running slightly behind schedule", subtext: "Your visit may be a little later than planned", color: "text-amber-700 bg-amber-50 border-amber-200", icon: AlertTriangle };
    }
    if (eta.ahead_of_schedule_minutes && eta.ahead_of_schedule_minutes >= 5) {
      const mins = eta.ahead_of_schedule_minutes;
      return { text: `Ahead of schedule by ~${mins} min${mins !== 1 ? "s" : ""}`, subtext: "Matt may arrive earlier than expected!", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: TrendingUp };
    }
    if (noLiveEta) {
      const bookedTime = myAppointment?.appointment_time?.slice(0, 5);
      return { text: bookedTime ? `On schedule · Expected ~${bookedTime}` : "On schedule", subtext: null, color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle };
    }
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const expectedCompleted = dayAppointments.filter(a => a.appointment_time < currentTimeStr).length;
    const behindSchedule = completedVisits < expectedCompleted - 1;
    if (behindSchedule) {
      return { text: "Running a little behind schedule", subtext: arrivalTimeStr ? `ETA ~${arrivalTimeStr}` : null, color: "text-amber-700 bg-amber-50 border-amber-200", icon: Clock };
    }
    return { text: arrivalTimeStr ? `On schedule · ETA ~${arrivalTimeStr}` : "On schedule", subtext: countdown ? countdown : null, color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle };
  };

  const status = getScheduleStatus();
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto">
        {/* Branded Header */}
        <div className="bg-[#0E1420] px-6 py-6 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="font-light text-xl tracking-[4px] text-[#E8ECF1]">SHAW</span>
            <span className="font-light text-xl tracking-[4px] text-[#D4912A]">SCOPE</span>
          </div>
          <p className="text-[11px] text-[#7A8494] tracking-[2px] uppercase">Visit Tracker</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Visit count + progress */}
          <div className="rounded-xl border border-[#E5E7EB] p-5 space-y-4">
            <div className="text-center">
              <p className="text-sm text-[#6B7280]">Hi <strong className="text-[#0E1420]">{myAppointment?.client_name}</strong></p>
              <p className="text-2xl font-bold text-[#0E1420] mt-1">
                You are visit {myVisitNumber} of {totalVisits}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#9CA3AF]">
                <span>{completedVisits} completed</span>
                <span>{totalVisits - completedVisits} remaining</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>

            {/* Status banner */}
            <div className={`py-3 px-4 rounded-xl text-center border ${status.color}`}>
              <div className="flex items-center justify-center gap-2">
                <StatusIcon className="h-5 w-5" />
                <span className="font-semibold text-sm">{status.text}</span>
              </div>
              {status.subtext && (
                <p className="text-xs mt-1 opacity-80 font-medium">{status.subtext}</p>
              )}
            </div>

            {/* Practitioner arrived */}
            {eta.practitioner_arrived && (
              <div className="text-center py-2">
                <p className="text-2xl font-bold text-emerald-600">🎉 Matt has arrived!</p>
                <p className="text-sm text-[#6B7280] mt-1">He's at your location now</p>
              </div>
            )}

            {/* Countdown display */}
            {isNext && eta.on_my_way_sent && !eta.practitioner_arrived && countdown && !hasArrived && (
              <div className="text-center">
                <p className="text-3xl font-bold text-[#D4912A] tabular-nums">{countdown}</p>
                <p className="text-xs text-[#9CA3AF] mt-1">estimated time remaining</p>
              </div>
            )}

            {/* Almost there */}
            {isNext && eta.on_my_way_sent && !eta.practitioner_arrived && hasArrived && (
              <div className="text-center py-2">
                <p className="text-2xl font-bold text-emerald-600">🚗 Almost there!</p>
                <p className="text-sm text-[#6B7280] mt-1">He should be with you any minute — please keep an eye out for him</p>
              </div>
            )}

            {/* Delay notification */}
            {eta.delay_notified && !hasArrived && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-semibold text-amber-800">⚠️ Slight Delay</p>
                <p className="text-xs text-amber-600 mt-1">
                  Matt is running a little behind due to traffic but is still on his way. He'll be with you as soon as possible!
                </p>
              </div>
            )}

            {/* Ahead of schedule */}
            {eta.ahead_of_schedule_minutes && eta.ahead_of_schedule_minutes >= 5 && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
                <p className="text-sm font-semibold text-emerald-800">
                  🎉 Matt is ~{eta.ahead_of_schedule_minutes} min{eta.ahead_of_schedule_minutes !== 1 ? "s" : ""} ahead of schedule!
                </p>
                <p className="text-xs text-emerald-600">
                  He may be able to visit you sooner. If you're available earlier, let us know:
                </p>
                <Link to={`/visit-ready/${token}`}>
                  <Button size="sm" className="bg-[#D4912A] hover:bg-[#b87a22] text-white mt-1 rounded-lg">
                    <Clock className="h-3.5 w-3.5 mr-1.5" /> Update my available time
                  </Button>
                </Link>
              </div>
            )}

            {!isNext && eta.visits_before > 0 && (
              <p className="text-center text-xs text-[#9CA3AF]">
                {eta.visits_before} visit{eta.visits_before !== 1 ? "s" : ""} before yours
              </p>
            )}
          </div>

          {/* Current area */}
          {eta.origin_area && (
            <div className="rounded-xl border border-[#E5E7EB] p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#D4912A]/10 flex items-center justify-center">
                  <Navigation className="h-5 w-5 text-[#D4912A]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0E1420]">Current Area</p>
                  <p className="text-xs text-[#6B7280]">
                    Matt was last in the <strong className="text-[#0E1420]">{eta.origin_area}</strong> area
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Visit timeline */}
          <div className="rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="bg-[#0E1420] px-4 py-2.5">
              <p className="text-[11px] text-[#E8ECF1] font-semibold uppercase tracking-[1px]">🗓️ Today's Route</p>
            </div>
            <div className="p-4 space-y-0">
              {dayAppointments.map((apt, i) => {
                const isMe = apt.id === myAppointment?.id;
                const isDone = apt.status === "completed";
                const isCurrent = !isDone && i === completedVisits;
                const postcodeDistrict = apt.postcode?.split(" ")[0] || "";

                return (
                  <div key={apt.id} className="flex items-start gap-3 relative">
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        isDone ? "bg-emerald-100 border-emerald-500 text-emerald-700" :
                        isCurrent ? "bg-[#D4912A]/10 border-[#D4912A] text-[#D4912A] animate-pulse" :
                        isMe ? "bg-[#D4912A]/10 border-[#D4912A] text-[#D4912A]" :
                        "bg-[#F9FAFB] border-[#E5E7EB] text-[#9CA3AF]"
                      }`}>
                        {isDone ? <CheckCircle className="h-4 w-4" /> : i + 1}
                      </div>
                      {i < dayAppointments.length - 1 && (
                        <div className={`w-0.5 h-8 ${isDone ? "bg-emerald-300" : "bg-[#E5E7EB]"}`} />
                      )}
                    </div>

                    <div className={`pb-4 flex-1 ${isMe ? "font-semibold" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isDone ? "text-emerald-700 line-through" : isCurrent ? "text-[#D4912A]" : "text-[#6B7280]"}`}>
                          Visit {i + 1}
                          {isMe && " — You!"}
                        </span>
                        {isMe && (
                          <Badge className="text-[10px] bg-[#D4912A]/10 text-[#D4912A] border border-[#D4912A]/30 px-1.5 py-0 hover:bg-[#D4912A]/20">
                            Your Visit
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge className="text-[10px] bg-[#D4912A] text-white px-1.5 py-0 hover:bg-[#D4912A]">
                            Next
                          </Badge>
                        )}
                        {apt.running_late && apt.status !== "completed" && (
                          <Badge className="text-[10px] bg-amber-50 text-amber-700 border border-amber-300 px-1.5 py-0 hover:bg-amber-100">
                            ⚠ Late
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        {apt.appointment_time.slice(0, 5)}
                        {!isMe && (apt.town ? ` · ${apt.town}` : postcodeDistrict ? ` · ${postcodeDistrict} area` : "")}
                        {isMe && (apt.town ? ` · ${apt.town}` : apt.postcode ? ` · ${apt.postcode}` : "")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Your appointment card */}
          {myAppointment && (
            <div className="rounded-xl border-2 border-[#D4912A]/30 bg-[#D4912A]/5 p-5 text-center">
              <p className="text-xs text-[#D4912A] uppercase tracking-wide font-semibold mb-1">Your Appointment</p>
              <p className="text-xl font-bold text-[#0E1420]">{myAppointment.appointment_time?.slice(0, 5)}</p>
              <p className="text-xs text-[#6B7280] mt-1">
                {format(parseISO(myAppointment.appointment_date), "EEEE d MMMM yyyy")}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pb-4 pt-2">
            <p className="text-[11px] text-[#9CA3AF]">This page updates automatically</p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <span className="font-light text-xs tracking-[2px] text-[#9CA3AF]">SHAW</span>
              <span className="font-light text-xs tracking-[2px] text-[#D4912A]">SCOPE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
