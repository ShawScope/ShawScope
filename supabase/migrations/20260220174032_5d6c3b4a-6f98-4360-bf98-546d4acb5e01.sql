
CREATE TABLE public.notices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  closed_from date,
  closed_until date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active notices" ON public.notices
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage notices" ON public.notices
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
