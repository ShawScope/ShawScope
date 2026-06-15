-- Add latitude and longitude columns to appointments for map display
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS longitude double precision;

-- Add admin_notes column for rejection/alternative notes
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS admin_notes text;

-- Add alternative appointment fields
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS alternative_date date;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS alternative_time time without time zone;