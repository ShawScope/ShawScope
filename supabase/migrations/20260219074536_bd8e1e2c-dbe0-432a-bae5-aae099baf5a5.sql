
-- Add marketing consent columns to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS marketing_email boolean NOT NULL DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS marketing_sms boolean NOT NULL DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS marketing_opted_in_at timestamp with time zone;
