
-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active services" ON public.services FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins can insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update services" ON public.services FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete services" ON public.services FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add service_id to appointments
ALTER TABLE public.appointments ADD COLUMN service_id UUID REFERENCES public.services(id);

-- Seed initial services
INSERT INTO public.services (name, description, duration_minutes, price, sort_order) VALUES
  ('Earwax Removal', 'Professional microsuction earwax removal for clear, comfortable hearing.', 30, 45.00, 1),
  ('Cryotherapy Skin Lesion Treatment', 'Safe and effective cryotherapy for the removal of skin lesions, warts, and skin tags.', 30, 60.00, 2),
  ('Foot Care Treatment', 'Comprehensive foot care including nail trimming, callus removal, and general foot health assessment.', 45, 50.00, 3);
