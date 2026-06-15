import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays } from "date-fns";
import { BookOpen, ExternalLink } from "lucide-react";
import { RegisterShell } from "./RegisterShell";
import SuggestedChecklist, { Suggestion } from "./SuggestedChecklist";

interface Row {
  id: string; heading: string; description: string | null;
  last_reviewed_at: string | null; review_notes: string | null;
  updated_at: string; sort_order: number;
}

const reviewTone = (date: string | null) => {
  if (!date) return "border-rose-500/40 text-rose-300 bg-rose-500/10";
  const d = differenceInDays(new Date(), parseISO(date));
  if (d > 365) return "border-rose-500/40 text-rose-300 bg-rose-500/10";
  if (d > 300) return "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
};
const reviewLabel = (date: string | null) => {
  if (!date) return "Never reviewed";
  const d = differenceInDays(new Date(), parseISO(date));
  return `Reviewed ${format(parseISO(date), "dd/MM/yyyy")} · ${d}d ago`;
};

const PoliciesRegister: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    supabase.from("business_policies").select("*").order("sort_order")
      .then(({ data }) => setRows((data as any) ?? []));
  }, []);

  const overdue = rows.filter(r => !r.last_reviewed_at || differenceInDays(new Date(), parseISO(r.last_reviewed_at)) > 365).length;

  const goManage = () => {
    window.dispatchEvent(new CustomEvent("admin:navigate", { detail: { tab: "policies" } }));
  };

  const matchHeading = (needle: string) => (rs: Row[]) =>
    rs.find(r => r.heading?.toLowerCase().includes(needle.toLowerCase()));

  const SUGGESTIONS: Suggestion<Row>[] = [
    { key: "ipc", label: "Infection prevention & control policy", matches: matchHeading("infection") },
    { key: "consent", label: "Consent policy", matches: matchHeading("consent") },
    { key: "safeguarding", label: "Safeguarding (adults + children) policy", matches: matchHeading("safeguard") },
    { key: "complaints", label: "Complaints policy", matches: matchHeading("complaint") },
    { key: "gdpr", label: "Data protection / UK GDPR policy", matches: (rs) => rs.find(r => /gdpr|data protection/i.test(r.heading)) },
    { key: "chaperone", label: "Chaperone policy", matches: matchHeading("chaperone") },
    { key: "lone-worker", label: "Lone-worker policy", matches: matchHeading("lone") },
    { key: "emergency", label: "Medical emergency / first aid policy", matches: (rs) => rs.find(r => /emergency|first aid/i.test(r.heading)) },
    { key: "health-safety", label: "Health & safety policy", matches: matchHeading("health") },
    { key: "edi", label: "Equality, diversity & inclusion policy", matches: (rs) => rs.find(r => /equality|diversity|inclusion/i.test(r.heading)) },
    { key: "waste", label: "Clinical waste disposal SOP", matches: matchHeading("waste") },
    { key: "microsuction", label: "Microsuction / irrigation SOP", matches: (rs) => rs.find(r => /microsuction|irrigation/i.test(r.heading)) },
  ];

  return (
    <RegisterShell
      title="Policies & SOPs"
      description="Version-controlled policy library. Each policy is reviewed annually and edited via the Policies tab with AI-assisted diff."
      count={rows.length}
      toolbar={
        <>
          {overdue > 0 && <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-300 bg-rose-500/10 h-7 px-2 flex items-center">{overdue} overdue review{overdue===1?"":"s"}</Badge>}
          <Button size="sm" onClick={goManage} className="bg-amber-500/15 border border-amber-500/40 text-amber-200 hover:bg-amber-500/25 h-8">
            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Manage in Policies tab
          </Button>
        </>
      }
      isEmpty={rows.length === 0}
      empty={{ title: "No policies yet", hint: "Add policies via the Policies tab — they will appear here with review-due RAG indicators." }}
    >
      <SuggestedChecklist
        storageKey="policies"
        suggestions={SUGGESTIONS}
        rows={rows}
        onAdd={(s) => {
          // Drop a hint into sessionStorage so the Policies editor can prefill the heading
          try { sessionStorage.setItem("policies:prefill_heading", s.label); } catch {}
          window.dispatchEvent(new CustomEvent("admin:navigate", { detail: { tab: "policies", prefill: s.label } }));
        }}
        onOpenMatch={() => goManage()}
        matchLabel={(m) => m.heading}
      />
      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.id} className="p-3 bg-slate-950/60 border-slate-800">
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-sm">{r.heading}</span>
                  <Badge variant="outline" className={`text-[10px] ${reviewTone(r.last_reviewed_at)}`}>{reviewLabel(r.last_reviewed_at)}</Badge>
                </div>
                {r.description && <div className="text-[11px] text-muted-foreground">{r.description}</div>}
                {r.review_notes && <div className="text-[11px] text-muted-foreground mt-1"><span className="text-slate-400">Last review:</span> {r.review_notes}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">Updated {format(parseISO(r.updated_at), "dd/MM/yyyy")}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </RegisterShell>
  );
};

export default PoliciesRegister;