ALTER TABLE public.mileage_journeys
  ADD COLUMN IF NOT EXISTS journey_time time without time zone,
  ADD COLUMN IF NOT EXISTS is_return_to_base boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_mileage_journeys_date_time
  ON public.mileage_journeys (journey_date, journey_time);