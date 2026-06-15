export type CqcDomain = "safe" | "effective" | "caring" | "responsive" | "well_led";

export const CQC_DOMAINS: { key: CqcDomain; label: string; tone: string }[] = [
  { key: "safe", label: "Safe", tone: "text-rose-300 border-rose-500/40 bg-rose-500/10" },
  { key: "effective", label: "Effective", tone: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" },
  { key: "caring", label: "Caring", tone: "text-pink-300 border-pink-500/40 bg-pink-500/10" },
  { key: "responsive", label: "Responsive", tone: "text-sky-300 border-sky-500/40 bg-sky-500/10" },
  { key: "well_led", label: "Well-led", tone: "text-amber-300 border-amber-500/40 bg-amber-500/10" },
];

export interface UpcomingRenewal {
  source: string;
  id: string;
  title: string;
  subtype: string;
  due_date: string;
  status: string | null;
}

export const ragForDays = (daysUntil: number): "overdue" | "due_soon" | "due_later" | "ok" => {
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 30) return "due_soon";
  if (daysUntil <= 60) return "due_later";
  return "ok";
};

export const ragTone: Record<string, string> = {
  overdue: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  due_soon: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  due_later: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
};

export const sourceLabel: Record<string, string> = {
  credential: "Credential",
  equipment_service: "Equipment service",
  equipment_filter: "Filter replacement",
  calibration: "Calibration",
  risk_assessment: "Risk assessment",
  ipc_audit: "IPC audit",
  audit: "Audit",
  training: "Training",
  continuity: "BC plan test",
  policy: "Policy review",
};