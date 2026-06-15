import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    google: any;
  }
}

interface AddressPickerProps {
  value: string;
  onChange: (address: string) => void;
  onLocationChange?: (lat: number, lng: number) => void;
  onPostcodeChange?: (postcode: string) => void;
}

const AddressPicker = ({ value, onChange, onLocationChange, onPostcodeChange }: AddressPickerProps) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapVisible, setMapVisible] = useState(false);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [postcode, setPostcode] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const scriptLoaded = useRef(false);

  // Fetch API key
  useEffect(() => {
    supabase.functions.invoke("google-maps-key").then(({ data }) => {
      if (data?.apiKey) setApiKey(data.apiKey);
      setLoading(false);
    });
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey || scriptLoaded.current) return;
    if (window.google?.maps) {
      scriptLoaded.current = true;
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
    };
    document.head.appendChild(script);
  }, [apiKey]);

  // Geocode postcode and show on map
  const geocodePostcode = useCallback(async (pc: string) => {
    if (!window.google?.maps || !pc.trim()) return;

    setGeocoding(true);
    const geocoder = new window.google.maps.Geocoder();
    try {
      const result = await new Promise<any>((resolve, reject) => {
        geocoder.geocode(
          { address: pc.trim(), componentRestrictions: { country: "gb" } },
          (results: any, status: any) => {
            if (status === "OK" && results?.[0]) resolve(results[0]);
            else reject(status);
          }
        );
      });

      const pos = {
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
      };
      setMarkerPos(pos);
      setMapVisible(true);
      onLocationChange?.(pos.lat, pos.lng);

      if (googleMapRef.current) {
        googleMapRef.current.panTo(pos);
        googleMapRef.current.setZoom(15);
        if (markerRef.current) markerRef.current.setPosition(pos);
      }
    } catch {
      // Geocoding failed — don't block
    } finally {
      setGeocoding(false);
    }
  }, [onLocationChange]);

  // Trigger geocode when postcode looks complete (UK pattern)
  const handlePostcodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setPostcode(upper);
    onPostcodeChange?.(upper);

    // Check if it looks like a complete UK postcode
    const isComplete = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(upper.trim());
    if (isComplete && apiKey) {
      geocodePostcode(upper.trim());
    }
  };

  // Initialize map when it becomes visible
  useEffect(() => {
    if (!mapVisible || !mapRef.current || !window.google || !markerPos) return;
    if (googleMapRef.current) {
      googleMapRef.current.panTo(markerPos);
      if (markerRef.current) markerRef.current.setPosition(markerPos);
      return;
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center: markerPos,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
    });

    const marker = new window.google.maps.Marker({
      position: markerPos,
      map,
      draggable: true,
      title: "Drag to fine-tune your location",
    });

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) {
        const newPos = { lat: pos.lat(), lng: pos.lng() };
        setMarkerPos(newPos);
        // Only update GPS coords, NOT address/postcode/travel fee
        onLocationChange?.(newPos.lat, newPos.lng);
      }
    });

    googleMapRef.current = map;
    markerRef.current = marker;
  }, [mapVisible, markerPos]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Home Address *</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="address-text">Home Address *</Label>
        <Textarea
          id="address-text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="House number, street, town/city..."
          rows={2}
          maxLength={500}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="postcode">Postcode *</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="postcode"
            value={postcode}
            onChange={(e) => handlePostcodeChange(e.target.value)}
            placeholder="e.g. DT1 1JJ"
            className="pl-9 uppercase"
            maxLength={10}
            required
          />
        </div>
        {geocoding && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Locating on map...
          </p>
        )}
      </div>

      {mapVisible && markerPos && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              📍 Drag the pin to pinpoint your home — this helps us find you!
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setMapVisible(false)}
            >
              Hide map
            </Button>
          </div>
          <div
            ref={mapRef}
            className="h-[250px] w-full overflow-hidden rounded-lg border"
          />
        </div>
      )}

      {!mapVisible && markerPos && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setMapVisible(true)}
        >
          <MapPin className="mr-1 h-3 w-3" /> Show map
        </Button>
      )}
    </div>
  );
};

export default AddressPicker;
