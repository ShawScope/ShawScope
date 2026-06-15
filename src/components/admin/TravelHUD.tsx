import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, MapPin, AlertTriangle, ChevronUp, Minus, Plus, X, Navigation, Phone, Stethoscope, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Place = { id: string; name: string; postcode: string; is_base: boolean };

interface TravelHUDProps {
  appointmentId: string;
  clientName: string;
  serviceName: string;
  address: string | null;
  postcode: string | null;
  phone: string | null;
  arrivalIso: string; // ISO string of expected arrival
  onSilentAdjust: (aptId: string, deltaMinutes: number) => Promise<void>;
  onDelay: (apt: any) => void;
  onArrived: (aptId: string) => Promise<void>;
  onMinimize: () => void;
  onClose: () => void;
  appointment: any;
  isArrived: boolean;
  googleMapsKey?: string;
}

const TravelHUD = ({
  appointmentId,
  clientName,
  serviceName,
  address,
  postcode,
  phone,
  arrivalIso,
  onSilentAdjust,
  onDelay,
  onArrived,
  onMinimize,
  onClose,
  appointment,
  isArrived,
  googleMapsKey,
}: TravelHUDProps) => {
  const [tick, setTick] = useState(0);
  const [arriving, setArriving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Return to base state
  const [places, setPlaces] = useState<Place[]>([]);
  const [returnPlaceId, setReturnPlaceId] = useState<string>("");
  const [returnMiles, setReturnMiles] = useState<string>(
    appointment?.travel_distance_miles != null ? String(appointment.travel_distance_miles) : ""
  );
  const [loggingReturn, setLoggingReturn] = useState(false);
  const [returnLogged, setReturnLogged] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("mileage_places")
        .select("id,name,postcode,is_base")
        .order("is_base", { ascending: false })
        .order("name");
      if (cancelled) return;
      const list = (data || []) as Place[];
      setPlaces(list);
      const base = list.find(p => p.is_base) || list[0];
      if (base) setReturnPlaceId(prev => prev || base.id);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const logReturnToBase = useCallback(async () => {
    const dest = places.find(p => p.id === returnPlaceId);
    if (!dest) { toast.error("Pick a destination"); return; }
    const miles = Number(returnMiles || 0);
    if (!Number.isFinite(miles) || miles < 0) { toast.error("Enter valid miles"); return; }
    setLoggingReturn(true);
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
      const { error } = await supabase.from("mileage_journeys").insert({
        journey_date: dateStr,
        journey_time: timeStr,
        is_return_to_base: true,
        source: "return",
        from_label: clientName,
        from_postcode: postcode,
        to_label: dest.name,
        to_postcode: dest.postcode,
        miles,
        purpose: dest.is_base ? "Return to base" : `Return to ${dest.name}`,
        appointment_id: appointmentId,
      });
      if (error) throw error;
      toast.success(`Logged return to ${dest.name}`);
      setReturnLogged(true);
    } catch (e: any) {
      toast.error(e?.message || "Failed to log");
    } finally {
      setLoggingReturn(false);
    }
  }, [places, returnPlaceId, returnMiles, clientName, postcode, appointmentId]);

  const remainMs = new Date(arrivalIso).getTime() - Date.now();
  const totalSecs = Math.max(0, Math.floor(remainMs / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const isDue = remainMs <= 0;
  const isWarning = !isDue && mins <= 2;

  const countdownColor = isDue
    ? "text-red-500"
    : isWarning
      ? "text-amber-400"
      : "text-blue-400";

  const handleArrived = useCallback(async () => {
    const ok = window.confirm("Reminder: Start your voice recorder.\n\nClick OK once recording has started to mark Arrived.");
    if (!ok) return;
    setArriving(true);
    try {
      await onArrived(appointmentId);
    } finally {
      setArriving(false);
    }
  }, [appointmentId, onArrived]);

  const firstName = clientName.split(" ")[0];
  const mapQuery = encodeURIComponent(address || postcode || "");

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-blue-400" />
          <span className="text-sm font-semibold text-foreground">
            {isArrived ? "Arrived" : "En Route"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onMinimize} title="Minimise">
            <ChevronUp className="h-5 w-5 rotate-180" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose} title="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Countdown section */}
        <div className="flex flex-col items-center justify-center py-8 px-4">
          {isArrived ? (
            <div className="text-center space-y-3">
              <div className="text-6xl">📍</div>
              <p className="text-3xl font-bold text-emerald-400">Arrived!</p>
              <p className="text-lg text-muted-foreground">At {firstName}'s location</p>
            </div>
          ) : (
            <>
              <p className="text-sm uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                {isDue ? "Due Now" : "Arriving In"}
              </p>
              <p className={cn("font-mono font-black tabular-nums leading-none", countdownColor)}
                 style={{ fontSize: "clamp(5rem, 20vw, 10rem)" }}>
                {isDue ? "0:00" : `${mins}:${String(secs).padStart(2, "0")}`}
              </p>

              {/* Giant +/- buttons */}
              <div className="flex items-center gap-6 mt-8">
                <Button
                  variant="outline"
                  className="h-20 w-20 rounded-2xl border-2 border-slate-600 text-3xl font-black hover:bg-slate-800 active:scale-95 transition-transform"
                  onClick={() => onSilentAdjust(appointmentId, -1)}
                >
                  <Minus className="h-10 w-10" />
                </Button>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">1 min</span>
                <Button
                  variant="outline"
                  className="h-20 w-20 rounded-2xl border-2 border-slate-600 text-3xl font-black hover:bg-slate-800 active:scale-95 transition-transform"
                  onClick={() => onSilentAdjust(appointmentId, 1)}
                >
                  <Plus className="h-10 w-10" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        {!isArrived && (
          <div className="px-4 pb-6 space-y-3">
            <Button
              className="w-full h-16 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl active:scale-[0.98] transition-transform"
              onClick={handleArrived}
              disabled={arriving}
            >
              <MapPin className="h-6 w-6 mr-3" />
              {arriving ? "Marking arrived..." : "Arrived"}
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-base font-semibold border-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 rounded-2xl active:scale-[0.98] transition-transform"
              onClick={() => onDelay(appointment)}
            >
              <AlertTriangle className="h-5 w-5 mr-3" />
              Delayed — Notify Patient
            </Button>
          </div>
        )}

        {/* Patient info card */}
        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xl font-bold text-foreground">{clientName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Stethoscope className="h-4 w-4 text-secondary" />
                  <span className="text-sm text-muted-foreground">{serviceName}</span>
                </div>
              </div>
              {phone && (
                <a href={`tel:${phone}`} className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 active:scale-95 transition-transform">
                  <Phone className="h-6 w-6 text-blue-400" />
                </a>
              )}
            </div>

            {address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-foreground leading-snug">{address}</p>
                  {postcode && <p className="text-xs text-muted-foreground mt-0.5 font-mono">{postcode}</p>}
                </div>
              </div>
            )}

            {/* Navigate button */}
            {(address || postcode) && (
              <a
                href={`https://maps.google.com/?daddr=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 font-semibold text-sm hover:bg-blue-500/25 active:scale-[0.98] transition-transform"
              >
                <Navigation className="h-5 w-5" />
                Open in Google Maps
              </a>
            )}
          </div>
        </div>

        {/* Return to Base — log when leaving the patient */}
        {isArrived && (
          <div className="px-4 pb-4">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-amber-400" />
                <p className="text-base font-bold text-foreground">Return to Base</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Log this leg when you leave {clientName.split(" ")[0]} so it appears in your mileage.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Destination</label>
                <Select value={returnPlaceId} onValueChange={setReturnPlaceId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={places.length ? "Pick a place" : "No saved places — add in Mileage tab"} />
                  </SelectTrigger>
                  <SelectContent>
                    {places.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.is_base ? "🏠 " : ""}{p.name} · {p.postcode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Miles</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={returnMiles}
                  onChange={(e) => setReturnMiles(e.target.value)}
                  placeholder="e.g. 8.4"
                  className="h-11"
                />
              </div>
              <Button
                className="w-full h-12 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl"
                onClick={logReturnToBase}
                disabled={loggingReturn || !returnPlaceId}
              >
                <Home className="h-5 w-5 mr-2" />
                {returnLogged ? "Log another leg" : loggingReturn ? "Logging…" : "Log Return Now"}
              </Button>
              {returnLogged && (
                <p className="text-xs text-emerald-400 text-center">✓ Saved to your mileage log</p>
              )}
            </div>
          </div>
        )}

        {/* Map embed */}
        {googleMapsKey && mapQuery && (
          <div className="px-4 pb-6">
            <div className="rounded-2xl overflow-hidden border border-border" style={{ height: "250px" }}>
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${mapQuery}&zoom=15`}
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelHUD;
