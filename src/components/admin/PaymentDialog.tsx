import React, { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { PoundSterling, CreditCard, Banknote, Building2, FileText, CircleDot, Send, Loader2, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: {
    id: string;
    client_name: string;
    client_email: string;
    client_phone: string | null;
    price: number | null;
    travel_fee: number | null;
    service_id: string | null;
  } | null;
  serviceName: string;
  onPaymentRecorded: () => void;
  onSkipPayment?: () => void;
  existingPayment?: {
    id: string;
    amount: number;
    payment_method: string;
    payment_status: string;
    notes: string | null;
  } | null;
}

const PAYMENT_METHODS = [
  { value: "card", label: "Card", icon: CreditCard },
  { value: "manual_card", label: "Manual Card Payment", icon: Smartphone },
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "cheque", label: "Cheque", icon: CircleDot },
  { value: "invoice_sent", label: "Invoice Sent", icon: FileText },
];

const PaymentDialog = ({ open, onOpenChange, appointment, serviceName, onPaymentRecorded, onSkipPayment, existingPayment }: PaymentDialogProps) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("card");
  const [status, setStatus] = useState<"paid" | "unpaid">("paid");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendBankDetails, setSendBankDetails] = useState(false);
  const [sendingBankDetails, setSendingBankDetails] = useState(false);

  useEffect(() => {
    if (open && appointment) {
      if (existingPayment) {
        setAmount(existingPayment.amount.toFixed(2));
        setMethod(existingPayment.payment_method);
        setStatus(existingPayment.payment_status as "paid" | "unpaid");
        setNotes(existingPayment.notes || "");
      } else {
        const total = (appointment.price || 0) + (appointment.travel_fee || 0);
        setAmount(total > 0 ? total.toFixed(2) : "");
        setMethod("card");
        setStatus("paid");
        setNotes("");
      }
      setSendBankDetails(false);
    }
  }, [open, appointment, existingPayment]);

  // When bank_transfer is selected, default to unpaid
  useEffect(() => {
    if (method === "bank_transfer" && !existingPayment) {
      setStatus("unpaid");
    }
  }, [method, existingPayment]);

  const sendBankDetailsToPatient = async () => {
    if (!appointment) return;
    setSendingBankDetails(true);
    const surname = appointment.client_name || "PATIENT";
    const amountStr = amount ? `£${parseFloat(amount).toFixed(2)}` : "the agreed amount";
    
    try {
      // Send email
      if (appointment.client_email) {
        await supabase.functions.invoke("send-form-email", {
          body: {
            to: appointment.client_email,
            subject: `Payment Details — ShawScope`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                <div style="background: #292524; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h2 style="color: #fff; margin: 0; font-size: 20px;">💳 Payment Details</h2>
                </div>
                <div style="background: #fff; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
                  <p style="margin: 0 0 16px; color: #333;">Hi ${appointment.client_name.split(" ")[0]},</p>
                  <p style="margin: 0 0 16px; color: #333;">Please find our bank details below for your payment of <strong>${amountStr}</strong>:</p>
                  <div style="background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 0 0 16px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr><td style="padding: 4px 0; color: #666; font-size: 14px;">Account Name</td><td style="padding: 4px 0; font-weight: bold; color: #333; text-align: right;">Matt Shaw</td></tr>
                      <tr><td style="padding: 4px 0; color: #666; font-size: 14px;">Account Type</td><td style="padding: 4px 0; font-weight: bold; color: #333; text-align: right;">Business</td></tr>
                      <tr><td style="padding: 4px 0; color: #666; font-size: 14px;">Sort Code</td><td style="padding: 4px 0; font-weight: bold; color: #333; text-align: right;">04-00-03</td></tr>
                      <tr><td style="padding: 4px 0; color: #666; font-size: 14px;">Account Number</td><td style="padding: 4px 0; font-weight: bold; color: #333; text-align: right;">99491218</td></tr>
                      <tr><td style="padding: 4px 0; color: #666; font-size: 14px;">Reference</td><td style="padding: 4px 0; font-weight: bold; color: #333; text-align: right;">${surname.toUpperCase()}</td></tr>
                      <tr style="border-top: 1px solid #e0e0e0;"><td style="padding: 8px 0 4px; color: #666; font-size: 14px;">Amount Due</td><td style="padding: 8px 0 4px; font-weight: bold; color: #16a34a; text-align: right; font-size: 18px;">${amountStr}</td></tr>
                    </table>
                  </div>
                   <p style="margin: 0 0 8px; color: #666; font-size: 13px;">⚠️ Please use <strong>${surname.toUpperCase()}</strong> as the payment reference so we can identify your transfer.</p>
                  <p style="margin: 0; color: #999; font-size: 12px;">Thank you for choosing ShawScope.</p>
                </div>
              </div>
            `,
          },
        });
      }

      // Send SMS
      if (appointment.client_phone) {
        await supabase.functions.invoke("send-sms-reminder", {
          body: {
            appointmentId: appointment.id,
            customMessage: `Hi ${appointment.client_name.split(" ")[0]}, here are our bank details for your payment of ${amountStr}:\n\nMatt Shaw (Business)\nSort Code: 04-00-03\nAcc No: 99491218\nRef: ${surname.toUpperCase()}\n\nPlease use your name as the reference. Thank you! — ShawScope`,
          },
        });
      }

      toast.success("Bank details sent to patient");
    } catch (err: any) {
      toast.error("Failed to send bank details: " + err.message);
    } finally {
      setSendingBankDetails(false);
    }
  };

  const handleSave = async () => {
    if (!appointment) return;
    setSaving(true);
    try {
      // Send bank details first if requested
      if (sendBankDetails && method === "bank_transfer") {
        await sendBankDetailsToPatient();
      }

      const paymentData = {
        appointment_id: appointment.id,
        amount: parseFloat(amount) || 0,
        payment_method: method,
        payment_status: status,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (existingPayment) {
        const { error } = await (supabase as any)
          .from("appointment_payments")
          .update(paymentData)
          .eq("id", existingPayment.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("appointment_payments")
          .upsert(paymentData, { onConflict: "appointment_id" });
        if (error) throw error;
      }

      toast.success(status === "paid" ? "Payment recorded" : "Marked as unpaid — added to pending");
      onPaymentRecorded();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to save payment: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!appointment) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif flex items-center gap-2">
            <PoundSterling className="h-5 w-5 text-emerald-400" />
            Record Payment
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1">
              <p><strong>{appointment.client_name}</strong> — {serviceName}</p>
              {appointment.price != null && (
                <p className="text-xs">
                  Service: £{Number(appointment.price).toFixed(2)}
                  {(appointment.travel_fee || 0) > 0 && ` + Travel: £${Number(appointment.travel_fee).toFixed(2)}`}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Amount (£)</Label>
            <div className="relative">
              <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 text-lg font-semibold"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Payment Method</Label>
            <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                <Label
                  key={value}
                  htmlFor={`pm-${value}`}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors text-sm ${
                    method === value
                      ? "border-secondary bg-secondary/10 text-foreground font-medium"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <RadioGroupItem value={value} id={`pm-${value}`} className="sr-only" />
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Bank Transfer: Send Details Option */}
          {method === "bank_transfer" && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 p-3 space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="send-bank-details"
                  checked={sendBankDetails}
                  onCheckedChange={(c) => setSendBankDetails(!!c)}
                />
                <Label htmlFor="send-bank-details" className="text-sm cursor-pointer text-foreground">
                  <Send className="h-3.5 w-3.5 inline mr-1.5" />
                  Send bank details to patient via email & SMS
                </Label>
              </div>
              {sendBankDetails && (
                <div className="text-xs text-muted-foreground ml-7 space-y-1">
                  <p className="font-medium text-blue-300">Details that will be sent:</p>
                   <div className="bg-blue-900/30 rounded p-2 text-blue-200/80 font-mono text-[11px]">
                     <p>Account: Matt Shaw (Business)</p>
                     <p>Sort Code: 04-00-03</p>
                     <p>Account No: 99491218</p>
                     <p>Reference: {appointment.client_name.toUpperCase() || "PATIENT NAME"}</p>
                     <p>Amount Due: £{amount ? parseFloat(amount).toFixed(2) : "0.00"}</p>
                   </div>
                  <p className="text-blue-300/60">Will be sent to {appointment.client_email}{appointment.client_phone ? ` & ${appointment.client_phone}` : ""}</p>
                </div>
              )}
            </div>
          )}

          {/* Payment Status */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Payment Status</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("paid")}
                className={`rounded-lg border p-2.5 text-sm font-medium transition-colors ${
                  status === "paid"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                ✅ Paid
              </button>
              <button
                type="button"
                onClick={() => setStatus("unpaid")}
                className={`rounded-lg border p-2.5 text-sm font-medium transition-colors ${
                  status === "unpaid"
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                ⏳ Unpaid
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Partial payment, invoice #123..."
              className="text-sm"
            />
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {!existingPayment && onSkipPayment && (
            <button
              type="button"
              onClick={() => { onSkipPayment(); onOpenChange(false); }}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 mr-auto"
            >
              Skip — complete without payment
            </button>
          )}
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleSave();
            }}
            disabled={saving || sendingBankDetails || !amount}
          >
            {saving || sendingBankDetails ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving...</>
            ) : status === "paid" ? "Mark as Paid" : "Save as Unpaid"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PaymentDialog;
