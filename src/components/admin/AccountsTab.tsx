import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Download, Upload, FileText, PoundSterling, Briefcase, Receipt, TrendingUp, AlertCircle, Sparkles, Loader2, Paperclip, Eye, PieChart as PieIcon, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

// HMRC self-employed expense categories (SA103F)
const EXPENSE_CATEGORIES = [
  "Cost of goods bought for resale or goods used",
  "Construction industry – payments to subcontractors",
  "Wages, salaries and other staff costs",
  "Car, van and travel expenses",
  "Rent, rates, power and insurance costs",
  "Repairs and maintenance of property and equipment",
  "Phone, fax, stationery and other office costs",
  "Advertising and business entertainment costs",
  "Interest on bank and other loans",
  "Bank, credit card and other financial charges",
  "Irrecoverable debts written off",
  "Accountancy, legal and other professional fees",
  "Depreciation and loss/profit on sale of assets",
  "Other business expenses",
];

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  vendor: string | null;
  amount: number;
  vat_amount: number | null;
  payment_method: string | null;
  receipt_path: string | null;
  receipt_name: string | null;
  receipt_mime: string | null;
  notes: string | null;
};
type Employment = {
  id: string;
  pay_date: string;
  employer: string | null;
  period_label: string | null;
  gross_pay: number;
  tax_paid: number;
  ni_paid: number;
  pension: number;
  tax_year_start: string | null;
  notes: string | null;
};
type Payment = {
  id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  appointment_id: string;
  notes?: string | null;
};
type ApptLite = { id: string; client_name: string; appointment_date: string; appointment_time: string };

// UK tax year starts 6 April
function taxYearForDate(d: Date) {
  const y = d.getFullYear();
  const start = new Date(y, 3, 6); // 6 April
  return d >= start ? y : y - 1;
}
function taxYearRange(startYear: number) {
  return { start: new Date(startYear, 3, 6), end: new Date(startYear + 1, 3, 6) };
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);
}
function fmtDate(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

// UK 2024/25 + 2025/26 (approximation; same bands)
function calcIncomeTax(taxableIncome: number) {
  let pa = 12570;
  // Personal allowance taper: lose £1 per £2 over £100k
  let adjustedIncome = taxableIncome;
  if (adjustedIncome > 100000) {
    pa = Math.max(0, pa - (adjustedIncome - 100000) / 2);
  }
  const taxable = Math.max(0, taxableIncome - pa);
  const basicBand = 37700; // up to £50,270
  const higherBand = 125140 - 50270; // £74,870
  let tax = 0;
  const basic = Math.min(taxable, basicBand);
  tax += basic * 0.2;
  const higher = Math.min(Math.max(0, taxable - basicBand), higherBand);
  tax += higher * 0.4;
  const additional = Math.max(0, taxable - basicBand - higherBand);
  tax += additional * 0.45;
  return { tax, personalAllowance: pa };
}

function calcClass2NI(profit: number) {
  // Class 2 voluntary if profits below £6,725; required reporting from £12,570
  // Simplified: treat as £3.45/wk * 52 if profits >= £12,570
  if (profit >= 12570) return 3.45 * 52;
  return 0;
}
function calcClass4NI(profit: number) {
  const lower = 12570;
  const upper = 50270;
  if (profit <= lower) return 0;
  const band1 = Math.min(profit, upper) - lower;
  const band2 = Math.max(0, profit - upper);
  return band1 * 0.06 + band2 * 0.02; // 2024/25 rates
}

export default function AccountsTab() {
  const today = new Date();
  const [taxYear, setTaxYear] = useState<number>(taxYearForDate(today));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employment, setEmployment] = useState<Employment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [apptMap, setApptMap] = useState<Record<string, ApptLite>>({});
  const [allYearAppts, setAllYearAppts] = useState<ApptLite[]>([]);
  const [loading, setLoading] = useState(false);

  const [expDialog, setExpDialog] = useState(false);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [expForm, setExpForm] = useState({
    expense_date: today.toISOString().slice(0, 10),
    category: EXPENSE_CATEGORIES[3],
    description: "",
    vendor: "",
    amount: "",
    vat_amount: "",
    payment_method: "card",
    notes: "",
  });
  const [expFile, setExpFile] = useState<File | null>(null);
  const [expSaving, setExpSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [rememberMapping, setRememberMapping] = useState<boolean>(true);
  const [mappings, setMappings] = useState<{ keyword: string; category: string }[]>([]);

  const [empDialog, setEmpDialog] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employment | null>(null);
  const [empForm, setEmpForm] = useState({
    pay_date: today.toISOString().slice(0, 10),
    employer: "",
    period_label: "",
    gross_pay: "",
    tax_paid: "",
    ni_paid: "",
    pension: "",
    notes: "",
  });
  const [empSaving, setEmpSaving] = useState(false);

  // Income (payment) editing
  const [payDialog, setPayDialog] = useState(false);
  const [editingPay, setEditingPay] = useState<Payment | null>(null);
  const [payForm, setPayForm] = useState({
    appointment_id: "",
    appt_search: "",
    amount: "",
    payment_method: "card",
    payment_status: "paid",
    notes: "",
    created_at: today.toISOString().slice(0, 10),
  });
  const [paySaving, setPaySaving] = useState(false);

  const ty = taxYearRange(taxYear);
  const tyStartStr = ty.start.toISOString().slice(0, 10);
  const tyEndStr = ty.end.toISOString().slice(0, 10);

  const load = async () => {
    setLoading(true);
    const [{ data: exp }, { data: emp }, { data: pays }] = await Promise.all([
      supabase.from("accounts_expenses").select("*").gte("expense_date", tyStartStr).lt("expense_date", tyEndStr).order("expense_date", { ascending: false }),
      supabase.from("accounts_employment_income").select("*").gte("pay_date", tyStartStr).lt("pay_date", tyEndStr).order("pay_date", { ascending: false }),
      supabase.from("appointment_payments").select("id,amount,payment_method,payment_status,created_at,appointment_id,notes").gte("created_at", ty.start.toISOString()).lt("created_at", ty.end.toISOString()).order("created_at", { ascending: false }),
    ]);
    setExpenses(exp || []);
    setEmployment(emp || []);
    setPayments(pays || []);

    // Fetch all appointments in tax year for name lookup + add dialog selector
    const { data: apts } = await supabase
      .from("appointments")
      .select("id,client_name,appointment_date,appointment_time")
      .gte("appointment_date", tyStartStr)
      .lt("appointment_date", tyEndStr)
      .order("appointment_date", { ascending: false });
    const list = (apts || []) as ApptLite[];
    setAllYearAppts(list);
    const map: Record<string, ApptLite> = {};
    for (const a of list) map[a.id] = a;
    // Also fetch any appointments referenced by payments but outside the date filter
    const missing = (pays || []).map(p => p.appointment_id).filter(id => id && !map[id]);
    if (missing.length) {
      const { data: extra } = await supabase
        .from("appointments")
        .select("id,client_name,appointment_date,appointment_time")
        .in("id", Array.from(new Set(missing)));
      for (const a of (extra || []) as ApptLite[]) map[a.id] = a;
    }
    setApptMap(map);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [taxYear]);

  // Load saved keyword → category mappings (vendor remembered choices)
  const loadMappings = async () => {
    const { data } = await supabase
      .from("accounts_category_mappings")
      .select("keyword,category")
      .order("match_count", { ascending: false });
    setMappings((data || []) as any);
  };
  useEffect(() => { loadMappings(); }, []);

  // Match the longest stored keyword that appears in the supplied text
  const suggestFromMappings = (text?: string | null): string | null => {
    if (!text) return null;
    const t = text.toLowerCase();
    let best: { keyword: string; category: string } | null = null;
    for (const m of mappings) {
      const k = (m.keyword || "").toLowerCase().trim();
      if (!k) continue;
      if (t.includes(k) && (!best || k.length > best.keyword.length)) best = m;
    }
    return best?.category || null;
  };

  // Totals
  const selfEmployedIncome = useMemo(() => payments.filter(p => p.payment_status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0), [payments]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount || 0), 0), [expenses]);
  const selfEmployedProfit = selfEmployedIncome - totalExpenses;
  const employmentGross = useMemo(() => employment.reduce((s, e) => s + Number(e.gross_pay || 0), 0), [employment]);
  const employmentTaxPaid = useMemo(() => {
    // Use the most recent entry's YTD tax_paid if entries are cumulative; otherwise sum.
    // Heuristic: if user enters cumulative YTD per payslip, the max is correct. We sum.
    return employment.reduce((s, e) => s + Number(e.tax_paid || 0), 0);
  }, [employment]);
  const totalIncome = employmentGross + Math.max(0, selfEmployedProfit);
  const { tax: incomeTaxDue, personalAllowance } = calcIncomeTax(totalIncome);
  const class2 = calcClass2NI(selfEmployedProfit);
  const class4 = calcClass4NI(selfEmployedProfit);
  const totalTaxDue = incomeTaxDue + class2 + class4;
  const balance = totalTaxDue - employmentTaxPaid;

  // ─── Monthly trends & VAT ───
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; label: string; income: number; expenses: number; profit: number }>();
    const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    for (let i = 0; i < 12; i++) {
      const m = ((i + 3) % 12) + 1;
      const y = i < 9 ? taxYear : taxYear + 1;
      const key = `${y}-${String(m).padStart(2, "0")}`;
      map.set(key, { month: key, label: `${months[i]} ${String(y).slice(-2)}`, income: 0, expenses: 0, profit: 0 });
    }
    for (const p of payments) {
      if (p.payment_status !== "paid") continue;
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = map.get(key);
      if (row) row.income += Number(p.amount || 0);
    }
    for (const e of expenses) {
      const d = new Date(e.expense_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = map.get(key);
      if (row) row.expenses += Number(e.amount || 0);
    }
    for (const row of map.values()) row.profit = row.income - row.expenses;
    return Array.from(map.values());
  }, [payments, expenses, taxYear]);

  const ytdProfit = selfEmployedProfit;
  const ytdTurnover = selfEmployedIncome;

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { category: string; total: number; count: number; vat: number }>();
    for (const e of expenses) {
      const k = e.category || "Uncategorised";
      const row = map.get(k) || { category: k, total: 0, count: 0, vat: 0 };
      row.total += Number(e.amount || 0);
      row.vat += Number(e.vat_amount || 0);
      row.count += 1;
      map.set(k, row);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Receipts (only expenses that have an attached file)
  const receipts = useMemo(() => expenses.filter(e => !!e.receipt_path), [expenses]);

  // VAT threshold: £85,000 rolling 12-month taxable turnover
  const VAT_THRESHOLD = 85000;
  const vatStatus = ytdTurnover >= VAT_THRESHOLD ? "eligible" : "below";
  const vatDistance = Math.max(0, VAT_THRESHOLD - ytdTurnover);
  const vatEstimate = vatStatus === "eligible" ? ytdTurnover * 0.2 : 0; // 20% standard rate estimate

  const lastEmp = employment[0];

  // Receipt handling
  const openExpense = (e?: Expense) => {
    if (e) {
      setEditingExp(e);
      setExpForm({
        expense_date: e.expense_date,
        category: e.category,
        description: e.description || "",
        vendor: e.vendor || "",
        amount: String(e.amount),
        vat_amount: e.vat_amount ? String(e.vat_amount) : "",
        payment_method: e.payment_method || "card",
        notes: e.notes || "",
      });
    } else {
      setEditingExp(null);
      setExpForm({
        expense_date: today.toISOString().slice(0, 10),
        category: EXPENSE_CATEGORIES[3],
        description: "",
        vendor: "",
        amount: "",
        vat_amount: "",
        payment_method: "card",
        notes: "",
      });
    }
    setExpFile(null);
    setOcrConfidence(null);
    setRememberMapping(true);
    setExpDialog(true);
  };

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const idx = res.indexOf("base64,");
      resolve(idx >= 0 ? res.slice(idx + 7) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const matchCategory = (hint?: string | null) => {
    if (!hint) return null;
    const h = hint.toLowerCase();
    // Saved mappings always win
    const saved = suggestFromMappings(h);
    if (saved) return saved;
    const found = EXPENSE_CATEGORIES.find(c => c.toLowerCase().includes(h) || h.includes(c.toLowerCase().split(",")[0]));
    if (found) return found;
    if (/(fuel|petrol|diesel|car|van|parking|train|taxi|uber|mileage|travel)/.test(h)) return "Car, van and travel expenses";
    if (/(phone|stationery|office|print|paper|ink)/.test(h)) return "Phone, fax, stationery and other office costs";
    if (/(advert|marketing|google ads|facebook|instagram)/.test(h)) return "Advertising and business entertainment costs";
    if (/(rent|rates|insurance|electric|gas|power|utility)/.test(h)) return "Rent, rates, power and insurance costs";
    if (/(repair|maintenance)/.test(h)) return "Repairs and maintenance of property and equipment";
    if (/(bank|card fee|stripe|paypal|transaction)/.test(h)) return "Bank, credit card and other financial charges";
    if (/(account|legal|professional|consult)/.test(h)) return "Accountancy, legal and other professional fees";
    return null;
  };

  const handleReceiptFile = async (file: File | null) => {
    setExpFile(file);
    setOcrConfidence(null);
    if (!file) return;
    const isImg = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImg && !isPdf) {
      // OCR not supported for other types — just attach
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.message("File too large for auto-extract — saved without OCR");
      return;
    }
    setOcrLoading(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("ocr-receipt", {
        body: { fileBase64, mimeType: file.type, fileName: file.name },
      });
      if (error) throw error;
      const r = (data as any)?.data || {};
      const updates: Partial<typeof expForm> = {};
      if (r.merchant && !expForm.vendor) updates.vendor = String(r.merchant).slice(0, 120);
      if (r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) updates.expense_date = r.date;
      if (typeof r.total === "number" && !isNaN(r.total)) updates.amount = String(r.total);
      if (typeof r.vat === "number" && !isNaN(r.vat)) updates.vat_amount = String(r.vat);
      if (r.description && !expForm.description) updates.description = String(r.description).slice(0, 200);
      const guessText = [r.merchant, r.description, r.category_hint].filter(Boolean).join(" ");
      const cat = suggestFromMappings(guessText) || matchCategory(r.category_hint);
      if (cat) updates.category = cat;
      if (Object.keys(updates).length > 0) {
        setExpForm(prev => ({ ...prev, ...updates }));
        setOcrConfidence(typeof r.confidence === "number" ? r.confidence : null);
        toast.success("Extracted from receipt — please verify");
      } else {
        toast.message("Couldn't auto-extract — fill manually");
      }
    } catch (e: any) {
      toast.error(e?.message || "OCR failed — fill manually");
    } finally {
      setOcrLoading(false);
    }
  };

  const saveExpense = async () => {
    if (!expForm.amount || !expForm.category) {
      toast.error("Amount and category required");
      return;
    }
    setExpSaving(true);
    try {
      let receipt_path = editingExp?.receipt_path || null;
      let receipt_name = editingExp?.receipt_name || null;
      let receipt_mime = editingExp?.receipt_mime || null;
      if (expFile) {
        const ext = expFile.name.split(".").pop() || "bin";
        const path = `receipts/${taxYear}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("accounts-receipts").upload(path, expFile, { upsert: false });
        if (upErr) throw upErr;
        receipt_path = path;
        receipt_name = expFile.name;
        receipt_mime = expFile.type || null;
      }
      const payload: any = {
        expense_date: expForm.expense_date,
        category: expForm.category,
        description: expForm.description || null,
        vendor: expForm.vendor || null,
        amount: Number(expForm.amount),
        vat_amount: expForm.vat_amount ? Number(expForm.vat_amount) : 0,
        payment_method: expForm.payment_method || null,
        notes: expForm.notes || null,
        receipt_path, receipt_name, receipt_mime,
      };
      if (editingExp) {
        const { error } = await supabase.from("accounts_expenses").update(payload).eq("id", editingExp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts_expenses").insert(payload);
        if (error) throw error;
      }
      // Remember vendor → category mapping for next time
      const vendorKey = (expForm.vendor || "").trim().toLowerCase();
      if (rememberMapping && vendorKey) {
        const existing = mappings.find(m => m.keyword.toLowerCase() === vendorKey);
        if (existing) {
          if (existing.category !== expForm.category) {
            await supabase
              .from("accounts_category_mappings")
              .update({ category: expForm.category })
              .eq("keyword", vendorKey);
          }
        } else {
          await supabase
            .from("accounts_category_mappings")
            .insert({ keyword: vendorKey, category: expForm.category });
        }
        loadMappings();
      }
      toast.success("Expense saved");
      setExpDialog(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setExpSaving(false);
    }
  };

  const deleteExpense = async (e: Expense) => {
    if (!confirm("Delete this expense?")) return;
    if (e.receipt_path) await supabase.storage.from("accounts-receipts").remove([e.receipt_path]);
    await supabase.from("accounts_expenses").delete().eq("id", e.id);
    load();
  };

  const downloadReceipt = async (e: Expense) => {
    if (!e.receipt_path) return;
    const { data, error } = await supabase.storage.from("accounts-receipts").createSignedUrl(e.receipt_path, 60);
    if (error || !data) { toast.error("Could not access file"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const openEmployment = (e?: Employment) => {
    if (e) {
      setEditingEmp(e);
      setEmpForm({
        pay_date: e.pay_date,
        employer: e.employer || "",
        period_label: e.period_label || "",
        gross_pay: String(e.gross_pay),
        tax_paid: String(e.tax_paid),
        ni_paid: String(e.ni_paid),
        pension: String(e.pension),
        notes: e.notes || "",
      });
    } else {
      setEditingEmp(null);
      setEmpForm({
        pay_date: today.toISOString().slice(0, 10),
        employer: lastEmp?.employer || "",
        period_label: "",
        gross_pay: "",
        tax_paid: "",
        ni_paid: "",
        pension: "",
        notes: "",
      });
    }
    setEmpDialog(true);
  };

  const saveEmployment = async () => {
    if (!empForm.gross_pay) { toast.error("Gross pay required"); return; }
    setEmpSaving(true);
    try {
      const payload: any = {
        pay_date: empForm.pay_date,
        employer: empForm.employer || null,
        period_label: empForm.period_label || null,
        gross_pay: Number(empForm.gross_pay),
        tax_paid: Number(empForm.tax_paid || 0),
        ni_paid: Number(empForm.ni_paid || 0),
        pension: Number(empForm.pension || 0),
        notes: empForm.notes || null,
        tax_year_start: tyStartStr,
      };
      if (editingEmp) {
        const { error } = await supabase.from("accounts_employment_income").update(payload).eq("id", editingEmp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts_employment_income").insert(payload);
        if (error) throw error;
      }
      toast.success("Employment income saved");
      setEmpDialog(false);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
    finally { setEmpSaving(false); }
  };

  const deleteEmployment = async (e: Employment) => {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("accounts_employment_income").delete().eq("id", e.id);
    load();
  };

  // ── Income (payment) CRUD ──
  const openPayment = (p?: Payment) => {
    if (p) {
      setEditingPay(p);
      setPayForm({
        appointment_id: p.appointment_id || "",
        appt_search: apptMap[p.appointment_id]?.client_name || "",
        amount: String(p.amount),
        payment_method: p.payment_method || "card",
        payment_status: p.payment_status || "paid",
        notes: p.notes || "",
        created_at: new Date(p.created_at).toISOString().slice(0, 10),
      });
    } else {
      setEditingPay(null);
      setPayForm({
        appointment_id: "",
        appt_search: "",
        amount: "",
        payment_method: "card",
        payment_status: "paid",
        notes: "",
        created_at: today.toISOString().slice(0, 10),
      });
    }
    setPayDialog(true);
  };

  const savePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) { toast.error("Amount required"); return; }
    if (!payForm.appointment_id) { toast.error("Pick a patient appointment"); return; }
    setPaySaving(true);
    try {
      const payload: any = {
        appointment_id: payForm.appointment_id,
        amount: Number(payForm.amount),
        payment_method: payForm.payment_method,
        payment_status: payForm.payment_status,
        notes: payForm.notes || null,
      };
      if (editingPay) {
        const { error } = await supabase.from("appointment_payments").update(payload).eq("id", editingPay.id);
        if (error) throw error;
      } else {
        // Allow user to set the recorded date
        if (payForm.created_at) payload.created_at = new Date(payForm.created_at + "T12:00:00").toISOString();
        const { error } = await supabase.from("appointment_payments").insert(payload);
        if (error) throw error;
      }
      toast.success("Payment saved");
      setPayDialog(false);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
    finally { setPaySaving(false); }
  };

  const deletePayment = async (p: Payment) => {
    if (!confirm("Delete this payment record?")) return;
    const { error } = await supabase.from("appointment_payments").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment deleted");
    load();
  };

  const apptSearchResults = useMemo(() => {
    const q = payForm.appt_search.trim().toLowerCase();
    if (!q) return allYearAppts.slice(0, 8);
    return allYearAppts.filter(a => a.client_name.toLowerCase().includes(q)).slice(0, 12);
  }, [payForm.appt_search, allYearAppts]);

  const exportCSV = (kind: "expenses" | "employment" | "income" | "summary") => {
    let csv = "";
    let name = "";
    if (kind === "expenses") {
      csv = "Date,Category,Vendor,Description,Amount,VAT,Payment,Notes\n" +
        expenses.map(e => [fmtDate(e.expense_date), e.category, e.vendor || "", e.description || "", e.amount, e.vat_amount || 0, e.payment_method || "", (e.notes || "").replace(/[\r\n,]/g, " ")].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      name = `expenses-${taxYear}-${taxYear + 1}.csv`;
    } else if (kind === "employment") {
      csv = "Pay Date,Employer,Period,Gross,Tax,NI,Pension,Notes\n" +
        employment.map(e => [fmtDate(e.pay_date), e.employer || "", e.period_label || "", e.gross_pay, e.tax_paid, e.ni_paid, e.pension, (e.notes || "").replace(/[\r\n,]/g, " ")].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      name = `employment-${taxYear}-${taxYear + 1}.csv`;
    } else if (kind === "income") {
      csv = "Date,Patient,Amount,Method,Status,Notes\n" +
        payments.map(p => [
          new Date(p.created_at).toLocaleDateString("en-GB"),
          apptMap[p.appointment_id]?.client_name || "",
          p.amount,
          p.payment_method,
          p.payment_status,
          (p.notes || "").replace(/[\r\n,]/g, " "),
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      name = `self-employed-income-${taxYear}-${taxYear + 1}.csv`;
    } else {
      csv = "Tax Year,Self-Employed Income,Expenses,SE Profit,Employment Gross,Total Income,Personal Allowance,Income Tax Due,Class 2 NI,Class 4 NI,Total Tax Due,Tax Paid (Employment),Balance\n" +
        `"${taxYear}/${taxYear + 1}",${selfEmployedIncome.toFixed(2)},${totalExpenses.toFixed(2)},${selfEmployedProfit.toFixed(2)},${employmentGross.toFixed(2)},${totalIncome.toFixed(2)},${personalAllowance.toFixed(2)},${incomeTaxDue.toFixed(2)},${class2.toFixed(2)},${class4.toFixed(2)},${totalTaxDue.toFixed(2)},${employmentTaxPaid.toFixed(2)},${balance.toFixed(2)}`;
      name = `tax-summary-${taxYear}-${taxYear + 1}.csv`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  // HMRC Self Assessment export — maps totals to SA103F (self-employment) and
  // SA102 (employment) box numbers so figures can be copied straight into the
  // online return.
  const exportSelfAssessment = () => {
    // SA103F box numbers for each HMRC expense category (in order of EXPENSE_CATEGORIES)
    const SA103F_EXPENSE_BOXES: { box: string; label: string }[] = [
      { box: "17", label: "Cost of goods bought for resale or goods used" },
      { box: "18", label: "Construction industry – payments to subcontractors" },
      { box: "19", label: "Wages, salaries and other staff costs" },
      { box: "20", label: "Car, van and travel expenses" },
      { box: "21", label: "Rent, rates, power and insurance costs" },
      { box: "22", label: "Repairs and maintenance of property and equipment" },
      { box: "23", label: "Phone, fax, stationery and other office costs" },
      { box: "24", label: "Advertising and business entertainment costs" },
      { box: "25", label: "Interest on bank and other loans" },
      { box: "26", label: "Bank, credit card and other financial charges" },
      { box: "27", label: "Irrecoverable debts written off" },
      { box: "28", label: "Accountancy, legal and other professional fees" },
      { box: "29", label: "Depreciation and loss/profit on sale of assets" },
      { box: "30", label: "Other business expenses" },
    ];
    const totalsByCat = new Map<string, number>();
    for (const e of expenses) {
      totalsByCat.set(e.category, (totalsByCat.get(e.category) || 0) + Number(e.amount || 0));
    }
    const money = (n: number) => n.toFixed(2);
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const row = (...cells: (string | number)[]) => cells.map(esc).join(",");

    const lines: string[] = [];
    lines.push(`UK Self Assessment Export — Tax year ${taxYear}/${String(taxYear + 1).slice(-2)} (6 Apr ${taxYear} – 5 Apr ${taxYear + 1})`);
    lines.push(`Generated ${new Date().toLocaleString("en-GB")}`);
    lines.push("");

    // SA103F — Self-employment (full)
    lines.push("SA103F — Self-employment (full)");
    lines.push(row("Box", "Description", "Amount (£)"));
    lines.push(row("15", "Your turnover – takings, fees, sales", money(selfEmployedIncome)));
    lines.push(row("16", "Any other business income (not turnover)", money(0)));
    for (let i = 0; i < EXPENSE_CATEGORIES.length; i++) {
      const cat = EXPENSE_CATEGORIES[i];
      const meta = SA103F_EXPENSE_BOXES[i];
      lines.push(row(meta.box, meta.label, money(totalsByCat.get(cat) || 0)));
    }
    lines.push(row("31", "Total expenses (boxes 17 to 30)", money(totalExpenses)));
    lines.push(row(selfEmployedProfit >= 0 ? "32" : "33", selfEmployedProfit >= 0 ? "Net profit" : "Net loss", money(Math.abs(selfEmployedProfit))));
    lines.push("");

    // SA102 — Employment
    lines.push("SA102 — Employment");
    lines.push(row("Box", "Description", "Amount (£)"));
    lines.push(row("1", "Pay from this employment (gross, before tax)", money(employmentGross)));
    lines.push(row("2", "UK tax taken off pay (PAYE)", money(employmentTaxPaid)));
    const niTotal = employment.reduce((s, e) => s + Number(e.ni_paid || 0), 0);
    const pensionTotal = employment.reduce((s, e) => s + Number(e.pension || 0), 0);
    lines.push(row("—", "National Insurance contributions (info only)", money(niTotal)));
    lines.push(row("—", "Pension contributions deducted (info only)", money(pensionTotal)));
    lines.push("");

    // Tax calculation summary
    lines.push("Tax calculation summary (estimate)");
    lines.push(row("Item", "Amount (£)"));
    lines.push(row("Total taxable income", money(totalIncome)));
    lines.push(row("Personal allowance applied", money(personalAllowance)));
    lines.push(row("Income tax due", money(incomeTaxDue)));
    lines.push(row("Class 2 NI", money(class2)));
    lines.push(row("Class 4 NI", money(class4)));
    lines.push(row("Total tax & NI due", money(totalTaxDue)));
    lines.push(row("Less tax already paid via PAYE", money(employmentTaxPaid)));
    lines.push(row(balance >= 0 ? "Balance owed to HMRC" : "Estimated refund", money(Math.abs(balance))));
    lines.push("");
    lines.push("Notes:");
    lines.push(esc("Box numbers reference HMRC SA103F (self-employment, full) and SA102 (employment) for tax year 2024/25."));
    lines.push(esc("If your turnover is under £90,000 you may use SA103S instead — copy box 15 to SA103S box 9 and box 31 to SA103S box 20."));
    lines.push(esc("Estimate only — not a substitute for professional advice or the official HMRC calculation."));

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `self-assessment-${taxYear}-${taxYear + 1}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Tax year selector + summary */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button size="sm" variant="outline" onClick={() => setTaxYear(taxYear - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-sm sm:text-lg leading-tight truncate">
              Tax Year {taxYear}/{String(taxYear + 1).slice(-2)}
              <span className="hidden sm:inline text-xs font-normal text-muted-foreground ml-2">(6 Apr {taxYear} – 5 Apr {taxYear + 1})</span>
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setTaxYear(taxYear + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => exportCSV("summary")}><Download className="h-4 w-4 mr-1" />Summary</Button>
            <Button size="sm" variant="outline" onClick={exportSelfAssessment} title="HMRC SA103F / SA102 box-by-box totals"><FileText className="h-4 w-4 mr-1" />SA Export</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3">
              <div className="text-xs text-muted-foreground">Self-Employed Income</div>
              <div className="text-lg font-bold text-emerald-300">{fmtCurrency(selfEmployedIncome)}</div>
              <div className="text-[10px] text-muted-foreground">{payments.filter(p => p.payment_status === "paid").length} paid</div>
            </div>
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3">
              <div className="text-xs text-muted-foreground">Expenses</div>
              <div className="text-lg font-bold text-rose-300">{fmtCurrency(totalExpenses)}</div>
              <div className="text-[10px] text-muted-foreground">{expenses.length} items</div>
            </div>
            <div className="rounded-lg border border-sky-500/30 bg-sky-950/30 p-3">
              <div className="text-xs text-muted-foreground">SE Profit</div>
              <div className={`text-lg font-bold ${selfEmployedProfit >= 0 ? "text-sky-300" : "text-rose-300"}`}>{fmtCurrency(selfEmployedProfit)}</div>
            </div>
            <div className="rounded-lg border border-violet-500/30 bg-violet-950/30 p-3">
              <div className="text-xs text-muted-foreground">Employment Gross</div>
              <div className="text-lg font-bold text-violet-300">{fmtCurrency(employmentGross)}</div>
              <div className="text-[10px] text-muted-foreground">Tax paid {fmtCurrency(employmentTaxPaid)}</div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/20 p-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Estimated UK tax for {taxYear}/{String(taxYear + 1).slice(-2)}</div>
                <div className="text-xs mt-1 space-y-0.5">
                  <div>Total income: <span className="font-mono">{fmtCurrency(totalIncome)}</span> · Personal allowance: <span className="font-mono">{fmtCurrency(personalAllowance)}</span></div>
                  <div>Income tax: <span className="font-mono">{fmtCurrency(incomeTaxDue)}</span> · Class 2 NI: <span className="font-mono">{fmtCurrency(class2)}</span> · Class 4 NI: <span className="font-mono">{fmtCurrency(class4)}</span></div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total tax due</div>
                <div className="text-xl font-bold text-amber-300">{fmtCurrency(totalTaxDue)}</div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-muted-foreground">Less tax already paid via PAYE: <span className="font-mono">{fmtCurrency(employmentTaxPaid)}</span></div>
              {balance >= 0 ? (
                <Badge className="bg-rose-600 text-white">You owe approx {fmtCurrency(balance)}</Badge>
              ) : (
                <Badge className="bg-emerald-600 text-white">Likely refund of approx {fmtCurrency(Math.abs(balance))}</Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 flex items-start gap-1"><AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> Estimate only using 2024/25 bands. Not a substitute for professional advice or your final HMRC self assessment.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" onValueChange={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="dashboard" className="text-[11px] sm:text-sm px-1 sm:px-3 py-1.5 flex-col sm:flex-row gap-0.5 sm:gap-1"><TrendingUp className="h-4 w-4" /><span>Dashboard</span></TabsTrigger>
          <TabsTrigger value="expenses" className="text-[11px] sm:text-sm px-1 sm:px-3 py-1.5 flex-col sm:flex-row gap-0.5 sm:gap-1"><Receipt className="h-4 w-4" /><span>Expenses</span></TabsTrigger>
          <TabsTrigger value="receipts" className="text-[11px] sm:text-sm px-1 sm:px-3 py-1.5 flex-col sm:flex-row gap-0.5 sm:gap-1"><Paperclip className="h-4 w-4" /><span>Receipts</span></TabsTrigger>
          <TabsTrigger value="income" className="text-[11px] sm:text-sm px-1 sm:px-3 py-1.5 flex-col sm:flex-row gap-0.5 sm:gap-1"><PoundSterling className="h-4 w-4" /><span>Income</span></TabsTrigger>
          <TabsTrigger value="employment" className="text-[11px] sm:text-sm px-1 sm:px-3 py-1.5 flex-col sm:flex-row gap-0.5 sm:gap-1"><Briefcase className="h-4 w-4" /><span>Employment</span></TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground">YTD Self-Employed Profit / Loss</div>
              <div className={`text-2xl font-bold ${ytdProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtCurrency(ytdProfit)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Tax year to 5 Apr {taxYear + 1}</div>
            </div>
            <div className={`rounded-lg border p-3 ${vatStatus === "eligible" ? "border-amber-500/40 bg-amber-950/20" : "border-border bg-card"}`}>
              <div className="text-xs text-muted-foreground">VAT Threshold</div>
              <div className={`text-2xl font-bold ${vatStatus === "eligible" ? "text-amber-300" : "text-emerald-300"}`}>{vatStatus === "eligible" ? "Exceeded" : fmtCurrency(vatDistance)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {vatStatus === "eligible"
                  ? `Turnover ${fmtCurrency(ytdTurnover)} > £85,000 · Est VAT liability ${fmtCurrency(vatEstimate)}`
                  : `Turnover ${fmtCurrency(ytdTurnover)} · £85,000 threshold`}
              </div>
            </div>
          </div>

          {/* Tax Summary */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-1"><CardTitle className="text-sm">Tax Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-lg border border-border bg-muted/20 p-2 sm:p-3 text-center">
                  <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Last PAYE</div>
                  <div className="text-base sm:text-xl font-bold text-violet-300 leading-tight">{fmtCurrency(Number(lastEmp?.tax_paid || 0))}</div>
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-1 leading-tight">
                    {lastEmp ? fmtDate(lastEmp.pay_date) : "No payslip recorded"}
                    {lastEmp?.employer ? ` · ${lastEmp.employer}` : ""}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-2 sm:p-3 text-center">
                  <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Tax &amp; NI due</div>
                  <div className="text-base sm:text-xl font-bold text-amber-300 leading-tight">{fmtCurrency(totalTaxDue)}</div>
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-1 leading-tight">IT {fmtCurrency(incomeTaxDue)}</div>
                </div>
                <div className={`rounded-lg border p-2 sm:p-3 text-center ${balance >= 0 ? "border-rose-500/30 bg-rose-950/20" : "border-emerald-500/30 bg-emerald-950/20"}`}>
                  <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Difference</div>
                  <div className={`text-base sm:text-xl font-bold leading-tight ${balance >= 0 ? "text-rose-300" : "text-emerald-300"}`}>
                    {balance >= 0 ? fmtCurrency(balance) : fmtCurrency(Math.abs(balance))}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-1 leading-tight">
                    {balance >= 0 ? "Still owed to HMRC" : "Likely refund"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-1"><CardTitle className="text-sm">Monthly Trends</CardTitle></CardHeader>
            <CardContent>
              {monthlyData.some(d => d.income > 0 || d.expenses > 0) ? (
                <>
                  <ChartContainer config={{ income: { label: "Income", color: "hsl(160,60%,45%)" }, expenses: { label: "Expenses", color: "hsl(0,70%,55%)" } }} className="h-[200px] w-full">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `£${v}`} tick={{ fontSize: 10 }} width={50} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="income" fill="hsl(160,60%,45%)" radius={[4,4,0,0]} />
                      <Bar dataKey="expenses" fill="hsl(0,70%,55%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-1 text-[10px] text-muted-foreground">
                    {monthlyData.map(m => (
                      <div key={m.month} className={`rounded border border-border p-1 ${m.profit >= 0 ? "bg-emerald-950/20" : "bg-rose-950/20"}`}>
                        <div className="font-medium">{m.label}</div>
                        <div className="flex justify-between"><span className="text-emerald-300">{fmtCurrency(m.income)}</span><span className="text-rose-300">{fmtCurrency(m.expenses)}</span></div>
                        <div className={`font-mono font-medium ${m.profit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtCurrency(m.profit)}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground py-6 text-center">No data yet for monthly trends.</div>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1"><PieIcon className="h-4 w-4 text-amber-300" /> Spend by Category</CardTitle>
              <span className="text-[10px] text-muted-foreground">{expenses.length} item{expenses.length === 1 ? "" : "s"}</span>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No expenses yet.</div>
              ) : (
                <div className="space-y-2">
                  {categoryBreakdown.map(c => {
                    const pct = totalExpenses > 0 ? (c.total / totalExpenses) * 100 : 0;
                    return (
                      <div key={c.category}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate flex-1 min-w-0">{c.category}</span>
                          <span className="font-mono text-foreground shrink-0">{fmtCurrency(c.total)}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-10 text-right">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden mt-0.5">
                          <div className="h-full bg-amber-400/80" style={{ width: `${Math.max(2, pct)}%` }} />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {c.count} item{c.count === 1 ? "" : "s"}{c.vat > 0 ? ` · VAT ${fmtCurrency(c.vat)}` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPENSES */}
        <TabsContent value="expenses" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">{expenses.length} expense{expenses.length === 1 ? "" : "s"} · {fmtCurrency(totalExpenses)}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportCSV("expenses")}><Download className="h-4 w-4 mr-1" />CSV</Button>
              <Button size="sm" onClick={() => openExpense()}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </div>
          </div>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : expenses.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg text-center">No expenses recorded.</div>
          ) : (
            <div className="space-y-1">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{fmtCurrency(Number(e.amount))}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(e.expense_date)}</span>
                      {e.vendor && <span className="text-xs">· {e.vendor}</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{e.category}{e.description ? ` · ${e.description}` : ""}</div>
                  </div>
                  {e.receipt_path && (
                    <Button size="sm" variant="ghost" onClick={() => downloadReceipt(e)} title={e.receipt_name || "Receipt"}><FileText className="h-4 w-4" /></Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openExpense(e)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteExpense(e)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* RECEIPTS — all attachments */}
        <TabsContent value="receipts" className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs sm:text-sm text-muted-foreground">
              {receipts.length} attachment{receipts.length === 1 ? "" : "s"} · {fmtCurrency(receipts.reduce((s, e) => s + Number(e.amount || 0), 0))}
            </div>
            <Button size="sm" onClick={() => openExpense()}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
          {receipts.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg text-center">
              No receipts attached yet. Add an expense and upload a file to see it here.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {receipts.map(e => {
                const isImg = (e.receipt_mime || "").startsWith("image/");
                return (
                  <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
                    <div className="w-10 h-10 rounded bg-muted/30 flex items-center justify-center shrink-0">
                      {isImg ? <ImageIcon className="h-5 w-5 text-amber-300" /> : <FileText className="h-5 w-5 text-amber-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.receipt_name || "Receipt"}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {fmtCurrency(Number(e.amount))} · {fmtDate(e.expense_date)}{e.vendor ? ` · ${e.vendor}` : ""}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{e.category}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => downloadReceipt(e)} title="View"><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => openExpense(e)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* INCOME (auto from payments) */}
        <TabsContent value="income" className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs sm:text-sm text-muted-foreground">{payments.length} payment{payments.length === 1 ? "" : "s"} · {fmtCurrency(selfEmployedIncome)} paid</div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => exportCSV("income")}><Download className="h-4 w-4 mr-1" />CSV</Button>
              <Button size="sm" onClick={() => openPayment()}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">Auto-pulled from recorded appointment payments. You can also add, edit or delete entries here.</div>
          {payments.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg text-center">No payments in this tax year.</div>
          ) : (
            <div className="space-y-1">
              {payments.map(p => {
                const apt = apptMap[p.appointment_id];
                return (
                  <div key={p.id} className="flex items-center gap-1 p-2 rounded-lg border border-border bg-card">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{fmtCurrency(Number(p.amount))}</span>
                        <span className="text-[11px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-GB")}</span>
                        <Badge variant="outline" className="text-[10px]">{p.payment_method}</Badge>
                        {p.payment_status !== "paid" && <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/40">{p.payment_status}</Badge>}
                      </div>
                      <div className="text-[11px] text-foreground truncate mt-0.5">
                        {apt ? apt.client_name : <span className="text-muted-foreground italic">Patient unknown</span>}
                        {apt && <span className="text-muted-foreground"> · appt {fmtDate(apt.appointment_date)}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openPayment(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => deletePayment(p)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* EMPLOYMENT */}
        <TabsContent value="employment" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">{employment.length} entr{employment.length === 1 ? "y" : "ies"} · gross {fmtCurrency(employmentGross)}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportCSV("employment")}><Download className="h-4 w-4 mr-1" />CSV</Button>
              <Button size="sm" onClick={() => openEmployment()}><Plus className="h-4 w-4 mr-1" />Add payslip</Button>
            </div>
          </div>
          {lastEmp && (
            <div className="rounded-lg border border-violet-500/30 bg-violet-950/20 p-2 text-xs text-muted-foreground">
              Last entry: <span className="text-foreground font-medium">{lastEmp.employer || "Employer"}</span> · {fmtDate(lastEmp.pay_date)} · gross {fmtCurrency(Number(lastEmp.gross_pay))} · tax {fmtCurrency(Number(lastEmp.tax_paid))}
            </div>
          )}
          {employment.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg text-center">Add your payslips to update tax-paid running total.</div>
          ) : (
            <div className="space-y-1">
              {employment.map(e => (
                <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{fmtCurrency(Number(e.gross_pay))}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(e.pay_date)}</span>
                      {e.employer && <span className="text-xs">· {e.employer}</span>}
                      {e.period_label && <Badge variant="outline" className="text-[10px]">{e.period_label}</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Tax {fmtCurrency(Number(e.tax_paid))} · NI {fmtCurrency(Number(e.ni_paid))}{e.pension ? ` · Pension ${fmtCurrency(Number(e.pension))}` : ""}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEmployment(e)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteEmployment(e)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Expense dialog */}
      <Dialog open={expDialog} onOpenChange={setExpDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingExp ? "Edit expense" : "Add expense"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label>Date</Label>
                <Input type="date" value={expForm.expense_date} onChange={e => setExpForm({ ...expForm, expense_date: e.target.value })} />
              </div>
              <div>
                <Label>Amount (£)</Label>
                <Input type="number" inputMode="decimal" step="0.01" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Category (HMRC)</Label>
              <Select value={expForm.category} onValueChange={v => setExpForm({ ...expForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {(() => {
                const text = `${expForm.vendor} ${expForm.description}`.trim();
                const saved = suggestFromMappings(text);
                const guess = saved || matchCategory(text);
                if (!guess || guess === expForm.category) return null;
                return (
                  <button
                    type="button"
                    onClick={() => setExpForm({ ...expForm, category: guess })}
                    className="mt-1 text-[11px] text-amber-300 hover:text-amber-200 inline-flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" /> Suggested: {guess} {saved ? "(remembered)" : ""} — tap to apply
                  </button>
                );
              })()}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label>Vendor</Label>
                <Input value={expForm.vendor} onChange={e => setExpForm({ ...expForm, vendor: e.target.value })} placeholder="e.g. Tesco" />
              </div>
              <div>
                <Label>VAT (£)</Label>
                <Input type="number" inputMode="decimal" step="0.01" value={expForm.vat_amount} onChange={e => setExpForm({ ...expForm, vat_amount: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Payment method</Label>
              <Select value={expForm.payment_method} onValueChange={v => setExpForm({ ...expForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                  <SelectItem value="direct_debit">Direct debit</SelectItem>
                  <SelectItem value="personal">Personal funds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={expForm.notes} onChange={e => setExpForm({ ...expForm, notes: e.target.value })} />
            </div>
            {expForm.vendor.trim() && (
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox checked={rememberMapping} onCheckedChange={v => setRememberMapping(!!v)} className="mt-0.5" />
                <span>
                  Remember this category for <span className="text-foreground font-medium">{expForm.vendor.trim()}</span> — next time it'll be auto-selected.
                </span>
              </label>
            )}
            <div>
              <Label className="flex items-center gap-2">
                Receipt (any format)
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> auto-extracts merchant, date & total</span>
              </Label>
              <Input type="file" onChange={e => handleReceiptFile(e.target.files?.[0] || null)} disabled={ocrLoading} />
              {ocrLoading && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Reading receipt…</div>
              )}
              {!ocrLoading && ocrConfidence !== null && (
                <div className="text-[11px] text-emerald-300 mt-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Auto-filled (confidence {(ocrConfidence * 100).toFixed(0)}%) — please double-check</div>
              )}
              {editingExp?.receipt_name && !expFile && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <FileText className="h-3 w-3" /> Current: {editingExp.receipt_name}
                  <Button size="sm" variant="link" className="h-auto p-0" onClick={() => downloadReceipt(editingExp)}>view</Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpDialog(false)}>Cancel</Button>
            <Button onClick={saveExpense} disabled={expSaving}>{expSaving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employment dialog */}
      <Dialog open={empDialog} onOpenChange={setEmpDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEmp ? "Edit payslip" : "Add payslip"}</DialogTitle></DialogHeader>
          {!editingEmp && lastEmp && (
            <div className="rounded-md border border-amber-500/30 bg-amber-950/20 p-2 text-xs">
              Last: {fmtDate(lastEmp.pay_date)} · gross {fmtCurrency(Number(lastEmp.gross_pay))} · tax {fmtCurrency(Number(lastEmp.tax_paid))}. Running total this tax year: gross {fmtCurrency(employmentGross)}, tax {fmtCurrency(employmentTaxPaid)}.
            </div>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Pay date</Label>
                <Input type="date" value={empForm.pay_date} onChange={e => setEmpForm({ ...empForm, pay_date: e.target.value })} />
              </div>
              <div>
                <Label>Employer</Label>
                <Input value={empForm.employer} onChange={e => setEmpForm({ ...empForm, employer: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Period (optional)</Label>
              <Input value={empForm.period_label} onChange={e => setEmpForm({ ...empForm, period_label: e.target.value })} placeholder="e.g. Month 7 / Week 30" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Gross pay (£)</Label>
                <Input type="number" step="0.01" value={empForm.gross_pay} onChange={e => setEmpForm({ ...empForm, gross_pay: e.target.value })} />
              </div>
              <div>
                <Label>Tax paid (£)</Label>
                <Input type="number" step="0.01" value={empForm.tax_paid} onChange={e => setEmpForm({ ...empForm, tax_paid: e.target.value })} />
              </div>
              <div>
                <Label>NI paid (£)</Label>
                <Input type="number" step="0.01" value={empForm.ni_paid} onChange={e => setEmpForm({ ...empForm, ni_paid: e.target.value })} />
              </div>
              <div>
                <Label>Pension (£)</Label>
                <Input type="number" step="0.01" value={empForm.pension} onChange={e => setEmpForm({ ...empForm, pension: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={empForm.notes} onChange={e => setEmpForm({ ...empForm, notes: e.target.value })} />
            </div>
            <p className="text-[10px] text-muted-foreground">Tip: enter each payslip's figures (not cumulative) — the dashboard sums them automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDialog(false)}>Cancel</Button>
            <Button onClick={saveEmployment} disabled={empSaving}>{empSaving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment (income) dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPay ? "Edit payment" : "Add payment"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Patient appointment</Label>
              {payForm.appointment_id && apptMap[payForm.appointment_id] ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-2 text-sm">
                  <span className="truncate">
                    <span className="font-medium">{apptMap[payForm.appointment_id].client_name}</span>
                    <span className="text-muted-foreground"> · {fmtDate(apptMap[payForm.appointment_id].appointment_date)}</span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setPayForm({ ...payForm, appointment_id: "", appt_search: "" })}>Change</Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Search patient name…"
                    value={payForm.appt_search}
                    onChange={e => setPayForm({ ...payForm, appt_search: e.target.value })}
                  />
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border">
                    {apptSearchResults.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-2">No matches in this tax year.</div>
                    ) : apptSearchResults.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        className="w-full text-left p-2 hover:bg-muted/40 text-xs flex items-center justify-between gap-2"
                        onClick={() => setPayForm({ ...payForm, appointment_id: a.id, appt_search: a.client_name })}
                      >
                        <span className="font-medium truncate">{a.client_name}</span>
                        <span className="text-muted-foreground shrink-0">{fmtDate(a.appointment_date)} {a.appointment_time?.slice(0, 5)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Amount (£)</Label>
                <Input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
              </div>
              <div>
                <Label>Recorded date</Label>
                <Input type="date" value={payForm.created_at} disabled={!!editingPay} onChange={e => setPayForm({ ...payForm, created_at: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Method</Label>
                <Select value={payForm.payment_method} onValueChange={v => setPayForm({ ...payForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank transfer</SelectItem>
                    <SelectItem value="invoice_sent">Invoice sent</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={payForm.payment_status} onValueChange={v => setPayForm({ ...payForm, payment_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="invoice_sent">Invoice sent</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancel</Button>
            <Button onClick={savePayment} disabled={paySaving}>{paySaving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}