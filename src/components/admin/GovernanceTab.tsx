import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarDays, Folder, AlertTriangle, ShieldAlert, Lightbulb, Sparkles,
  HardHat, UserCheck, Trash2 as TrashIcon, Wrench, Activity, ClipboardCheck, MessageSquare,
  Star, FileWarning, FileText, GraduationCap, BookOpen, History, Lock, Stethoscope,
  Heart, LifeBuoy, ShieldCheck,
} from "lucide-react";
import GovernanceOverview from "./governance/GovernanceOverview";
import GovernanceCalendar from "./governance/GovernanceCalendar";
import EvidenceFolder from "./governance/EvidenceFolder";
import DocumentsLibrary from "./governance/DocumentsLibrary";
import MonthlyReviewSection from "./MonthlyReviewSection";
import IncidentsRegister from "./governance/IncidentsRegister";
import SafeguardingRegister from "./governance/SafeguardingRegister";
import SignificantEventsRegister from "./governance/SignificantEventsRegister";
import IPCAuditsRegister from "./governance/IPCAuditsRegister";
import RiskAssessmentsRegister from "./governance/RiskAssessmentsRegister";
import LoneWorkerRegister from "./governance/LoneWorkerRegister";
import ClinicalWasteRegister from "./governance/ClinicalWasteRegister";
import EquipmentRegister from "./governance/EquipmentRegister";
import CalibrationRegister from "./governance/CalibrationRegister";
import ComplaintsRegister from "./governance/ComplaintsRegister";
import ComplimentsRegister from "./governance/ComplimentsRegister";
import FeedbackRegister from "./governance/FeedbackRegister";
import ContinuityRegister from "./governance/ContinuityRegister";
import CredentialsRegister from "./governance/CredentialsRegister";
import TrainingRegister from "./governance/TrainingRegister";
import GdprBreachRegister from "./governance/GdprBreachRegister";
import AccessLogRegister from "./governance/AccessLogRegister";
import PoliciesRegister from "./governance/PoliciesRegister";
import ClinicalAuditsRegister from "./governance/ClinicalAuditsRegister";
import GovernanceReportExport from "./governance/GovernanceReportExport";
import BusinessPoliciesSection from "./BusinessPoliciesSection";
import BackupExportButton from "./governance/BackupExportButton";

type SectionKey =
  | "overview" | "calendar"
  | "incidents" | "safeguarding" | "significant" | "ipc" | "risk" | "lone_worker" | "waste"
  | "equipment" | "calibration" | "audits"
  | "feedback" | "compliments"
  | "complaints" | "continuity"
  | "policies" | "training" | "credentials" | "monthly" | "access_log"
  | "gdpr"
  | "evidence"
  | "documents";

interface NavItem { key: SectionKey; label: string; icon: any; }
interface NavGroup { label: string; icon: any; tone: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  {
    label: "Dashboard", icon: LayoutDashboard, tone: "text-amber-300",
    items: [
      { key: "overview", label: "Overview", icon: LayoutDashboard },
      { key: "calendar", label: "Calendar", icon: CalendarDays },
      { key: "evidence", label: "CQC Evidence Folder", icon: Folder },
      { key: "documents", label: "Documents", icon: Folder },
    ],
  },
  {
    label: "Safe", icon: ShieldCheck, tone: "text-rose-300",
    items: [
      { key: "incidents", label: "Incidents & near-misses", icon: AlertTriangle },
      { key: "safeguarding", label: "Safeguarding concerns", icon: ShieldAlert },
      { key: "significant", label: "Significant events", icon: Lightbulb },
      { key: "ipc", label: "Infection prevention & control", icon: Sparkles },
      { key: "risk", label: "Risk assessments", icon: HardHat },
      { key: "lone_worker", label: "Lone-worker safety", icon: UserCheck },
      { key: "waste", label: "Clinical waste records", icon: TrashIcon },
    ],
  },
  {
    label: "Effective", icon: Stethoscope, tone: "text-emerald-300",
    items: [
      { key: "equipment", label: "Equipment & servicing", icon: Wrench },
      { key: "calibration", label: "Calibration & checks", icon: Activity },
      { key: "audits", label: "Clinical audits", icon: ClipboardCheck },
    ],
  },
  {
    label: "Caring", icon: Heart, tone: "text-pink-300",
    items: [
      { key: "feedback", label: "Patient feedback", icon: Star },
      { key: "compliments", label: "Compliments", icon: MessageSquare },
    ],
  },
  {
    label: "Responsive", icon: LifeBuoy, tone: "text-sky-300",
    items: [
      { key: "complaints", label: "Complaints management", icon: MessageSquare },
      { key: "continuity", label: "Business continuity", icon: LifeBuoy },
    ],
  },
  {
    label: "Well-led", icon: BookOpen, tone: "text-amber-300",
    items: [
      { key: "policies", label: "Policies & SOPs", icon: BookOpen },
      { key: "training", label: "Training & CPD", icon: GraduationCap },
      { key: "credentials", label: "DBS, insurance & registration", icon: FileText },
      { key: "monthly", label: "Monthly governance review", icon: ClipboardCheck },
      { key: "access_log", label: "Access log", icon: History },
    ],
  },
  {
    label: "Data Protection", icon: Lock, tone: "text-violet-300",
    items: [
      { key: "gdpr", label: "GDPR & breach log", icon: FileWarning },
    ],
  },
];

const ALL_ITEMS: NavItem[] = NAV.flatMap(g => g.items);

const Placeholder: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <Card className="p-8 bg-slate-950/60 border-slate-800 text-center">
    <Sparkles className="h-8 w-8 mx-auto mb-3 text-amber-400 opacity-70" />
    <h3 className="font-serif text-lg mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
    <Badge variant="outline" className="mt-3 border-amber-500/40 text-amber-300 bg-amber-500/5">Coming in next release</Badge>
  </Card>
);

const GovernanceTab: React.FC = () => {
  const [section, setSection] = useState<SectionKey>("overview");

  const renderSection = () => {
    switch (section) {
      case "overview": return <GovernanceOverview onNavigate={(k) => setSection(k as SectionKey)} />;
      case "calendar": return <GovernanceCalendar />;
      case "evidence": return <EvidenceFolder />;
      case "documents": return <DocumentsLibrary />;
      case "monthly": return <MonthlyReviewSection />;
      case "incidents": return <IncidentsRegister />;
      case "safeguarding": return <SafeguardingRegister />;
      case "significant": return <SignificantEventsRegister />;
      case "ipc": return <IPCAuditsRegister />;
      case "risk": return <RiskAssessmentsRegister />;
      case "lone_worker": return <LoneWorkerRegister />;
      case "waste": return <ClinicalWasteRegister />;
      case "equipment": return <EquipmentRegister />;
      case "calibration": return <CalibrationRegister />;
      case "audits": return <ClinicalAuditsRegister />;
      case "feedback": return <FeedbackRegister />;
      case "compliments": return <ComplimentsRegister />;
      case "complaints": return <ComplaintsRegister />;
      case "continuity": return <ContinuityRegister />;
      case "policies": return <BusinessPoliciesSection />;
      case "training": return <TrainingRegister />;
      case "credentials": return <CredentialsRegister />;
      case "access_log": return <AccessLogRegister />;
      case "gdpr": return (
        <div className="space-y-4">
          <Card className="p-4 bg-slate-950/60 border-violet-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-serif text-base flex items-center gap-2"><Lock className="h-4 w-4 text-violet-300" /> Full system backup</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Download an AES-256 password-protected ZIP of every patient, appointment, consent form,
                  policy, message and governance record. Save monthly as a disaster-recovery snapshot.
                </p>
              </div>
              <BackupExportButton />
            </div>
          </Card>
          <GdprBreachRegister />
        </div>
      );
      default: return null;
    }
  };

  const activeItem = ALL_ITEMS.find(i => i.key === section);

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card className="p-3 sm:p-5 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-xl leading-tight">Clinical Governance</h1>
              <p className="text-[11px] text-muted-foreground tracking-wider uppercase hidden sm:block">CQC-aligned · Safe · Effective · Caring · Responsive · Well-led</p>
              <p className="text-[11px] text-muted-foreground tracking-wider uppercase sm:hidden">CQC-aligned governance</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/5 text-[10px]"><Lock className="h-2.5 w-2.5 mr-1" /> 2FA + SMS</Badge>
            <Badge variant="outline" className="border-sky-500/40 text-sky-300 bg-sky-500/5 text-[10px]">UK GDPR</Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/5 text-[10px]">CQC ready</Badge>
            <GovernanceReportExport />
          </div>
        </div>
      </Card>

      {/* Mobile section picker */}
      <div className="md:hidden">
        <Select value={section} onValueChange={(v) => setSection(v as SectionKey)}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-[60vh]">
            {NAV.map(group => (
              <React.Fragment key={group.label}>
                <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">{group.label}</div>
                {group.items.map(it => (
                  <SelectItem key={it.key} value={it.key}>{it.label}</SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
        {activeItem && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <activeItem.icon className="h-4 w-4 text-amber-400" />
            <span className="font-medium">{activeItem.label}</span>
          </div>
        )}
      </div>

      {/* Desktop layout */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3">
        <aside className="hidden md:block">
          <Card className="p-2 bg-slate-950/60 border-slate-800 sticky top-3 max-h-[calc(100vh-160px)] overflow-y-auto">
            <nav className="space-y-3">
              {NAV.map(group => (
                <div key={group.label}>
                  <div className={cn("px-2 py-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold", group.tone)}>
                    <group.icon className="h-3 w-3" />
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map(it => {
                      const Icon = it.icon;
                      const active = section === it.key;
                      return (
                        <button
                          key={it.key}
                          onClick={() => setSection(it.key)}
                          className={cn(
                            "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                            active ? "bg-amber-500/10 text-amber-200 border border-amber-500/40" : "text-muted-foreground hover:bg-slate-900/60 hover:text-foreground border border-transparent",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{it.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </Card>
        </aside>

        <main className="min-w-0">{renderSection()}</main>
      </div>
    </div>
  );
};

export default GovernanceTab;