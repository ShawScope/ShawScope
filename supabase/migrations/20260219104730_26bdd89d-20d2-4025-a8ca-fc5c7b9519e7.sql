
-- Add postcode column to appointments for travel-time calculations
ALTER TABLE public.appointments ADD COLUMN postcode text;

-- Create route cache table for drive time lookups
CREATE TABLE public.route_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_postcode text NOT NULL,
  destination_postcode text NOT NULL,
  drive_time_minutes integer NOT NULL,
  distance_miles numeric NOT NULL,
  cached_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(origin_postcode, destination_postcode)
);

-- RLS: anyone can read (needed for public booking), admins can manage
ALTER TABLE public.route_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read route cache"
  ON public.route_cache FOR SELECT USING (true);

CREATE POLICY "Anyone can insert route cache"
  ON public.route_cache FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage route cache"
  ON public.route_cache FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Index for fast lookups
CREATE INDEX idx_route_cache_postcodes ON public.route_cache(origin_postcode, destination_postcode);

-- Clean up old cache entries (older than 7 days) - optional trigger
CREATE OR REPLACE FUNCTION public.cleanup_old_route_cache()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  DELETE FROM public.route_cache WHERE cached_at < now() - interval '7 days';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_route_cache_on_insert
  AFTER INSERT ON public.route_cache
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_route_cache();
