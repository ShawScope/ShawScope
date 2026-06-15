import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import {
  PoundSterling, TrendingUp, TrendingDown, FileDown, ChevronDown, Loader2, Receipt, Calculator,
  Wallet, BarChart3, ArrowUpDown, Search, Target, X, Home, CreditCard, Save, Trash2
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Area, AreaChart } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ───
interface Appointment {
  id: string; client_name: string; client_email: string; appointment_date: string;
  appointment_time: string; status: string; service_id: string | null;
  price: number | null; travel_fee: number | null; travel_distance_miles: number | null; postcode: string | null;
}
interface PaymentRecord { id: string; appointment_id: string; amount: number; payment_method: string; payment_status: string; }
interface Service { id: string; name: string; price: number | null; }

// ─── Constants ───
const TAX_YEAR_MONTHS = [
  { month: 3, label: "Apr" }, { month: 4, label: "May" }, { month: 5, label: "Jun" },
  { month: 6, label: "Jul" }, { month: 7, label: "Aug" }, { month: 8, label: "Sep" },
  { month: 9, label: "Oct" }, { month: 10, label: "Nov" }, { month: 11, label: "Dec" },
  { month: 0, label: "Jan" }, { month: 1, label: "Feb" }, { month: 2, label: "Mar" },
];
const CHART_COLORS = ["hsl(210,70%,55%)", "hsl(160,60%,45%)", "hsl(280,60%,55%)", "hsl(30,80%,55%)", "hsl(340,65%,50%)", "hsl(190,60%,50%)"];
const TARGET_OPTIONS = [
  { value: "annual_income", label: "Annual Income Target" },
  { value: "monthly_income", label: "Monthly Income Target" },
  { value: "appointments_month", label: "Appointments per Month" },
  { value: "appointments_year", label: "Appointments per Year" },
  { value: "avg_appointment_value", label: "Avg Appointment Value" },
];

const getCurrentTaxYearStart = () => {
  const now = new Date();
  return now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6) ? now.getFullYear() : now.getFullYear() - 1;
};
const getTaxYearLabel = (y: number) => `${y}/${y + 1}`;
const getTaxYears = () => Array.from({ length: 6 }, (_, i) => getCurrentTaxYearStart() - i);

type SortKey = "date" | "client" | "service" | "price" | "travelFee" | "total";
type SortDir = "asc" | "desc";

const FinancesTab = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(String(getCurrentTaxYearStart()));
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedExportRows, setSelectedExportRows] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchFilter, setSearchFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [activeTarget, setActiveTarget] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [savedTargets, setSavedTargets] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("shawscope_targets") || "{}"); } catch { return {}; }
  });
  const [monthlyBills, setMonthlyBills] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("shawscope_monthly_bills") || "0") || 0; } catch { return 0; }
  });
  const [billsInput, setBillsInput] = useState(String(monthlyBills || ""));
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; appointmentId: string; client: string } | null>(null);

  const paymentMap = useMemo(() => {
    const map = new Map<string, PaymentRecord>();
    payments.forEach(p => map.set(p.appointment_id, p));
    return map;
  }, [payments]);

  // Only count PAID payment records as income; appointments without a payment record contribute £0
  const getAptIncome = useCallback((a: Appointment) => {
    const payment = paymentMap.get(a.id);
    if (!payment) return 0;
    return payment.payment_status === "paid" ? payment.amount : 0;
  }, [paymentMap]);

  const getAptTravelFee = useCallback((a: Appointment) => a.travel_fee || 0, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [aptsRes, svcRes, paymentsRes] = await Promise.all([
      supabase.from("appointments").select("id,client_name,client_email,appointment_date,appointment_time,status,service_id,price,travel_fee,travel_distance_miles,postcode").order("appointment_date", { ascending: false }),
      supabase.from("services").select("id,name,price"),
      (supabase as any).from("appointment_payments").select("id,appointment_id,amount,payment_method,payment_status"),
    ]);
    if (aptsRes.data) setAppointments(aptsRes.data);
    if (svcRes.data) setServices(svcRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data.map((p: any) => ({ ...p, amount: Number(p.amount) })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getServiceName = useCallback((id: string | null) => services.find(s => s.id === id)?.name || "General", [services]);

  // ─── Filters ───
  const yearFilteredApts = useMemo(() => {
    const year = parseInt(selectedYear);
    const start = new Date(year, 3, 6);
    const end = new Date(year + 1, 3, 5, 23, 59, 59);
    return appointments.filter(a => { const d = parseISO(a.appointment_date); return d >= start && d <= end; });
  }, [appointments, selectedYear]);

  const filteredApts = useMemo(() => {
    if (selectedMonth === "all") return yearFilteredApts;
    const monthIdx = parseInt(selectedMonth);
    const year = parseInt(selectedYear);
    const expectedYear = monthIdx <= 2 ? year + 1 : year;
    return yearFilteredApts.filter(a => { const d = parseISO(a.appointment_date); return d.getMonth() === monthIdx && d.getFullYear() === expectedYear; });
  }, [yearFilteredApts, selectedMonth, selectedYear]);

  // ONLY completed appointments count for income — not confirmed/pending
  const incomeApts = filteredApts.filter(a => a.status === "completed");
  const cancelledApts = filteredApts.filter(a => a.status === "cancelled");
  const yearIncomeApts = yearFilteredApts.filter(a => a.status === "completed");

  const completedAppointmentIds = useMemo(() => new Set(incomeApts.map(a => a.id)), [incomeApts]);

  // ─── Key Stats ───
  const totalGross = incomeApts.reduce((s, a) => s + getAptIncome(a), 0);
  const totalTravelFees = incomeApts.reduce((s, a) => s + getAptTravelFee(a), 0);
  const totalServiceIncome = totalGross - totalTravelFees;
  const avgPerAppointment = incomeApts.length ? totalGross / incomeApts.length : 0;
  const yearTotalGross = yearIncomeApts.reduce((s, a) => s + getAptIncome(a), 0);
  const pendingPaymentsTotal = payments
    .filter(p => p.payment_status === "unpaid" && completedAppointmentIds.has(p.appointment_id))
    .reduce((s, p) => s + p.amount, 0);

  // Tax calculations — full year
  const taxReserve40 = yearTotalGross * 0.4;
  const niReserve = yearTotalGross * 0.09;
  const totalTaxNI = taxReserve40 + niReserve;
  const yearTakeHome = yearTotalGross - totalTaxNI;

  const now = new Date();
  const getMonthIncome = useCallback((monthIdx: number, yr: number) => {
    const expectedYear = monthIdx <= 2 ? yr + 1 : yr;
    return yearIncomeApts
      .filter(a => { const d = parseISO(a.appointment_date); return d.getMonth() === monthIdx && d.getFullYear() === expectedYear; })
      .reduce((s, a) => s + getAptIncome(a), 0);
  }, [yearIncomeApts, getAptIncome]);

  const currentYear = parseInt(selectedYear);
  const thisMonthGross = getMonthIncome(now.getMonth(), currentYear);
  const thisMonthTakeHome = thisMonthGross * 0.51 - monthlyBills;
  const prevMonthIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevMonthTakeHome = getMonthIncome(prevMonthIdx, currentYear) * 0.51 - monthlyBills;
  const monthDiff = thisMonthTakeHome - prevMonthTakeHome;

  const yoyComparison = useMemo(() => {
    const year = parseInt(selectedYear);
    const start = new Date(year - 1, 3, 6);
    const end = new Date(year, 3, 5, 23, 59, 59);
    const prevApts = appointments.filter(a => { const d = parseISO(a.appointment_date); return d >= start && d <= end; }).filter(a => a.status === "completed");
    const prevTotal = prevApts.reduce((s, a) => s + getAptIncome(a), 0);
    const change = prevTotal > 0 ? ((yearTotalGross - prevTotal) / prevTotal) * 100 : 0;
    return { prevTotal, change };
  }, [appointments, selectedYear, yearTotalGross, getAptIncome]);

  // ─── Chart Data ───
  const monthlyData = useMemo(() => {
    const year = parseInt(selectedYear);
    const quarters = [
      { label: "Q1 (Apr-Jun)", months: [3, 4, 5], qYear: year },
      { label: "Q2 (Jul-Sep)", months: [6, 7, 8], qYear: year },
      { label: "Q3 (Oct-Dec)", months: [9, 10, 11], qYear: year },
      { label: "Q4 (Jan-Mar)", months: [0, 1, 2], qYear: year + 1 },
    ];
    return quarters.map(q => {
      const qApts = yearIncomeApts.filter(a => { const d = parseISO(a.appointment_date); return q.months.includes(d.getMonth()) && d.getFullYear() === q.qYear; });
      return { name: q.label, income: qApts.reduce((s, a) => s + getAptIncome(a), 0), travel: qApts.reduce((s, a) => s + getAptTravelFee(a), 0), count: qApts.length };
    });
  }, [yearIncomeApts, selectedYear, getAptIncome, getAptTravelFee]);

  const cumulativeData = useMemo(() => {
    let running = 0;
    return monthlyData.map(m => { running += m.income + m.travel; return { name: m.name, cumulative: running }; });
  }, [monthlyData]);

  const serviceData = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; count: number }> = {};
    incomeApts.forEach(a => {
      const key = a.service_id || "other";
      if (!map[key]) map[key] = { name: getServiceName(a.service_id), revenue: 0, count: 0 };
      map[key].revenue += getAptIncome(a);
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [incomeApts, getServiceName, getAptIncome]);

  const uniqueServices = useMemo(() => Array.from(new Set(incomeApts.map(a => getServiceName(a.service_id)))).sort(), [incomeApts, getServiceName]);

  // ─── Income Log ───
  const incomeLog = useMemo(() => {
    let rows = incomeApts
      .filter(a => paymentMap.has(a.id))
      .map(a => {
        const payment = paymentMap.get(a.id)!;
        const income = payment.payment_status === "paid" ? payment.amount : 0;
        return {
          id: a.id,
          date: a.appointment_date,
          time: a.appointment_time,
          client: a.client_name,
          service: getServiceName(a.service_id),
          price: payment.payment_status === "paid" ? payment.amount : 0,
          travelFee: a.travel_fee || 0,
          total: income,
          postcode: a.postcode || "—",
          paymentMethod: payment.payment_method || "—",
          paymentStatus: payment.payment_status || "recorded",
          paymentId: payment.id,
        };
      });
    if (searchFilter) { const q = searchFilter.toLowerCase(); rows = rows.filter(r => r.client.toLowerCase().includes(q) || r.service.toLowerCase().includes(q) || r.postcode.toLowerCase().includes(q)); }
    if (serviceFilter !== "all") rows = rows.filter(r => r.service === serviceFilter);
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date": cmp = a.date.localeCompare(b.date) || a.time.localeCompare(b.time); break;
        case "client": cmp = a.client.localeCompare(b.client); break;
        case "service": cmp = a.service.localeCompare(b.service); break;
        case "price": cmp = a.price - b.price; break;
        case "travelFee": cmp = a.travelFee - b.travelFee; break;
        case "total": cmp = a.total - b.total; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return rows;
  }, [incomeApts, getServiceName, paymentMap, searchFilter, serviceFilter, sortKey, sortDir]);

  // ─── Handlers ───
  const handleSort = (key: SortKey) => { if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("desc"); } };
  const toggleExportRow = (id: string) => setSelectedExportRows(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAllExport = () => setSelectedExportRows(selectedExportRows.size === incomeLog.length ? new Set() : new Set(incomeLog.map(r => r.id)));

  const handleDeletePayment = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await (supabase as any).from("appointment_payments").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setPayments(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast.success(`Payment record for ${deleteTarget.client} deleted`);
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Targets
  const saveTarget = () => {
    if (!activeTarget || !targetValue) return;
    const val = parseFloat(targetValue);
    if (isNaN(val) || val <= 0) { toast.error("Enter a valid target value"); return; }
    const next = { ...savedTargets, [activeTarget]: val };
    setSavedTargets(next);
    localStorage.setItem("shawscope_targets", JSON.stringify(next));
    toast.success("Target saved");
    setActiveTarget(""); setTargetValue("");
  };
  const removeTarget = (key: string) => { const next = { ...savedTargets }; delete next[key]; setSavedTargets(next); localStorage.setItem("shawscope_targets", JSON.stringify(next)); };
  const getTargetProgress = (key: string, target: number) => {
    switch (key) {
      case "annual_income": return { current: yearTotalGross, pct: Math.min(100, (yearTotalGross / target) * 100) };
      case "monthly_income": { const mi = yearIncomeApts.filter(a => { const d = parseISO(a.appointment_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, a) => s + getAptIncome(a), 0); return { current: mi, pct: Math.min(100, (mi / target) * 100) }; }
      case "appointments_month": { const mc = yearIncomeApts.filter(a => { const d = parseISO(a.appointment_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length; return { current: mc, pct: Math.min(100, (mc / target) * 100) }; }
      case "appointments_year": return { current: yearIncomeApts.length, pct: Math.min(100, (yearIncomeApts.length / target) * 100) };
      case "avg_appointment_value": { const avg = yearIncomeApts.length ? yearTotalGross / yearIncomeApts.length : 0; return { current: avg, pct: Math.min(100, (avg / target) * 100) }; }
      default: return { current: 0, pct: 0 };
    }
  };
  const saveBills = () => { const val = parseFloat(billsInput) || 0; setMonthlyBills(val); localStorage.setItem("shawscope_monthly_bills", String(val)); toast.success("Monthly bills updated"); };

  // Export
  const exportRows = (type: "csv" | "pdf") => {
    const rows = selectedExportRows.size > 0 ? incomeLog.filter(r => selectedExportRows.has(r.id)) : incomeLog;
    if (rows.length === 0) { toast.error("No data to export"); return; }
    const total = rows.reduce((s, r) => s + r.total, 0);
    const totalPrice = rows.reduce((s, r) => s + r.price, 0);
    const totalTravel = rows.reduce((s, r) => s + r.travelFee, 0);
    const yearLabel = `Tax Year ${getTaxYearLabel(parseInt(selectedYear))}`;

    if (type === "csv") {
      const csv = "Date,Time,Client,Service,Price,Travel Fee,Total,Postcode\n" + rows.map(r => `${format(parseISO(r.date), "dd/MM/yyyy")},${r.time.slice(0, 5)},"${r.client}","${r.service}",${r.price.toFixed(2)},${r.travelFee.toFixed(2)},${r.total.toFixed(2)},${r.postcode}`).join("\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `shawscope-income-${selectedYear}.csv`; a.click();
    } else {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text(`Shawscope Income Report — ${yearLabel}`, 14, 20);
      doc.setFontSize(10); doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
      doc.text(`Total Income: £${totalPrice.toFixed(2)}  |  Travel Fees: £${totalTravel.toFixed(2)}  |  Gross: £${total.toFixed(2)}`, 14, 35);
      doc.text(`40% Tax Reserve: £${(total * 0.4).toFixed(2)}`, 14, 41);
      autoTable(doc, {
        startY: 48,
        head: [["Date", "Time", "Client", "Service", "Price", "Travel", "Total", "Postcode"]],
        body: rows.map(r => [format(parseISO(r.date), "dd/MM/yyyy"), r.time.slice(0, 5), r.client, r.service, `£${r.price.toFixed(2)}`, `£${r.travelFee.toFixed(2)}`, `£${r.total.toFixed(2)}`, r.postcode]),
        foot: [["", "", "", "TOTALS", `£${totalPrice.toFixed(2)}`, `£${totalTravel.toFixed(2)}`, `£${total.toFixed(2)}`, ""]],
        theme: "grid", headStyles: { fillColor: [30, 41, 59] }, footStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
      });
      doc.save(`shawscope-income-${selectedYear}.pdf`);
    }
    toast.success(`Exported ${rows.length} records`);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>;

  const yearLabel = `Tax Year ${getTaxYearLabel(parseInt(selectedYear))}`;
  const chartConfig = { income: { label: "Service Income", color: "hsl(160,60%,45%)" }, travel: { label: "Travel Fees", color: "hsl(210,70%,55%)" }, cumulative: { label: "Cumulative", color: "hsl(160,60%,45%)" } };
  const SortIcon = ({ col }: { col: SortKey }) => <ArrowUpDown className={cn("h-3 w-3 ml-1 inline-block", sortKey === col ? "text-emerald-400" : "text-muted-foreground/40")} />;

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="font-serif text-2xl font-bold text-foreground">Finances</h2>
        <p className="text-sm text-muted-foreground mt-1">Track income, tax reserves, and business performance across tax years</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); setSelectedMonth("all"); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{getTaxYears().map(y => <SelectItem key={y} value={String(y)}>{getTaxYearLabel(y)}</SelectItem>)}</SelectContent>
        </Select>
        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">UK Tax Year (6 Apr – 5 Apr)</Badge>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportRows("csv")}><FileDown className="mr-1 h-4 w-4" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportRows("pdf")}><FileDown className="mr-1 h-4 w-4" /> PDF</Button>
        </div>
      </div>

      {/* Month Pills */}
      <div className="flex flex-wrap gap-1.5">
        <Button variant={selectedMonth === "all" ? "default" : "outline"} size="sm" className={cn("h-7 text-xs", selectedMonth === "all" && "bg-emerald-600 hover:bg-emerald-700")} onClick={() => setSelectedMonth("all")}>Full Year</Button>
        {TAX_YEAR_MONTHS.map(m => (
          <Button key={m.month} variant={selectedMonth === String(m.month) ? "default" : "outline"} size="sm" className={cn("h-7 text-xs px-2.5", selectedMonth === String(m.month) && "bg-emerald-600 hover:bg-emerald-700")} onClick={() => setSelectedMonth(String(m.month))}>{m.label}</Button>
        ))}
      </div>

      {/* Pending Payments Alert */}
      {pendingPaymentsTotal > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 flex items-center gap-3">
          <Wallet className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">£{pendingPaymentsTotal.toFixed(2)} in pending payments</p>
            <p className="text-xs text-amber-400/70">{payments.filter(p => p.payment_status === "unpaid" && completedAppointmentIds.has(p.appointment_id)).length} appointment(s) awaiting payment</p>
          </div>
        </div>
      )}

      {/* ─── KPI TILES: 2 hero + 4 small ─── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Gross Income — hero */}
        <Card className="bg-emerald-950/80 border-emerald-800/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
              <PoundSterling className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-emerald-300/70 uppercase tracking-wide">Gross Income</p>
              <p className="text-2xl font-bold text-white">£{totalGross.toFixed(0)}</p>
              <p className="text-[10px] text-emerald-300/60">
                {incomeApts.length} completed appts
                {yoyComparison.change !== 0 && selectedMonth === "all" && (
                  <span className={cn("ml-1", yoyComparison.change > 0 ? "text-emerald-400" : "text-red-400")}>
                    {yoyComparison.change > 0 ? "↑" : "↓"}{Math.abs(yoyComparison.change).toFixed(0)}% YoY
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Take-Home — hero */}
        <Card className="bg-emerald-950/80 border-emerald-800/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
              <Home className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-emerald-300/70 uppercase tracking-wide">Take-Home (Month)</p>
              <p className="text-2xl font-bold text-white">£{thisMonthTakeHome.toFixed(0)}</p>
              <p className="text-[10px] text-emerald-300/60 flex items-center gap-1">
                vs prev: {monthDiff !== 0 ? (
                  <span className={monthDiff > 0 ? "text-emerald-400" : "text-red-400"}>{monthDiff > 0 ? "+" : ""}£{monthDiff.toFixed(0)}</span>
                ) : "same"}
                <span className="ml-1">· Year: £{yearTakeHome.toFixed(0)}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Services / Travel split */}
        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-2 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 shrink-0">
              <Receipt className="h-4 w-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-white leading-tight">£{totalServiceIncome.toFixed(0)}<span className="text-xs font-normal text-muted-foreground ml-1">+£{totalTravelFees.toFixed(0)}</span></p>
              <p className="text-[10px] text-muted-foreground">Services / Travel</p>
            </div>
          </CardContent>
        </Card>

        {/* Tax Reserve */}
        <Card className="bg-red-950/70 border-red-800/50">
          <CardContent className="flex items-center gap-2 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/20 shrink-0">
              <Calculator className="h-4 w-4 text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-white leading-tight">£{totalTaxNI.toFixed(0)}</p>
              <p className="text-[10px] text-red-300">Tax+NI (49%)</p>
            </div>
          </CardContent>
        </Card>

        {/* Avg per appointment */}
        <Card className="bg-amber-950/70 border-amber-800/50">
          <CardContent className="flex items-center gap-2 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 shrink-0">
              <Wallet className="h-4 w-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-white leading-tight">£{avgPerAppointment.toFixed(0)}</p>
              <p className="text-[10px] text-amber-300">Avg / appt</p>
            </div>
          </CardContent>
        </Card>

        {/* Cancelled */}
        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-2 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
              <X className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-white leading-tight">{cancelledApts.length}</p>
              <p className="text-[10px] text-muted-foreground">Cancelled ({filteredApts.length > 0 ? ((cancelledApts.length / filteredApts.length) * 100).toFixed(0) : 0}%)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Bills */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between rounded-lg border border-rose-700/40 bg-rose-950/40 p-3 hover:bg-rose-900/40 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-rose-400" />
              <span className="font-serif text-sm font-semibold text-rose-200">Monthly Recurring Bills</span>
              {monthlyBills > 0 && <Badge variant="outline" className="text-[10px] border-rose-600/40 text-rose-300">£{monthlyBills.toFixed(0)}/mo</Badge>}
            </div>
            <ChevronDown className="h-4 w-4 text-rose-400" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 border-rose-800/30">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Enter your total monthly recurring bills. This is deducted from your take-home calculation.</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-[200px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                  <Input type="number" value={billsInput} onChange={e => setBillsInput(e.target.value)} className="pl-7 h-9" placeholder="0.00" />
                </div>
                <Button size="sm" onClick={saveBills} className="h-9 bg-rose-600 hover:bg-rose-700"><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
              </div>
              {monthlyBills > 0 && <p className="text-[10px] text-rose-300/60">Annual: £{(monthlyBills * 12).toFixed(0)}</p>}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Targets */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between rounded-lg border border-sky-700/40 bg-sky-950/40 p-3 hover:bg-sky-900/40 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-sky-400" />
              <span className="font-serif text-sm font-semibold text-sky-200">Performance Targets</span>
              {Object.keys(savedTargets).length > 0 && <Badge variant="outline" className="text-[10px] border-sky-600/40 text-sky-300">{Object.keys(savedTargets).length} active</Badge>}
            </div>
            <ChevronDown className="h-4 w-4 text-sky-400" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 border-sky-800/30">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <Select value={activeTarget} onValueChange={setActiveTarget}>
                  <SelectTrigger className="h-9 text-xs flex-1 min-w-[160px]"><SelectValue placeholder="Choose target..." /></SelectTrigger>
                  <SelectContent>{TARGET_OPTIONS.filter(t => !savedTargets[t.value]).map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder={activeTarget?.includes("income") || activeTarget?.includes("value") ? "£" : "#"} value={targetValue} onChange={e => setTargetValue(e.target.value)} className="h-9 w-28 text-xs" />
                <Button size="sm" onClick={saveTarget} disabled={!activeTarget || !targetValue} className="h-9">Set</Button>
              </div>
              {Object.entries(savedTargets).map(([key, target]) => {
                const label = TARGET_OPTIONS.find(t => t.value === key)?.label || key;
                const { current, pct } = getTargetProgress(key, target);
                const isCurrency = key.includes("income") || key.includes("value");
                return (
                  <div key={key} className="rounded-lg border border-sky-800/30 bg-sky-950/20 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-sky-200">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-sky-300">{isCurrency ? `£${current.toFixed(0)}` : current.toFixed(0)} / {isCurrency ? `£${target.toFixed(0)}` : target.toFixed(0)}</span>
                        <button onClick={() => removeTarget(key)} className="text-red-400 hover:text-red-300"><X className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <span className={cn("text-[10px] font-medium mt-1 block", pct >= 100 ? "text-emerald-400" : pct >= 75 ? "text-sky-400" : pct >= 50 ? "text-amber-400" : "text-red-400")}>{pct.toFixed(0)}%{pct >= 100 ? " 🎯" : ""}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Income Log — near top, collapsed */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between rounded-lg border border-emerald-700/40 bg-emerald-950/40 p-3 hover:bg-emerald-900/40 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-400" />
              <span className="font-serif text-sm font-semibold text-emerald-200">Income Log</span>
              <Badge variant="outline" className="text-[10px] border-emerald-600/40 text-emerald-300">{incomeLog.length}</Badge>
            </div>
            <ChevronDown className="h-4 w-4 text-emerald-400" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 border-emerald-800/30">
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="h-8 pl-7 text-xs" />
                </div>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All services" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Services</SelectItem>{uniqueServices.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {incomeLog.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No records match your filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"><Checkbox checked={selectedExportRows.size === incomeLog.length && incomeLog.length > 0} onCheckedChange={toggleAllExport} /></TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("date")}>Date<SortIcon col="date" /></TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("client")}>Client<SortIcon col="client" /></TableHead>
                        <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort("service")}>Service<SortIcon col="service" /></TableHead>
                        <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("total")}>Total<SortIcon col="total" /></TableHead>
                        <TableHead className="hidden md:table-cell text-center">Method</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomeLog.map(r => (
                        <TableRow key={r.id} className={r.paymentStatus === "unpaid" ? "bg-amber-950/20" : ""}>
                          <TableCell><Checkbox checked={selectedExportRows.has(r.id)} onCheckedChange={() => toggleExportRow(r.id)} /></TableCell>
                          <TableCell className="text-xs">{format(parseISO(r.date), "dd/MM/yy")}</TableCell>
                          <TableCell className="text-xs font-medium">{r.client}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{r.service}</TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            {r.paymentStatus === "unpaid" ? <span className="text-amber-400">⏳ £{r.total.toFixed(2)}</span> : <>£{r.total.toFixed(2)}</>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-center">
                            {r.paymentMethod !== "—" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground capitalize">{r.paymentMethod.replace("_", " ")}</span>}
                          </TableCell>
                          <TableCell>
                            {r.paymentId && (
                              <button onClick={() => setDeleteTarget({ id: r.paymentId!, appointmentId: r.id, client: r.client })} className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors" title="Delete payment record">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {selectedExportRows.size > 0 && (
                <div className="flex items-center justify-between border-t p-3 bg-emerald-950/20">
                  <span className="text-sm text-emerald-300">{selectedExportRows.size} selected — £{incomeLog.filter(r => selectedExportRows.has(r.id)).reduce((s, r) => s + r.total, 0).toFixed(2)}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportRows("csv")}><FileDown className="mr-1 h-3 w-3" /> CSV</Button>
                    <Button size="sm" variant="outline" onClick={() => exportRows("pdf")}><FileDown className="mr-1 h-3 w-3" /> PDF</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Revenue Charts — collapsed */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between rounded-lg border border-emerald-700/40 bg-emerald-950/40 p-3 hover:bg-emerald-900/40 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <span className="font-serif text-sm font-semibold text-emerald-200">Revenue Charts</span>
            </div>
            <ChevronDown className="h-4 w-4 text-emerald-400" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-3 lg:grid-cols-2 mt-2">
            <Card className="border-emerald-800/30 bg-emerald-950/10">
              <CardHeader className="pb-1"><CardTitle className="font-serif text-xs text-emerald-200 flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /> Revenue — {yearLabel}</CardTitle></CardHeader>
              <CardContent className="pt-1">
                <ChartContainer config={chartConfig} className="h-[190px] w-full">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,25%)" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(210,10%,60%)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "hsl(210,10%,60%)", fontSize: 10 }} tickFormatter={v => `£${v}`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [`£${Number(value).toFixed(2)}`, name === "income" ? "Services" : "Travel"]} />} />
                    <Bar dataKey="income" stackId="a" fill="hsl(160,60%,45%)" />
                    <Bar dataKey="travel" stackId="a" fill="hsl(210,70%,55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="border-emerald-800/30 bg-emerald-950/10">
              <CardHeader className="pb-1"><CardTitle className="font-serif text-xs text-emerald-200 flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> Cumulative — {yearLabel}</CardTitle></CardHeader>
              <CardContent className="pt-1">
                <ChartContainer config={chartConfig} className="h-[190px] w-full">
                  <AreaChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,25%)" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(210,10%,60%)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "hsl(210,10%,60%)", fontSize: 10 }} tickFormatter={v => `£${v}`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={value => [`£${Number(value).toFixed(2)}`, "Total"]} />} />
                    <defs><linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(160,60%,45%)" stopOpacity={0.4} /><stop offset="95%" stopColor="hsl(160,60%,45%)" stopOpacity={0} /></linearGradient></defs>
                    <Area type="monotone" dataKey="cumulative" stroke="hsl(160,60%,45%)" fill="url(#cumGradient)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Service Breakdown & Tax — collapsed */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between rounded-lg border border-amber-700/40 bg-amber-950/40 p-3 hover:bg-amber-900/40 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-amber-400" />
              <span className="font-serif text-sm font-semibold text-amber-200">Service Breakdown & Tax</span>
            </div>
            <ChevronDown className="h-4 w-4 text-amber-400" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-3 lg:grid-cols-2 mt-2">
            <Card className="border-violet-800/30 bg-violet-950/10">
              <CardHeader className="pb-1"><CardTitle className="font-serif text-xs text-violet-200">Income by Service</CardTitle></CardHeader>
              <CardContent>
                {serviceData.length === 0 ? <p className="py-6 text-center text-muted-foreground">No data.</p> : (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="h-[160px] w-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart><Pie data={serviceData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={64} innerRadius={32}>{serviceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><ChartTooltip formatter={value => [`£${Number(value).toFixed(2)}`]} /></PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      {serviceData.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-muted-foreground">{s.name}</span></div>
                          <div><span className="font-medium">£{s.revenue.toFixed(0)}</span><span className="text-[10px] text-muted-foreground ml-1">({s.count})</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-amber-800/30 bg-amber-950/10">
              <CardHeader className="pb-1">
                <CardTitle className="font-serif text-xs text-amber-200 flex items-center gap-2"><Calculator className="h-3.5 w-3.5" /> Tax Summary (40%)</CardTitle>
                <CardDescription className="text-[11px]">Estimated for self-assessment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-lg border border-amber-800/30 bg-amber-950/20 p-2.5 space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Services</span><span>£{totalServiceIncome.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Travel</span><span>£{totalTravelFees.toFixed(2)}</span></div>
                  <div className="border-t border-amber-800/20 my-1" />
                  <div className="flex justify-between text-xs font-bold"><span className="text-amber-200">Gross</span><span className="text-amber-200">£{totalGross.toFixed(2)}</span></div>
                </div>
                <div className="rounded-lg border border-amber-800/30 bg-amber-950/20 p-2.5 space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Tax (40%)</span><span className="font-bold text-amber-200">£{(totalGross * 0.4).toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">NI (9%)</span><span>£{(totalGross * 0.09).toFixed(2)}</span></div>
                  <div className="border-t border-amber-800/20 my-1" />
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total (49%)</span><span className="font-bold text-red-300">£{(totalGross * 0.49).toFixed(2)}</span></div>
                </div>
                <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/20 p-2.5">
                  <div className="flex justify-between text-xs"><span className="text-emerald-300 font-medium">Take-Home (51%)</span><span className="font-bold text-emerald-200">£{(totalGross * 0.51).toFixed(2)}</span></div>
                  {monthlyBills > 0 && <div className="flex justify-between text-xs mt-1"><span className="text-muted-foreground">After bills</span><span className="text-emerald-300">£{(totalGross * 0.51 - monthlyBills * (selectedMonth === "all" ? 12 : 1)).toFixed(2)}</span></div>}
                </div>
                <p className="text-[10px] text-muted-foreground italic">* Does not account for personal allowance, expenses or thresholds.</p>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the payment record for <strong>{deleteTarget?.client}</strong>? This will remove it from your financial reports. The appointment itself will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FinancesTab;
