
-- Quick access tiles for hearing screening tab
CREATE TABLE public.hearing_quick_tiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  icon text DEFAULT 'link',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hearing_quick_tiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quick tiles"
  ON public.hearing_quick_tiles FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
