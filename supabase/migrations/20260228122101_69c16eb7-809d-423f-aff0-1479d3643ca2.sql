
ALTER TABLE public.hearing_screenings 
ADD COLUMN IF NOT EXISTS volume_target_percent integer NOT NULL DEFAULT 50;
