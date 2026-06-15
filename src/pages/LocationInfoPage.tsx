import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, Car, Cat, AlertTriangle, Phone, Mail, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";

interface AppointmentInfo {
  client_name: string;
  appointment_date: string;
  appointment_time: string;
  service_name?: string;
}

const LocationInfoPage = () => {
  const { token } = useParams<{ token: string }>();
  const [apt, setApt] = useState<AppointmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase.rpc("get_appointment_by_token", { p_token: token });
      if (!data || data.length === 0) {
        setError(true);
        setLoading(false);
        return;
      }
      const a = data[0];
      let serviceName = "Your appointment";
      if (a.service_id) {
        const { data: svc } = await supabase
          .from("services")
          .select("name")
          .eq("id", a.service_id)
          .maybeSingle();
        if (svc?.name) serviceName = svc.name;
      }
      const parts = a.appointment_date?.split("-");
      const dateStr = parts?.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : a.appointment_date;
      setApt({
        client_name: a.client_name,
        appointment_date: dateStr,
        appointment_time: a.appointment_time?.slice(0, 5) || "",
        service_name: serviceName,
      });
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !apt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">This link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstName = apt.client_name.split(" ")[0];

  return (
    <>
      <PageMeta title="Your Appointment Location — ShawScope" description="Location details for your ShawScope appointment" />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-[#0E1420] text-white py-8 px-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-2">
            <span className="text-2xl font-light tracking-[4px]">SHAW</span>
            <span className="text-2xl font-light tracking-[4px] text-[#D4912A]">SCOPE</span>
          </div>
          <p className="text-xs text-gray-400 tracking-[2px] uppercase">Your Appointment Location</p>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Appointment summary */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Hi {firstName} 👋</h2>
              <p className="text-muted-foreground mb-4">Here are the details for your visit to our location.</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-muted-foreground text-xs mb-1">📅 Date</p>
                  <p className="font-semibold">{apt.appointment_date}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-muted-foreground text-xs mb-1">🕐 Time</p>
                  <p className="font-semibold">{apt.appointment_time}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-muted-foreground text-xs mb-1">🩺 Service</p>
                  <p className="font-semibold text-xs">{apt.service_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What to expect */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-3">What to Expect</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You'll be welcomed into a quiet, comfortable space within my home. While this is not a clinic setting, the environment is clean, private, and set up to ensure your treatment is carried out professionally and safely. Please feel welcome to bring a friend or family member with you.
              </p>
            </CardContent>
          </Card>

          {/* Address & Map */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#D4912A]" />
                Address & Directions
              </h3>
              <div className="bg-[#0E1420] text-white rounded-lg p-5 mb-4">
                <p className="font-semibold text-lg">22 St Martins Close</p>
                <p>Broadmayne</p>
                <p>Dorchester</p>
                <p className="font-semibold">DT2 8DG</p>
                <a
                  href="https://what3words.com/pizzeria.fuel.grit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D4912A] text-sm mt-2 inline-block hover:underline"
                >
                  📌 What3Words: ///pizzeria.fuel.grit
                </a>
              </div>

              <div className="flex gap-2 mb-4">
                <Button asChild className="flex-1 bg-[#D4912A] hover:bg-[#c0832a] text-white">
                  <a href="https://maps.google.com/?q=22+St+Martins+Close,+Broadmayne,+DT2+8DG" target="_blank" rel="noopener noreferrer">
                    <Navigation className="h-4 w-4 mr-2" />
                    Open in Google Maps
                  </a>
                </Button>
              </div>

              {/* Google Maps embed */}
              <div className="rounded-lg overflow-hidden border mb-4">
                <iframe
                  src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=22+St+Martins+Close,+Broadmayne,+DT2+8DG&maptype=satellite&zoom=17"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Location map"
                />
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Car className="h-5 w-5 text-[#D4912A]" />
                Finding Us & Parking
              </h3>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                We're directly opposite St Martins Church on the main road through the village, behind the old wall and railing. Parking is available on the church lay-by or Chalky Road.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <img src="/images/location-street.jpg" alt="Street view with parking and house markers" className="rounded-lg w-full h-48 object-cover" />
                <img src="/images/location-front.jpg" alt="Front door of 22 St Martins Close" className="rounded-lg w-full h-48 object-cover" />
              </div>
            </CardContent>
          </Card>

          {/* Inside the home */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                🏡 Inside Our Home
              </h3>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                A clean, comfortable, and professional setting for your appointment.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <img src="/images/clinic-setup.jpg" alt="Treatment area with professional ear care equipment" className="rounded-lg w-full h-48 object-cover" />
                <img src="/images/clinic-lounge.jpg" alt="Comfortable lounge area" className="rounded-lg w-full h-48 object-cover" />
              </div>
            </CardContent>
          </Card>

          {/* Important notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">Please Note</p>
                    <ul className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-1 list-disc list-inside">
                      <li>Steps leading up to the property</li>
                      <li>Arrive promptly — no waiting room, please no more than 5 mins early</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <Cat className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-blue-800 dark:text-blue-200">Pets & Allergies</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      We have two friendly cats. If you have allergies, we recommend booking a home visit instead.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact */}
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">Questions about the setting, parking, or accessibility?</p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" size="sm" asChild>
                  <a href="tel:01305340194"><Phone className="h-4 w-4 mr-1" /> 01305 340 194</a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="mailto:matt@shawscope.co.uk"><Mail className="h-4 w-4 mr-1" /> Email</a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-6">Thank you — Matt, ShawScope</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default LocationInfoPage;
