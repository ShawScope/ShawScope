import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  AlertTriangle, ShieldCheck, CalendarClock, FileWarning, Activity, ListChecks,
  ArrowRight, Stethoscope, Lock, GraduationCap, ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CQC_DOMAINS, UpcomingRenewal, ragForDays, ragTone, sourceLabel } from "./types";

interface Props {
  onNavigate: (sectionKey: string) => void;
}

const formatDate = (d: string) => format(parseISO(d), "dd/MM/yyyy");

export const GovernanceOverview: React.FC<Props> = ({ onNavigate }) => {
  const [renewals, setRenewals] = useState<UpcomingRenewal[]>([]);
  const [openIncidents, setOpenIncidents] = useState(0);
  const [openComplaints, setOpenComplaints] = useState(0);
  const [openSafeguarding, setOpenSafeguarding] = useState(0);
  const [openBreaches, setOpenBreaches] = useState(0);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ren, inc, comp, safe, breach, recInc, recAud] = await Promise.all([
        supabase.from("gov_upcoming_renewals" as any).select("*").order("due_date", { ascending: true }).limit(50),
        supabase.from("gov_incidents").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("gov_complaints").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("gov_safeguarding").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("gov_gdpr_breaches").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("gov_incidents").select("id,incident_date,type,severity,description,status").order("incident_date", { ascending: false }).limit(5),
        supabase.from("gov_audits").select("id,audit_date,audit_type,score,findings").order("audit_date", { ascending: false }).limit(5),
      ]);
      setRenewals((ren.data as any) ?? []);
      setOpenIncidents(inc.count ?? 0);
      setOpenComplaints(comp.count ?? 0);
      setOpenSafeguarding(safe.count ?? 0);
      setOpenBreaches(breach.count ?? 0);
      setRecentIncidents(recInc.data ?? []);
      setRecentAudits(recAud.data ?? []);
      setLoading(false);
    })();
  }, []);

  const today = useMemo(() => new Date(), []);
  const enriched = useMemo(
    () => renewals.map(r => ({ ...r, days: differenceInCalendarDays(parseISO(r.due_date), today), rag: ragForDays(differenceInCalendarDays(parseISO(r.due_date), today)) })),
    [renewals, today]
  );
  const overdue = enriched.filter(r => r.rag === "overdue");
  const dueSoon = enriched.filter(r => r.rag === "due_soon");
  const dueLater = enriched.filter(r => r.rag === "due_later");

  // governance score: 100 - 5 per overdue - 2 per due_soon - 3 per open incident - 4 per open breach
  const score = Math.max(0, Math.min(100,
    100 - overdue.length * 5 - dueSoon.length * 2 - openIncidents * 3 - openBreaches * 4 - openSafeguarding * 4
  ));

  const scoreTone = score >= 85 ? "text-emerald-300" : score >= 65 ? "text-amber-300" : "text-rose-300";

  const domainStatus = useMemo(() => {
    const status: Record<string, "green" | "amber" | "red"> = {
      safe: openIncidents > 0 || openSafeguarding > 0 ? "red" : overdue.some(r => ["risk_assessment", "ipc_audit"].includes(r.source)) ? "amber" : "green",
      effective: overdue.some(r => ["equipment_service", "equipment_filter", "calibration", "audit"].includes(r.source)) ? "red" : dueSoon.some(r => ["equipment_service", "calibration", "audit"].includes(r.source)) ? "amber" : "green",
      caring: openComplaints > 0 ? "amber" : "green",
      responsive: openComplaints > 1 ? "red" : openComplaints > 0 ? "amber" : "green",
      well_led: overdue.some(r => ["credential", "training", "policy"].includes(r.source)) ? "red" : dueSoon.some(r => ["credential", "training", "policy"].includes(r.source)) ? "amber" : "green",
    };
    return status;
  }, [overdue, dueSoon, openIncidents, openSafeguarding, openComplaints]);

  return (
    <div className="space-y-4">
      {/* Outstanding actions — top of overview */}
      <OutstandingActions
        loading={loading}
        overdue={overdue}
        dueSoon={dueSoon}
        openIncidents={openIncidents}
        openComplaints={openComplaints}
        openSafeguarding={openSafeguarding}
        openBreaches={openBreaches}
        onNavigate={onNavigate}
      />

      {/* Score & status pills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Governance score</p>
              <p className={cn("text-5xl font-bold mt-1 font-serif", scoreTone)}>{score}<span className="text-xl text-muted-foreground">/100</span></p>
            </div>
            <ShieldCheck className={cn("h-12 w-12", scoreTone)} strokeWidth={1.5} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/5 text-[10px]"><Lock className="h-2.5 w-2.5 mr-1" /> 2FA Active</Badge>
            <Badge variant="outline" className="border-sky-500/40 text-sky-300 bg-sky-500/5 text-[10px]">RLS Enforced</Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/5 text-[10px]">UK GDPR</Badge>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-slate-950/60 border-slate-800 lg:col-span-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">CQC key questions</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {CQC_DOMAINS.map(d => {
              const s = domainStatus[d.key];
              const tone = s === "red" ? "bg-rose-500/15 text-rose-300 border-rose-500/40" : s === "amber" ? "bg-amber-500/15 text-amber-300 border-amber-500/40" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
              return (
                <div key={d.key} className={cn("rounded-lg border px-2 py-2.5 text-center", tone)}>
                  <div className="text-[10px] uppercase tracking-wider opacity-80">{d.label}</div>
                  <div className="text-base font-bold mt-0.5 capitalize">{s}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <KpiTile icon={AlertTriangle} label="Open incidents" value={openIncidents} tone={openIncidents ? "text-rose-300" : "text-emerald-300"} onClick={() => onNavigate("incidents")} />
        <KpiTile icon={FileWarning} label="Safeguarding" value={openSafeguarding} tone={openSafeguarding ? "text-rose-300" : "text-emerald-300"} onClick={() => onNavigate("safeguarding")} />
        <KpiTile icon={Activity} label="Open complaints" value={openComplaints} tone={openComplaints ? "text-amber-300" : "text-emerald-300"} onClick={() => onNavigate("complaints")} />
        <KpiTile icon={Lock} label="GDPR breaches" value={openBreaches} tone={openBreaches ? "text-rose-300" : "text-emerald-300"} onClick={() => onNavigate("gdpr")} />
      </div>

      {/* Upcoming renewals */}
      <Card className="p-4 sm:p-5 bg-slate-950/60 border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-400" />
            <h3 className="font-serif text-base">Upcoming renewals & reviews</h3>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onNavigate("calendar")} className="h-7 text-xs">
            View calendar <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : enriched.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing scheduled. Add equipment, credentials, audits or risk assessments to populate this list.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {enriched.slice(0, 12).map((r, i) => (
              <div key={`${r.source}-${r.id}-${i}`} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-slate-900/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-slate-700 text-muted-foreground">{sourceLabel[r.source] ?? r.source}</Badge>
                    <span className="text-sm truncate">{r.title}</span>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", ragTone[r.rag])}>
                  {r.rag === "overdue" ? `Overdue ${Math.abs(r.days)}d` : `In ${r.days}d`} · {formatDate(r.due_date)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent incidents + recent audits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4 bg-slate-950/60 border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <h3 className="font-serif text-base">Recent incidents</h3>
          </div>
          {recentIncidents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No incidents logged.</p>
          ) : (
            <div className="space-y-1.5">
              {recentIncidents.map(i => (
                <div key={i.id} className="text-xs flex items-start justify-between gap-2 py-1.5 border-b border-slate-800/60 last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{i.type}</p>
                    <p className="text-muted-foreground truncate">{i.description}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(i.incident_date)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4 bg-slate-950/60 border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-4 w-4 text-sky-400" />
            <h3 className="font-serif text-base">Recent audits</h3>
          </div>
          {recentAudits.length === 0 ? (
            <p className="text-xs text-muted-foreground">No audits recorded.</p>
          ) : (
            <div className="space-y-1.5">
              {recentAudits.map(a => (
                <div key={a.id} className="text-xs flex items-start justify-between gap-2 py-1.5 border-b border-slate-800/60 last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.audit_type}</p>
                    <p className="text-muted-foreground truncate">{a.findings ?? "—"}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{a.score != null ? `${a.score}%` : ""} · {formatDate(a.audit_date)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const KpiTile: React.FC<{ icon: any; label: string; value: number; tone: string; onClick?: () => void }> = ({ icon: Icon, label, value, tone, onClick }) => (
  <button onClick={onClick} className="text-left">
    <Card className="p-3 sm:p-4 bg-slate-950/60 border-slate-800 hover:border-amber-500/40 transition-colors">
      <div className="flex items-center justify-between">
        <Icon className={cn("h-4 w-4", tone)} />
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className={cn("text-2xl font-bold mt-1", tone)}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </Card>
  </button>
);

export default GovernanceOverview;

interface OutstandingActionsProps {
  loading: boolean;
  overdue: Array<UpcomingRenewal & { days: number; rag: string }>;
  dueSoon: Array<UpcomingRenewal & { days: number; rag: string }>;
  openIncidents: number;
  openComplaints: number;
  openSafeguarding: number;
  openBreaches: number;
  onNavigate: (k: string) => void;
}

const OutstandingActions: React.FC<OutstandingActionsProps> = ({
  loading, overdue, dueSoon, openIncidents, openComplaints, openSafeguarding, openBreaches, onNavigate,
}) => {
  const actions: { label: string; tone: string; key: string; sub?: string }[] = [];
  if (openIncidents > 0) actions.push({ label: `${openIncidents} open incident${openIncidents>1?"s":""}`, tone: "rose", key: "incidents", sub: "Investigate & close" });
  if (openSafeguarding > 0) actions.push({ label: `${openSafeguarding} safeguarding concern${openSafeguarding>1?"s":""}`, tone: "rose", key: "safeguarding", sub: "Action required" });
  if (openBreaches > 0) actions.push({ label: `${openBreaches} GDPR breach${openBreaches>1?"es":""}`, tone: "rose", key: "gdpr", sub: "Within 72h to ICO" });
  if (openComplaints > 0) actions.push({ label: `${openComplaints} open complaint${openComplaints>1?"s":""}`, tone: "amber", key: "complaints", sub: "Respond & resolve" });
  overdue.slice(0, 5).forEach(r => actions.push({ label: r.title, tone: "rose", key: r.source === "credential" ? "credentials" : r.source === "training" ? "training" : r.source === "policy" ? "policies" : r.source.includes("equipment") ? "equipment" : r.source === "calibration" ? "calibration" : r.source === "audit" ? "audits" : r.source === "ipc_audit" ? "ipc" : r.source === "risk_assessment" ? "risk" : "calendar", sub: `Overdue ${Math.abs(r.days)}d` }));
  dueSoon.slice(0, 3).forEach(r => actions.push({ label: r.title, tone: "amber", key: r.source === "credential" ? "credentials" : r.source === "training" ? "training" : r.source === "policy" ? "policies" : r.source.includes("equipment") ? "equipment" : r.source === "calibration" ? "calibration" : r.source === "audit" ? "audits" : "calendar", sub: `Due in ${r.days}d` }));

  if (loading) return null;

  if (actions.length === 0) {
    return (
      <Card className="p-4 bg-emerald-950/30 border-emerald-500/30">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-300 shrink-0" />
          <div className="min-w-0">
            <p className="font-serif text-base text-emerald-200">All clear — no outstanding actions</p>
            <p className="text-xs text-emerald-300/70 mt-0.5">No open incidents, complaints, breaches, or overdue renewals. Stay on top of monthly governance review.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-rose-950/20 border-rose-500/40 ring-1 ring-rose-500/20 animate-in fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
        </span>
        <AlertTriangle className="h-4 w-4 text-rose-300" />
        <h3 className="font-serif text-base text-rose-100">Outstanding actions</h3>
        <Badge variant="outline" className="ml-auto text-[10px] border-rose-500/50 text-rose-200 bg-rose-500/10">{actions.length} need attention</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {actions.map((a, i) => {
          const ring = a.tone === "rose" ? "border-rose-500/40 hover:border-rose-400/70 text-rose-100" : "border-amber-500/40 hover:border-amber-400/70 text-amber-100";
          return (
            <button
              key={i}
              onClick={() => onNavigate(a.key)}
              className={cn("flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-slate-950/40 text-left transition-colors", ring)}
            >
              <div className="min-w-0">
                <p className="text-sm truncate">{a.label}</p>
                {a.sub && <p className="text-[10px] uppercase tracking-wider opacity-70">{a.sub}</p>}
              </div>
              <ArrowRight className="h-3.5 w-3.5 opacity-70 shrink-0" />
            </button>
          );
        })}
      </div>
    </Card>
  );
};