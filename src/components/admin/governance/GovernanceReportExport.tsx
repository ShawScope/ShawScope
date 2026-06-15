import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { logAccess } from "./RegisterShell";

const fmtDate = (d?: string | null) => d ? format(parseISO(d), "dd/MM/yyyy") : "—";

export const GovernanceReportExport: React.FC = () => {
  const [busy, setBusy] = useState(false);

  const exportPDF = async () => {
    setBusy(true);
    try {
      const [incidents, safeguarding, complaints, breaches, credentials, training, equipment, ipc, feedback] = await Promise.all([
        supabase.from("gov_incidents").select("*").order("incident_date", { ascending: false }).limit(100),
        supabase.from("gov_safeguarding").select("*").order("concern_date", { ascending: false }).limit(100),
        supabase.from("gov_complaints").select("*").order("received_date", { ascending: false }).limit(100),
        supabase.from("gov_gdpr_breaches").select("*").order("breach_date", { ascending: false }).limit(100),
        supabase.from("gov_credentials").select("*").order("expiry_date", { ascending: true }),
        supabase.from("gov_training_cpd").select("*").order("training_date", { ascending: false }).limit(50),
        supabase.from("gov_equipment").select("*").order("name"),
        supabase.from("gov_ipc_audits").select("*").order("audit_date", { ascending: false }).limit(50),
        supabase.from("gov_patient_feedback").select("*").order("feedback_date", { ascending: false }).limit(100),
      ]);

      const doc = new jsPDF();
      const today = format(new Date(), "dd/MM/yyyy HH:mm");

      // Cover
      doc.setFontSize(20); doc.text("ShawScope — CQC Evidence Report", 14, 22);
      doc.setFontSize(11); doc.setTextColor(110);
      doc.text(`Generated ${today}`, 14, 30);
      doc.text("A Home Visiting Service · Clinical Governance Summary", 14, 36);
      doc.setTextColor(0);

      const counts = [
        ["Incidents & near-misses", incidents.data?.length ?? 0],
        ["Safeguarding concerns", safeguarding.data?.length ?? 0],
        ["Complaints", complaints.data?.length ?? 0],
        ["GDPR breaches", breaches.data?.length ?? 0],
        ["Equipment items", equipment.data?.length ?? 0],
        ["IPC audits", ipc.data?.length ?? 0],
        ["CPD entries", training.data?.length ?? 0],
        ["Credentials tracked", credentials.data?.length ?? 0],
        ["Patient feedback responses", feedback.data?.length ?? 0],
      ];
      autoTable(doc, {
        startY: 44,
        head: [["Register", "Records"]],
        body: counts.map(([k, v]) => [String(k), String(v)]),
        theme: "striped", headStyles: { fillColor: [212, 145, 42] }, styles: { fontSize: 10 },
      });

      const addTable = (title: string, head: string[], body: any[][]) => {
        doc.addPage();
        doc.setFontSize(14); doc.text(title, 14, 18);
        autoTable(doc, {
          startY: 24, head: [head], body,
          theme: "striped", headStyles: { fillColor: [30, 41, 59] },
          styles: { fontSize: 8, cellPadding: 2 }, columnStyles: { 0: { cellWidth: 22 } },
        });
      };

      addTable("Incidents & near-misses", ["Date", "Type", "Severity", "Status", "Summary"],
        (incidents.data ?? []).map((r: any) => [fmtDate(r.incident_date), r.type, r.severity, r.status, (r.description ?? "").slice(0, 60)]));

      addTable("Safeguarding concerns", ["Date", "Subject", "Description", "Status"],
        (safeguarding.data ?? []).map((r: any) => [fmtDate(r.concern_date), r.subject_type, (r.description ?? "").slice(0, 60), r.status]));

      addTable("Complaints", ["Received", "Complainant", "Subject", "Status"],
        (complaints.data ?? []).map((r: any) => [fmtDate(r.received_date), r.complainant ?? "—", (r.summary ?? "").slice(0, 60), r.status]));

      addTable("GDPR breaches", ["Date", "Type", "ICO", "Status", "Subjects"],
        (breaches.data ?? []).map((r: any) => [fmtDate(r.breach_date), r.breach_type, r.ico_reportable ? "Yes" : "No", r.status, r.data_subjects_affected ?? "—"]));

      addTable("Credentials (DBS / insurance / registration)", ["Type", "Holder", "Expiry", "Status"],
        (credentials.data ?? []).map((r: any) => [r.type, r.holder, fmtDate(r.expiry_date), r.status]));

      addTable("Training & CPD", ["Date", "Topic", "Hours", "Provider"],
        (training.data ?? []).map((r: any) => [fmtDate(r.training_date), r.topic, r.hours ?? "—", r.provider ?? "—"]));

      addTable("Equipment & servicing", ["Name", "Serial", "Next service", "Status"],
        (equipment.data ?? []).map((r: any) => [r.name, r.serial_number ?? "—", fmtDate(r.next_service_date), r.status]));

      addTable("IPC audits", ["Date", "Score", "Next due", "Findings"],
        (ipc.data ?? []).map((r: any) => [fmtDate(r.audit_date), r.score != null ? `${r.score}%` : "—", fmtDate(r.next_due), (r.findings ?? "").slice(0, 60)]));

      addTable("Patient feedback (recent)", ["Date", "Score", "Source", "Comment"],
        (feedback.data ?? []).map((r: any) => [fmtDate(r.feedback_date), r.score ?? "—", r.source ?? "—", (r.comment ?? "").slice(0, 60)]));

      // Footer page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`ShawScope CQC Evidence Report · ${today} · Page ${i} of ${pageCount}`, 14, 290);
      }

      doc.save(`ShawScope-CQC-Evidence-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      await logAccess(supabase, "export", "governance_report", { generated_at: new Date().toISOString() });
      toast.success("Evidence report exported");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Export failed");
    }
    setBusy(false);
  };

  return (
    <Button size="sm" onClick={exportPDF} disabled={busy} className="bg-amber-500/15 border border-amber-500/40 text-amber-200 hover:bg-amber-500/25 h-8">
      {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1" />}
      Export CQC PDF
    </Button>
  );
};

export default GovernanceReportExport;