
-- Change start_hour and end_hour to numeric to support 15-minute increments (e.g. 9.25 = 9:15)
ALTER TABLE public.available_dates ALTER COLUMN start_hour TYPE numeric USING start_hour::numeric;
ALTER TABLE public.available_dates ALTER COLUMN end_hour TYPE numeric USING end_hour::numeric;

ALTER TABLE public.business_settings ALTER COLUMN start_hour TYPE numeric USING start_hour::numeric;
ALTER TABLE public.business_settings ALTER COLUMN end_hour TYPE numeric USING end_hour::numeric;
