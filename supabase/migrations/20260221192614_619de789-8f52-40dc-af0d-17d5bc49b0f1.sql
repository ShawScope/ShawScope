-- Add coordinate columns to patients table for map plotting
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS longitude double precision;