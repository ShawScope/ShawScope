import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/SiteLayout";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

const CancelAppointmentPage = () => {
  const { token } = useParams<{ token: string }>();
  const [reason, setReason] = useState("");
  const [phase, setPhase] = useState<"idle" | "confirming">("idle");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCancel = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.functions.invoke("cancel-appointment", {
        body: { token, reason: reason.trim() },
      });

      if (error || !data?.success) {
        setErrorMsg(data?.error || error?.message || "Something went wrong");
        setResult("error");
        setLoading(false);
        return;
      }

      setResult("success");
    } catch (e: any) {
      setErrorMsg(e.message || "Something went wrong");
      setResult("error");
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <PageMeta title="Cancel Appointment — ShawScope" description="Cancel your appointment" />
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        {result === "success" ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="font-serif text-3xl">Appointment Cancelled</h1>
            <p className="text-muted-foreground">
              Your appointment has been successfully cancelled. We've sent you a confirmation email.
            </p>
            <p className="text-sm text-muted-foreground">
              If you'd like to rebook, please visit our{" "}
              <a href="/book" className="text-primary underline">booking page</a>.
            </p>
          </div>
        ) : result === "error" ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="font-serif text-3xl">Unable to Cancel</h1>
            <p className="text-muted-foreground">{errorMsg}</p>
            <Button variant="outline" onClick={() => { setResult(null); setPhase("idle"); }}>Try Again</Button>
          </div>
        ) : phase === "confirming" ? (
          <div className="space-y-6 text-left">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/30">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <h1 className="font-serif text-2xl">Are you sure?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This action cannot be undone. Please let us know why you'd like to cancel.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Reason for cancellation</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please let us know why you're cancelling (optional)"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPhase("idle")}
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</>
                ) : (
                  "Confirm Cancellation"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/30">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="font-serif text-2xl">Cancel Your Appointment</h1>
            <p className="text-muted-foreground">
              If you no longer need your appointment, you can cancel it here. You'll receive a confirmation email once cancelled.
            </p>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setPhase("confirming")}
            >
              I'd Like to Cancel
            </Button>
          </div>
        )}
      </div>
    </SiteLayout>
  );
};

export default CancelAppointmentPage;
