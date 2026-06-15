
-- Create a table to store rich analytics snapshots
CREATE TABLE public.website_analytics_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_visitors integer NOT NULL DEFAULT 0,
  total_pageviews integer NOT NULL DEFAULT 0,
  avg_pageviews_per_visit numeric(5,2) NOT NULL DEFAULT 0,
  avg_session_duration_seconds numeric(10,2) NOT NULL DEFAULT 0,
  bounce_rate numeric(5,2) NOT NULL DEFAULT 0,
  top_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  device_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  country_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_visitors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.website_analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin only access
CREATE POLICY "Admins can manage analytics snapshots"
ON public.website_analytics_snapshots FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
