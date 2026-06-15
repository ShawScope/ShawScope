
-- Create available_dates table for individual date availability
CREATE TABLE public.available_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  available_date DATE NOT NULL UNIQUE,
  start_hour INTEGER,
  end_hour INTEGER,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.available_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read available dates" ON public.available_dates FOR SELECT USING (true);
CREATE POLICY "Admins can insert available dates" ON public.available_dates FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update available dates" ON public.available_dates FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete available dates" ON public.available_dates FOR DELETE TO authenticated USING (public.is_admin());
