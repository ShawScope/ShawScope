import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServicePrice {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  duration_minutes: number;
}

export interface ServiceOffer {
  id: string;
  service_id: string;
  offer_name: string;
  description: string | null;
  price_text: string;
  price_note: string | null;
  valid_from: string | null;
  valid_until: string | null;
}

export function useServicePricing() {
  const [services, setServices] = useState<ServicePrice[]>([]);
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: svcs }, { data: offs }] = await Promise.all([
        supabase.from("services").select("id, name, price, description, duration_minutes").eq("is_active", true).order("sort_order"),
        supabase.from("service_offers").select("id, service_id, offer_name, description, price_text, price_note, valid_from, valid_until").eq("is_active", true).order("sort_order"),
      ]);
      if (svcs) setServices(svcs as ServicePrice[]);
      if (offs) setOffers(offs as ServiceOffer[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const getServicePrice = (nameSearch: string): number | null => {
    const svc = services.find(s => s.name.toLowerCase().includes(nameSearch.toLowerCase()));
    return svc?.price ?? null;
  };

  const getServiceOffers = (nameSearch: string): ServiceOffer[] => {
    const svc = services.find(s => s.name.toLowerCase().includes(nameSearch.toLowerCase()));
    if (!svc) return [];
    return offers.filter(o => o.service_id === svc.id);
  };

  const formatPrice = (nameSearch: string): string => {
    const price = getServicePrice(nameSearch);
    return price != null ? `£${price}` : "—";
  };

  return { services, offers, loading, getServicePrice, getServiceOffers, formatPrice };
}
