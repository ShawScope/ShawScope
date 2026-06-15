import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, CheckCircle, AlertTriangle, Snowflake, Ear, Camera, Image } from "lucide-react";
import { StableInput, StableTextarea } from "@/components/StableFormFields";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";

interface AppointmentData {
  id: string;
  client_name: string;
  client_email: string;
  appointment_date: string;
  appointment_time: string;
  service_id: string | null;
  consent_form_template_id: string | null;
  access_token: string;
}

interface ConsentTemplate {
  id: string;
  title: string;
  description: string | null;
  fields: any[];
}

const PageShell = ({ children, templateTitle, isCryo }: { children: React.ReactNode; templateTitle?: string; isCryo?: boolean }) => (
  <div className="flex min-h-screen flex-col bg-background">
    <header className="bg-surface-dark">
      <div className="container mx-auto flex items-center gap-3 px-4 py-4">
        <Link to="/" className="font-serif text-lg tracking-wide text-primary-foreground uppercase">
          Shaw<span className="text-secondary">Scope</span>
        </Link>
        {templateTitle && (
          <div className="ml-auto flex items-center gap-2">
            {isCryo ? <Snowflake className="h-4 w-4 text-secondary" /> : <Ear className="h-4 w-4 text-secondary" />}
            <span className="text-xs text-primary-foreground/60 hidden sm:inline">{templateTitle}</span>
          </div>
        )}
      </div>
    </header>
    {children}
    <footer className="border-t py-4 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} ShawScope. All rights reserved.
    </footer>
  </div>
);

const ConsentFormPage = () => {
  const { token } = useParams<{ token: string }>();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [template, setTemplate] = useState<ConsentTemplate | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitterName, setSubmitterName] = useState("");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showAnotherPersonForm, setShowAnotherPersonForm] = useState(false);
  const [anotherPersonName, setAnotherPersonName] = useState("");
  const [needHelp, setNeedHelp] = useState(false);
  const [helpDescription, setHelpDescription] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid link");
      setLoading(false);
      return;
    }
    loadData();
  }, [token]);

  const loadData = async () => {
    // Use RPC to bypass RLS — access_token is the auth mechanism
    const { data: aptRows, error: aptError } = await supabase
      .rpc("get_appointment_by_token", { p_token: token! });

    if (aptError || !aptRows || aptRows.length === 0) {
      setError("Appointment not found or link has expired.");
      setLoading(false);
      return;
    }

    const apt = aptRows[0];
    setAppointment(apt as AppointmentData);

    if (apt.service_id) {
      const { data: svc } = await supabase
        .from("services")
        .select("name, consent_form_template_id")
        .eq("id", apt.service_id)
        .single();
      if (svc) {
        setServiceName(svc.name);
        const templateId = apt.consent_form_template_id || svc.consent_form_template_id;
        if (templateId) {
          const { data: tpl } = await supabase
            .from("consent_form_templates")
            .select("id, title, description, fields")
            .eq("id", templateId)
            .single();
          if (tpl) setTemplate(tpl as ConsentTemplate);
        }
      }
    } else if (apt.consent_form_template_id) {
      const { data: tpl } = await supabase
        .from("consent_form_templates")
        .select("id, title, description, fields")
        .eq("id", apt.consent_form_template_id)
        .single();
      if (tpl) setTemplate(tpl as ConsentTemplate);
    }

    // Check if already completed via RPC
    const { data: completed } = await supabase
      .rpc("check_consent_completed", { p_token: token! });

    if (completed) {
      setAlreadyCompleted(true);
    }

    setLoading(false);
  };

  const fields = useMemo(() => {
    if (!template) return [];
    return Array.isArray(template.fields) ? template.fields : [];
  }, [template]);

  // Calculate Fitzpatrick score from scored_radio fields
  const fitzpatrickScore = useMemo(() => {
    let total = 0;
    let hasScored = false;
    for (const field of fields) {
      if (field.type === "scored_radio" && responses[field.label] !== undefined) {
        hasScored = true;
        const selectedOption = field.options?.find((o: any) => o.text === responses[field.label]);
        if (selectedOption) total += selectedOption.score;
      }
    }
    return hasScored ? total : null;
  }, [responses, fields]);

  const getFitzpatrickType = (score: number): { type: string; description: string } => {
    if (score <= 6) return { type: "Type I", description: "Very fair skin, always burns, never tans" };
    if (score <= 13) return { type: "Type II", description: "Fair skin, burns easily, tans minimally" };
    if (score <= 20) return { type: "Type III", description: "Medium skin, sometimes burns, tans gradually" };
    if (score <= 27) return { type: "Type IV", description: "Olive skin, rarely burns, tans easily" };
    if (score <= 33) return { type: "Type V", description: "Brown skin, very rarely burns, tans very easily" };
    return { type: "Type VI", description: "Dark brown/black skin, never burns, deeply pigmented" };
  };

  const handleSubmit = async () => {
    if (!appointment || !template) return;

    setMissingFields([]);

    // Only validate required fields if patient is NOT requesting help
    if (!needHelp) {
      const missing: string[] = [];
      for (const field of fields) {
        if (!field.required) continue;
        if (field.type === "section" || field.type === "heading" || field.type === "info" || field.type === "score_display" || field.type === "link") continue;

        // Skip fields hidden by conditional logic
        if (field.showWhen && !responses[field.showWhen]) continue;

        if (field.type === "confirm") {
          if (!responses[field.label]) {
            missing.push(field.label || "Confirmation required");
            continue;
          }
          continue;
        }

        if (field.type === "signature") {
          if (!signature.trim()) {
            missing.push("Signature");
            continue;
          }
          continue;
        }

        if (field.type === "photo") {
          continue;
        }

        if (field.type === "multiselect") {
          const val = responses[field.label];
          if (!val || !Array.isArray(val) || val.length === 0) {
            missing.push(field.label || "Selection required");
            continue;
          }
          continue;
        }

        if (!responses[field.label]?.toString().trim()) {
          missing.push(field.label || "Required field");
          continue;
        }
      }

      if (missing.length > 0) {
        setMissingFields(missing);
        toast.error(`Please complete ${missing.length} required ${missing.length === 1 ? "field" : "fields"} before submitting`, { duration: 6000 });
        // Scroll to first missing field
        setTimeout(() => {
          const el = document.querySelector('[data-missing="true"]');
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        return;
      }
    }

    // Include Fitzpatrick score in responses if applicable
    const finalResponses = { ...responses };
    if (fitzpatrickScore !== null) {
      const fitzType = getFitzpatrickType(fitzpatrickScore);
      finalResponses["__fitzpatrick_score"] = fitzpatrickScore;
      finalResponses["__fitzpatrick_type"] = fitzType.type;
      finalResponses["__fitzpatrick_description"] = fitzType.description;
    }

    // Mark if patient needed help
    if (needHelp) {
      finalResponses["__needs_help"] = true;
      finalResponses["__help_description"] = helpDescription.trim() || "Patient indicated they needed help completing this form.";
    }

    setSubmitting(true);
    try {
      const { data: responseId, error: submitError } = await supabase.rpc("submit_consent_response", {
        p_token: token!,
        p_template_id: template.id,
        p_responses: finalResponses,
        p_signature: signature.trim() || null,
        p_submitter_name: submitterName.trim() || null,
      });

      if (submitError) {
        if (submitError.message?.includes("already submitted")) {
          toast.error("This person has already submitted a consent form for this appointment.");
        } else {
          console.error("Consent submission error:", submitError);
          toast.error("Failed to submit form. Please try again.");
        }
      } else {
        setSubmitted(true);
        toast.success(needHelp 
          ? "Form submitted — Matt will be in touch to help you complete it." 
          : "Consent form submitted successfully!"
        );

        // Send help notification email if patient needs help
        if (needHelp) {
          supabase.functions.invoke("send-notification", {
            body: {
              type: "consent_help_needed",
              client_name: submitterName || appointment.client_name,
              client_email: appointment.client_email,
              appointment_date: appointment.appointment_date,
              appointment_time: appointment.appointment_time,
              service_name: serviceName,
              template_title: template.title,
              help_description: helpDescription.trim() || "No specific details provided.",
              completed_responses: finalResponses,
            },
          }).catch(() => {});
        }

      }
    } catch (err) {
      console.error("Unexpected consent form error:", err);
      toast.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateResponse = useCallback((label: string, value: any) => {
    setResponses(prev => {
      if (prev[label] === value) return prev;
      return { ...prev, [label]: value };
    });
  }, []);

  // Determine if this is a cryo or earwax form for theming
  const isCryo = template?.title.toLowerCase().includes("cryo");

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Loading your form...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center">
              <p className="text-lg font-medium text-destructive">{error}</p>
              <p className="mt-2 text-sm text-muted-foreground">Please check the link in your email and try again.</p>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  if (alreadyCompleted && !showAnotherPersonForm) {
    return (
      <PageShell templateTitle={template?.title} isCryo={isCryo}>
        <div className="flex flex-1 items-center justify-center p-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md space-y-4">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="mb-2 font-serif text-2xl">Form Already Completed</h1>
            <p className="text-muted-foreground">You've already submitted your consent form for this appointment. No further action is needed.</p>
          </motion.div>
        </div>
      </PageShell>
    );
  }

  if (submitted) {
    const displayName = submitterName || appointment?.client_name;
    return (
      <PageShell templateTitle={template?.title} isCryo={isCryo}>
        <div className="flex flex-1 items-center justify-center p-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md space-y-4">
            <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${needHelp ? "bg-amber-100 dark:bg-amber-950/30" : "bg-success/10"}`}>
              {needHelp ? <AlertTriangle className="h-10 w-10 text-amber-500" /> : <CheckCircle className="h-10 w-10 text-success" />}
            </div>
            <h1 className="mb-2 font-serif text-2xl">{needHelp ? "Form Received" : "Consent Form Submitted!"}</h1>
            <p className="mb-2 text-muted-foreground">Thank you, {displayName}.</p>
            <p className="text-sm text-muted-foreground">
              {needHelp 
                ? "We've received what you've completed so far. Matt will be in touch before your appointment to help you finish the rest of the form. Don't worry — we're here to help!"
                : "Your consent form has been received and a copy has been sent to your email for your records. We look forward to seeing you at your appointment."
              }
            </p>
          </motion.div>
        </div>
      </PageShell>
    );
  }

  if (!template) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center">
              <CheckCircle className="mx-auto mb-4 h-10 w-10 text-success" />
              <p className="text-lg font-medium">No Consent Form Required</p>
              <p className="mt-2 text-sm text-muted-foreground">There is no consent form attached to this appointment.</p>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  const renderField = (field: any, i: number) => {
    const key = field.label ? `field-${field.label.slice(0, 30)}-${i}` : `field-${i}`;
    const stableId = `consent-field-${i}`;

    // Conditional logic: hide field if showWhen checkbox is not checked
    if (field.showWhen && !responses[field.showWhen]) {
      return null;
    }

    switch (field.type) {
      case "section":
      case "heading":
        return (
          <div
            key={key}
            className="pt-6 pb-2 first:pt-0"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="h-px flex-1 bg-border" />
              <h3 className="font-serif text-lg text-center px-3">
                {(field.label || "").replace(/^── |──$/g, "").trim() || "Section"}
              </h3>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        );

      case "info":
        return (
          <div key={key}>
            <Card className="border-muted bg-muted/30">
              <CardContent className="py-4 px-5">
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {(field.content || field.label || "").split(/(\*\*[^*]+\*\*)/).map((part: string, j: number) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                      return <strong key={j} className="text-foreground">{part.slice(2, -2)}</strong>;
                    }
                    return <span key={j}>{part}</span>;
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "link":
        return (
          <div key={key} className="rounded-lg border p-4">
            <a
              href={field.placeholder || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white underline hover:text-white/80 inline-flex items-center gap-1.5"
            >
              🔗 {field.label || "Link"}
            </a>
            {field.description && (
              <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}
          </div>
        );

      case "confirm":
        return (
          <div
            key={key}
            className="rounded-lg border-2 border-dashed p-4 space-y-3"
          >
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{field.label}</p>
            <div className="flex items-center gap-3">
              <Checkbox
                id={stableId}
                checked={!!responses[field.label]}
                onCheckedChange={(checked) => updateResponse(field.label, checked)}
              />
              <Label htmlFor={stableId} className="font-medium text-sm">
                {field.confirmText || "I confirm"}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
          </div>
        );

      case "radio":
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm leading-relaxed whitespace-pre-line">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <RadioGroup
              value={responses[field.label] || ""}
              onValueChange={(val) => updateResponse(field.label, val)}
              className="flex flex-col gap-2"
            >
              {(field.options || []).map((opt: string, j: number) => (
                <div key={j} className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={opt} id={`radio-${i}-${j}`} />
                  <Label htmlFor={`radio-${i}-${j}`} className="font-normal text-sm flex-1 cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
            {field.followUp && responses[field.label] === "Yes" && (
              <StableTextarea
                placeholder={field.followUp}
                value={responses[`${field.label}_details`] || ""}
                onValueCommit={(val) => updateResponse(`${field.label}_details`, val)}
                rows={2}
                className="mt-2"
              />
            )}
          </div>
        );

      case "select":
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm leading-relaxed">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={responses[field.label] || ""}
              onValueChange={(val) => updateResponse(field.label, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || "Select an option..."} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt: string, j: number) => (
                  <SelectItem key={j} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.followUp && responses[field.label] === "Yes" && (
              <StableTextarea
                placeholder={field.followUp}
                value={responses[`${field.label}_details`] || ""}
                onValueCommit={(val) => updateResponse(`${field.label}_details`, val)}
                rows={2}
              />
            )}
          </div>
        );

      case "multiselect":
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm leading-relaxed">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-1.5">
              {(field.options || []).map((opt: string, j: number) => {
                const currentVals: string[] = responses[field.label] || [];
                const isChecked = currentVals.includes(opt);
                return (
                  <div key={j} className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`multi-${i}-${j}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const updated = checked
                          ? [...currentVals, opt]
                          : currentVals.filter((v: string) => v !== opt);
                        updateResponse(field.label, updated);
                      }}
                    />
                    <Label htmlFor={`multi-${i}-${j}`} className="font-normal text-sm flex-1 cursor-pointer">{opt}</Label>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "photo":
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm leading-relaxed">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.capture = "environment";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => updateResponse(field.label, reader.result);
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
              >
                <Camera className="h-4 w-4 mr-1" /> Camera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => updateResponse(field.label, reader.result);
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
              >
                <Image className="h-4 w-4 mr-1" /> Gallery
              </Button>
            </div>
            {responses[field.label] && (
              <div className="mt-2">
                <img src={responses[field.label]} alt="Uploaded" className="max-w-full max-h-48 rounded-lg border" />
              </div>
            )}
          </div>
        );

      case "scored_radio":
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <RadioGroup
              value={responses[field.label] || ""}
              onValueChange={(val) => updateResponse(field.label, val)}
              className="flex flex-col gap-1.5"
            >
              {(field.options || []).map((opt: any, j: number) => (
                <div key={j} className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={opt.text} id={`scored-${i}-${j}`} />
                  <Label htmlFor={`scored-${i}-${j}`} className="font-normal text-sm flex-1 cursor-pointer">
                    {opt.text}
                  </Label>
                  <span className="text-xs text-muted-foreground font-mono">{opt.score}</span>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case "score_display":
        if (fitzpatrickScore === null) return null;
        const fitzType = getFitzpatrickType(fitzpatrickScore);
        const isHighRisk = fitzpatrickScore >= 21; // Types IV-VI
        return (
          <div key={key} className="space-y-3">
            <div
              className="rounded-xl border-2 border-secondary bg-secondary/5 p-5 text-center"
            >
              <p className="text-xs tracking-widest uppercase text-secondary mb-1">Your Skin Type Score</p>
              <p className="font-serif text-4xl text-secondary mb-1">{fitzpatrickScore}</p>
              <p className="font-serif text-lg">{fitzType.type}</p>
              <p className="text-sm text-muted-foreground">{fitzType.description}</p>
            </div>
            {isHighRisk ? (
              <div className="rounded-xl border-2 border-destructive/60 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-destructive text-sm">Clinical Advisory — Higher Skin Type</p>
                    <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Freezing time will be <strong className="text-foreground">reduced by half</strong> to minimise the risk of pigmentation changes</li>
                      <li>A <strong className="text-foreground">follow-up retreatment in approximately 2 weeks</strong> is likely required</li>
                      <li>There is a higher chance of post-inflammatory hyper- or hypo-pigmentation</li>
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">Your practitioner will discuss this with you before starting begins.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-success bg-success/10 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success shrink-0" />
                  <div>
                    <p className="font-medium text-success text-sm">Standard Treatment Protocol</p>
                    <p className="text-sm text-muted-foreground">No adjustments required — standard freezing times apply for your skin type.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "signature":
        return (
          <div key={key} className="space-y-2 pt-4">
            <Label className="text-sm leading-relaxed">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <StableInput
              id={stableId}
              placeholder="Type your full name as signature"
              value={signature}
              onValueCommit={setSignature}
              className="h-12 text-lg font-serif"
            />
            <p className="text-xs text-foreground/70">
              By typing your name, you confirm agreement to this form.
            </p>
          </div>
        );

      case "textarea":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={stableId} className="text-sm leading-relaxed">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <StableTextarea
              id={stableId}
              value={responses[field.label] || ""}
              onValueCommit={(val) => updateResponse(field.label, val)}
              placeholder={field.placeholder || ""}
              rows={3}
            />
          </div>
        );

      case "checkbox":
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={!!responses[field.label]}
                onCheckedChange={(checked) => updateResponse(field.label, checked)}
              />
              <Label className="font-normal text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
            {field.followUp && responses[field.label] && (
              <StableTextarea
                placeholder={field.followUp}
                value={responses[`${field.label}_details`] || ""}
                onValueCommit={(val) => updateResponse(`${field.label}_details`, val)}
                rows={2}
                className="ml-6"
              />
            )}
          </div>
        );

      default: // text input
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={stableId} className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <StableInput
              id={stableId}
              value={responses[field.label] || ""}
              onValueCommit={(val) => updateResponse(field.label, val)}
              placeholder={field.placeholder || ""}
            />
          </div>
        );
    }
  };

  return (
    <PageShell templateTitle={template.title} isCryo={isCryo}>
      <div className="container mx-auto max-w-lg flex-1 px-4 py-8">
        {/* Additional person banner */}
        {showAnotherPersonForm && submitterName && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="py-3">
              <p className="text-sm font-medium text-center">
                Completing this form for: <strong>{submitterName}</strong>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Appointment info banner */}
        <Card className="mb-6 border-secondary/30 bg-secondary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {isCryo ? <Snowflake className="h-5 w-5 text-secondary" /> : <Ear className="h-5 w-5 text-secondary" />}
              <div>
                <p className="text-sm font-medium">Your Appointment</p>
                <p className="text-sm text-muted-foreground">
                  {serviceName && <>{serviceName} · </>}
                  {appointment && format(parseISO(appointment.appointment_date), "EEEE, MMMM d, yyyy")} at{" "}
                  {appointment?.appointment_time.slice(0, 5)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-secondary" />
              {template.title}
            </CardTitle>
            {template.description && (
              <p className="text-sm text-muted-foreground">{template.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {fields.map((field: any, i: number) => {
              const rendered = renderField(field, i);
              if (!rendered) return null;
              const isMissing = field.label && missingFields.includes(field.label);
              return (
                <div
                  key={`wrap-${i}`}
                  data-missing={isMissing ? "true" : undefined}
                  className={isMissing ? "rounded-md ring-2 ring-destructive ring-offset-2 ring-offset-background p-2 -m-2" : undefined}
                >
                  {rendered}
                </div>
              );
            })}

            {/* Need Help section */}
            <div className="border border-amber-500/40 bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="need-help"
                  checked={needHelp}
                  onCheckedChange={(checked) => setNeedHelp(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="need-help" className="text-sm font-medium cursor-pointer text-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 inline mr-1 text-amber-500" />
                    I'm having difficulty completing this form
                  </Label>
                  <p className="text-xs text-foreground/70">
                    Tick this box to submit what you've completed so far. Matt will contact you to help finish the form before your appointment.
                  </p>
                </div>
              </div>
              {needHelp && (
                <div className="ml-7 space-y-1.5">
                  <Label htmlFor="help-desc" className="text-xs text-muted-foreground">
                    What are you struggling with? <span className="text-muted-foreground/60">(optional)</span>
                  </Label>
                  <Textarea
                    id="help-desc"
                    value={helpDescription}
                    onChange={(e) => setHelpDescription(e.target.value)}
                    placeholder="e.g. I'm not sure about a medical question, the form is hard to read on my phone, I need help understanding something..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
              )}
            </div>

            <div className="pt-4">
              {missingFields.length > 0 && (
                <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="font-medium mb-1">
                    Please complete {missingFields.length} required {missingFields.length === 1 ? "field" : "fields"}:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {missingFields.slice(0, 8).map((m, i) => (
                      <li key={i}>{m.length > 80 ? m.slice(0, 80) + "…" : m}</li>
                    ))}
                    {missingFields.length > 8 && <li>…and {missingFields.length - 8} more</li>}
                  </ul>
                  <p className="mt-2 text-xs">Or tick "I'm having difficulty completing this form" below and Matt will help.</p>
                </div>
              )}
              <Button onClick={handleSubmit} className="w-full h-12 text-base" disabled={submitting}>
                {submitting ? "Submitting..." : needHelp ? "Submit What I've Completed" : "Submit Consent Form"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
};

export default ConsentFormPage;