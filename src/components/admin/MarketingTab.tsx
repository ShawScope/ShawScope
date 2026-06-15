import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, parseISO, addDays } from "date-fns";
import { Search, Pencil, Trash2, Mail, MessageSquare, Users, Download, Upload, Send, TrendingUp, MailPlus, Loader2, ChevronDown, Megaphone, PoundSterling, AlertTriangle, Eye, Copy, CheckCircle, XCircle, Sparkles, TestTube, UserMinus, History, ImagePlus, X, RefreshCw, CalendarDays, Clock, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import PollResultsPanel from "./PollResultsPanel";

interface MarketingSubscriber {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  marketing_email: boolean;
  marketing_sms: boolean;
  marketing_opted_in_at: string | null;
}

// ─── SMS Templates ───
const SMS_TEMPLATES = [
  {
    name: "Seasonal Offer",
    body: `Hi {{first_name}}, ShawScope here! 🎉 We have a special offer this season — book any treatment and get 10% off. Reply BOOK or visit shawscope.co.uk/booking to grab your slot. Matt`,
  },
  {
    name: "New Year Promo",
    body: `Happy New Year {{first_name}}! 🎆 Start the year right with ShawScope. We're offering a discount on selected treatments this January. Book at shawscope.co.uk/booking — Matt`,
  },
  {
    name: "Referral Reward",
    body: `Hi {{first_name}}, did you know? Refer a friend to ShawScope and you'll both receive a discount on your next visit! Simply ask them to mention your name when booking. Matt`,
  },
  {
    name: "General Update",
    body: `Hi {{first_name}}, it's Matt from ShawScope. Just a quick update — we have new availability and services. Visit shawscope.co.uk/booking to see what's on offer!`,
  },
];

// ─── Shared branded email wrapper (matches email-layout.ts) ───
const marketingEmailWrap = (subtitle: string, content: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;text-align:center;">${subtitle}</p>
    </div>
    <div style="padding:32px 28px;">
      ${content}
    </div>
    <div style="border-top:1px solid #E5E7EB;margin:0 24px;padding-top:20px;text-align:center;">
      <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/>
      <a href="mailto:matt@shawscope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shawscope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
    </div>
    <div style="background-color:#0E1420;padding:16px 24px;text-align:center;margin-top:24px;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Dorchester, Dorset · <a href="https://shawscope.co.uk" style="color:#D4912A;text-decoration:none;">shawscope.co.uk</a></p>
    </div>
  </div>
</body>
</html>`;

const marketingButton = (text: string, href: string) =>
  `<div style="text-align:center;margin:24px 0;"><a href="${href}" style="display:inline-block;background-color:#D4912A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">${text}</a></div>`;

// ─── Email Templates ───
const EMAIL_TEMPLATES = [
  {
    name: "Seasonal Offer",
    subject: "A Special Offer from ShawScope 🎉",
    body: marketingEmailWrap("Special Offer", `
      <p style="font-size:15px;color:#4B5563;">Hi {{first_name}},</p>
      <p style="font-size:15px;color:#4B5563;">We have a special seasonal offer just for our valued patients — <strong style="color:#0E1420;">10% off</strong> any treatment booked this month!</p>
      <p style="font-size:15px;color:#4B5563;">Whether it's earwax removal, cryotherapy, or a foot health consultation, now is the perfect time to book.</p>
      ${marketingButton("Book Now", "https://shawscope.co.uk/booking")}
    `),
  },
  {
    name: "New Year Promo",
    subject: "Happy New Year from ShawScope! 🎆",
    body: marketingEmailWrap("New Year, New You", `
      <p style="font-size:15px;color:#4B5563;">Hi {{first_name}},</p>
      <p style="font-size:15px;color:#4B5563;">Happy New Year! 🎆 Start the year fresh with ShawScope's January treatments at reduced prices.</p>
      <p style="font-size:15px;color:#4B5563;">We have availability across Dorchester & surrounding areas. Don't miss out!</p>
      ${marketingButton("Book Your Slot", "https://shawscope.co.uk/booking")}
    `),
  },
  {
    name: "Referral Reward",
    subject: "Refer a Friend & Save! 💰",
    body: marketingEmailWrap("Referral Reward Programme", `
      <p style="font-size:15px;color:#4B5563;">Hi {{first_name}},</p>
      <p style="font-size:15px;color:#4B5563;">Love your ShawScope experience? <strong style="color:#0E1420;">Refer a friend</strong> and you'll both receive a discount on your next appointment!</p>
      <p style="font-size:15px;color:#4B5563;">Just ask them to mention your name when booking. Simple!</p>
      ${marketingButton("Book Again", "https://shawscope.co.uk/booking")}
    `),
  },
  {
    name: "General Update",
    subject: "News from ShawScope ✨",
    body: marketingEmailWrap("A Home Visiting Service", `
      <p style="font-size:15px;color:#4B5563;">Hi {{first_name}},</p>
      <p style="font-size:15px;color:#4B5563;">Just a quick update — we've got new availability and services. Check out what's on offer and book your next treatment.</p>
      ${marketingButton("View Availability", "https://shawscope.co.uk/booking")}
    `),
  },
];

// TheSMSWorks pricing: ~£0.04 per SMS segment (UK)
const SMS_COST_PER_SEGMENT = 0.04;
const SMS_SEGMENT_CHARS = 160;

const MarketingTab = () => {
  const [subscribers, setSubscribers] = useState<MarketingSubscriber[]>([]);
  const [search, setSearch] = useState("");
  const [editSub, setEditSub] = useState<MarketingSubscriber | null>(null);
  const [editEmail, setEditEmail] = useState(false);
  const [editSms, setEditSms] = useState(false);
  const [scheduledBatches, setScheduledBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Campaign state
  const [campaignChannel, setCampaignChannel] = useState<"sms" | "email">("sms");
  const [campaignName, setCampaignName] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [lastResults, setLastResults] = useState<{ total: number; sent: number; failed: number; results?: any[]; failedRecipients?: any[] } | null>(null);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);

  // AI writer state
  const [aiChannel, setAiChannel] = useState<"sms" | "email">("email");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiSubject, setAiSubject] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState<{ name: string; url: string }[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [testSending, setTestSending] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Social media AI state
  const [socialPostType, setSocialPostType] = useState("data-insight");
  const [socialCustomPrompt, setSocialCustomPrompt] = useState("");
  const [socialGenerating, setSocialGenerating] = useState(false);
  const [socialPost, setSocialPost] = useState("");
  const [socialImage, setSocialImage] = useState<string | null>(null);
  const [socialWithImage, setSocialWithImage] = useState(false);
  const [socialCopied, setSocialCopied] = useState(false);

  // Scheduling state
  const [scheduleMode, setScheduleMode] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [scheduleStartDate, setScheduleStartDate] = useState(() => format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [scheduling, setScheduling] = useState(false);

  // Unsubscribes & past campaigns
  const [unsubscribes, setUnsubscribes] = useState<{ id: string; client_email: string | null; client_phone: string | null; reason: string; created_at: string }[]>([]);
  const [pastCampaigns, setPastCampaigns] = useState<{ id: string; campaign_name: string; channel: string; subject: string | null; body_preview: string | null; body_html: string | null; recipient_count: number; sent_count: number; failed_count: number; created_at: string; failed_recipients?: any[] }[]>([]);
  const [viewingCampaign, setViewingCampaign] = useState<typeof pastCampaigns[0] | null>(null);

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ added: number; updated: number; skipped: number; errors: string[] } | null>(null);

  const fetchSubscribers = async () => {
    const { data } = await supabase
      .from("patients")
      .select("id, client_name, client_email, client_phone, marketing_email, marketing_sms, marketing_opted_in_at")
      .or("marketing_email.eq.true,marketing_sms.eq.true")
      .order("client_name");
    if (data) setSubscribers(data as MarketingSubscriber[]);
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  useEffect(() => {
    supabase.from("marketing_unsubscribes").select("*").order("created_at", { ascending: false }).then(({ data }) => { if (data) setUnsubscribes(data as any); });
    supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false }).then(({ data }) => { if (data) setPastCampaigns(data as any); });
    supabase.from("scheduled_campaign_batches" as any).select("*").eq("status", "pending").order("scheduled_date").then(({ data }: any) => { if (data) setScheduledBatches(data); });
  }, []);

  const filtered = subscribers.filter(s =>
    s.client_name.toLowerCase().includes(search.toLowerCase()) ||
    s.client_email.toLowerCase().includes(search.toLowerCase())
  );

  const emailCount = subscribers.filter(s => s.marketing_email).length;
  const smsCount = subscribers.filter(s => s.marketing_sms).length;

  // Channel-eligible subscribers
  const eligibleSubscribers = useMemo(() => {
    if (campaignChannel === "sms") return subscribers.filter(s => s.marketing_sms && s.client_phone);
    return subscribers.filter(s => s.marketing_email);
  }, [subscribers, campaignChannel]);

  const handleRemove = async (sub: MarketingSubscriber) => {
    await supabase.from("patients").update({
      marketing_email: false,
      marketing_sms: false,
      marketing_opted_in_at: null,
    }).eq("id", sub.id);
    toast.success(`${sub.client_name} removed from marketing`);
    fetchSubscribers();
  };

  const handleEditSave = async () => {
    if (!editSub) return;
    const anyActive = editEmail || editSms;
    await supabase.from("patients").update({
      marketing_email: editEmail,
      marketing_sms: editSms,
      marketing_opted_in_at: anyActive ? (editSub.marketing_opted_in_at || new Date().toISOString()) : null,
    }).eq("id", editSub.id);
    toast.success("Preferences updated");
    setEditSub(null);
    fetchSubscribers();
  };

  const exportCsv = () => {
    const rows = [["Name", "Email", "Phone", "Email Opt-in", "SMS Opt-in", "Opted In Date"]];
    filtered.forEach(s => {
      rows.push([
        s.client_name,
        s.client_email,
        s.client_phone || "",
        s.marketing_email ? "Yes" : "No",
        s.marketing_sms ? "Yes" : "No",
        s.marketing_opted_in_at ? format(parseISO(s.marketing_opted_in_at), "dd/MM/yyyy") : "",
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marketing-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleImportCsv = async (file: File) => {
    setImporting(true);
    setImportResults(null);
    const results = { added: 0, updated: 0, skipped: 0, errors: [] as string[] };

    try {
      const text = await file.text();
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        toast.error("CSV file is empty or has no data rows");
        setImporting(false);
        return;
      }

      // Parse header to find columns
      const header = lines[0].toLowerCase().replace(/"/g, "").split(",").map(h => h.trim());
      const nameIdx = header.findIndex(h => h.includes("name"));
      const emailIdx = header.findIndex(h => h.includes("email") && !h.includes("opt") && !h.includes("marketing"));
      const phoneIdx = header.findIndex(h => h.includes("phone") || h.includes("mobile"));

      if (emailIdx === -1) {
        toast.error("CSV must have an 'email' column");
        setImporting(false);
        return;
      }

      for (let i = 1; i < lines.length; i++) {
        // Simple CSV parsing (handles quoted fields)
        const cols: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const ch of lines[i]) {
          if (ch === '"') { inQuotes = !inQuotes; continue; }
          if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ""; continue; }
          current += ch;
        }
        cols.push(current.trim());

        const email = cols[emailIdx]?.toLowerCase().trim();
        const name = nameIdx >= 0 ? cols[nameIdx]?.trim() : "";
        const phone = phoneIdx >= 0 ? cols[phoneIdx]?.trim() : "";

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.errors.push(`Row ${i + 1}: Invalid email "${email || "empty"}"`);
          continue;
        }

        // Check if patient exists
        const { data: existing } = await supabase
          .from("patients")
          .select("id, marketing_email, marketing_sms")
          .eq("client_email", email)
          .maybeSingle();

        if (existing) {
          if (existing.marketing_email) {
            results.skipped++;
          } else {
            await supabase.from("patients").update({
              marketing_email: true,
              marketing_opted_in_at: new Date().toISOString(),
            }).eq("id", existing.id);
            results.updated++;
          }
        } else {
          // Create new patient with marketing opt-in
          const { error } = await supabase.from("patients").insert({
            client_name: name || email.split("@")[0],
            client_email: email,
            client_phone: phone || null,
            marketing_email: true,
            marketing_opted_in_at: new Date().toISOString(),
          });
          if (error) {
            results.errors.push(`Row ${i + 1}: ${error.message}`);
          } else {
            results.added++;
          }
        }
      }

      setImportResults(results);
      toast.success(`Import complete: ${results.added} added, ${results.updated} updated`);
      fetchSubscribers();
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Load template
  const loadTemplate = (template: { name: string; body: string; subject?: string }) => {
    setCampaignBody(template.body);
    setCampaignName(template.name);
    if (template.subject) setCampaignSubject(template.subject);
    toast.success(`Loaded "${template.name}" template`);
  };

  // SMS cost estimation
  const smsCost = useMemo(() => {
    if (campaignChannel !== "sms") return null;
    const recipientCount = selectedRecipients.size || eligibleSubscribers.length;
    const segments = Math.ceil(campaignBody.length / SMS_SEGMENT_CHARS) || 1;
    const totalCost = recipientCount * segments * SMS_COST_PER_SEGMENT;
    return { recipientCount, segments, costPerRecipient: segments * SMS_COST_PER_SEGMENT, totalCost };
  }, [campaignChannel, campaignBody, selectedRecipients, eligibleSubscribers]);

  // Email cost — Resend is free for low volume
  const emailCost = useMemo(() => {
    if (campaignChannel !== "email") return null;
    const recipientCount = selectedRecipients.size || eligibleSubscribers.length;
    // Resend free tier: 100 emails/day, 3000/month
    return { recipientCount, costPerRecipient: 0, totalCost: 0, note: "Free on Resend (up to 100/day)" };
  }, [campaignChannel, selectedRecipients, eligibleSubscribers]);

  // Toggle recipient
  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAllRecipients = () => {
    if (selectedRecipients.size === eligibleSubscribers.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(eligibleSubscribers.map(s => s.id)));
    }
  };

  // Send campaign — one recipient at a time for progress tracking
  const sendCampaign = async () => {
    setConfirmDialogOpen(false);
    setSending(true);
    const allResults: any[] = [];
    try {
      const recipientIds = selectedRecipients.size > 0 ? [...selectedRecipients] : eligibleSubscribers.map(s => s.id);
      const recipientList = eligibleSubscribers
        .filter(s => recipientIds.includes(s.id))
        .map(s => ({
          name: s.client_name,
          email: s.client_email,
          phone: s.client_phone,
        }));

      // Deduplicate by email/phone to prevent double-sends
      const seen = new Set<string>();
      const deduped = recipientList.filter(r => {
        const key = campaignChannel === "sms" ? (r.phone || "").toLowerCase() : (r.email || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setSendProgress({ current: 0, total: deduped.length, currentName: deduped[0]?.name || "" });

      for (let i = 0; i < deduped.length; i++) {
        const r = deduped[i];
        setSendProgress({ current: i + 1, total: deduped.length, currentName: r.name });

        try {
          const { data, error } = await supabase.functions.invoke("send-marketing-campaign", {
            body: {
              channel: campaignChannel,
              recipients: [r],
              subject: campaignSubject,
              messageBody: campaignBody,
              campaignName: campaignName || `Marketing ${campaignChannel.toUpperCase()}`,
              skipCampaignLog: true,
            },
          });
          if (error) throw error;
          allResults.push(...(data.results || []));
        } catch (err: any) {
          allResults.push({ recipient: r.name, success: false, error: err.message, email: r.email, phone: r.phone });
        }

        // Space out sends to stay well within Resend rate limits (2/sec)
        if (i < deduped.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      const sent = allResults.filter((r: any) => r.success).length;
      const failed = allResults.filter((r: any) => !r.success).length;
      const failedRecipients = allResults
        .filter((r: any) => !r.success)
        .map((r: any) => ({ name: r.recipient, email: r.email || null, phone: r.phone || null, error: r.error || null }));

      setLastResults({ total: deduped.length, sent, failed, results: allResults, failedRecipients });
      setResultsDialogOpen(true);
      toast.success(`Campaign sent: ${sent}/${deduped.length} delivered`);

      // Log the aggregated campaign
      await supabase.from("marketing_campaigns").insert({
        campaign_name: campaignName || `Marketing ${campaignChannel.toUpperCase()}`,
        channel: campaignChannel,
        subject: campaignSubject || null,
        body_preview: campaignBody.substring(0, 300),
        body_html: campaignBody,
        recipient_count: deduped.length,
        sent_count: sent,
        failed_count: failed,
        failed_recipients: failedRecipients,
      } as any);

      // Refresh past campaigns
      supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false }).then(({ data: d }) => { if (d) setPastCampaigns(d as any); });
    } catch (err: any) {
      toast.error(`Campaign failed: ${err.message}`);
    } finally {
      setSending(false);
      setSendProgress(null);
    }
  };

  // Retry failed recipients
  const retryFailed = async (failedRecipients: any[], channel: string, subject?: string | null, fullBody?: string | null, campaignNameStr?: string) => {
    if (!failedRecipients?.length) return;
    setRetrying(true);
    setSendProgress({ current: 0, total: failedRecipients.length, currentName: "Sending batch..." });
    try {
      // Send all failed recipients in a single batch call
      const recipients = failedRecipients.map(r => ({ name: r.name, email: r.email, phone: r.phone }));
      const { data, error } = await supabase.functions.invoke("send-marketing-campaign", {
        body: {
          channel,
          recipients,
          subject: subject || campaignSubject,
          messageBody: fullBody || campaignBody || "",
          campaignName: `Retry: ${campaignNameStr || campaignName || "Campaign"}`,
        },
      });
      if (error) throw error;

      const allResults = data.results || [];
      const sent = allResults.filter((r: any) => r.success).length;
      const failed = allResults.filter((r: any) => !r.success).length;
      const newFailed = allResults
        .filter((r: any) => !r.success)
        .map((r: any) => ({ name: r.recipient, email: r.email || null, phone: r.phone || null, error: r.error || null }));

      setLastResults({ total: failedRecipients.length, sent, failed, results: allResults, failedRecipients: newFailed });
      setViewingCampaign(null);
      setResultsDialogOpen(true);
      toast.success(`Retry sent: ${sent}/${failedRecipients.length} delivered`);
      // Refresh past campaigns
      supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false }).then(({ data: d }) => { if (d) setPastCampaigns(d as any); });
    } catch (err: any) {
      toast.error(`Retry failed: ${err.message}`);
    } finally {
      setRetrying(false);
      setSendProgress(null);
    }
  };

  // Schedule campaign in daily batches
  const scheduleCampaign = async () => {
    setConfirmDialogOpen(false);
    setScheduling(true);
    try {
      const recipientIds = selectedRecipients.size > 0 ? [...selectedRecipients] : eligibleSubscribers.map(s => s.id);
      const recipientList = eligibleSubscribers
        .filter(s => recipientIds.includes(s.id))
        .map(s => ({ name: s.client_name, email: s.client_email, phone: s.client_phone }));

      const totalBatches = Math.ceil(recipientList.length / batchSize);
      const parentGroupId = crypto.randomUUID();

      const batchRows = [];
      for (let i = 0; i < totalBatches; i++) {
        const batchRecipients = recipientList.slice(i * batchSize, (i + 1) * batchSize);
        const scheduledDate = format(addDays(new Date(scheduleStartDate), i), "yyyy-MM-dd");
        batchRows.push({
          campaign_name: campaignName || `Marketing ${campaignChannel.toUpperCase()}`,
          channel: campaignChannel,
          subject: campaignSubject || null,
          body_html: campaignBody,
          recipients: batchRecipients,
          batch_number: i + 1,
          total_batches: totalBatches,
          scheduled_date: scheduledDate,
          parent_group_id: parentGroupId,
          status: "pending",
        });
      }

      const { error } = await supabase.from("scheduled_campaign_batches" as any).insert(batchRows as any);
      if (error) throw error;

      toast.success(`Campaign scheduled: ${totalBatches} batch${totalBatches > 1 ? "es" : ""} of ~${batchSize}/day starting ${format(new Date(scheduleStartDate), "dd MMM yyyy")}`, { duration: 6000 });

      // Refresh past campaigns & scheduled batches
      supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false }).then(({ data: d }) => { if (d) setPastCampaigns(d as any); });
      supabase.from("scheduled_campaign_batches" as any).select("*").eq("status", "pending").order("scheduled_date").then(({ data }: any) => { if (data) setScheduledBatches(data); });
    } catch (err: any) {
      toast.error(`Scheduling failed: ${err.message}`);
    } finally {
      setScheduling(false);
    }
  };

  // Personalise preview
  const previewBody = campaignBody
    .replace(/\{\{name\}\}/gi, "Jane Smith")
    .replace(/\{\{first_name\}\}/gi, "Jane");

  const templates = campaignChannel === "sms" ? SMS_TEMPLATES : EMAIL_TEMPLATES;
  const costInfo = campaignChannel === "sms" ? smsCost : emailCost;
  const recipientCount = selectedRecipients.size || eligibleSubscribers.length;

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="font-serif text-2xl font-bold text-foreground">Marketing</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage subscriber opt-ins and send promotional campaigns via email or SMS</p>
      </div>
      {/* Stats — matching Business Statistics style */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{subscribers.length}</p>
              <p className="text-xs text-muted-foreground">Total Subscribers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{emailCount}</p>
              <p className="text-xs text-muted-foreground">Email Opt-ins</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/20">
              <MessageSquare className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{smsCount}</p>
              <p className="text-xs text-muted-foreground">SMS Opt-ins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Social Media Posts */}
      <Card className="border-sky-800/50 bg-sky-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-400" />
            <CardTitle className="font-serif text-lg text-foreground">AI Social Media Posts</CardTitle>
          </div>
          <CardDescription>Generate engaging social media content for ShawScope using your real business data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: "data-insight", label: "📊 Data Insight", desc: "Stats from your reports" },
              { value: "health-tip", label: "💡 Health Tip", desc: "Earwax, cryo, foot facts" },
              { value: "seasonal", label: "🌸 Seasonal", desc: "Timely & relevant" },
              { value: "promotional", label: "📣 Promotional", desc: "Service promotion" },
              { value: "behind-scenes", label: "🏠 Behind the Scenes", desc: "Day in the life" },
              { value: "custom", label: "✏️ Custom", desc: "Your own idea" },
            ].map(pt => (
              <button
                key={pt.value}
                onClick={() => setSocialPostType(pt.value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  socialPostType === pt.value
                    ? "border-sky-500 bg-sky-900/40 text-white"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-secondary/40"
                )}
              >
                <p className="text-sm font-medium">{pt.label}</p>
                <p className="text-[10px] opacity-70">{pt.desc}</p>
              </button>
            ))}
          </div>

          {socialPostType === "custom" && (
            <Textarea
              placeholder="Describe the post you want, e.g. 'A post about how earwax is actually protective and shouldn't be removed with cotton buds'"
              value={socialCustomPrompt}
              onChange={e => setSocialCustomPrompt(e.target.value)}
              rows={2}
            />
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={socialWithImage} onCheckedChange={setSocialWithImage} />
              <Label className="text-sm text-muted-foreground">Generate image too</Label>
            </div>
            <Button
              onClick={async () => {
                setSocialGenerating(true);
                setSocialPost("");
                setSocialImage(null);
                setSocialCopied(false);
                try {
                  const session = (await supabase.auth.getSession()).data.session;
                  const { data, error } = await supabase.functions.invoke("generate-social-post", {
                    body: {
                      postType: socialPostType,
                      prompt: socialCustomPrompt,
                      generateImage: socialWithImage,
                    },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.error);
                  setSocialPost(data.post || "");
                  setSocialImage(data.image || null);
                  toast.success("Social media post generated!");
                } catch (err: any) {
                  toast.error(err.message || "Generation failed");
                } finally {
                  setSocialGenerating(false);
                }
              }}
              disabled={socialGenerating || (socialPostType === "custom" && !socialCustomPrompt.trim())}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {socialGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {socialGenerating ? "Generating..." : "Generate Post"}
            </Button>
          </div>

          {socialPost && (
            <div className="space-y-3">
              {socialImage && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Generated Image (right-click to save)</Label>
                  <img
                    src={socialImage}
                    alt="Generated social media image"
                    className="rounded-lg border max-w-full max-h-[400px] object-contain"
                  />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">Post Text</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(socialPost);
                      setSocialCopied(true);
                      toast.success("Copied to clipboard!");
                      setTimeout(() => setSocialCopied(false), 2000);
                    }}
                    className="h-7 text-xs"
                  >
                    {socialCopied ? <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    {socialCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="rounded-lg border p-4 bg-card whitespace-pre-wrap text-sm">
                  {socialPost}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Campaign Writer */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-sky-500/20"><Sparkles className="h-4 w-4 text-sky-600" /></div>
              <span className="font-serif text-sm font-semibold text-foreground">AI Campaign Writer</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 border">
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Describe the campaign you want and the AI will draft a ready-to-use template. Once generated, click <strong>"Use This"</strong> to load it into the Campaign Builder below.
              </p>

              <div className="flex gap-2">
                <Button variant={aiChannel === "email" ? "default" : "outline"} size="sm" onClick={() => setAiChannel("email")} className={aiChannel === "email" ? "bg-blue-600 hover:bg-blue-700" : ""}>
                  <Mail className="h-4 w-4 mr-1" /> Email
                </Button>
                <Button variant={aiChannel === "sms" ? "default" : "outline"} size="sm" onClick={() => setAiChannel("sms")} className={aiChannel === "sms" ? "bg-violet-600 hover:bg-violet-700" : ""}>
                  <MessageSquare className="h-4 w-4 mr-1" /> SMS
                </Button>
              </div>

              <div>
                <Label className="text-xs">What's the campaign about?</Label>
                <Textarea
                  placeholder="e.g. Spring promotion with 15% off earwax removal, targeting returning patients, friendly and warm tone..."
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  className="mt-1 min-h-[80px]"
                />
              </div>

              {/* Image Upload for Email Campaigns */}
              {aiChannel === "email" && (
                <div className="space-y-2">
                  <Label className="text-xs">Upload Images (optional)</Label>
                  <div className="flex flex-wrap gap-2 items-start">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative group border rounded-lg overflow-hidden w-20 h-20">
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(img.url);
                            toast.success("Image URL copied");
                          }}
                          className="absolute bottom-0.5 right-0.5 bg-background/80 text-foreground rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      {uploadingImage ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImagePlus className="h-5 w-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground mt-1">Add Image</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error("Image must be under 5MB");
                            return;
                          }
                          setUploadingImage(true);
                          try {
                            const ext = file.name.split(".").pop() || "jpg";
                            const path = `marketing/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
                            const { error: uploadError } = await supabase.storage
                              .from("shawscope")
                              .upload(path, file, { contentType: file.type });
                            if (uploadError) throw uploadError;

                            const { data: signedData, error: signedError } = await supabase.storage
                              .from("shawscope")
                              .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
                            if (signedError) throw signedError;

                            setUploadedImages(prev => [...prev, { name: file.name, url: signedData.signedUrl }]);
                            toast.success("Image uploaded");
                          } catch (err: any) {
                            toast.error("Upload failed: " + err.message);
                          } finally {
                            setUploadingImage(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  </div>
                  {uploadedImages.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {uploadedImages.length} image{uploadedImages.length !== 1 ? "s" : ""} uploaded — the AI will include {uploadedImages.length === 1 ? "it" : "them"} in the generated template.
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={async () => {
                  if (!aiPrompt.trim()) return;
                  setAiGenerating(true);
                  setAiResult("");
                  setAiSubject("");
                  try {
                    const imageInstructions = uploadedImages.length > 0 && aiChannel === "email"
                      ? ` Include the following image(s) in the email body using <img> tags with max-width:100% and border-radius:8px styling: ${uploadedImages.map((img, i) => `Image ${i + 1}: ${img.url}`).join(", ")}.`
                      : "";
                    const prompt = aiChannel === "email"
                      ? `You are a marketing copywriter for ShawScope, a mobile healthcare practitioner in Dorset, UK. Write an HTML email campaign template based on this brief: "${aiPrompt}".${imageInstructions} The email should use the ShawScope brand (dark header #292524, clean body, Book Now button linking to ${import.meta.env.VITE_APP_URL || window.location.origin}/booking). Use {{first_name}} for personalisation. Include an unsubscribe note at the bottom. Start your response with SUBJECT: on the first line, then the HTML on subsequent lines. No markdown code fences, just the subject line then raw HTML.`
                      : `You are a marketing copywriter for ShawScope, a mobile healthcare practitioner in Dorset, UK. Write a short SMS marketing message (under 160 chars if possible) based on this brief: "${aiPrompt}". Use {{first_name}} for personalisation. Sign off as Matt. Return ONLY the SMS text, no markdown or explanation.`;

                    void prompt;
                    throw new Error("AI template generator has been removed for compliance — use the Social Post or Monthly Blog generators instead.");
                    // eslint-disable-next-line no-unreachable
                    const resp: Response = new Response();

                    // Parse SSE stream
                    const reader = resp.body?.getReader();
                    const decoder = new TextDecoder();
                    let fullText = "";

                    if (reader) {
                      let buffer = "";
                      while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";
                        for (const line of lines) {
                          if (!line.startsWith("data: ")) continue;
                          const payload = line.slice(6).trim();
                          if (payload === "[DONE]") continue;
                          try {
                            const parsed = JSON.parse(payload);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) fullText += delta;
                          } catch { /* skip malformed chunks */ }
                        }
                      }
                    }

                    if (!fullText.trim()) throw new Error("AI returned an empty response");

                    // Clean markdown code fences if present
                    let cleaned = fullText.trim();
                    cleaned = cleaned.replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

                    if (aiChannel === "email" && cleaned.toUpperCase().startsWith("SUBJECT:")) {
                      const lines = cleaned.split("\n");
                      setAiSubject(lines[0].replace(/^SUBJECT:\s*/i, "").trim());
                      setAiResult(lines.slice(1).join("\n").trim());
                    } else {
                      setAiResult(cleaned);
                    }
                    toast.success("Template generated!");
                  } catch (err: any) {
                    toast.error("AI generation failed: " + err.message);
                  } finally {
                    setAiGenerating(false);
                  }
                }}
                disabled={!aiPrompt.trim() || aiGenerating}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {aiGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Generate Template
              </Button>

              {aiResult && (
                <div className="space-y-3">
                  {aiSubject && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Subject Line</Label>
                      <p className="text-sm font-medium mt-1">{aiSubject}</p>
                    </div>
                  )}
                  <div className="rounded-lg border p-3 max-h-[300px] overflow-y-auto">
                    {aiChannel === "email" ? (
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aiResult, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody'], ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'width', 'height', 'target', 'rel'], ALLOW_DATA_ATTR: false }) }} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{aiResult}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setCampaignChannel(aiChannel);
                        setCampaignBody(aiResult);
                        if (aiSubject) setCampaignSubject(aiSubject);
                        setCampaignName("AI Generated");
                        toast.success("Template loaded into Campaign Builder");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> Use This Template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testSending}
                      onClick={async () => {
                        setTestSending(true);
                        try {
                          const body = aiResult.replace(/\{\{first_name\}\}/gi, "Matt").replace(/\{\{name\}\}/gi, "Matt Shaw");
                          const { error } = await supabase.functions.invoke("send-marketing-campaign", {
                            body: {
                              channel: "email",
                              recipients: [{ name: "Matt Shaw", email: "matt@shawscope.co.uk" }],
                              subject: aiSubject || "Test Email from ShawScope",
                              messageBody: aiChannel === "email" ? body : `<p>${body}</p>`,
                              campaignName: "AI Test Send",
                            },
                          });
                          if (error) throw error;
                          toast.success("Test email sent to matt@shawscope.co.uk");
                        } catch (err: any) { toast.error("Test failed: " + err.message); }
                        finally { setTestSending(false); }
                      }}
                      className="text-xs"
                    >
                      {testSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
                      Test Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testSending}
                      onClick={async () => {
                        setTestSending(true);
                        try {
                          const plainText = aiResult.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
                            .replace(/\{\{first_name\}\}/gi, "Matt").replace(/\{\{name\}\}/gi, "Matt Shaw");
                          const { error } = await supabase.functions.invoke("send-marketing-campaign", {
                            body: {
                              channel: "sms",
                              recipients: [{ name: "Matt Shaw", phone: "07444653593" }],
                              messageBody: plainText,
                              campaignName: "AI Test Send",
                            },
                          });
                          if (error) throw error;
                          toast.success("Test SMS sent to 07444653593");
                        } catch (err: any) { toast.error("Test failed: " + err.message); }
                        finally { setTestSending(false); }
                      }}
                      className="text-xs"
                    >
                      {testSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                      Test SMS
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>




      {/* Campaign Builder */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-orange-500/20"><Megaphone className="h-4 w-4 text-orange-600" /></div>
              <span className="font-serif text-sm font-semibold text-foreground">Campaign Builder</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 border">
            <CardContent className="p-4 space-y-4">
              {/* Channel Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={campaignChannel === "sms" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setCampaignChannel("sms"); setCampaignBody(""); setCampaignSubject(""); setSelectedRecipients(new Set()); }}
                  className={campaignChannel === "sms" ? "bg-violet-600 hover:bg-violet-700" : ""}
                >
                  <MessageSquare className="h-4 w-4 mr-1" /> SMS Campaign
                </Button>
                <Button
                  variant={campaignChannel === "email" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setCampaignChannel("email"); setCampaignBody(""); setCampaignSubject(""); setSelectedRecipients(new Set()); }}
                  className={campaignChannel === "email" ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  <Mail className="h-4 w-4 mr-1" /> Email Campaign
                </Button>
              </div>

              {/* Templates */}
              <div>
                <Label className="text-xs font-medium mb-2 block">Quick Templates</Label>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <Button key={t.name} variant="outline" size="sm" onClick={() => loadTemplate(t)} className="text-xs">
                      <Copy className="h-3 w-3 mr-1" /> {t.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Campaign Name */}
              <div>
                <Label className="text-xs">Campaign Name</Label>
                <Input placeholder="e.g. January 2026 Promo" value={campaignName} onChange={e => setCampaignName(e.target.value)} className="mt-1" />
              </div>

              {/* Subject (email only) */}
              {campaignChannel === "email" && (
                <div>
                  <Label className="text-xs">Subject Line</Label>
                  <Input placeholder="e.g. A Special Offer from ShawScope 🎉" value={campaignSubject} onChange={e => setCampaignSubject(e.target.value)} className="mt-1" />
                </div>
              )}

              {/* Message Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Message {campaignChannel === "email" ? "(HTML)" : "(Text)"}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Variables: {"{{first_name}}"} {"{{name}}"}</span>
                    {campaignBody && (
                      <Button variant="ghost" size="sm" onClick={() => setPreviewDialogOpen(true)} className="text-xs h-6 px-2">
                        <Eye className="h-3 w-3 mr-1" /> Preview
                      </Button>
                    )}
                  </div>
                </div>
                <Textarea
                  placeholder={campaignChannel === "sms" ? "Type your SMS message..." : "Paste or edit your email HTML..."}
                  value={campaignBody}
                  onChange={e => setCampaignBody(e.target.value)}
                  className="mt-1 min-h-[120px] font-mono text-xs"
                />
                {campaignChannel === "sms" && campaignBody && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {campaignBody.length} chars · {Math.ceil(campaignBody.length / SMS_SEGMENT_CHARS)} segment{Math.ceil(campaignBody.length / SMS_SEGMENT_CHARS) > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Cost Estimation */}
              {costInfo && campaignBody && (
                <Card className={cn("border-dashed", campaignChannel === "sms" ? "border-violet-700/40 bg-violet-950/20" : "border-blue-700/40 bg-blue-950/20")}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-2 mb-2">
                      <PoundSterling className="h-4 w-4" />
                      <span className="text-sm font-medium">Estimated Cost</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                      <div>
                        <p className="text-muted-foreground">Recipients</p>
                        <p className="font-bold text-lg">{recipientCount}</p>
                      </div>
                      {campaignChannel === "sms" && smsCost && (
                        <div>
                          <p className="text-muted-foreground">Segments</p>
                          <p className="font-bold text-lg">{smsCost.segments}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Per Recipient</p>
                        <p className="font-bold text-lg">£{costInfo.costPerRecipient.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-bold text-lg text-emerald-400">
                          {costInfo.totalCost === 0 ? "FREE" : `£${costInfo.totalCost.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                    {campaignChannel === "email" && emailCost && (
                      <p className="text-[10px] text-muted-foreground text-center mt-1">{emailCost.note}</p>
                    )}
                    {campaignChannel === "sms" && (
                      <p className="text-[10px] text-muted-foreground text-center mt-1">Based on TheSMSWorks UK rate ~£0.04/segment. Actual cost may vary.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Recipient Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">
                    Recipients ({selectedRecipients.size || eligibleSubscribers.length} of {eligibleSubscribers.length})
                  </Label>
                  <Button variant="ghost" size="sm" onClick={toggleAllRecipients} className="text-xs h-6 px-2">
                    {selectedRecipients.size === eligibleSubscribers.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                {eligibleSubscribers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3">No subscribers opted in for {campaignChannel === "sms" ? "SMS (with phone number)" : "email"} marketing.</p>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto rounded-md border p-2 space-y-1">
                    {eligibleSubscribers.map(s => (
                      <div key={s.id} className="flex items-center gap-2 text-xs py-1 px-1 rounded hover:bg-muted/20">
                        <Checkbox
                          checked={selectedRecipients.size === 0 || selectedRecipients.has(s.id)}
                          onCheckedChange={() => toggleRecipient(s.id)}
                        />
                        <span className="font-medium flex-1">{s.client_name}</span>
                        <span className="text-muted-foreground">{campaignChannel === "sms" ? s.client_phone : s.client_email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Send + Test */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => { setScheduleMode(false); setConfirmDialogOpen(true); }}
                    disabled={!campaignBody || eligibleSubscribers.length === 0 || sending || scheduling}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                  {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                    {sending ? "Sending..." : "Send Now"}
                  </Button>
                  <Button
                    onClick={() => { setScheduleMode(true); setConfirmDialogOpen(true); }}
                    disabled={!campaignBody || eligibleSubscribers.length === 0 || sending || scheduling}
                    variant="outline"
                    className="border-sky-600/40 text-sky-600 hover:bg-sky-600/10"
                  >
                    {scheduling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-1" />}
                    {scheduling ? "Scheduling..." : "Schedule"}
                  </Button>
                </div>
                {/* Sending Progress */}
                {sending && sendProgress && (
                  <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Sending to <span className="font-medium text-foreground">{sendProgress.currentName}</span>
                      </span>
                      <span className="font-medium">{sendProgress.current}/{sendProgress.total}</span>
                    </div>
                    <Progress value={(sendProgress.current / sendProgress.total) * 100} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">
                      ~{Math.max(0, (sendProgress.total - sendProgress.current) * 5)} seconds remaining (4s gap between sends)
                    </p>
                  </div>
                )}
                {campaignBody && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-amber-800/20 pt-3">
                     <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Test:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testSending}
                      onClick={async () => {
                        setTestSending(true);
                        try {
                          const { error } = await supabase.functions.invoke("send-marketing-campaign", {
                            body: {
                              channel: "email",
                              recipients: [{ name: "Matt Shaw", email: "matt@shawscope.co.uk" }],
                              subject: campaignSubject || "Test Email from ShawScope",
                              messageBody: campaignBody.replace(/\{\{first_name\}\}/gi, "Matt").replace(/\{\{name\}\}/gi, "Matt Shaw"),
                              campaignName: "Test Send",
                            },
                          });
                          if (error) throw error;
                          toast.success("Test email sent to matt@shawscope.co.uk");
                        } catch (err: any) { toast.error("Test failed: " + err.message); }
                        finally { setTestSending(false); }
                      }}
                      className="text-xs"
                    >
                      {testSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
                      Test Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testSending}
                      onClick={async () => {
                        setTestSending(true);
                        try {
                          const plainText = campaignBody.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
                            .replace(/\{\{first_name\}\}/gi, "Matt").replace(/\{\{name\}\}/gi, "Matt Shaw");
                          const { error } = await supabase.functions.invoke("send-marketing-campaign", {
                            body: {
                              channel: "sms",
                              recipients: [{ name: "Matt Shaw", phone: "07444653593" }],
                              messageBody: plainText,
                              campaignName: "Test Send",
                            },
                          });
                          if (error) throw error;
                          toast.success("Test SMS sent to 07444653593");
                        } catch (err: any) { toast.error("Test failed: " + err.message); }
                        finally { setTestSending(false); }
                      }}
                      className="text-xs"
                    >
                      {testSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                      Test SMS
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Unsubscribes */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-red-500/20"><UserMinus className="h-4 w-4 text-red-600" /></div>
              <span className="font-serif text-sm font-semibold text-foreground">Unsubscribes</span>
              <Badge variant="outline" className="text-[10px]">{unsubscribes.length}</Badge>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 border">
            <CardContent className="p-4">
              {unsubscribes.length === 0 ? (
                <p className="text-sm text-center py-4 text-muted-foreground">No unsubscribes yet.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {unsubscribes.map(u => (
                    <div key={u.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.client_email || u.client_phone || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{u.reason}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{format(parseISO(u.created_at), "dd MMM yyyy")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Scheduled Batches */}
      {scheduledBatches.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between rounded-lg border border-sky-600/30 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-sky-500/20"><CalendarDays className="h-4 w-4 text-sky-600" /></div>
                <span className="font-serif text-sm font-semibold text-foreground">Scheduled Batches</span>
                <Badge variant="outline" className="text-[10px] border-sky-600/40 text-sky-600">{scheduledBatches.length} pending</Badge>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2 border border-sky-600/20">
              <CardContent className="p-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {scheduledBatches.map(b => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{b.campaign_name}</p>
                          <Badge variant="outline" className={cn("text-[10px]", b.channel === "email" ? "border-blue-600/40 text-blue-600" : "border-violet-600/40 text-violet-600")}>
                            {b.channel.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Batch {b.batch_number}/{b.total_batches} · {(b.recipients as any[])?.length || 0} recipients
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs text-sky-500 font-medium">{format(new Date(b.scheduled_date), "dd MMM yyyy")}</p>
                        <p className="text-[10px] text-muted-foreground">8:00 AM</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    const ids = scheduledBatches.map(b => b.id);
                    await supabase.from("scheduled_campaign_batches" as any).update({ status: "cancelled" } as any).in("id", ids);
                    setScheduledBatches([]);
                    toast.success("All scheduled batches cancelled");
                  }}
                >
                  Cancel All Scheduled
                </Button>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Past Campaigns */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted"><History className="h-4 w-4 text-muted-foreground" /></div>
              <span className="font-serif text-sm font-semibold text-foreground">Past Campaigns</span>
              <Badge variant="outline" className="text-[10px]">{pastCampaigns.length}</Badge>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 border">
            <CardContent className="p-4">
              {pastCampaigns.length === 0 ? (
                <p className="text-sm text-center py-4 text-muted-foreground">No campaigns sent yet.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {pastCampaigns.map(c => (
                    <div key={c.id} onClick={() => setViewingCampaign(c)} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{c.campaign_name}</p>
                          <Badge variant="outline" className={cn("text-[10px]", c.channel === "email" ? "border-blue-600/40 text-blue-600" : "border-violet-600/40 text-violet-600")}>
                            {c.channel.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.subject || c.body_preview?.slice(0, 60)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <div className="text-right">
                          <p className="text-xs text-emerald-600">{c.sent_count}/{c.recipient_count} sent</p>
                          {c.failed_count > 0 && <p className="text-[10px] text-red-400">{c.failed_count} failed</p>}
                          <p className="text-[10px] text-muted-foreground">{format(parseISO(c.created_at), "dd MMM yyyy")}</p>
                        </div>
                        {c.failed_count > 0 && (c as any).failed_recipients?.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] border-amber-600/40 text-amber-600 hover:bg-amber-600/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              retryFailed(
                                (c as any).failed_recipients,
                                c.channel,
                                c.subject,
                                c.body_html || c.body_preview,
                                c.campaign_name
                              );
                            }}
                            disabled={retrying}
                          >
                            {retrying ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                            Resend
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Email Polls */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/20"><BarChart3 className="h-4 w-4 text-amber-600" /></div>
              <span className="font-serif text-sm font-semibold text-foreground">Email Polls</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 border">
            <CardContent className="p-4">
              <PollResultsPanel />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={!!viewingCampaign} onOpenChange={(open) => !open && setViewingCampaign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{viewingCampaign?.campaign_name}</DialogTitle>
          </DialogHeader>
          {viewingCampaign && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 rounded-lg p-3">
                <div><span className="text-muted-foreground">Channel:</span> {viewingCampaign.channel.toUpperCase()}</div>
                <div><span className="text-muted-foreground">Sent:</span> {format(parseISO(viewingCampaign.created_at), "dd MMM yyyy HH:mm")}</div>
                <div><span className="text-muted-foreground">Recipients:</span> {viewingCampaign.recipient_count}</div>
                <div><span className="text-muted-foreground">Delivered:</span> <span className="text-emerald-500">{viewingCampaign.sent_count}</span> / Failed: <span className="text-red-400">{viewingCampaign.failed_count}</span></div>
              </div>
              {viewingCampaign.subject && <p className="text-xs"><span className="text-muted-foreground">Subject:</span> {viewingCampaign.subject}</p>}
              {viewingCampaign.body_preview && (
                <div className="rounded-lg border p-3 text-xs bg-muted/10 whitespace-pre-wrap">{viewingCampaign.body_preview}</div>
              )}
              {/* Failed recipients list & retry */}
              {(viewingCampaign as any).failed_recipients && (viewingCampaign as any).failed_recipients.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-red-400">Failed recipients:</p>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {(viewingCampaign as any).failed_recipients.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-red-950/20">
                        <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
                        <span>{r.name}</span>
                        <span className="text-muted-foreground ml-auto truncate max-w-[150px]">{r.error}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => retryFailed(
                      (viewingCampaign as any).failed_recipients,
                      viewingCampaign.channel,
                      viewingCampaign.subject,
                      viewingCampaign.body_html || viewingCampaign.body_preview,
                      viewingCampaign.campaign_name
                    )}
                    disabled={retrying}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    {retrying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    Retry {(viewingCampaign as any).failed_recipients.length} Failed
                  </Button>
                  {retrying && sendProgress && (
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Retrying: <span className="font-medium text-foreground">{sendProgress.currentName}</span></span>
                        <span className="font-medium">{sendProgress.current}/{sendProgress.total}</span>
                      </div>
                      <Progress value={(sendProgress.current / sendProgress.total) * 100} className="h-2" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subscriber List */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/20"><Users className="h-4 w-4 text-emerald-600" /></div>
              <span className="font-serif text-sm font-semibold text-foreground">Subscriber List</span>
              <Badge variant="outline" className="text-[10px]">{subscribers.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setImportDialogOpen(true); }} className="text-xs h-7 px-2">
                <Upload className="h-3 w-3 mr-1" /> Import
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); exportCsv(); }} className="text-xs h-7 px-2">
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 border">
            <CardContent className="p-4">
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search subscribers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>

              {loading ? (
                <p className="py-8 text-center text-muted-foreground">Loading...</p>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {subscribers.length === 0 ? "No marketing subscribers yet. Patients can opt in during booking." : "No results found."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-center">Email</TableHead>
                        <TableHead className="text-center">SMS</TableHead>
                        <TableHead className="hidden sm:table-cell">Opted In</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium text-sm">{sub.client_name}</TableCell>
                          <TableCell>
                            <p className="text-xs">{sub.client_email}</p>
                            {sub.client_phone && <p className="text-[10px] text-muted-foreground">{sub.client_phone}</p>}
                          </TableCell>
                          <TableCell className="text-center">
                            {sub.marketing_email ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-600/20 text-[10px]">Yes</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {sub.marketing_sms ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-600/20 text-[10px]">Yes</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                            {sub.marketing_opted_in_at ? format(parseISO(sub.marketing_opted_in_at), "dd MMM yyyy") : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" title="Edit preferences" onClick={() => {
                                setEditSub(sub);
                                setEditEmail(sub.marketing_email);
                                setEditSms(sub.marketing_sms);
                              }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Remove from marketing" onClick={() => handleRemove(sub)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Dialog */}
      <Dialog open={!!editSub} onOpenChange={(open) => !open && setEditSub(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Marketing Preferences</DialogTitle>
          </DialogHeader>
          {editSub && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{editSub.client_name}</p>
              <p className="text-xs text-muted-foreground">{editSub.client_email}</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-mkt-email">Email marketing</Label>
                <Switch id="edit-mkt-email" checked={editEmail} onCheckedChange={setEditEmail} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-mkt-sms">SMS marketing</Label>
                <Switch id="edit-mkt-sms" checked={editSms} onCheckedChange={setEditSms} />
              </div>
              <Button onClick={handleEditSave} className="w-full">Save Preferences</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Send Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              {scheduleMode ? (
                <><CalendarDays className="h-5 w-5 text-sky-400" /> Schedule Campaign</>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-amber-400" /> Confirm Campaign Send</>
              )}
            </DialogTitle>
            <DialogDescription>
              {scheduleMode ? (
                <>Schedule {campaignChannel === "sms" ? "SMS" : "email"} to <strong>{recipientCount}</strong> recipient{recipientCount !== 1 ? "s" : ""} in daily batches.</>
              ) : (
                <>
                  This will send {campaignChannel === "sms" ? "an SMS" : "an email"} to <strong>{recipientCount}</strong> recipient{recipientCount !== 1 ? "s" : ""}.
                  {campaignChannel === "sms" && smsCost && smsCost.totalCost > 0 && (
                    <> Estimated cost: <strong>£{smsCost.totalCost.toFixed(2)}</strong>.</>
                  )}
                  {" "}This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {scheduleMode && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Batch Size (recipients per day)</Label>
                <Input
                  type="number"
                  min={1}
                  max={recipientCount}
                  value={batchSize}
                  onChange={e => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={scheduleStartDate}
                  min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                  onChange={e => setScheduleStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="rounded-lg border border-sky-600/30 bg-sky-950/20 p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 font-medium text-sky-400">
                  <Clock className="h-3.5 w-3.5" />
                  Schedule Summary
                </div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">{Math.ceil(recipientCount / batchSize)}</strong> batch{Math.ceil(recipientCount / batchSize) > 1 ? "es" : ""} of up to <strong className="text-foreground">{batchSize}</strong> per day
                </p>
                <p className="text-muted-foreground">
                  Starting <strong className="text-foreground">{format(new Date(scheduleStartDate), "dd MMM yyyy")}</strong> → 
                  finishing <strong className="text-foreground">{format(addDays(new Date(scheduleStartDate), Math.ceil(recipientCount / batchSize) - 1), "dd MMM yyyy")}</strong>
                </p>
                <p className="text-muted-foreground">Batches are sent daily at <strong className="text-foreground">8:00 AM</strong></p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            {scheduleMode ? (
              <Button onClick={scheduleCampaign} className="bg-sky-600 hover:bg-sky-700">
                <CalendarDays className="h-4 w-4 mr-1" /> Confirm Schedule
              </Button>
            ) : (
              <Button onClick={sendCampaign} className="bg-orange-600 hover:bg-orange-700">
                <Send className="h-4 w-4 mr-1" /> Confirm & Send
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Message Preview</DialogTitle>
            <DialogDescription>Showing with sample name "Jane Smith"</DialogDescription>
          </DialogHeader>
          {campaignChannel === "sms" ? (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm whitespace-pre-wrap">{previewBody}</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Subject: {(campaignSubject || "").replace(/\{\{first_name\}\}/gi, "Jane").replace(/\{\{name\}\}/gi, "Jane Smith")}</p>
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewBody, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody'], ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'width', 'height', 'target', 'rel'], ALLOW_DATA_ATTR: false }) }} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Campaign Results</DialogTitle>
          </DialogHeader>
          {lastResults && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{lastResults.total}</p>
                </div>
                <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/30 p-3">
                  <p className="text-xs text-emerald-300/60">Sent</p>
                  <p className="text-2xl font-bold text-emerald-400">{lastResults.sent}</p>
                </div>
                <div className="rounded-lg bg-red-950/30 border border-red-800/30 p-3">
                  <p className="text-xs text-red-300/60">Failed</p>
                  <p className="text-2xl font-bold text-red-400">{lastResults.failed}</p>
                </div>
              </div>
              {lastResults.results && lastResults.results.some((r: any) => !r.success) && (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  <p className="text-xs font-medium text-red-400">Failed deliveries:</p>
                  {lastResults.results.filter((r: any) => !r.success).map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-red-950/20">
                      <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
                      <span>{r.recipient}</span>
                      <span className="text-muted-foreground ml-auto">{r.error}</span>
                    </div>
                  ))}
                </div>
              )}
              {lastResults.failedRecipients && lastResults.failedRecipients.length > 0 && (
                <Button
                  onClick={() => retryFailed(lastResults.failedRecipients!, campaignChannel, campaignSubject, campaignBody, campaignName)}
                  disabled={retrying}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {retrying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Retry {lastResults.failedRecipients.length} Failed Recipient{lastResults.failedRecipients.length !== 1 ? "s" : ""}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!open) { setImportDialogOpen(false); setImportResults(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Import Marketing Subscribers</DialogTitle>
            <DialogDescription>
              Upload a CSV file with columns: <strong>Name</strong>, <strong>Email</strong>, and optionally <strong>Phone</strong>. Existing patients will be updated; new patients will be created with email marketing opt-in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <Label htmlFor="csv-import" className="cursor-pointer text-sm text-primary hover:underline">
                {importing ? "Importing..." : "Click to select CSV file"}
              </Label>
              <input
                id="csv-import"
                type="file"
                accept=".csv"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportCsv(file);
                  e.target.value = "";
                }}
              />
              <p className="text-[10px] text-muted-foreground mt-2">Accepted format: .csv with header row</p>
            </div>

            {importing && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Processing...</span>
              </div>
            )}

            {importResults && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <p className="text-muted-foreground">Added</p>
                    <p className="text-lg font-bold text-emerald-500">{importResults.added}</p>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 p-3">
                    <p className="text-muted-foreground">Updated</p>
                    <p className="text-lg font-bold text-blue-500">{importResults.updated}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-muted-foreground">Skipped</p>
                    <p className="text-lg font-bold">{importResults.skipped}</p>
                  </div>
                </div>
                {importResults.errors.length > 0 && (
                  <div className="max-h-[120px] overflow-y-auto rounded border p-2 space-y-1">
                    <p className="text-xs font-medium text-destructive">Errors:</p>
                    {importResults.errors.map((err, i) => (
                      <p key={i} className="text-[10px] text-destructive">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingTab;
