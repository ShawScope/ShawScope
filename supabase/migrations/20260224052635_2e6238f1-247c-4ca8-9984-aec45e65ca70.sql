
-- Create a simple cache table for website analytics
CREATE TABLE public.website_analytics_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  this_week_visitors integer NOT NULL DEFAULT 0,
  last_week_visitors integer NOT NULL DEFAULT 0,
  this_month_visitors integer NOT NULL DEFAULT 0,
  last_month_visitors integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.website_analytics_cache ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admins can manage analytics cache"
ON public.website_analytics_cache FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Anyone authenticated can read (for dashboard)
CREATE POLICY "Authenticated users can read analytics cache"
ON public.website_analytics_cache FOR SELECT
USING (is_admin());

-- Seed with current data (from Lovable analytics as of 2026-02-24)
INSERT INTO public.website_analytics_cache (this_week_visitors, last_week_visitors, this_month_visitors, last_month_visitors)
VALUES (292, 0, 292, 0);
