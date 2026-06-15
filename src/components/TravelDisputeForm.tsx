import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface TravelDisputeFormProps {
  postcode: string;
  calculatedDistance: number | null;
  calculatedFee: number;
}

const DISPUTE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-dispute`;

const TravelDisputeForm = ({ postcode, calculatedDistance, calculatedFee }: TravelDisputeFormProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !reason.trim()) {
      toast.error("Please fill in your name, email and reason");
      return;
    }

    setSending(true);
    try {
      const resp = await fetch(DISPUTE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          postcode,
          calculatedDistance,
          calculatedFee,
          reason: reason.trim(),
        }),
      });

      if (resp.ok) {
        setSent(true);
        toast.success("Your query has been sent — we'll be in touch");
      } else {
        const err = await resp.json().catch(() => ({ error: "Something went wrong" }));
        toast.error(err.error || "Failed to send");
      }
    } catch {
      toast.error("Failed to send — please try again");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400"
      >
        <CheckCircle className="h-4 w-4" />
        <span>Thanks! We'll review this and get back to you.</span>
      </motion.div>
    );
  }

  return (
    <div className="mt-3">
      <AnimatePresence>
        {!open ? (
          <motion.button
            key="trigger"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Think this is wrong? Let us know
          </motion.button>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="space-y-3 rounded-lg border bg-card p-4 mt-2 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Query this calculation</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Let us know why you think the travel fee may be incorrect and we'll review it.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="dispute-name" className="text-xs">Name *</Label>
                <Input
                  id="dispute-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={200}
                  required
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dispute-email" className="text-xs">Email *</Label>
                <Input
                  id="dispute-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  maxLength={320}
                  required
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dispute-phone" className="text-xs">Phone</Label>
                <Input
                  id="dispute-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number"
                  maxLength={30}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dispute-address" className="text-xs">Full address</Label>
                <Input
                  id="dispute-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your full address"
                  maxLength={500}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="dispute-reason" className="text-xs">Why do you think this is wrong? *</Label>
              <Textarea
                id="dispute-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. I'm closer than the calculation shows, my postcode covers a wide area..."
                maxLength={2000}
                rows={3}
                required
                className="text-sm"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={sending} className="text-xs">
                {sending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Send Query
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TravelDisputeForm;
