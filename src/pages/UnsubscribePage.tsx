import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, Heart } from "lucide-react";
import PageMeta from "@/components/PageMeta";

const REASONS = [
  "I receive too many emails/texts",
  "The content isn't relevant to me",
  "I no longer use ShawScope services",
  "I never signed up for marketing",
  "Other",
];

const UnsubscribePage = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) return;
    setSubmitting(true);
    try {
      // Log the unsubscribe AND flip the patient's marketing flags in one go.
      // (Direct UPDATE on `patients` from the public/anon client is blocked by
      // admin-only RLS, which previously caused people to keep receiving emails
      // and have to unsubscribe again. The RPC runs as SECURITY DEFINER.)
      await supabase.rpc("process_marketing_unsubscribe", {
        p_email: email || null,
        p_phone: phone || null,
        p_reason: reason || null,
      });

      setDone(true);
    } catch {
      setDone(true); // Still show success to prevent info leakage
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <PageMeta title="Unsubscribed — ShawScope" description="You have been unsubscribed from ShawScope marketing." />
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground">You're Unsubscribed</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You've been successfully removed from our marketing list. You won't receive any more promotional emails or texts from us.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground leading-relaxed">
              <Heart className="h-4 w-4 inline-block mr-1 text-rose-400" />
              Thank you for being a valued patient. As a one-man band, I truly appreciate every person I get to help. I hope you were happy with the service and I'd love to see you again in the future if you ever need us.
              <br /><br />
              — Matt Shaw, ShawScope
            </div>
            <a href="/" className="text-sm text-primary hover:underline inline-block mt-2">
              Return to ShawScope website →
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <PageMeta title="Unsubscribe — ShawScope" description="Unsubscribe from ShawScope marketing communications." />
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-serif text-2xl font-bold text-foreground">Unsubscribe</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We're sorry to see you go. As a small, one-person practice, I try my very best not to fill your inbox — but I completely understand if you'd prefer not to receive marketing messages.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="unsub-email">Email Address</Label>
              <Input
                id="unsub-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unsub-phone">Mobile Number</Label>
              <Input
                id="unsub-phone"
                type="tel"
                placeholder="07xxx xxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Enter whichever contact method you'd like to unsubscribe.</p>
            </div>

            <div className="space-y-3">
              <Label>Reason for unsubscribing</Label>
              <RadioGroup value={reason} onValueChange={setReason}>
                {REASONS.map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <RadioGroupItem value={r} id={`reason-${r}`} />
                    <Label htmlFor={`reason-${r}`} className="text-sm font-normal cursor-pointer">{r}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Button
              type="submit"
              disabled={(!email && !phone) || !reason || submitting}
              className="w-full"
              variant="destructive"
            >
              {submitting ? "Processing..." : "Unsubscribe"}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              This will remove you from all promotional emails and SMS. You'll still receive appointment-related communications.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnsubscribePage;
