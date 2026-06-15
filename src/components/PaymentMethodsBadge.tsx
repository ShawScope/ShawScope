import { Building2, PoundSterling, CreditCard, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface PaymentMethodsBadgeProps {
  className?: string;
  compact?: boolean;
  showExample?: boolean;
  exampleAmount?: number;
}

const METHODS = [
  { icon: PoundSterling, label: "Cash", shortLabel: "Cash", feeLabel: "No fee", feeRate: 0 },
  { icon: Building2, label: "Bank Transfer", shortLabel: "Transfer", feeLabel: "No fee", feeRate: 0 },
  { icon: CreditCard, label: "Card", shortLabel: "Card", feeLabel: "1.69% fee", feeRate: 0.0169 },
  { icon: FileText, label: "Online Invoice", shortLabel: "Invoice", feeLabel: "2.5% fee", feeRate: 0.025 },
];

function calcTotal(base: number, rate: number) {
  return (base + base * rate).toFixed(2);
}

const PaymentMethodsBadge = ({ className = "", compact = false, showExample = true, exampleAmount = 60 }: PaymentMethodsBadgeProps) => {
  if (compact) {
    return (
      <div className={`rounded-xl bg-card border border-border px-4 py-4 ${className}`}>
        <p className="text-center text-xs font-serif font-semibold text-foreground mb-3">We Accept</p>
        <div className="grid grid-cols-4 gap-3 text-center">
          {METHODS.map(({ icon: Icon, shortLabel, feeLabel, feeRate }) => {
            const hasFee = feeRate > 0;
            return (
              <div key={shortLabel} className="flex flex-col items-center gap-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  hasFee ? "bg-muted" : "bg-secondary/15"
                }`}>
                  <Icon className={`h-4 w-4 ${hasFee ? "text-muted-foreground" : "text-secondary"}`} />
                </div>
                <span className="text-[11px] font-medium text-foreground">{shortLabel}</span>
                <span className={`text-[9px] font-medium ${hasFee ? "text-muted-foreground" : "text-secondary/80"}`}>
                  {feeLabel}
                </span>
              </div>
            );
          })}
        </div>
        {showExample && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground text-center mb-1.5">Example for a £{exampleAmount} appointment:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] max-w-[200px] mx-auto">
              {METHODS.map(m => (
                <div key={m.shortLabel} className="flex justify-between">
                  <span className="text-muted-foreground">{m.shortLabel}:</span>
                  <span className="font-medium text-foreground">£{calcTotal(exampleAmount, m.feeRate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border-2 border-secondary/20 bg-secondary/5 p-5 ${className}`}
    >
      <p className="text-center text-sm font-serif font-semibold mb-4">Accepted Payment Methods</p>
      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        {METHODS.map(({ icon: Icon, label, feeLabel, feeRate }) => {
          const hasFee = feeRate > 0;
          return (
            <div
              key={label}
              className={`relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
                hasFee
                  ? "border-muted-foreground/20 bg-muted/30"
                  : "border-secondary/30 bg-secondary/10"
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                hasFee ? "bg-muted-foreground/10" : "bg-secondary/20"
              }`}>
                <Icon className={`h-4 w-4 ${hasFee ? "text-muted-foreground" : "text-secondary"}`} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-medium text-foreground block leading-tight">{label}</span>
                <span className={`text-[10px] leading-tight ${hasFee ? "text-muted-foreground" : "text-secondary/80"}`}>
                  {feeLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {showExample && (
        <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground text-center mb-2 font-medium">Example for a £{exampleAmount} appointment:</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] max-w-[240px] mx-auto">
            {METHODS.map(m => (
              <div key={m.label} className="flex justify-between">
                <span className="text-muted-foreground">{m.label === "Online Invoice" ? "Invoice" : m.label}:</span>
                <span className="font-semibold text-foreground">£{calcTotal(exampleAmount, m.feeRate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-center text-[11px] text-muted-foreground mt-4">
        We prefer Cash or Bank Transfer — details provided after your appointment.
      </p>
    </motion.div>
  );
};

export default PaymentMethodsBadge;
