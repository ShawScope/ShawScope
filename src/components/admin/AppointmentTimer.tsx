import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Timer, Square, X, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AppointmentTimerProps {
  appointmentId: string;
  clientName: string;
  serviceName: string;
  onStopped?: (durationSeconds: number) => void;
  onDismiss: () => void;
}

const AppointmentTimer = ({ appointmentId, clientName, serviceName, onStopped, onDismiss }: AppointmentTimerProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [stopping, setStopping] = useState(false);
  const startTimeRef = useRef<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    startTimeRef.current = new Date();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000));
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleStop = async () => {
    setStopping(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000);

    const { error } = await supabase.from("appointment_timings").upsert({
      appointment_id: appointmentId,
      started_at: startTimeRef.current.toISOString(),
      ended_at: endTime.toISOString(),
      duration_seconds: durationSeconds,
    }, { onConflict: "appointment_id" });

    if (error) {
      toast.error("Failed to save timing");
      setStopping(false);
      return;
    }

    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    toast.success(`Appointment timed: ${mins}m ${secs}s`);
    onStopped?.(durationSeconds);
    onDismiss();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {expanded ? (
        <div className="rounded-2xl bg-card border border-border shadow-2xl p-4 w-72 space-y-3 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In Progress</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-white" onClick={() => setExpanded(false)}>
              <ChevronUp className="h-4 w-4 rotate-180" />
            </Button>
          </div>
          <div className="text-center space-y-1">
            <p className="text-4xl font-mono font-bold text-white tracking-wider">{formatTime(elapsed)}</p>
            <p className="text-sm font-medium text-white truncate">{clientName}</p>
            <p className="text-xs text-muted-foreground truncate">{serviceName}</p>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleStop}
              disabled={stopping}
            >
              <Square className="mr-2 h-4 w-4" /> Stop
            </Button>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-white" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className={cn(
            "flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-xl border transition-all hover:scale-105",
            "bg-card border-red-500/40 hover:border-red-500/70"
          )}
        >
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-lg font-mono font-bold text-white">{formatTime(elapsed)}</span>
          <Timer className="h-4 w-4 text-red-400" />
        </button>
      )}
    </div>
  );
};

export default AppointmentTimer;
