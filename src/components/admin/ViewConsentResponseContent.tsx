import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, FileDown, Loader2 } from "lucide-react";
import NEWSScorePanel, { type NEWSObservation } from "@/components/admin/NEWSScorePanel";
import jsPDF from "jspdf";

interface ConsentResponse {
  id: string;
  appointment_id: string;
  consent_form_template_id: string;
  responses: any;
  signature: string | null;
  signed_at: string | null;
  created_at: string;
  status?: string;
  template_title?: string;
  submitter_name?: string | null;
  template_snapshot?: any;
}

interface Props {
  response: ConsentResponse;
  patientName?: string;
}

const ViewConsentResponseContent = ({ response, patientName }: Props) => {
  const [templateFields, setTemplateFields] = useState<any[] | null>(null);
  const [templateTitle, setTemplateTitle] = useState(response.template_title || "");
  const [templateDescription, setTemplateDescription] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    // Use snapshot if available (future-proof), otherwise fetch current template
    if (response.template_snapshot?.fields && Array.isArray(response.template_snapshot.fields)) {
      setTemplateFields(response.template_snapshot.fields);
      if (response.template_snapshot.title) setTemplateTitle(response.template_snapshot.title);
      if (response.template_snapshot.description) setTemplateDescription(response.template_snapshot.description);
    } else {
      supabase
        .from("consent_form_templates")
        .select("fields, title, description")
        .eq("id", response.consent_form_template_id)
        .single()
        .then(({ data }) => {
          if (data?.fields && Array.isArray(data.fields)) {
            setTemplateFields(data.fields);
            if (data.title) setTemplateTitle(data.title);
            if (data.description) setTemplateDescription(data.description);
          }
        });
    }
  }, [response.consent_form_template_id, response.template_snapshot]);

  const responses = response.responses as Record<string, any>;
  const fitzScore = responses?.__fitzpatrick_score;
  const fitzType = responses?.__fitzpatrick_type;
  const fitzDesc = responses?.__fitzpatrick_description;
  const newsObs = responses?.__newsObservations;
  const heidiNotes: string | null = responses?.__heidiNotes || null;
  const heidiOnly: boolean = !!responses?.__heidiOnly;

  const getFieldDisplayValue = (field: any): { label: string; value: string; details?: string } | null => {
    const value = responses[field.label];
    const detailsValue = responses[`${field.label}_details`];

    switch (field.type) {
      case "section":
      case "heading":
      case "info":
      case "score_display":
      case "signature":
      case "link":
        return null; // These are structural, handled separately
      case "confirm":
        return { label: field.label, value: value ? (field.confirmText || "Confirmed") : "Not confirmed" };
      case "multiselect":
        return { label: field.label, value: Array.isArray(value) ? value.join(", ") : "—" };
      case "photo":
        return value ? { label: field.label, value: "[Photo attached]" } : { label: field.label, value: "—" };
      default:
        if (value === undefined || value === null || value === "") {
          return { label: field.label, value: "—" };
        }
        return {
          label: field.label,
          value: typeof value === "boolean" ? (value ? "Yes" : "No") : String(value),
          details: detailsValue ? String(detailsValue) : undefined,
        };
    }
  };

  const renderFieldValue = (field: any) => {
    const value = responses[field.label];

    switch (field.type) {
      case "section":
      case "heading":
        return (
          <div className="pt-4 pb-1 first:pt-0">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <h3 className="font-serif text-sm text-center px-2 text-muted-foreground">
                {(field.label || "").replace(/^── |──$/g, "").trim() || "Section"}
              </h3>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        );

      case "info":
        return (
          <div className="rounded-lg border border-muted bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {(field.content || field.label || "").split(/(\*\*[^*]+\*\*)/).map((part: string, j: number) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return <strong key={j} className="text-foreground">{part.slice(2, -2)}</strong>;
                }
                return <span key={j}>{part}</span>;
              })}
            </p>
          </div>
        );

      case "confirm":
        return (
          <div className="flex items-center gap-2 rounded-lg border p-3">
            {value ? (
              <CheckCircle className="h-4 w-4 text-success shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground leading-relaxed">{field.label}</p>
              <p className="text-xs font-medium mt-0.5">{value ? (field.confirmText || "Confirmed") : "Not confirmed"}</p>
            </div>
          </div>
        );

      case "score_display":
        return null;

      case "scored_radio":
        return (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
            <p className="text-sm mt-1">{value || "—"}</p>
          </div>
        );

      case "photo":
        return (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">{field.label}</p>
            {value ? (
              <img src={value} alt={field.label} className="max-w-full max-h-48 rounded-lg" />
            ) : (
              <p className="text-sm text-muted-foreground italic">No photo provided</p>
            )}
          </div>
        );

      case "signature":
        return null; // Handled separately at bottom

      case "link":
        return (
          <div className="rounded-lg border p-3">
            <a
              href={field.placeholder || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline hover:text-primary/80 inline-flex items-center gap-1.5"
            >
              🔗 {field.label || "Link"}
            </a>
          </div>
        );

      case "multiselect":
        return (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {Array.isArray(value) && value.length > 0 ? value.map((v: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">{v}</Badge>
              )) : <p className="text-sm text-muted-foreground italic">—</p>}
            </div>
          </div>
        );

      default: {
        const detailsValue = responses[`${field.label}_details`];
        return (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
            <p className="text-sm mt-1">
              {value === undefined || value === null || value === "" 
                ? <span className="text-muted-foreground italic">—</span>
                : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
            </p>
            {detailsValue && (
              <p className="text-sm mt-1 text-muted-foreground italic border-l-2 border-primary/30 pl-2">{String(detailsValue)}</p>
            )}
          </div>
        );
      }
    }
  };

  const downloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      // Fetch patient details
      let patientEmail = "", patientPhone = "", patientAddress = "", patientDob = "";
      let appointmentDate = "", appointmentTime = "";
      if (response.appointment_id) {
        const { data: apt } = await supabase.from("appointments")
          .select("client_email, client_phone, address, postcode, appointment_date, appointment_time")
          .eq("id", response.appointment_id).single();
        if (apt) {
          patientEmail = apt.client_email || "";
          patientPhone = apt.client_phone || "";
          patientAddress = [apt.address, apt.postcode].filter(Boolean).join(", ");
          if (apt.appointment_date) appointmentDate = format(new Date(apt.appointment_date), "dd MMMM yyyy");
          if (apt.appointment_time) appointmentTime = apt.appointment_time.substring(0, 5);
        }
        if (apt?.client_email) {
          const { data: pat } = await supabase.from("patients")
            .select("date_of_birth").eq("client_email", apt.client_email).maybeSingle();
          if (pat?.date_of_birth) patientDob = pat.date_of_birth;
        }
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      let y = 16;
      let pageNum = 1;

      // Theme colors
      const amberR = 212, amberG = 145, amberB = 42;
      const darkR = 14, darkG = 20, darkB = 32;

      const addPageFooter = () => {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150);
        doc.text("matt@shawscope.co.uk  |  01305 340194", pageWidth / 2, pageHeight - 10, { align: "center" });
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: "right" });
        doc.text("CONFIDENTIAL", margin, pageHeight - 10);
        doc.setTextColor(0);
      };

      const newPage = () => {
        addPageFooter();
        doc.addPage();
        pageNum++;
        y = 16;
      };

      const checkPage = (needed = 12) => {
        if (y > pageHeight - 25 - needed) newPage();
      };

      const addSectionHeading = (text: string) => {
        checkPage(14);
        doc.setFillColor(amberR, amberG, amberB);
        doc.rect(margin, y - 1, 3, 6, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkR, darkG, darkB);
        doc.text(text, margin + 6, y + 4);
        doc.setTextColor(0);
        y += 10;
      };

      const addField = (label: string, value: string, details?: string) => {
        if (!value || value === "—") return;
        checkPage(10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(amberR, amberG, amberB);
        doc.text(label, margin + 2, y);
        doc.setTextColor(0);
        y += 4;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50);
        const lines = doc.splitTextToSize(value, contentWidth - 4);
        for (const line of lines) {
          checkPage(5);
          doc.text(line, margin + 2, y);
          y += 4.2;
        }
        if (details) {
          doc.setFontSize(8);
          doc.setTextColor(80);
          const detLines = doc.splitTextToSize(`↳ ${details}`, contentWidth - 8);
          for (const dl of detLines) {
            checkPage(5);
            doc.text(dl, margin + 5, y);
            y += 3.8;
          }
        }
        doc.setTextColor(0);
        y += 2;
      };

      const addCheck = (label: string, checked: boolean) => {
        checkPage(6);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50);
        doc.setDrawColor(amberR, amberG, amberB);
        doc.setLineWidth(0.4);
        doc.rect(margin + 2, y - 3.2, 3.5, 3.5);
        if (checked) {
          doc.setFillColor(amberR, amberG, amberB);
          doc.rect(margin + 2.6, y - 2.6, 2.3, 2.3, "F");
        }
        doc.text(label, margin + 7.5, y);
        doc.setTextColor(0);
        doc.setDrawColor(0);
        y += 5;
      };

      // === HEADER ===
      const centerX = pageWidth / 2;
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      const shawW = doc.getTextWidth("Shaw");
      const scopeW = doc.getTextWidth("Scope");
      const totalW = shawW + scopeW;
      doc.setTextColor(darkR, darkG, darkB);
      doc.text("Shaw", centerX - totalW / 2, y);
      doc.setTextColor(amberR, amberG, amberB);
      doc.text("Scope", centerX - totalW / 2 + shawW, y);
      y += 5;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(130);
      doc.text("A Home Visiting Service", centerX, y, { align: "center" });
      y += 4;
      doc.setDrawColor(amberR, amberG, amberB);
      doc.setLineWidth(0.6);
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;

      // === TITLE ===
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkR, darkG, darkB);
      doc.text(templateTitle || "Consultation Form", centerX, y, { align: "center" });
      doc.setTextColor(0);
      y += 8;

      // === PATIENT INFO BOX ===
      // Calculate dynamic box height based on address lines
      doc.setFontSize(9);
      const addrLines = patientAddress ? doc.splitTextToSize(patientAddress, contentWidth / 2 - 8) : [];
      const addrLineCount = Math.max(addrLines.length, 1);
      const boxHeight = 14 + 4.5 + 4.5 + (addrLineCount * 4.5) + 3;
      const boxTop = y;
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(230);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, boxTop, contentWidth, boxHeight, 2, 2, "FD");
      y = boxTop + 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(amberR, amberG, amberB);
      doc.text("PATIENT DETAILS", margin + 4, y);
      doc.setTextColor(0);
      y += 5;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50);
      const col1 = margin + 4;
      const col2 = margin + contentWidth / 2;

      const displayName = patientName || response.submitter_name || "";
      if (displayName) { doc.setFont("helvetica", "bold"); doc.text(displayName, col1, y); doc.setFont("helvetica", "normal"); }
      if (patientDob) { doc.text(`DOB: ${format(new Date(patientDob), "dd/MM/yyyy")}`, col2, y); }
      y += 4.5;
      if (patientEmail && !patientEmail.includes("noemail.")) { doc.text(patientEmail, col1, y); }
      if (patientPhone) { doc.text(patientPhone, col2, y); }
      y += 4.5;
      if (addrLines.length > 0) {
        for (let i = 0; i < addrLines.length; i++) {
          doc.text(addrLines[i], col1, y);
          y += 4.5;
        }
      }
      doc.setTextColor(0);
      y = boxTop + boxHeight + 3;

      // Appointment date line
      doc.setFontSize(8);
      doc.setTextColor(100);
      const dateLabel = appointmentDate
        ? `Appointment: ${appointmentDate}${appointmentTime ? ` at ${appointmentTime}` : ""}`
        : format(parseISO(response.created_at), "dd MMMM yyyy");
      doc.text(dateLabel, margin, y);
      doc.setTextColor(0);
      y += 8;

      // === DESCRIPTION ===
      if (templateDescription) {
        checkPage(15);
        doc.setFontSize(9);
        doc.setTextColor(100);
        const descLines = doc.splitTextToSize(templateDescription, contentWidth);
        doc.text(descLines, margin, y);
        y += descLines.length * 4 + 4;
        doc.setTextColor(0);
      }

      // Fitzpatrick Score
      if (fitzScore != null) {
        checkPage(10);
        addSectionHeading("Skin Type Assessment");
        addField("Fitzpatrick Score", `${fitzScore} — ${fitzType || ""} (${fitzDesc || ""})`);
      }

      // === FORM FIELDS ===
      if (heidiNotes) {
        addSectionHeading("Heidi Notes");
        addField("", heidiNotes);
      }
      if (templateFields && !heidiOnly) {
        for (const field of templateFields) {
          if (field.showWhen && !responses[field.showWhen]) continue;
          // Skip compliance fields (only show details)
          const labelLower = (field.label || "").toLowerCase();
          if (labelLower.includes("compliance") && !labelLower.includes("details")) continue;

          if (field.type === "section" || field.type === "heading") {
            const heading = (field.label || "").replace(/^── |──$/g, "").trim() || "Section";
            addSectionHeading(heading);
            continue;
          }

          if (field.type === "info") {
            checkPage(10);
            doc.setFontSize(8);
            doc.setTextColor(100);
            const infoText = (field.content || field.label || "").replace(/\*\*/g, "");
            const infoLines = doc.splitTextToSize(infoText, contentWidth);
            doc.text(infoLines, margin + 2, y);
            y += infoLines.length * 3.5 + 4;
            doc.setTextColor(0);
            continue;
          }

          if (field.type === "signature" || field.type === "score_display") continue;

          const display = getFieldDisplayValue(field);
          if (!display) continue;

          if (field.type === "confirm") {
            addCheck(display.label, responses[field.label] === true);
          } else {
            addField(display.label, display.value, display.details);
          }
        }
      } else {
        // Fallback: key-value pairs
        for (const [key, value] of Object.entries(responses)) {
          if (key.startsWith("__")) continue;
          const val = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
          addField(key, val);
        }
      }

      // Signature
      if (response.signature) {
        checkPage(20);
        addSectionHeading("Signature");
        doc.setFontSize(14);
        doc.setTextColor(darkR, darkG, darkB);
        doc.setFont("helvetica", "italic");
        doc.text(response.signature, margin + 2, y);
        doc.setFont("helvetica", "normal");
        y += 7;
        if (response.signed_at) {
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`Signed: ${format(parseISO(response.signed_at), "dd MMMM yyyy 'at' HH:mm")}`, margin + 2, y);
          doc.setTextColor(0);
          y += 5;
        }
      }

      // Add footer to last page
      addPageFooter();

      const safeName = (patientName || response.submitter_name || "patient").replace(/[^a-zA-Z0-9]/g, "_");
      const dateStr = format(parseISO(response.created_at), "yyyy-MM-dd");
      doc.save(`${safeName}_${templateTitle?.replace(/[^a-zA-Z0-9]/g, "_") || "form"}_${dateStr}.pdf`);
    } catch (e) {
      console.error("PDF generation error:", e);
    }
    setGeneratingPdf(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Submitted: {format(parseISO(response.created_at), "MMMM d, yyyy 'at' HH:mm")}
          </p>
          {response.submitter_name && (
            <Badge variant="outline" className="text-xs mt-1">By: {response.submitter_name}</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={downloadPdf} disabled={generatingPdf}>
          {generatingPdf ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileDown className="h-3 w-3 mr-1" />}
          Download PDF
        </Button>
      </div>

      {templateDescription && (
        <div className="rounded-lg border border-muted bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{templateDescription}</p>
        </div>
      )}

      {/* Fitzpatrick Score if present */}
      {fitzScore != null && (
        <div className="rounded-xl border-2 border-secondary bg-secondary/5 p-4 text-center">
          <p className="text-[10px] tracking-widest uppercase text-secondary mb-1">Skin Type Score</p>
          <p className="font-serif text-3xl text-secondary">{fitzScore}</p>
          <p className="font-serif text-sm">{fitzType}</p>
          <p className="text-xs text-muted-foreground">{fitzDesc}</p>
        </div>
      )}

      {/* NEWS Observations */}
      {newsObs && Array.isArray(newsObs) && newsObs.length > 0 && (
        <NEWSScorePanel observations={newsObs} onChange={() => {}} readOnly />
      )}

      {/* Heidi Notes (verbatim) */}
      {heidiNotes && (
        <div className="rounded-lg border-2 border-secondary/40 bg-secondary/5 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Heidi Notes</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{heidiNotes}</p>
        </div>
      )}

      {/* Render with template structure — show ALL fields */}
      {heidiOnly ? null : templateFields ? (
        <div className="space-y-2">
          {templateFields.map((field: any, i: number) => {
            if (field.showWhen && !responses[field.showWhen]) return null;
            return <div key={`tf-${i}`}>{renderFieldValue(field)}</div>;
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(responses)
            .filter(([key]) => !key.startsWith("__"))
            .map(([key, value]) => (
              <div key={key} className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">{key}</p>
                <p className="text-sm mt-1">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</p>
              </div>
            ))}
        </div>
      )}

      {response.signature && (
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Signature</p>
          <p className="text-lg font-serif font-medium">{response.signature}</p>
          {response.signed_at && (
            <p className="text-[10px] text-muted-foreground mt-1">Signed: {format(parseISO(response.signed_at), "MMMM d, yyyy 'at' HH:mm")}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewConsentResponseContent;
