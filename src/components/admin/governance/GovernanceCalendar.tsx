import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { UpcomingRenewal, ragForDays, ragTone, sourceLabel } from "./types";

export const GovernanceCalendar: React.FC = () => {
  const [renewals, setRenewals] = useState<UpcomingRenewal[]>([]);
  const [month, setMonth] = useState(startOfMonth(new Date()));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("gov_upcoming_renewals" as any).select("*").order("due_date", { ascending: true });
      setRenewals((data as any) ?? []);
    })();
  }, []);

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month]);
  const byDay = useMemo(() => {
    const m = new Map<string, UpcomingRenewal[]>();
    renewals.forEach(r => {
      const key = r.due_date;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    });
    return m;
  }, [renewals]);

  const today = new Date();
  const upcomingThisMonth = renewals.filter(r => isSameMonth(parseISO(r.due_date), month));

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-slate-950/60 border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-amber-400" />
            <h3 className="font-serif text-lg">{format(month, "MMMM yyyy")}</h3>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <div className="grid grid-cols-7 gap-1 text-center min-w-[320px]">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
              <div key={d} className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground py-1">{d}</div>
            ))}
            {(() => {
              const firstDow = (days[0].getDay() + 6) % 7; // make Mon=0
              const blanks = Array.from({ length: firstDow });
              return (
                <>
                  {blanks.map((_, i) => <div key={`b-${i}`} />)}
                  {days.map(d => {
                    const key = format(d, "yyyy-MM-dd");
                    const items = byDay.get(key) ?? [];
                    const isToday = isSameDay(d, today);
                    const hasOverdue = items.some(it => differenceInCalendarDays(parseISO(it.due_date), today) < 0);
                    const hasSoon = items.some(it => {
                      const days = differenceInCalendarDays(parseISO(it.due_date), today);
                      return days >= 0 && days <= 30;
                    });
                    return (
                      <div key={key} className={cn(
                        "min-h-[48px] sm:min-h-[64px] rounded-md border p-1 text-left text-[9px] sm:text-[10px]",
                        isToday ? "border-amber-500/60 bg-amber-500/5" : "border-slate-800/60 bg-slate-900/30",
                      )}>
                        <div className={cn("font-semibold", isToday ? "text-amber-300" : "text-foreground")}>{format(d, "d")}</div>
                        <div className="mt-0.5 space-y-0.5">
                          {items.slice(0,2).map((it, i) => (
                            <div key={i} className={cn("truncate rounded px-1 py-px text-[8px] sm:text-[9px] border", hasOverdue ? ragTone.overdue : hasSoon ? ragTone.due_soon : ragTone.ok)}>
                              {it.title}
                            </div>
                          ))}
                          {items.length > 2 && <div className="text-[8px] sm:text-[9px] text-muted-foreground">+{items.length-2}</div>}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-slate-950/60 border-slate-800">
        <h4 className="font-serif text-sm mb-3">Agenda — {format(month, "MMMM")}</h4>
        {upcomingThisMonth.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing scheduled this month.</p>
        ) : (
          <div className="space-y-1.5">
            {upcomingThisMonth.map((r, i) => {
              const days = differenceInCalendarDays(parseISO(r.due_date), today);
              const rag = ragForDays(days);
              return (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/60 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-slate-700 text-muted-foreground shrink-0">{sourceLabel[r.source] ?? r.source}</Badge>
                    <span className="truncate">{r.title}</span>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] shrink-0", ragTone[rag])}>{format(parseISO(r.due_date), "dd/MM/yyyy")}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default GovernanceCalendar;