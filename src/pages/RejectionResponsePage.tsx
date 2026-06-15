import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, CalendarDays, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import SiteLayout from "@/components/SiteLayout";

const RejectionResponsePage = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const action = searchParams.get("action"); // "accept" or "reject"

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [result, setResult] = useState<"accepted" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(action === "reject");

  useEffect(() => {
    if (!token) return;
    const fetchAppointment = async () => {
      const { data, error: err } = await supabase.rpc("get_appointment_by_token", { p_token: token });
      if (err || !data || data.length === 0) {
        setError("We couldn't find this appointment. The link may have expired.");
      } else {
        setAppointment(data[0]);
        // Auto-accept if action=accept
        if (action === "accept") {
          handleAccept();
        }
      }
      setLoading(false);
    };
    fetchAppointment();
  }, [token]);

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("rejection-response", {
        body: { token, action: "accept" },
      });
      if (err) throw new Error("Failed to confirm");
      setResult("accepted");
    } catch {
      setError("Something went wrong. Please try again or contact us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setSubmitting(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("rejection-response", {
        body: { token, action: "reject", reason: rejectReason.trim() },
      });
      if (err) throw new Error("Failed to submit");
      setResult("rejected");
    } catch {
      setError("Something went wrong. Please try again or contact us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (error) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-muted-foreground">{error}</p>
              <p className="text-sm text-muted-foreground">
                Please contact us at <a href="mailto:matt@shawscope.co.uk" className="text-primary underline">matt@shawscope.co.uk</a> or call <a href="tel:01305340194" className="text-primary underline">01305 340 194</a>.
              </p>
            </CardContent>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  if (result === "accepted") {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-success mx-auto" />
              <h2 className="text-xl font-semibold font-serif">You're all booked in!</h2>
              <p className="text-muted-foreground">
                Your appointment has been confirmed. We'll send you a confirmation email shortly.
              </p>
              <p className="text-sm text-muted-foreground">
                If you need to make any changes, please contact us at{" "}
                <a href="mailto:matt@shawscope.co.uk" className="text-primary underline">matt@shawscope.co.uk</a>.
              </p>
            </CardContent>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  if (result === "rejected") {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold font-serif">Thanks for letting us know</h2>
              <p className="text-muted-foreground">
                We've passed your feedback on to Matt, who will be in touch to find a time that works better for you.
              </p>
              <p className="text-sm text-muted-foreground">
                You can also reach us at{" "}
                <a href="mailto:matt@shawscope.co.uk" className="text-primary underline">matt@shawscope.co.uk</a> or call{" "}
                <a href="tel:01305340194" className="text-primary underline">01305 340 194</a>.
              </p>
            </CardContent>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  // Main decision UI
  return (
    <SiteLayout>
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-xl">Alternative Appointment Offered</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground text-center">
              Hi <strong>{appointment?.client_name}</strong>, we're sorry we couldn't accommodate your original appointment.
              We'd love to offer you an alternative — would this work for you?
            </p>

            {!showRejectForm ? (
              <>
                <div className="flex gap-3">
                  <Button
                    onClick={handleAccept}
                    disabled={submitting}
                    className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                    size="lg"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                    Yes, book me in!
                  </Button>
                  <Button
                    onClick={() => setShowRejectForm(true)}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                    disabled={submitting}
                  >
                    <XCircle className="mr-2 h-5 w-5" />
                    Doesn't work for me
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>We're sorry to hear that! Could you let us know why so we can help find a better time?</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. I'm not free on that day, I'd prefer a morning slot..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleReject}
                    disabled={submitting || !rejectReason.trim()}
                    variant="destructive"
                    className="flex-1"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send feedback
                  </Button>
                  <Button
                    onClick={() => setShowRejectForm(false)}
                    variant="ghost"
                    disabled={submitting}
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
};

export default RejectionResponsePage;
