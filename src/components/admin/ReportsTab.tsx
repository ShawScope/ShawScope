import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, subYears, differenceInYears } from "date-fns";
import { FileDown, PoundSterling, CalendarDays, Users, TrendingUp, BarChart3, PieChart, ClipboardList, Loader2, Globe, Monitor, Smartphone, Tablet, Trash2, RefreshCw, Car, Route, Clock } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AreasMapSection from "@/components/admin/AreasMapSection";
import AreasErrorBoundary from "@/components/admin/AreasErrorBoundary";
import FinancesTab from "@/components/admin/FinancesTab";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend, ComposedChart, Line } from "recharts";

// Types
interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_id: string | null;
  price: number | null;
  travel_fee: number | null;
  travel_distance_miles: number | null;
  notes: string | null;
  address: string | null;
  postcode: string | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}

interface Service {
  id: string;
  name: string;
  price: number | null;
  duration_minutes: number;
}

interface ConsentResponse {
  id: string;
  appointment_id: string;
  consent_form_template_id: string;
  responses: any;
  created_at: string;
  submitter_name: string | null;
}

interface ConsentTemplate {
  id: string;
  title: string;
  fields: any[];
  form_type: string;
}

interface Patient {
  id: string;
  client_name: string;
  client_email: string;
  date_of_birth: string | null;
  created_at: string;
  marketing_email: boolean;
  marketing_sms: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ReportsTab = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [consentResponses, setConsentResponses] = useState<ConsentResponse[]>([]);
  const [consentTemplates, setConsentTemplates] = useState<ConsentTemplate[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState<any>(null);
  const [timings, setTimings] = useState<any[]>([]);
  const [timingsLoading, setTimingsLoading] = useState(true);
  const [journeys, setJourneys] = useState<any[]>([]);
  const [ga4Loading, setGa4Loading] = useState(false);
  const [ga4Connecting, setGa4Connecting] = useState(false);
  const [googleAnalyticsConnected, setGoogleAnalyticsConnected] = useState<boolean | null>(null);
  const [ga4Days, setGa4Days] = useState<string>("30");
  // Report filters
  const [reportYear, setReportYear] = useState(String(CURRENT_YEAR));
  const [reportMonth, setReportMonth] = useState("all");
  const [reportTab, setReportTab] = useState("financial");

  // Consent analytics filters
  const [selectedTemplateId, setSelectedTemplateId] = useState("all");
  const [selectedFieldLabel, setSelectedFieldLabel] = useState("");

  useEffect(() => {
    fetchAllData();
    checkGoogleAnalyticsConnection();
  }, []);

  const checkGoogleAnalyticsConnection = async () => {
    const { data } = await supabase
      .from("google_oauth_tokens")
      .select("id, scopes")
      .ilike("scopes", "%analytics.readonly%")
      .limit(1);
    setGoogleAnalyticsConnected(!!data && data.length > 0);
  };

  const fetchAllData = async () => {
    setLoading(true);
    setTimingsLoading(true);
    const [aptsRes, svcRes, consentRes, templatesRes, patientsRes, analyticsRes, timingsRes, journeysRes] = await Promise.all([
      supabase.from("appointments").select("*").order("appointment_date", { ascending: false }),
      supabase.from("services").select("*"),
      supabase.from("consent_form_responses").select("*").order("created_at", { ascending: false }),
      supabase.from("consent_form_templates").select("*"),
      supabase.from("patients").select("*").order("created_at", { ascending: false }),
      supabase.from("website_analytics_snapshots").select("*").order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("appointment_timings").select("*, appointments(client_name, service_id, appointment_date)").order("created_at", { ascending: false }),
      supabase.from("mileage_journeys").select("*").eq("hidden", false).order("journey_date", { ascending: false }),
    ]);
    if (aptsRes.data) setAppointments(aptsRes.data as Appointment[]);
    if (svcRes.data) setServices(svcRes.data as Service[]);
    if (consentRes.data) setConsentResponses(consentRes.data as ConsentResponse[]);
    if (templatesRes.data) setConsentTemplates(templatesRes.data as ConsentTemplate[]);
    if (patientsRes.data) setPatients(patientsRes.data as Patient[]);
    if (analyticsRes.data) setAnalyticsSnapshot(analyticsRes.data);
    if (timingsRes.data) setTimings(timingsRes.data);
    if (journeysRes.data) setJourneys(journeysRes.data as any[]);
    setLoading(false);
    setTimingsLoading(false);
  };

  const refreshGA4 = async () => {
    setGa4Loading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-ga4-analytics", {
        body: { days: parseInt(ga4Days, 10) || 30 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Analytics refreshed — ${data.total_visitors} visitors, ${data.total_pageviews} pageviews`);
      // Re-fetch snapshot
      const { data: snap } = await supabase.from("website_analytics_snapshots").select("*").order("snapshot_date", { ascending: false }).limit(1).maybeSingle();
      if (snap) setAnalyticsSnapshot(snap);
    } catch (err: any) {
      console.error("GA4 refresh error:", err);
      let message = err.message || "Failed to refresh analytics";
      if (err.context instanceof Response) {
        try {
          const details = await err.context.clone().json();
          message = details?.error || message;
        } catch {
          // Keep the original error message if the response body is not JSON.
        }
      }
      toast.error(message, { duration: 12000 });
    } finally {
      setGa4Loading(false);
    }
  };

  const connectGoogleAnalytics = async () => {
    setGa4Connecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("google-oauth-start", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { mode: "analytics" },
      });
      if (error || data?.error) throw new Error(data?.error || "Failed to start Google connection");
      window.open(data.url, "_blank", "width=520,height=720");
      const poll = setInterval(async () => {
        const { data: tokens } = await supabase
          .from("google_oauth_tokens")
          .select("id, scopes")
          .ilike("scopes", "%analytics.readonly%")
          .limit(1);
        if (tokens && tokens.length > 0) {
          setGoogleAnalyticsConnected(true);
          clearInterval(poll);
          toast.success("Google Analytics connected. You can refresh GA4 now.");
        }
      }, 3000);
      setTimeout(() => clearInterval(poll), 120000);
    } catch (err: any) {
      toast.error("Failed to connect Google Analytics: " + (err.message || "Unknown error"));
    } finally {
      setGa4Connecting(false);
    }
  };

  const getServiceName = (id: string | null) => services.find(s => s.id === id)?.name || "Unknown";

  // Filtered appointments for the selected period
  const filteredApts = useMemo(() => {
    const year = parseInt(reportYear);
    return appointments.filter(a => {
      const d = parseISO(a.appointment_date);
      if (d.getFullYear() !== year) return false;
      if (reportMonth !== "all" && d.getMonth() !== parseInt(reportMonth)) return false;
      return true;
    });
  }, [appointments, reportYear, reportMonth]);

  const completedApts = filteredApts.filter(a => a.status === "completed");
  const confirmedApts = filteredApts.filter(a => a.status === "confirmed" || a.status === "completed");
  const cancelledApts = filteredApts.filter(a => a.status === "cancelled");
  const rejectedApts = filteredApts.filter(a => a.status === "rejected");
  const pendingApts = filteredApts.filter(a => a.status === "pending" || a.status === "requested");

  // Financial calculations
  const totalRevenue = confirmedApts.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalTravelFees = confirmedApts.reduce((sum, a) => sum + (a.travel_fee || 0), 0);
  const avgAppointmentValue = confirmedApts.length ? totalRevenue / confirmedApts.length : 0;
  const totalDistance = confirmedApts.reduce((sum, a) => sum + (a.travel_distance_miles || 0), 0);

  // Monthly breakdown for the year
  const monthlyBreakdown = useMemo(() => {
    const year = parseInt(reportYear);
    return Array.from({ length: 12 }, (_, month) => {
      const monthApts = appointments.filter(a => {
        const d = parseISO(a.appointment_date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      const confirmed = monthApts.filter(a => a.status === "completed" || a.status === "confirmed");
      return {
        month: MONTHS[month],
        total: monthApts.length,
        completed: monthApts.filter(a => a.status === "completed").length,
        confirmed: confirmed.length,
        cancelled: monthApts.filter(a => a.status === "cancelled").length,
        rejected: monthApts.filter(a => a.status === "rejected").length,
        revenue: confirmed.reduce((s, a) => s + (a.price || 0), 0),
        travelFees: confirmed.reduce((s, a) => s + (a.travel_fee || 0), 0),
      };
    });
  }, [appointments, reportYear]);

  // Bookings-over-time trend: daily within a month, monthly across the year.
  const bookingsTrend = useMemo(() => {
    const year = parseInt(reportYear);
    if (reportMonth === "all") {
      return monthlyBreakdown.map(m => ({
        label: m.month.slice(0, 3),
        bookings: m.total,
        completed: m.completed,
        cancelled: m.cancelled,
      }));
    }
    const monthIdx = parseInt(reportMonth);
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayApts = appointments.filter(a => {
        const d = parseISO(a.appointment_date);
        return d.getFullYear() === year && d.getMonth() === monthIdx && d.getDate() === day;
      });
      return {
        label: String(day).padStart(2, "0"),
        bookings: dayApts.length,
        completed: dayApts.filter(a => a.status === "completed").length,
        cancelled: dayApts.filter(a => a.status === "cancelled").length,
      };
    });
  }, [appointments, reportYear, reportMonth, monthlyBreakdown]);

  // Simple linear trend direction over the period
  const bookingsTrendDirection = useMemo(() => {
    if (bookingsTrend.length < 2) return { delta: 0, pct: 0, dir: "flat" as const };
    const mid = Math.floor(bookingsTrend.length / 2);
    const first = bookingsTrend.slice(0, mid).reduce((s, p) => s + p.bookings, 0);
    const second = bookingsTrend.slice(mid).reduce((s, p) => s + p.bookings, 0);
    const delta = second - first;
    const pct = first > 0 ? (delta / first) * 100 : (second > 0 ? 100 : 0);
    return { delta, pct, dir: delta > 0 ? "up" as const : delta < 0 ? "down" as const : "flat" as const };
  }, [bookingsTrend]);

  // Service breakdown
  const serviceBreakdown = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number; cancelled: number }> = {};
    filteredApts.forEach(a => {
      const key = a.service_id || "none";
      if (!map[key]) map[key] = { name: getServiceName(a.service_id), count: 0, revenue: 0, cancelled: 0 };
      map[key].count++;
      if (a.status === "completed" || a.status === "confirmed") {
        map[key].revenue += (a.price || 0);
      }
      if (a.status === "cancelled") map[key].cancelled++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredApts, services]);

  // Referral source analysis (from consent form responses - "How did you hear about us" type fields)
  const referralAnalysis = useMemo(() => {
    const counts: Record<string, number> = {};
    consentResponses.forEach(cr => {
      if (typeof cr.responses !== "object" || !cr.responses) return;
      const resp = cr.responses as Record<string, any>;
      Object.entries(resp).forEach(([key, value]) => {
        const k = key.toLowerCase();
        if (k.includes("hear about") || k.includes("how did you find") || k.includes("referral") || k.includes("found us") || k.includes("how did you hear")) {
          const val = String(value || "").trim();
          if (val) counts[val] = (counts[val] || 0) + 1;
        }
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [consentResponses]);

  // Consent form field analytics
  const consentFieldAnalysis = useMemo(() => {
    if (selectedTemplateId === "all") return [];
    const template = consentTemplates.find(t => t.id === selectedTemplateId);
    if (!template) return [];

    const relevantResponses = consentResponses.filter(cr => cr.consent_form_template_id === selectedTemplateId);
    const fields = Array.isArray(template.fields) ? template.fields : [];

    return fields.map((field: any) => {
      const label = field.label || field.name || "Unknown";
      const counts: Record<string, number> = {};
      let total = 0;

      relevantResponses.forEach(cr => {
        const resp = cr.responses as Record<string, any>;
        const val = resp[label];
        if (val !== undefined && val !== null && val !== "") {
          total++;
          const strVal = typeof val === "boolean" ? (val ? "Yes" : "No") : String(val);
          counts[strVal] = (counts[strVal] || 0) + 1;
        }
      });

      return {
        label,
        type: field.type || "text",
        total,
        counts: Object.entries(counts).sort((a, b) => b[1] - a[1]),
      };
    }).filter(f => f.total > 0);
  }, [selectedTemplateId, consentResponses, consentTemplates]);

  // Patient demographics
  const patientDemographics = useMemo(() => {
    const now = new Date();
    const ageGroups: Record<string, number> = { "Under 18": 0, "18-30": 0, "31-45": 0, "46-60": 0, "61-75": 0, "75+": 0, "Unknown": 0 };
    patients.forEach(p => {
      if (!p.date_of_birth) { ageGroups["Unknown"]++; return; }
      const age = differenceInYears(now, parseISO(p.date_of_birth));
      if (age < 18) ageGroups["Under 18"]++;
      else if (age <= 30) ageGroups["18-30"]++;
      else if (age <= 45) ageGroups["31-45"]++;
      else if (age <= 60) ageGroups["46-60"]++;
      else if (age <= 75) ageGroups["61-75"]++;
      else ageGroups["75+"]++;
    });
    return ageGroups;
  }, [patients]);

  // Top patients by appointment count
  const topPatients = useMemo(() => {
    const map: Record<string, { name: string; email: string; count: number; revenue: number }> = {};
    filteredApts.forEach(a => {
      const key = a.client_email.toLowerCase();
      if (!map[key]) map[key] = { name: a.client_name, email: a.client_email, count: 0, revenue: 0 };
      map[key].count++;
      if (a.status === "completed" || a.status === "confirmed") {
        map[key].revenue += (a.price || 0);
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [filteredApts]);

  // Postcode / area analysis
  const postcodeAnalysis = useMemo(() => {
    const map: Record<string, { area: string; count: number; revenue: number }> = {};
    filteredApts.forEach(a => {
      if (!a.postcode) return;
      const area = a.postcode.trim().toUpperCase().split(" ")[0] || "Unknown";
      if (!map[area]) map[area] = { area, count: 0, revenue: 0 };
      map[area].count++;
      if (a.status === "completed" || a.status === "confirmed") {
        map[area].revenue += (a.price || 0);
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredApts]);

  // Day of week analysis
  const dayOfWeekAnalysis = useMemo(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const counts = days.map(d => ({ day: d, count: 0 }));
    filteredApts.filter(a => a.status !== "cancelled" && a.status !== "rejected").forEach(a => {
      const d = parseISO(a.appointment_date);
      counts[d.getDay()].count++;
    });
    return counts;
  }, [filteredApts]);

  // Time of day analysis
  const timeAnalysis = useMemo(() => {
    const slots: Record<string, number> = {};
    filteredApts.filter(a => a.status !== "cancelled" && a.status !== "rejected").forEach(a => {
      const hour = a.appointment_time.slice(0, 2);
      const key = `${hour}:00`;
      slots[key] = (slots[key] || 0) + 1;
    });
    return Object.entries(slots).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredApts]);

  // Cancellation rate
  const cancellationRate = filteredApts.length ? ((cancelledApts.length / filteredApts.length) * 100).toFixed(1) : "0";
  const conversionRate = filteredApts.length ? ((confirmedApts.length / filteredApts.length) * 100).toFixed(1) : "0";

  // New vs returning patients
  const newVsReturning = useMemo(() => {
    const year = parseInt(reportYear);
    const emailsBefore = new Set<string>();
    const emailsInPeriod = new Set<string>();
    
    // Sort all appointments chronologically
    const sorted = [...appointments].sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
    sorted.forEach(a => {
      const d = parseISO(a.appointment_date);
      if (d.getFullYear() < year) {
        emailsBefore.add(a.client_email.toLowerCase());
      } else if (d.getFullYear() === year) {
        if (reportMonth !== "all" && d.getMonth() !== parseInt(reportMonth)) return;
        emailsInPeriod.add(a.client_email.toLowerCase());
      }
    });

    let newCount = 0;
    let returningCount = 0;
    emailsInPeriod.forEach(email => {
      if (emailsBefore.has(email)) returningCount++;
      else newCount++;
    });

    return { new: newCount, returning: returningCount };
  }, [appointments, reportYear, reportMonth]);

  // Marketing opt-in stats
  const marketingStats = useMemo(() => {
    const emailOptIn = patients.filter(p => p.marketing_email).length;
    const smsOptIn = patients.filter(p => p.marketing_sms).length;
    return { emailOptIn, smsOptIn, total: patients.length };
  }, [patients]);

  // Tax year breakdown (UK: April 6 - April 5)
  const taxYearData = useMemo(() => {
    const year = parseInt(reportYear);
    // Tax year starts April 6 of the selected year
    const taxStart = `${year}-04-06`;
    const taxEnd = `${year + 1}-04-05`;

    const taxApts = appointments.filter(a => {
      return a.appointment_date >= taxStart && a.appointment_date <= taxEnd &&
        (a.status === "completed" || a.status === "confirmed");
    });

    const quarterlyBreakdown = [
      { label: `Q1 (Apr-Jun ${year})`, start: `${year}-04-06`, end: `${year}-07-05` },
      { label: `Q2 (Jul-Sep ${year})`, start: `${year}-07-06`, end: `${year}-10-05` },
      { label: `Q3 (Oct-Dec ${year})`, start: `${year}-10-06`, end: `${year + 1}-01-05` },
      { label: `Q4 (Jan-Mar ${year + 1})`, start: `${year + 1}-01-06`, end: `${year + 1}-04-05` },
    ];

    return {
      totalIncome: taxApts.reduce((s, a) => s + (a.price || 0), 0),
      totalTravelFees: taxApts.reduce((s, a) => s + (a.travel_fee || 0), 0),
      totalAppointments: taxApts.length,
      totalMileage: taxApts.reduce((s, a) => s + (a.travel_distance_miles || 0), 0),
      quarters: quarterlyBreakdown.map(q => {
        const qApts = taxApts.filter(a => a.appointment_date >= q.start && a.appointment_date <= q.end);
        return {
          ...q,
          appointments: qApts.length,
          income: qApts.reduce((s, a) => s + (a.price || 0), 0),
          travelFees: qApts.reduce((s, a) => s + (a.travel_fee || 0), 0),
          mileage: qApts.reduce((s, a) => s + (a.travel_distance_miles || 0), 0),
        };
      }),
    };
  }, [appointments, reportYear]);

  const periodLabel = reportMonth === "all" ? reportYear : `${MONTHS[parseInt(reportMonth)]} ${reportYear}`;

  // PDF Export
  const exportPDF = (reportType: string) => {
    const doc = new jsPDF({ orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("ShawScope Reports", 14, 18);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${reportType} — ${periodLabel}`, 14, 26);
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 32);
    let startY = 40;

    if (reportType === "Financial Summary") {
      autoTable(doc, {
        startY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Revenue (Service Fees)", `£${totalRevenue.toFixed(2)}`],
          ["Total Travel Fees", `£${totalTravelFees.toFixed(2)}`],
          ["Combined Income", `£${(totalRevenue + totalTravelFees).toFixed(2)}`],
          ["Average Appointment Value", `£${avgAppointmentValue.toFixed(2)}`],
          ["Total Appointments", String(filteredApts.length)],
          ["Completed/Confirmed", String(confirmedApts.length)],
          ["Cancelled", String(cancelledApts.length)],
          ["Cancellation Rate", `${cancellationRate}%`],
          ["Total Miles Travelled", `${totalDistance.toFixed(1)} mi`],
        ],
        styles: { fontSize: 10 },
      });

      const tableEnd = (doc as any).lastAutoTable?.finalY || startY + 60;
      autoTable(doc, {
        startY: tableEnd + 10,
        head: [["Month", "Appointments", "Completed", "Revenue", "Travel Fees"]],
        body: monthlyBreakdown.map(m => [
          m.month, String(m.total), String(m.completed), `£${m.revenue.toFixed(2)}`, `£${m.travelFees.toFixed(2)}`,
        ]),
        styles: { fontSize: 9 },
      });
    }

    if (reportType === "Tax Year Report") {
      autoTable(doc, {
        startY,
        head: [["Tax Year Summary", `${reportYear}/${parseInt(reportYear) + 1}`]],
        body: [
          ["Total Income", `£${taxYearData.totalIncome.toFixed(2)}`],
          ["Total Travel Fees (Claimable Expense)", `£${taxYearData.totalTravelFees.toFixed(2)}`],
          ["Net Income (after travel)", `£${(taxYearData.totalIncome - taxYearData.totalTravelFees).toFixed(2)}`],
          ["Total Appointments", String(taxYearData.totalAppointments)],
          ["Total Business Mileage", `${taxYearData.totalMileage.toFixed(1)} miles`],
          ["Mileage Allowance (45p/mi first 10k)", `£${Math.min(taxYearData.totalMileage * 0.45, 4500).toFixed(2)}`],
        ],
        styles: { fontSize: 10 },
      });

      const tableEnd = (doc as any).lastAutoTable?.finalY || startY + 50;
      autoTable(doc, {
        startY: tableEnd + 10,
        head: [["Quarter", "Appointments", "Income", "Travel Fees", "Mileage"]],
        body: taxYearData.quarters.map(q => [
          q.label, String(q.appointments), `£${q.income.toFixed(2)}`, `£${q.travelFees.toFixed(2)}`, `${q.mileage.toFixed(1)} mi`,
        ]),
        styles: { fontSize: 9 },
      });
    }

    if (reportType === "Service Breakdown") {
      autoTable(doc, {
        startY,
        head: [["Service", "Total Bookings", "Cancelled", "Revenue"]],
        body: serviceBreakdown.map(s => [s.name, String(s.count), String(s.cancelled), `£${s.revenue.toFixed(2)}`]),
        styles: { fontSize: 10 },
      });
    }

    if (reportType === "Appointment Analytics") {
      autoTable(doc, {
        startY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Appointments", String(filteredApts.length)],
          ["Completed", String(completedApts.length)],
          ["Confirmed", String(confirmedApts.filter(a => a.status === "confirmed").length)],
          ["Pending/Requested", String(pendingApts.length)],
          ["Cancelled", String(cancelledApts.length)],
          ["Rejected", String(rejectedApts.length)],
          ["Conversion Rate", `${conversionRate}%`],
          ["Cancellation Rate", `${cancellationRate}%`],
          ["New Patients", String(newVsReturning.new)],
          ["Returning Patients", String(newVsReturning.returning)],
        ],
        styles: { fontSize: 10 },
      });

      const tableEnd = (doc as any).lastAutoTable?.finalY || startY + 60;
      autoTable(doc, {
        startY: tableEnd + 10,
        head: [["Day", "Appointments"]],
        body: dayOfWeekAnalysis.map(d => [d.day, String(d.count)]),
        styles: { fontSize: 9 },
      });

      const tableEnd2 = (doc as any).lastAutoTable?.finalY || tableEnd + 60;
      autoTable(doc, {
        startY: tableEnd2 + 10,
        head: [["Time Slot", "Appointments"]],
        body: timeAnalysis.map(([t, c]) => [t, String(c)]),
        styles: { fontSize: 9 },
      });
    }

    if (reportType === "Patient Analytics") {
      autoTable(doc, {
        startY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Patients", String(patients.length)],
          ["Marketing Email Opt-In", String(marketingStats.emailOptIn)],
          ["Marketing SMS Opt-In", String(marketingStats.smsOptIn)],
          ["New Patients (Period)", String(newVsReturning.new)],
          ["Returning Patients (Period)", String(newVsReturning.returning)],
        ],
        styles: { fontSize: 10 },
      });

      const tableEnd = (doc as any).lastAutoTable?.finalY || startY + 50;
      autoTable(doc, {
        startY: tableEnd + 10,
        head: [["Age Group", "Count"]],
        body: Object.entries(patientDemographics).map(([g, c]) => [g, String(c)]),
        styles: { fontSize: 9 },
      });

      const tableEnd2 = (doc as any).lastAutoTable?.finalY || tableEnd + 50;
      autoTable(doc, {
        startY: tableEnd2 + 10,
        head: [["Patient", "Email", "Appointments", "Revenue"]],
        body: topPatients.map(p => [p.name, p.email, String(p.count), `£${p.revenue.toFixed(2)}`]),
        styles: { fontSize: 9 },
      });
    }

    if (reportType === "Area Analysis") {
      autoTable(doc, {
        startY,
        head: [["Postcode Area", "Appointments", "Revenue"]],
        body: postcodeAnalysis.map(p => [p.area, String(p.count), `£${p.revenue.toFixed(2)}`]),
        styles: { fontSize: 10 },
      });
    }

    if (reportType === "Consent Form Analytics") {
      if (consentFieldAnalysis.length > 0) {
        consentFieldAnalysis.forEach((field, idx) => {
          const y = idx === 0 ? startY : (doc as any).lastAutoTable?.finalY + 10 || startY;
          autoTable(doc, {
            startY: y,
            head: [[`${field.label} (${field.total} responses)`, "Count", "%"]],
            body: field.counts.map(([val, cnt]) => [
              val, String(cnt), `${((cnt / field.total) * 100).toFixed(1)}%`,
            ]),
            styles: { fontSize: 9 },
          });
        });
      } else {
        doc.text("No consent form analytics data available for the selected template.", 14, startY);
      }

      if (referralAnalysis.length > 0) {
        const y = (doc as any).lastAutoTable?.finalY + 15 || startY + 20;
        autoTable(doc, {
          startY: y,
          head: [["Referral Source", "Count"]],
          body: referralAnalysis.map(([src, cnt]) => [src, String(cnt)]),
          styles: { fontSize: 9 },
        });
      }
    }

    doc.save(`ShawScope_${reportType.replace(/\s/g, "_")}_${periodLabel.replace(/\s/g, "_")}.pdf`);
    toast.success(`${reportType} PDF exported`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Type Tabs - at the very top */}
      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-10 h-auto gap-1.5 p-1.5 bg-card/80 rounded-xl">
          <TabsTrigger value="financial" className="text-xs py-2.5 px-2 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground data-[state=active]:bg-amber-900/80 data-[state=active]:text-white data-[state=active]:border-amber-600/60 data-[state=active]:font-bold transition-all">💰 Financial</TabsTrigger>
          <TabsTrigger value="tax" className="text-xs py-2.5 px-2 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground data-[state=active]:bg-amber-900/80 data-[state=active]:text-white data-[state=active]:border-amber-600/60 data-[state=active]:font-bold transition-all">📋 Tax Year</TabsTrigger>
          <TabsTrigger value="appointments" className="text-xs py-2.5 px-2 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground data-[state=active]:bg-amber-900/80 data-[state=active]:text-white data-[state=active]:border-amber-600/60 data-[state=active]:font-bold transition-all">📅 Bookings</TabsTrigger>
          <TabsTrigger value="services" className="text-xs py-2.5 px-2 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground data-[state=active]:bg-amber-900/80 data-[state=active]:text-white data-[state=active]:border-amber-600/60 data-[state=active]:font-bold transition-all">🩺 Services</TabsTrigger>
          <TabsTrigger value="timings" className="text-xs py-2.5 px-2 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground data-[state=active]:bg-amber-900/80 data-[state=active]:text-white data-[state=active]:border-amber-600/60 data-[state=active]:font-bold transition-all">⏱️ Timings</TabsTrigger>
          <TabsTrigger value="travel" className="text-xs py-2.5 px-2 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground data-[state=active]:bg-amber-900/80 data-[state=active]:text-white data-[state=active]:border-amber-600/60 data-[state=active]:font-bold transition-all">🚗 Travel</TabsTrigger>
          <TabsTrigger value="patients" className="text-xs py-2.5 px-2 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground data-[state=active]:bg-amber-900/80 data-[state=active]:text-white data-[state=active]:border-amber-600/60 data-[state=active]:font-bold transition-all">👥 Patients</TabsTrigger>
          <TabsTrigger value="areas" className="text-xs py-2.5 px-2 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground data-[state=active]:bg-amber-900/80 data-[state=active]:text-white data-[state=active]:border-amber-600/60 data-[state=active]:font-bold transition-all">📍 Areas</TabsTrigger>
          <TabsTrigger value="consent" className="text-xs py-2.5 px-2 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground data-[state=active]:bg-amber-900/80 data-[state=active]:text-white data-[state=active]:border-amber-600/60 data-[state=active]:font-bold transition-all">📝 Consent</TabsTrigger>
          <TabsTrigger value="website" className="text-xs py-2.5 px-2 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground data-[state=active]:bg-amber-900/80 data-[state=active]:text-white data-[state=active]:border-amber-600/60 data-[state=active]:font-bold transition-all">🌐 Website</TabsTrigger>
        </TabsList>

      {/* Inline Period Picker - rendered inside each sub-tab */}
      {reportTab !== "financial" && reportTab !== "website" && reportTab !== "timings" && (
        <div className="flex flex-wrap items-center gap-3 mt-3 p-3 rounded-lg bg-card/60 border border-border">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Year</Label>
            <Select value={reportYear} onValueChange={setReportYear}>
              <SelectTrigger className="w-[100px] h-8 text-xs bg-muted/60 border-border text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Month</Label>
            <Select value={reportMonth} onValueChange={setReportMonth}>
              <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/60 border-border text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="h-7 px-2 text-[10px] border-border text-muted-foreground">
            <CalendarDays className="h-3 w-3 mr-1" />{filteredApts.length} apts
          </Badge>
        </div>
      )}

        {/* FINANCIAL TAB — renders the dedicated FinancesTab */}
        <TabsContent value="financial" className="space-y-4">
          <FinancesTab />
        </TabsContent>

        {/* TAX YEAR TAB */}
        <TabsContent value="tax" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-white">UK Tax Year {reportYear}/{parseInt(reportYear) + 1}</CardTitle>
                <CardDescription className="text-muted-foreground">April 6, {reportYear} — April 5, {parseInt(reportYear) + 1}</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => exportPDF("Tax Year Report")}>
                <FileDown className="h-4 w-4 mr-1" /> Export PDF
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-emerald-950/80 border-emerald-800/60"><CardContent className="flex items-center gap-3 pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20"><PoundSterling className="h-5 w-5 text-emerald-400" /></div>
                  <div><p className="text-2xl font-bold text-white">£{taxYearData.totalIncome.toFixed(0)}</p><p className="text-xs text-emerald-300">Gross Income</p></div>
                </CardContent></Card>
                <Card className="bg-card border-border"><CardContent className="flex items-center gap-3 pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20"><PoundSterling className="h-5 w-5 text-blue-400" /></div>
                  <div><p className="text-2xl font-bold text-white">£{taxYearData.totalTravelFees.toFixed(0)}</p><p className="text-xs text-muted-foreground">Travel Fees (Expense)</p></div>
                </CardContent></Card>
                <Card className="bg-amber-950/70 border-amber-800/50"><CardContent className="flex items-center gap-3 pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20"><CalendarDays className="h-5 w-5 text-amber-400" /></div>
                  <div><p className="text-2xl font-bold text-white">{taxYearData.totalMileage.toFixed(0)} mi</p><p className="text-xs text-amber-300">Business Mileage</p></div>
                </CardContent></Card>
                <Card className="bg-purple-950/70 border-purple-800/50"><CardContent className="flex items-center gap-3 pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20"><PoundSterling className="h-5 w-5 text-purple-400" /></div>
                  <div><p className="text-2xl font-bold text-white">£{Math.min(taxYearData.totalMileage * 0.45, 4500).toFixed(0)}</p><p className="text-xs text-purple-300">Mileage Allowance (45p)</p></div>
                </CardContent></Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Quarter</TableHead>
                    <TableHead className="text-right text-muted-foreground">Appointments</TableHead>
                    <TableHead className="text-right text-muted-foreground">Income</TableHead>
                    <TableHead className="text-right text-muted-foreground">Travel Fees</TableHead>
                    <TableHead className="text-right text-muted-foreground">Mileage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxYearData.quarters.map((q, i) => (
                    <TableRow key={i} className="border-border hover:bg-muted/30">
                      <TableCell className="font-medium text-white">{q.label}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{q.appointments}</TableCell>
                      <TableCell className="text-right text-muted-foreground">£{q.income.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">£{q.travelFees.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{q.mileage.toFixed(1)} mi</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPOINTMENTS TAB */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-card border-border"><CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20"><CalendarDays className="h-5 w-5 text-blue-400" /></div>
              <div><p className="text-2xl font-bold text-white">{filteredApts.length}</p><p className="text-xs text-muted-foreground">Total</p></div>
            </CardContent></Card>
            <Card className="bg-emerald-950/80 border-emerald-800/60"><CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20"><Users className="h-5 w-5 text-emerald-400" /></div>
              <div><p className="text-2xl font-bold text-white">{completedApts.length}</p><p className="text-xs text-emerald-300">Completed</p></div>
            </CardContent></Card>
            <Card className="bg-purple-950/70 border-purple-800/50"><CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20"><CalendarDays className="h-5 w-5 text-red-400" /></div>
              <div><p className="text-2xl font-bold text-white">{cancelledApts.length}</p><p className="text-xs text-purple-300">Cancelled</p></div>
            </CardContent></Card>
            <Card className="bg-amber-950/70 border-amber-800/50"><CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20"><TrendingUp className="h-5 w-5 text-amber-400" /></div>
              <div><p className="text-2xl font-bold text-white">{conversionRate}%</p><p className="text-xs text-amber-300">Conversion</p></div>
            </CardContent></Card>
            <Card className="bg-card border-border"><CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20"><CalendarDays className="h-5 w-5 text-red-400" /></div>
              <div><p className="text-2xl font-bold text-white">{cancellationRate}%</p><p className="text-xs text-muted-foreground">Cancel Rate</p></div>
            </CardContent></Card>
          </div>

          {/* Bookings Over Time */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Bookings Over Time — {periodLabel}
                </CardTitle>
                <CardDescription className="text-xs">
                  {reportMonth === "all" ? "Monthly totals across the year" : "Daily bookings within the month"}
                </CardDescription>
              </div>
              <div className={`text-xs font-semibold px-2 py-1 rounded-md border ${
                bookingsTrendDirection.dir === "up" ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" :
                bookingsTrendDirection.dir === "down" ? "text-red-300 border-red-500/40 bg-red-500/10" :
                "text-muted-foreground border-border bg-muted/30"
              }`}>
                {bookingsTrendDirection.dir === "up" ? "▲" : bookingsTrendDirection.dir === "down" ? "▼" : "—"} {Math.abs(bookingsTrendDirection.pct).toFixed(0)}% vs first half
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={bookingsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="bookings" name="Total bookings" fill="#d4912a" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-white">By Day of Week</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportPDF("Appointment Analytics")}>
                  <FileDown className="h-4 w-4 mr-1" /> Export PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dayOfWeekAnalysis.map(d => {
                    const max = Math.max(...dayOfWeekAnalysis.map(x => x.count), 1);
                    return (
                      <div key={d.day} className="flex items-center gap-3">
                        <span className="text-sm w-24 text-muted-foreground">{d.day}</span>
                        <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                          <div className="bg-emerald-500/60 h-full rounded-full transition-all" style={{ width: `${(d.count / max) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-8 text-right text-white">{d.count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-sm font-medium text-white">By Time Slot</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeAnalysis.map(([time, count]) => {
                    const max = Math.max(...timeAnalysis.map(([, c]) => c as number), 1);
                    return (
                      <div key={time} className="flex items-center gap-3">
                        <span className="text-sm w-16 text-muted-foreground">{time}</span>
                        <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                          <div className="bg-blue-500/60 h-full rounded-full transition-all" style={{ width: `${((count as number) / max) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-8 text-right text-white">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-sm font-medium text-white">New vs Returning Patients — {periodLabel}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-8">
                <div>
                  <p className="text-xs text-muted-foreground">New Patients</p>
                  <p className="text-3xl font-bold text-white">{newVsReturning.new}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Returning Patients</p>
                  <p className="text-3xl font-bold text-emerald-400">{newVsReturning.returning}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SERVICES TAB */}
        <TabsContent value="services" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-white">Service Performance — {periodLabel}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportPDF("Service Breakdown")}>
                <FileDown className="h-4 w-4 mr-1" /> Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Service</TableHead>
                    <TableHead className="text-right text-muted-foreground">Total Bookings</TableHead>
                    <TableHead className="text-right text-muted-foreground">Cancelled</TableHead>
                    <TableHead className="text-right text-muted-foreground">Revenue</TableHead>
                    <TableHead className="text-right text-muted-foreground">% of Bookings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceBreakdown.map((s, i) => (
                    <TableRow key={i} className="border-border hover:bg-muted/30">
                      <TableCell className="font-medium text-white">{s.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{s.count}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{s.cancelled}</TableCell>
                      <TableCell className="text-right text-muted-foreground">£{s.revenue.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{filteredApts.length ? ((s.count / filteredApts.length) * 100).toFixed(1) : 0}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PATIENTS TAB */}
        <TabsContent value="patients" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border"><CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20"><Users className="h-5 w-5 text-blue-400" /></div>
              <div><p className="text-2xl font-bold text-white">{patients.length}</p><p className="text-xs text-muted-foreground">Total Patients</p></div>
            </CardContent></Card>
            <Card className="bg-emerald-950/80 border-emerald-800/60"><CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20"><PoundSterling className="h-5 w-5 text-emerald-400" /></div>
              <div><p className="text-2xl font-bold text-white">{marketingStats.emailOptIn}</p><p className="text-xs text-emerald-300">Email Opt-In</p></div>
            </CardContent></Card>
            <Card className="bg-purple-950/70 border-purple-800/50"><CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20"><PoundSterling className="h-5 w-5 text-purple-400" /></div>
              <div><p className="text-2xl font-bold text-white">{marketingStats.smsOptIn}</p><p className="text-xs text-purple-300">SMS Opt-In</p></div>
            </CardContent></Card>
            <Card className="bg-amber-950/70 border-amber-800/50"><CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20"><TrendingUp className="h-5 w-5 text-amber-400" /></div>
              <div><p className="text-2xl font-bold text-white">{patients.length ? ((marketingStats.emailOptIn / patients.length) * 100).toFixed(0) : 0}%</p><p className="text-xs text-amber-300">Opt-In Rate</p></div>
            </CardContent></Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-white">Age Demographics</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportPDF("Patient Analytics")}>
                  <FileDown className="h-4 w-4 mr-1" /> Export PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(patientDemographics).map(([group, count]) => {
                    const max = Math.max(...Object.values(patientDemographics), 1);
                    return (
                      <div key={group} className="flex items-center gap-3">
                        <span className="text-sm w-20 text-muted-foreground">{group}</span>
                        <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                          <div className="bg-purple-500/60 h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-8 text-right text-white">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-sm font-medium text-white">Top Patients by Bookings — {periodLabel}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-right text-muted-foreground">Bookings</TableHead>
                      <TableHead className="text-right text-muted-foreground">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPatients.slice(0, 10).map((p, i) => (
                      <TableRow key={i} className="border-border hover:bg-muted/30">
                        <TableCell className="font-medium text-white">{p.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{p.count}</TableCell>
                        <TableCell className="text-right text-muted-foreground">£{p.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AREAS TAB */}
        <TabsContent value="areas" className="space-y-4">
          <AreasErrorBoundary>
            <AreasMapSection appointments={appointments} filteredApts={filteredApts} postcodeAnalysis={postcodeAnalysis} totalDistance={totalDistance} totalTravelFees={totalTravelFees} confirmedApts={confirmedApts} periodLabel={periodLabel} exportPDF={exportPDF} reportYear={reportYear} />
          </AreasErrorBoundary>
        </TabsContent>

        {/* CONSENT FORM ANALYTICS TAB */}
        <TabsContent value="consent" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-white">Consent Form Response Analytics</CardTitle>
              <CardDescription className="text-muted-foreground">Analyse responses across all consent forms to identify trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Consent Form Template</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select a form" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">— Select a template —</SelectItem>
                      {consentTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.title} ({t.form_type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant="outline" className="h-9 px-3 flex items-center">
                  {consentResponses.length} total responses
                </Badge>
                {selectedTemplateId !== "all" && (
                  <Button size="sm" variant="outline" onClick={() => exportPDF("Consent Form Analytics")}>
                    <FileDown className="h-4 w-4 mr-1" /> Export PDF
                  </Button>
                )}
              </div>

              {selectedTemplateId !== "all" && consentFieldAnalysis.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {consentFieldAnalysis.map((field, idx) => (
                    <Card key={idx} className="bg-muted/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium">{field.label}</CardTitle>
                        <CardDescription className="text-xs">{field.total} responses • {field.type}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1.5">
                          {field.counts.slice(0, 10).map(([val, cnt], i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                                <div className="bg-primary/50 h-full rounded-full" style={{ width: `${(cnt / field.total) * 100}%` }} />
                              </div>
                              <span className="text-xs w-32 truncate" title={val}>{val}</span>
                              <span className="text-xs font-medium w-12 text-right">{cnt} ({((cnt / field.total) * 100).toFixed(0)}%)</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : selectedTemplateId !== "all" ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No responses found for this template</p>
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">Select a consent form template above to view response analytics</p>
              )}
            </CardContent>
          </Card>

          {/* Referral Sources */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-white">Referral Sources (from consent forms)</CardTitle>
              <CardDescription className="text-muted-foreground">How patients found ShawScope — extracted from "How did you hear about us" fields</CardDescription>
            </CardHeader>
            <CardContent>
              {referralAnalysis.length > 0 ? (
                <div className="space-y-2">
                  {referralAnalysis.map(([source, count], i) => {
                    const max = referralAnalysis[0][1] as number;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm w-40 truncate text-muted-foreground" title={source}>{source}</span>
                        <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                          <div className="bg-amber-500/60 h-full rounded-full" style={{ width: `${((count as number) / max) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-8 text-right text-white">{count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">No referral data found in consent form responses</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEBSITE ANALYTICS TAB */}
        <TabsContent value="website" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Powered by Google Analytics (GA4){googleAnalyticsConnected ? " · Connected" : " · Google connection required"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Select value={ga4Days} onValueChange={setGa4Days}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={connectGoogleAnalytics} disabled={ga4Connecting} className="gap-2 border-border text-muted-foreground hover:bg-muted">
                <Globe className={cn("h-3.5 w-3.5", ga4Connecting && "animate-pulse")} />
                {ga4Connecting ? "Connecting…" : googleAnalyticsConnected ? "Reconnect Google Analytics" : "Connect Google Analytics"}
              </Button>
              <Button size="sm" variant="outline" onClick={refreshGA4} disabled={ga4Loading || googleAnalyticsConnected === false} className="gap-2 border-border text-muted-foreground hover:bg-muted">
                <RefreshCw className={cn("h-3.5 w-3.5", ga4Loading && "animate-spin")} />
                {ga4Loading ? "Refreshing…" : "Refresh from GA4"}
              </Button>
            </div>
          </div>
          {analyticsSnapshot ? (() => {
            const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#84cc16"];
            const dailyData = (analyticsSnapshot.daily_visitors || []) as { date: string; visitors: number }[];
            const topPages = (analyticsSnapshot.top_pages || []) as { page: string; views: number; avg_time_seconds?: number; engagement_rate?: number }[];
            const topSources = (analyticsSnapshot.top_sources || []) as { source: string; visits: number }[];
            const devices = (analyticsSnapshot.device_breakdown || []) as { device: string; count: number }[];
            const countries = (analyticsSnapshot.country_breakdown || []) as { country: string; count: number }[];

            // Compute bookings per day within the analytics window
            const bookingsByDate: Record<string, number> = {};
            appointments.forEach(a => {
              if (a.status === "cancelled" || a.status === "rejected") return;
              bookingsByDate[a.created_at.slice(0, 10)] = (bookingsByDate[a.created_at.slice(0, 10)] || 0) + 1;
            });
            const combinedDaily = dailyData.map(d => ({
              ...d,
              label: format(parseISO(d.date), "dd MMM"),
              bookings: bookingsByDate[d.date] || 0,
            }));
            const totalVisitorsInRange = combinedDaily.reduce((s, d) => s + d.visitors, 0);
            const totalBookingsInRange = combinedDaily.reduce((s, d) => s + d.bookings, 0);
            const conversionRate = totalVisitorsInRange > 0 ? (totalBookingsInRange / totalVisitorsInRange) * 100 : 0;

            return (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="bg-purple-950/70 border-purple-800/50"><CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-white">{analyticsSnapshot.total_visitors}</p>
                    <p className="text-xs text-purple-300">Visitors</p>
                  </CardContent></Card>
                  <Card className="bg-blue-950/70 border-blue-800/50"><CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-white">{analyticsSnapshot.total_pageviews}</p>
                    <p className="text-xs text-blue-300">Pageviews</p>
                  </CardContent></Card>
                  <Card className="bg-emerald-950/70 border-emerald-800/50"><CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-white">{Number(analyticsSnapshot.avg_pageviews_per_visit).toFixed(1)}</p>
                    <p className="text-xs text-emerald-300">Pages / Visit</p>
                  </CardContent></Card>
                  <Card className="bg-amber-950/70 border-amber-800/50"><CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-white">{Math.round(Number(analyticsSnapshot.avg_session_duration_seconds) / 60)}m</p>
                    <p className="text-xs text-amber-300">Avg Session</p>
                  </CardContent></Card>
                  <Card className="bg-red-950/70 border-red-800/50"><CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-white">{Number(analyticsSnapshot.bounce_rate)}%</p>
                    <p className="text-xs text-red-300">Bounce Rate</p>
                  </CardContent></Card>
                </div>

                <p className="text-[10px] text-muted-foreground/70 text-right">Data snapshot: {format(parseISO(analyticsSnapshot.snapshot_date), "dd MMM yyyy")} · Period: {format(parseISO(analyticsSnapshot.period_start), "dd MMM")} – {format(parseISO(analyticsSnapshot.period_end), "dd MMM yyyy")}</p>

                {/* Conversion KPI row */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-indigo-950/70 border-indigo-800/50"><CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-white">{totalBookingsInRange}</p>
                    <p className="text-xs text-indigo-300">Bookings in period</p>
                  </CardContent></Card>
                  <Card className="bg-fuchsia-950/70 border-fuchsia-800/50"><CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-white">{conversionRate.toFixed(2)}%</p>
                    <p className="text-xs text-fuchsia-300">Visitor → Booking</p>
                  </CardContent></Card>
                  <Card className="bg-teal-950/70 border-teal-800/50"><CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-white">{totalVisitorsInRange > 0 ? Math.round(totalVisitorsInRange / combinedDaily.length) : 0}</p>
                    <p className="text-xs text-teal-300">Avg visitors / day</p>
                  </CardContent></Card>
                </div>

                {/* Daily Visitors + Bookings Chart */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-white flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Daily Visitors vs Bookings</CardTitle>
                    <CardDescription className="text-xs">Bars are website visitors; line shows bookings made that day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <ComposedChart data={combinedDaily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#f59e0b" }} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#fff" }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="left" dataKey="visitors" name="Visitors" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="bookings" name="Bookings" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Two column: Top Pages + Traffic Sources */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Top Pages */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-white">Top Pages</CardTitle>
                      <CardDescription className="text-xs">Views · Avg time on page · Engagement</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                      {topPages.map((p, i) => {
                        const max = topPages[0]?.views || 1;
                        const t = p.avg_time_seconds || 0;
                        const mm = Math.floor(t / 60);
                        const ss = String(t % 60).padStart(2, "0");
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-xs w-36 truncate text-muted-foreground font-mono" title={p.page}>{p.page || "/"}</span>
                              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                                <div className="bg-purple-500/60 h-full rounded-full" style={{ width: `${(p.views / max) * 100}%` }} />
                              </div>
                              <span className="text-xs font-semibold w-10 text-right text-white">{p.views}</span>
                            </div>
                            <div className="flex items-center gap-3 pl-[152px] text-[10px] text-muted-foreground/80">
                              <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {mm}:{ss}</span>
                              {typeof p.engagement_rate === "number" && (
                                <span>· {p.engagement_rate}% engaged</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Traffic Sources */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-white">Traffic Sources</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {topSources.map((s, i) => {
                        const max = topSources[0]?.visits || 1;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-sm w-36 truncate text-muted-foreground" title={s.source}>{s.source}</span>
                            <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                              <div className="bg-blue-500/60 h-full rounded-full" style={{ width: `${(s.visits / max) * 100}%` }} />
                            </div>
                            <span className="text-sm font-medium w-10 text-right text-white">{s.visits}</span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>

                {/* Two column: Devices + Countries */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Device Breakdown */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-white">Devices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <RechartsPieChart>
                          <Pie data={devices.map(d => ({ name: d.device, value: d.count }))} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {devices.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#fff" }} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Country Breakdown */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-white">Countries (Top 10)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {countries.slice(0, 10).map((c, i) => {
                        const max = countries[0]?.count || 1;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-sm w-20 text-muted-foreground">{c.country}</span>
                            <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                              <div className="bg-emerald-500/60 h-full rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
                            </div>
                            <span className="text-sm font-medium w-10 text-right text-white">{c.count}</span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              </>
            );
          })() : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No website analytics data available yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Click "Refresh from GA4" above to pull your latest Google Analytics data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TIMINGS TAB */}
        <TabsContent value="timings" className="space-y-4">
          {(() => {
            const getTimingSvcName = (t: any) => services.find(s => s.id === t.appointments?.service_id)?.name || "Unknown";

            // Group by service
            const byService: Record<string, { name: string; durations: number[] }> = {};
            timings.forEach(t => {
              if (!t.duration_seconds) return;
              const svcName = getTimingSvcName(t);
              if (!byService[svcName]) byService[svcName] = { name: svcName, durations: [] };
              byService[svcName].durations.push(t.duration_seconds);
            });

            const serviceStats = Object.values(byService).map(s => ({
              name: s.name,
              count: s.durations.length,
              avg: Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length),
              min: Math.min(...s.durations),
              max: Math.max(...s.durations),
            })).sort((a, b) => b.count - a.count);

            const allDurations = timings.filter(t => t.duration_seconds).map(t => t.duration_seconds);
            const overallAvg = allDurations.length ? Math.round(allDurations.reduce((a: number, b: number) => a + b, 0) / allDurations.length) : 0;

            const fmtDur = (s: number) => {
              const m = Math.floor(s / 60);
              const sec = s % 60;
              return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
            };

            if (timingsLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

            if (timings.length === 0) return (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">No appointment timings recorded yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Use the ⏱ stopwatch button on today's appointments to start tracking</p>
                </CardContent>
              </Card>
            );

            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card className="bg-card border-border"><CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-white">{fmtDur(overallAvg)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Overall Average</p>
                  </CardContent></Card>
                  <Card className="bg-card border-border"><CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-white">{allDurations.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Appointments Timed</p>
                  </CardContent></Card>
                  <Card className="bg-card border-border"><CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-white">{serviceStats.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Services Tracked</p>
                  </CardContent></Card>
                </div>

                <Card className="bg-card border-border">
                  <CardHeader><CardTitle className="text-sm text-white">Average Duration by Service</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-muted-foreground">Service</TableHead>
                        <TableHead className="text-muted-foreground text-right">Count</TableHead>
                        <TableHead className="text-muted-foreground text-right">Avg</TableHead>
                        <TableHead className="text-muted-foreground text-right">Min</TableHead>
                        <TableHead className="text-muted-foreground text-right">Max</TableHead>
                        <TableHead className="text-muted-foreground text-right">Scheduled</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {serviceStats.map(s => {
                          const svc = services.find(sv => sv.name === s.name);
                          const scheduled = svc?.duration_minutes ? svc.duration_minutes * 60 : null;
                          const diff = scheduled ? s.avg - scheduled : null;
                          return (
                            <TableRow key={s.name}>
                              <TableCell className="text-white font-medium">{s.name}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{s.count}</TableCell>
                              <TableCell className="text-right font-bold text-white">{fmtDur(s.avg)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{fmtDur(s.min)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{fmtDur(s.max)}</TableCell>
                              <TableCell className="text-right">
                                {scheduled ? (
                                  <span className={cn("font-medium", diff && diff > 0 ? "text-red-400" : "text-emerald-400")}>
                                    {fmtDur(scheduled)} {diff ? `(${diff > 0 ? "+" : ""}${fmtDur(Math.abs(diff))})` : ""}
                                  </span>
                                ) : <span className="text-muted-foreground/70">—</span>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader><CardTitle className="text-sm text-white">Recent Timings</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-muted-foreground">Date</TableHead>
                        <TableHead className="text-muted-foreground">Patient</TableHead>
                        <TableHead className="text-muted-foreground">Service</TableHead>
                        <TableHead className="text-muted-foreground text-right">Duration</TableHead>
                        <TableHead className="text-muted-foreground text-right w-10"></TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {timings.slice(0, 50).map(t => (
                          <TableRow key={t.id}>
                            <TableCell className="text-muted-foreground">{t.appointments?.appointment_date ? format(parseISO(t.appointments.appointment_date), "dd/MM/yy") : "—"}</TableCell>
                            <TableCell className="text-white">{t.appointments?.client_name || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{getTimingSvcName(t)}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-white">{t.duration_seconds ? fmtDur(t.duration_seconds) : "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/70 hover:text-red-400 hover:bg-red-500/10" onClick={async () => {
                                const { error } = await supabase.from("appointment_timings").delete().eq("id", t.id);
                                if (error) { toast.error("Failed to delete timing"); return; }
                                setTimings(prev => prev.filter(x => x.id !== t.id));
                                toast.success("Timing deleted");
                              }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        {/* TRAVEL TAB — mileage & estimated drive time */}
        <TabsContent value="travel" className="space-y-4">
          {(() => {
            const year = parseInt(reportYear);
            const monthFilter = reportMonth;
            // Average speed assumption for converting miles → estimated drive time
            const AVG_MPH = 30;
            const milesToMin = (m: number) => (m / AVG_MPH) * 60;
            const fmtMin = (mins: number) => {
              const h = Math.floor(mins / 60);
              const m = Math.round(mins % 60);
              return h > 0 ? `${h}h ${m}m` : `${m}m`;
            };

            // Filter journeys to selected year/month
            const periodJourneys = journeys.filter(j => {
              const d = parseISO(j.journey_date);
              if (d.getFullYear() !== year) return false;
              if (monthFilter !== "all" && d.getMonth() !== parseInt(monthFilter)) return false;
              return true;
            });

            const totalMiles = periodJourneys.reduce((s, j) => s + Number(j.miles || 0), 0);
            const totalLegs = periodJourneys.length;
            const totalFees = confirmedApts.reduce((s, a) => s + (a.travel_fee || 0), 0);
            const totalDriveMin = milesToMin(totalMiles);

            // Group by day
            const byDay: Record<string, { date: string; miles: number; legs: number }> = {};
            periodJourneys.forEach(j => {
              const k = j.journey_date;
              if (!byDay[k]) byDay[k] = { date: k, miles: 0, legs: 0 };
              byDay[k].miles += Number(j.miles || 0);
              byDay[k].legs += 1;
            });
            const dayRows = Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date));
            const daysTravelled = dayRows.length;
            const avgMilesPerDay = daysTravelled ? totalMiles / daysTravelled : 0;
            const avgMinPerDay = milesToMin(avgMilesPerDay);

            // Group by month for the chart (always for the selected year)
            const monthChart = Array.from({ length: 12 }, (_, m) => {
              const monthJ = journeys.filter(j => {
                const d = parseISO(j.journey_date);
                return d.getFullYear() === year && d.getMonth() === m;
              });
              const mi = monthJ.reduce((s, j) => s + Number(j.miles || 0), 0);
              return {
                month: MONTHS[m].slice(0, 3),
                miles: Math.round(mi * 10) / 10,
                hours: Math.round((milesToMin(mi) / 60) * 10) / 10,
              };
            });

            // Busiest travel days
            const topDays = [...dayRows].sort((a, b) => b.miles - a.miles).slice(0, 10);

            if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

            if (journeys.length === 0) return (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Car className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No travel journeys logged yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Use the Mileage tab to record journeys, or complete a day's mileage from the dashboard</p>
                </CardContent>
              </Card>
            );

            return (
              <>
                {/* Headline stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="bg-card border-border"><CardContent className="pt-5 pb-4 text-center">
                    <Route className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{totalMiles.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">mi</span></p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Total Distance</p>
                  </CardContent></Card>
                  <Card className="bg-card border-border"><CardContent className="pt-5 pb-4 text-center">
                    <Clock className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{fmtMin(totalDriveMin)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Est. Drive Time</p>
                  </CardContent></Card>
                  <Card className="bg-card border-border"><CardContent className="pt-5 pb-4 text-center">
                    <CalendarDays className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{daysTravelled}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Days On the Road</p>
                  </CardContent></Card>
                  <Card className="bg-card border-border"><CardContent className="pt-5 pb-4 text-center">
                    <PoundSterling className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">£{totalFees.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Travel Fees Charged</p>
                  </CardContent></Card>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="bg-card border-border"><CardContent className="pt-4 pb-4 text-center">
                    <p className="text-lg font-bold text-white">{avgMilesPerDay.toFixed(1)} mi</p>
                    <p className="text-[10px] text-muted-foreground">Avg per travel day</p>
                  </CardContent></Card>
                  <Card className="bg-card border-border"><CardContent className="pt-4 pb-4 text-center">
                    <p className="text-lg font-bold text-white">{fmtMin(avgMinPerDay)}</p>
                    <p className="text-[10px] text-muted-foreground">Avg drive per day</p>
                  </CardContent></Card>
                  <Card className="bg-card border-border"><CardContent className="pt-4 pb-4 text-center">
                    <p className="text-lg font-bold text-white">{totalLegs}</p>
                    <p className="text-[10px] text-muted-foreground">Journey legs</p>
                  </CardContent></Card>
                  <Card className="bg-card border-border"><CardContent className="pt-4 pb-4 text-center">
                    <p className="text-lg font-bold text-white">£{(totalMiles * 0.45).toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">HMRC 45p value</p>
                  </CardContent></Card>
                </div>

                {/* Monthly chart (always for whole selected year) */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white">Miles & Drive Hours by Month — {year}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Estimated drive time uses an avg of {AVG_MPH} mph</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={monthChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="left" dataKey="miles" name="Miles" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="hours" name="Hours (est.)" fill="#D4912A" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Per-day table */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Travel by Day</CardTitle></CardHeader>
                  <CardContent>
                    {dayRows.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No travel in this period.</p>
                    ) : (
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead className="text-muted-foreground">Date</TableHead>
                          <TableHead className="text-muted-foreground text-right">Legs</TableHead>
                          <TableHead className="text-muted-foreground text-right">Miles</TableHead>
                          <TableHead className="text-muted-foreground text-right">Est. Drive</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {dayRows.slice(0, 60).map(d => (
                            <TableRow key={d.date}>
                              <TableCell className="text-white font-medium">{format(parseISO(d.date), "EEE dd/MM/yy")}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{d.legs}</TableCell>
                              <TableCell className="text-right font-bold text-white">{d.miles.toFixed(1)}</TableCell>
                              <TableCell className="text-right text-amber-300">{fmtMin(milesToMin(d.miles))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Busiest travel days — to spot routes worth optimising */}
                {topDays.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-white">Heaviest Travel Days</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">Use these to spot routes worth re-planning or combining</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead className="text-muted-foreground">Date</TableHead>
                          <TableHead className="text-muted-foreground text-right">Legs</TableHead>
                          <TableHead className="text-muted-foreground text-right">Miles</TableHead>
                          <TableHead className="text-muted-foreground text-right">Est. Drive</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {topDays.map(d => (
                            <TableRow key={d.date}>
                              <TableCell className="text-white font-medium">{format(parseISO(d.date), "EEE dd/MM/yy")}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{d.legs}</TableCell>
                              <TableCell className="text-right font-bold text-white">{d.miles.toFixed(1)}</TableCell>
                              <TableCell className="text-right text-amber-300">{fmtMin(milesToMin(d.miles))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </TabsContent>

        </Tabs>
    </div>
  );
};

export default ReportsTab;
