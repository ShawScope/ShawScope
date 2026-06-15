import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isPast } from "date-fns";
import { CalendarDays, Mail, MessageSquare, RefreshCw, Ban, Pencil, Clock, Loader2, Eye, AlertTriangle, FileText, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ScheduledComm {
  id: string;
  appointment_id: string | null;
  channel: string;
  trigger_type: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  subject: string | null;
  scheduled_for: string;
  status: string;
  metadata: any;
  created_at: string;
}

interface ConsentPending {
  id: string;
  client_name: string;
  client_email: string;
  appointment_date: string;
  appointment_time: string;
  consent_form_template_id: string | null;
  consent_sent_at: string | null;
}

const triggerLabels: Record<string, string> = {
  review_request: "Review Request",
  cryo_followup: "Cryo Follow-up",
  sms_reminder: "SMS Reminder",
  auto_sms_reminder: "SMS Reminder",
  consent_reminder: "Consent Reminder",
};

const PlannedCommunications = () => {
  const [comms, setComms] = useState<ScheduledComm[]>([]);
  const [consentPending, setConsentPending] = useState<ConsentPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);
  const [editDialog, setEditDialog] = useState<ScheduledComm | null>(null);
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editTime, setEditTime] = useState("");
  const [previewComm, setPreviewComm] = useState<ScheduledComm | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchComms = async () => {
    setLoading(true);
    const [commResult, consentResult] = await Promise.all([
      supabase
        .from("scheduled_communications")
        .select("*")
        .eq("status", "pending")
        .order("scheduled_for", { ascending: true }),
      // Fetch appointments with consent forms not yet completed
      supabase
        .from("appointments")
        .select("id, client_name, client_email, appointment_date, appointment_time, consent_form_template_id, consent_sent_at")
        .not("consent_form_template_id", "is", null)
        .not("consent_sent_at", "is", null)
        .in("status", ["confirmed", "pending", "requested"])
        .gte("appointment_date", format(new Date(), "yyyy-MM-dd"))
        .order("appointment_date", { ascending: true }),
    ]);

    if (commResult.data) setComms(commResult.data as ScheduledComm[]);

    // Check which of these have NOT completed their consent form
    if (consentResult.data && consentResult.data.length > 0) {
      const aptIds = consentResult.data.map(a => a.id);
      const { data: completedResponses } = await supabase
        .from("consent_form_responses")
        .select("appointment_id")
        .in("appointment_id", aptIds);
      const completedIds = new Set((completedResponses || []).map(r => r.appointment_id));
      setConsentPending(consentResult.data.filter(a => !completedIds.has(a.id)) as ConsentPending[]);
    } else {
      setConsentPending([]);
    }
    setLoading(false);
  };

  const populateComms = async () => {
    setPopulating(true);
    toast.loading("Scanning appointments for planned communications...", { id: "populate" });
    const { data, error } = await supabase.functions.invoke("populate-scheduled-comms");
    if (error) {
      toast.error("Failed to scan appointments", { id: "populate" });
    } else {
      toast.success(`Found ${data?.created || 0} new planned communications`, { id: "populate" });
      fetchComms();
    }
    setPopulating(false);
  };

  const cancelComm = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_communications")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Failed to cancel");
    } else {
      toast.success("Communication cancelled");
      setComms(prev => prev.filter(c => c.id !== id));
    }
  };

  const saveEdit = async () => {
    if (!editDialog || !editDate) return;
    const newScheduled = new Date(editDate);
    const [h, m] = editTime.split(":").map(Number);
    newScheduled.setHours(h || 0, m || 0, 0, 0);

    const { error } = await supabase
      .from("scheduled_communications")
      .update({ scheduled_for: newScheduled.toISOString() })
      .eq("id", editDialog.id);
    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success("Send time updated");
      setComms(prev => prev.map(c => c.id === editDialog.id ? { ...c, scheduled_for: newScheduled.toISOString() } : c));
      setEditDialog(null);
    }
  };

  const openEdit = (comm: ScheduledComm) => {
    const d = parseISO(comm.scheduled_for);
    setEditDate(d);
    setEditTime(format(d, "HH:mm"));
    setEditDialog(comm);
  };

  const openPreview = async (comm: ScheduledComm) => {
    setPreviewComm(comm);
    setPreviewLoading(true);
    setPreviewContent(null);

    try {
      if (comm.channel === "sms") {
        // Fetch SMS template
        const triggerType = comm.trigger_type === "sms_reminder" ? "appointment_reminder" : comm.trigger_type;
        const { data: tpl } = await supabase
          .from("sms_templates")
          .select("body_text")
          .eq("trigger_type", triggerType)
          .eq("is_active", true)
          .maybeSingle();

        if (tpl) {
          let text = tpl.body_text
            .replace(/\{\{client_name\}\}/g, comm.recipient_name || "Patient")
            .replace(/\{\{service_name\}\}/g, "Appointment")
            .replace(/\{\{date\}\}/g, comm.scheduled_for ? format(parseISO(comm.scheduled_for), "dd MMM yyyy") : "")
            .replace(/\{\{time\}\}/g, "")
            .replace(/\{\{address\}\}/g, "")
            .replace(/\{\{admin_notes\}\}/g, "");
          setPreviewContent(text);
        } else {
          setPreviewContent("Template not found for this trigger type.");
        }
      } else {
        // Fetch email template
        if (comm.trigger_type === "cryo_followup" && comm.metadata?.week_number) {
          const { data: tpl } = await supabase
            .from("cryo_followup_templates")
            .select("subject, heading, guidance_html")
            .eq("week_number", comm.metadata.week_number)
            .eq("is_active", true)
            .maybeSingle();

          if (tpl) {
            const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;">
              <div style="background:#1a1a1a;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                <h1 style="color:#c8a97e;margin:0;font-size:18px;letter-spacing:2px;">SHAWSCOPE</h1>
                <p style="color:#999;margin:4px 0 0;font-size:11px;">CRYOTHERAPY AFTERCARE</p>
              </div>
              <div style="background:#fff;padding:24px;border:1px solid #e8e4df;border-top:none;border-radius:0 0 8px 8px;">
                <h2 style="margin:0 0 8px;font-size:18px;">${tpl.heading}</h2>
                <p style="color:#666;font-size:14px;">Hi ${comm.recipient_name || "Patient"},</p>
                <p style="color:#666;font-size:14px;">We're checking in on how your treated area is healing.</p>
                <div style="background:#faf9f7;border:1px solid #e8e4df;border-radius:6px;padding:16px;margin:12px 0;">
                  ${tpl.guidance_html}
                </div>
              </div>
            </div>`;
            setPreviewContent(html);
          } else {
            setPreviewContent("Cryo follow-up template not found for week " + comm.metadata.week_number);
          }
        } else {
          const { data: tpl } = await supabase
            .from("email_templates")
            .select("subject, body_html")
            .eq("trigger_type", comm.trigger_type)
            .eq("is_active", true)
            .maybeSingle();

          if (tpl) {
            const html = tpl.body_html
              .replace(/\{\{client_name\}\}/g, comm.recipient_name || "Patient")
              .replace(/\{\{service_name\}\}/g, "Appointment")
              .replace(/\{\{date\}\}/g, "")
              .replace(/\{\{time\}\}/g, "")
              .replace(/\{\{address\}\}/g, "")
              .replace(/\{\{admin_notes\}\}/g, "");
            setPreviewContent(html);
          } else {
            setPreviewContent("Email template not found for trigger: " + comm.trigger_type);
          }
        }
      }
    } catch {
      setPreviewContent("Failed to load template preview.");
    }
    setPreviewLoading(false);
  };

  useEffect(() => { fetchComms(); }, []);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-serif text-base">Planned Communications</CardTitle>
              <CardDescription>Upcoming emails and SMS that will be sent automatically</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchComms} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Refresh
              </Button>
              <Button variant="default" size="sm" onClick={populateComms} disabled={populating}>
                {populating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-1" />}
                Scan Appointments
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : comms.length === 0 && consentPending.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No planned communications.</p>
              <p className="text-xs mt-1">Click "Scan Appointments" to detect upcoming sends from approved/completed appointments.</p>
            </div>
          ) : (() => {
            const now = new Date();
            const nextToSend = comms.filter(c => isPast(parseISO(c.scheduled_for)));
            const future = comms.filter(c => !isPast(parseISO(c.scheduled_for)));

            const CommRow = ({ comm }: { comm: ScheduledComm }) => (
              <div key={comm.id} className="rounded-lg border p-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openPreview(comm)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
                      comm.channel === "email" ? "bg-primary/10" : "bg-secondary/10"
                    )}>
                      {comm.channel === "email" ? (
                        <Mail className="h-4 w-4 text-primary" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-secondary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{comm.recipient_name || "Unknown"}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {triggerLabels[comm.trigger_type] || comm.trigger_type}
                        </Badge>
                        {comm.metadata?.week_number && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Week {comm.metadata.week_number}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {comm.channel === "email" ? comm.recipient_email : comm.recipient_phone}
                        {comm.subject && <> · {comm.subject}</>}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {isPast(parseISO(comm.scheduled_for))
                            ? <span className="text-amber-600 dark:text-amber-400 font-medium">Overdue — {format(parseISO(comm.scheduled_for), "dd MMM yyyy, HH:mm")}</span>
                            : <>Scheduled: {format(parseISO(comm.scheduled_for), "dd MMM yyyy, HH:mm")}</>
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(comm); }} title="Edit send time">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); cancelComm(comm.id); }} title="Cancel">
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );

            return (
              <div className="space-y-4">
                {/* Next to Send — overdue items */}
                {nextToSend.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Next to Send</p>
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300">{nextToSend.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {nextToSend.map(comm => <CommRow key={comm.id} comm={comm} />)}
                    </div>
                  </div>
                )}

                {/* Consent forms awaiting completion */}
                {consentPending.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-destructive" />
                      <p className="text-sm font-semibold text-destructive">Awaiting Consent</p>
                      <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">{consentPending.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {consentPending.map(apt => (
                        <div key={apt.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                          <div className="flex items-start gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5 bg-destructive/10">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{apt.client_name}</p>
                              <p className="text-xs text-muted-foreground">{apt.client_email}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Appointment: {format(parseISO(apt.appointment_date), "dd MMM yyyy")} at {apt.appointment_time.slice(0, 5)}
                              </p>
                              <p className="text-[10px] text-destructive mt-1 font-medium">
                                Consent form sent but not yet completed
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Future planned */}
                {future.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold text-muted-foreground">Planned</p>
                      <Badge variant="outline" className="text-[10px]">{future.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {future.map(comm => <CommRow key={comm.id} comm={comm} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">Edit Send Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {editDialog?.recipient_name} — {triggerLabels[editDialog?.trigger_type || ""] || editDialog?.trigger_type}
              </p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {editDate ? format(editDate, "dd MMM yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editDate}
                  onSelect={setEditDate}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewComm} onOpenChange={(open) => !open && setPreviewComm(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {previewComm && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-lg flex items-center gap-2">
                  {previewComm.channel === "email" ? (
                    <Mail className="h-5 w-5 text-primary" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-secondary" />
                  )}
                  {previewComm.subject || "Message Preview"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-muted/30 rounded-lg p-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">To:</span>{" "}
                    <span className="font-medium">{previewComm.recipient_name || "Unknown"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Scheduled:</span>{" "}
                    {format(parseISO(previewComm.scheduled_for), "dd MMM yyyy, HH:mm")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {previewComm.channel === "email" ? "Email:" : "Phone:"}
                    </span>{" "}
                    {previewComm.channel === "email" ? previewComm.recipient_email : previewComm.recipient_phone}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {triggerLabels[previewComm.trigger_type] || previewComm.trigger_type}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Channel:</span>{" "}
                    {previewComm.channel === "email" ? "Email" : "SMS"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <span className="text-warning font-medium">Scheduled</span>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  {previewLoading ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      <p className="text-xs">Loading template preview...</p>
                    </div>
                  ) : previewContent ? (
                    previewComm.channel === "email" ? (
                      <iframe
                        srcDoc={previewContent}
                        className="w-full min-h-[400px] border-0 bg-white"
                        title="Email preview"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <div className="p-4 bg-muted/20 whitespace-pre-wrap text-sm">
                        {previewContent}
                      </div>
                    )
                  ) : (
                    <div className="p-4 text-muted-foreground text-center text-xs">
                      No template preview available.
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="flex-row gap-2 sm:justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setPreviewComm(null); openEdit(previewComm); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Time
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => { cancelComm(previewComm.id); setPreviewComm(null); }}>
                    <Ban className="h-3.5 w-3.5 mr-1" /> Cancel Send
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPreviewComm(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlannedCommunications;
