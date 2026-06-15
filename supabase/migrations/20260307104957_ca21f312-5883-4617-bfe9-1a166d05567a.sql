
CREATE TABLE public.service_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  offer_name TEXT NOT NULL,
  description TEXT,
  price_text TEXT NOT NULL,
  price_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage service offers" ON public.service_offers
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Anyone can read active offers" ON public.service_offers
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND (valid_from IS NULL OR valid_from <= CURRENT_DATE) AND (valid_until IS NULL OR valid_until >= CURRENT_DATE));
