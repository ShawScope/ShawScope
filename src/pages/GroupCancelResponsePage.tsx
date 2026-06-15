import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/SiteLayout";
import PageMeta from "@/components/PageMeta";
import AddressPicker from "@/components/AddressPicker";
import { CheckCircle, XCircle, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const GroupCancelResponsePage = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const action = searchParams.get("action") as "keep" | "cancel" | null;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"kept" | "cancelled" | "error" | "confirm_address" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Address state for "keep" flow
  const [currentAddress, setCurrentAddress] = useState("");
  const [currentPostcode, setCurrentPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [appointmentInfo, setAppointmentInfo] = useState<{
    clientName: string;
    serviceName: string;
    date: string;
    time: string;
  } | null>(null);

  useEffect(() => {
    if (!token || !action) {
      setErrorMsg("Invalid link. Please use the link from your email.");
      setResult("error");
      setLoading(false);
      return;
    }

    if (action === "cancel") {
      // Cancel submits immediately
      submitAction("cancel");
    } else {
      // Keep: fetch appointment details to show address confirmation
      fetchAppointmentDetails();
    }
  }, [token, action]);

  const fetchAppointmentDetails = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("group-cancel-response", {
        body: { token, action: "get_details" },
      });
      if (error) {
        // Try to extract the actual error message from the response
        let msg = "Could not load appointment details";
        try {
          if (error.context && typeof error.context.json === "function") {
            const body = await error.context.json();
            msg = body?.error || msg;
          } else {
            msg = error.message || msg;
          }
        } catch (_) {
          msg = error.message || msg;
        }
        setErrorMsg(msg);
        setResult("error");
      } else if (!data?.appointment) {
        setErrorMsg(data?.error || "Could not load appointment details");
        setResult("error");
      } else {
        const apt = data.appointment;
        setCurrentAddress(apt.address || "");
        setCurrentPostcode(apt.postcode || "");
        setAddress(apt.address || "");
        setPostcode(apt.postcode || "");
        setLatitude(apt.latitude || null);
        setLongitude(apt.longitude || null);
        setAppointmentInfo({
          clientName: apt.client_name,
          serviceName: apt.service_name || "Appointment",
          date: apt.appointment_date,
          time: apt.appointment_time?.slice(0, 5),
        });
        setResult("confirm_address");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Something went wrong");
      setResult("error");
    } finally {
      setLoading(false);
    }
  };

  const submitAction = async (submitAction: "keep" | "cancel") => {
    setSubmitting(true);
    try {
      const body: any = { token, action: submitAction };
      if (submitAction === "keep") {
        body.address = address.trim();
        body.postcode = postcode.trim().toUpperCase();
        body.latitude = latitude;
        body.longitude = longitude;
        body.address_changed = address.trim() !== currentAddress.trim() || postcode.trim().toUpperCase() !== currentPostcode.trim().toUpperCase();
      }

      const { data, error } = await supabase.functions.invoke("group-cancel-response", {
        body,
      });

      if (error) {
        let msg = "Something went wrong";
        try {
          if (error.context && typeof error.context.json === "function") {
            const errBody = await error.context.json();
            msg = errBody?.error || msg;
          } else {
            msg = error.message || msg;
          }
        } catch (_) {
          msg = error.message || msg;
        }
        setErrorMsg(msg);
        setResult("error");
      } else if (!data?.success) {
        setErrorMsg(data?.error || "Something went wrong");
        setResult("error");
      } else {
        setResult(data.action === "kept" ? "kept" : "cancelled");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Something went wrong");
      setResult("error");
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  const handleKeepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !postcode.trim()) return;
    submitAction("keep");
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <SiteLayout>
      <PageMeta title="Group Booking Update — ShawScope" description="Respond to a group booking change" />
      <div className="mx-auto max-w-lg px-4 py-16">
        {loading ? (
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
            <h1 className="font-serif text-2xl">Processing your response...</h1>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </div>
        ) : result === "confirm_address" && appointmentInfo ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
              <h1 className="font-serif text-3xl">Keep Your Appointment</h1>
              <p className="text-muted-foreground">
                Great, {appointmentInfo.clientName}! Please confirm your address details below.
              </p>
            </div>

            {/* Appointment summary */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Your Appointment</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Service</span>
                  <p className="font-medium">{appointmentInfo.serviceName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">{formatDate(appointmentInfo.date)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time</span>
                  <p className="font-medium">{appointmentInfo.time}</p>
                </div>
              </div>
            </div>

            {/* Address confirmation form */}
            <form onSubmit={handleKeepSubmit} className="space-y-5">
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Confirm Your Address</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Please confirm the address below is correct, or update it if needed. This is where Matt will visit you.
                </p>

                <AddressPicker
                  value={address}
                  onChange={setAddress}
                  onLocationChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                  onPostcodeChange={setPostcode}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1"
                  size="lg"
                  disabled={submitting || !address.trim() || !postcode.trim()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    "✓ Confirm & Keep Appointment"
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Changed your mind?{" "}
                <button
                  type="button"
                  className="text-destructive underline"
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel your appointment?")) {
                      submitAction("cancel");
                    }
                  }}
                  disabled={submitting}
                >
                  Cancel my appointment instead
                </button>
              </p>
            </form>
          </div>
        ) : result === "kept" ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="font-serif text-3xl">Appointment Confirmed</h1>
            <p className="text-muted-foreground">
              Great news! Your appointment has been kept and converted to an individual booking. We've sent you an updated confirmation email with the details.
            </p>
          </div>
        ) : result === "cancelled" ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="font-serif text-3xl">Appointment Cancelled</h1>
            <p className="text-muted-foreground">
              Your appointment has been cancelled. We've sent you a confirmation email.
            </p>
            <p className="text-sm text-muted-foreground">
              If you'd like to rebook, please visit our{" "}
              <a href="/book" className="text-primary underline">booking page</a>.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="font-serif text-3xl">Something Went Wrong</h1>
            <p className="text-muted-foreground">{errorMsg}</p>
            <p className="text-sm text-muted-foreground">
              Please contact us at{" "}
              <a href="tel:01305340194" className="text-primary underline">01305 340 194</a>{" "}
              or{" "}
              <a href="mailto:matt@shawscope.co.uk" className="text-primary underline">matt@shawscope.co.uk</a>.
            </p>
          </div>
        )}
      </div>
    </SiteLayout>
  );
};

export default GroupCancelResponsePage;
