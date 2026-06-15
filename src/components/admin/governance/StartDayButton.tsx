import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Loader2, LogOut, Play } from "lucide-react";
import { format } from "date-fns";

interface ActiveCheckin {
  id: string;
  start_time: string;
  expected_end: string | null;
}

interface Props {
  /** Display variant — compact for dashboard pulse, full for inside lone-worker register */
  variant?: "compact" | "full" | "icon";
}

const StartDayButton: React.FC<Props> = ({ variant = "compact" }) => {
  const [active, setActive] = useState<ActiveCheckin | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasTodayAppts, setHasTodayAppts] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("gov_lone_worker_checkins")
      .select("id, start_time, expected_end, status")
      .eq("status", "active")
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActive(data ? { id: (data as any).id, start_time: (data as any).start_time, expected_end: (data as any).expected_end } : null);

    const today = format(new Date(), "yyyy-MM-dd");
    const { count } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("appointment_date", today)
      .not("status", "in", "(cancelled,rejected,rejected_awaiting,form_only)");
    setHasTodayAppts((count ?? 0) > 0);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const start = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("lone-worker-start-day", {});
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success((data as any)?.email_sent
        ? "Day started — wife notified by email"
        : "Day started (email not sent — check Resend configuration)");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Could not start day");
    }
    setLoading(false);
  };

  const end = async () => {
    if (!confirm("End your clinic day and notify your emergency contact?")) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("lone-worker-end-day", {});
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success((data as any)?.email_sent
        ? "Day ended — wife notified by email"
        : "Day ended (email not sent)");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Could not end day");
    }
    setLoading(false);
  };

  if (variant === "full") {
    return (
      <Card className={`p-4 ${active ? "bg-emerald-500/10 border-emerald-500/40" : "bg-slate-950/60 border-slate-800"}`}>
        <div className="flex items-center gap-3">
          {active
            ? <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
            : <ShieldAlert className="h-6 w-6 text-amber-400 shrink-0" />}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm">
              {active ? "Clinic day in progress" : "Lone-worker check-in"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {active
                ? `Started ${format(new Date(active.start_time), "HH:mm")} · Wife notified by email`
                : hasTodayAppts
                  ? "Tap Start Day to email your wife your schedule"
                  : "No appointments today"}
            </div>
          </div>
          {active ? (
            <Button onClick={end} disabled={loading} size="sm" className="h-9 bg-rose-500/15 border border-rose-500/40 text-rose-200 hover:bg-rose-500/25">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <LogOut className="h-3.5 w-3.5 mr-1" />} End day
            </Button>
          ) : (
            <Button onClick={start} disabled={loading || !hasTodayAppts} size="sm" className="h-9 bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />} Start day
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (variant === "icon") {
    const endPassed = active?.expected_end ? new Date(active.expected_end).getTime() < Date.now() : false;
    // States: no bookings & not active → no bg; bookings & not started → amber pulse; active & before end → green; active & past end → amber pulse
    let tone = "text-sidebar-foreground/60 hover:text-sidebar-foreground";
    if (active && !endPassed) {
      tone = "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30";
    } else if (active && endPassed) {
      tone = "bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 animate-pulse";
    } else if (hasTodayAppts) {
      tone = "bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 animate-pulse";
    }
    const Icon = active && !endPassed ? ShieldCheck : ShieldAlert;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`relative ${tone}`}
            title={active ? "Lone-worker check-in active" : "Lone-worker safety check-in"}
          >
            <Icon className="h-5 w-5" />
            {active && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-400" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-3 bg-slate-900 border-slate-700">
          <div className="flex items-start gap-2 mb-3">
            <Icon className={`h-5 w-5 shrink-0 ${active ? "text-emerald-400" : "text-amber-400"}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white">
                {active ? "Day in progress" : "Lone-worker safety"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {active
                  ? `Started ${format(new Date(active.start_time), "HH:mm")} · Wife notified by email`
                  : hasTodayAppts
                    ? "Email your wife today's schedule before heading out"
                    : "No appointments scheduled today"}
              </div>
            </div>
          </div>
          {active ? (
            <Button onClick={end} disabled={loading} size="sm" className="w-full h-9 bg-rose-500/15 border border-rose-500/40 text-rose-200 hover:bg-rose-500/25">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <LogOut className="h-3.5 w-3.5 mr-1" />} End day & notify
            </Button>
          ) : (
            <Button onClick={start} disabled={loading || !hasTodayAppts} size="sm" className="w-full h-9 bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />} Start day & notify
            </Button>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  // Compact dashboard pulse
  if (!hasTodayAppts && !active) return null;
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${active ? "bg-emerald-500/10 border-emerald-500/40" : "bg-amber-500/10 border-amber-500/40 animate-pulse"}`}>
      <div className="flex items-center gap-2 min-w-0">
        {active
          ? <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          : <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />}
        <span className="text-xs truncate">
          {active
            ? `Lone-worker active since ${format(new Date(active.start_time), "HH:mm")}`
            : "Start your safety check-in before heading out"}
        </span>
      </div>
      {active ? (
        <Button onClick={end} disabled={loading} size="sm" className="h-7 text-xs bg-rose-500/20 border border-rose-500/40 text-rose-100 hover:bg-rose-500/30 shrink-0">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><LogOut className="h-3 w-3 mr-1" /> End day</>}
        </Button>
      ) : (
        <Button onClick={start} disabled={loading} size="sm" className="h-7 text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/30 shrink-0">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Play className="h-3 w-3 mr-1" /> Start day</>}
        </Button>
      )}
    </div>
  );
};

export default StartDayButton;