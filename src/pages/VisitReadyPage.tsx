import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, MapPin, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function VisitReadyPage() {
  const { token } = useParams<{ token: string }>();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [readyTime, setReadyTime] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_appointment_by_token", { p_token: token });
      if (error || !data || data.length === 0) {
        setError("Appointment not found or link has expired.");
        setLoading(false);
        return;
      }
      const apt: any = data[0];
      // Also fetch service name
      if (apt.service_id) {
        const { data: svc } = await supabase.from("services").select("name").eq("id", apt.service_id).maybeSingle();
        (apt as any).service_name = svc?.name || "Your appointment";
      }
      setAppointment(apt);
      setLoading(false);
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!readyTime || !appointment) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("set_ready_from_time", { 
      p_token: token!, 
      p_ready_time: readyTime + ":00" 
    });

    if (error) {
      setError("Failed to update. Please try again.");
      setSubmitting(false);
      return;
    }
    // Notify practitioner via SMS
    try {
      let notifyOk = false;
      let lastError: unknown = null;

      for (let i = 0; i < 2 && !notifyOk; i++) {
        const { data: notifyData, error: notifyError } = await supabase.functions.invoke("send-notification", {
          body: {
            type: "ready_from_update",
            appointmentId: appointment.id,
            accessToken: token,
            clientName: appointment.client_name,
          },
        });

        notifyOk = !notifyError && !!notifyData?.sms;
        lastError = notifyError;
      }

      if (!notifyOk) {
        console.error("ready_from_update notification failed", lastError);
      }
    } catch {
      console.error("ready_from_update notification error");
    }

    // Send confirmation SMS to the patient
    if (appointment.client_phone) {
      try {
        await supabase.functions.invoke("send-notification", {
          body: {
            type: "ready_early_confirmation",
            appointmentId: appointment.id,
            accessToken: token,
            clientName: appointment.client_name,
            readyTime,
          },
        });
      } catch {
        console.error("Patient confirmation SMS failed");
      }
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  // Generate time options from 7am to appointment time
  const generateTimeOptions = () => {
    const options: string[] = [];
    const startHour = 7;
    const endHour = appointment ? parseInt(appointment.appointment_time?.slice(0, 2) || "17") : 17;
    for (let h = startHour; h <= endHour; h++) {
      for (const m of ["00", "15", "30", "45"]) {
        const time = `${String(h).padStart(2, "0")}:${m}`;
        if (appointment && time >= appointment.appointment_time?.slice(0, 5)) break;
        options.push(time);
      }
    }
    return options;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <Card className="max-w-md w-full border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="text-xl font-serif font-bold text-green-800">Thank You!</h2>
            <p className="text-green-700">
              We've noted that you'll be ready from <strong>{readyTime}</strong>. 
              If we are able, we will try our best to visit a little earlier if we are ahead of schedule.
            </p>
            <p className="text-sm text-green-600">
              You can change at any time, so please let us know if plans change.
            </p>
            <a href={`/visit-ready/${token}`} onClick={(e) => { e.preventDefault(); setSubmitted(false); setReadyTime(""); }} className="inline-block text-sm text-green-700 underline cursor-pointer">
              Change my available time
            </a>
            <p className="text-xs text-green-500">You can close this page now.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center bg-stone-800 text-white rounded-t-lg">
          <p className="text-xs tracking-[3px] uppercase opacity-70 mb-1">ShawScope</p>
          <CardTitle className="text-lg font-serif">I'm Ready Early</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Hi <strong className="text-foreground">{appointment?.client_name}</strong></p>
            <p className="text-sm text-muted-foreground">
              Your {appointment?.service_name || "appointment"} is booked for today at{" "}
              <strong className="text-foreground">{appointment?.appointment_time?.slice(0, 5)}</strong>
            </p>
          </div>

          <div className="bg-stone-100 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-stone-700 flex items-center gap-2">
              <Clock className="h-4 w-4" /> What time will you be home and ready?
            </p>
            <Select value={readyTime} onValueChange={setReadyTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select a time..." />
              </SelectTrigger>
              <SelectContent>
                {generateTimeOptions().map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              If you're ready earlier than your appointment time, we may be able to visit you sooner.
            </p>
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button 
            onClick={handleSubmit} 
            disabled={!readyTime || submitting}
            className="w-full bg-stone-800 hover:bg-stone-700 text-white"
            size="lg"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Confirm I'm Ready
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
