
-- Add screening_method enum
DO $$ BEGIN
  CREATE TYPE public.hearing_screening_method AS ENUM ('shawscope', 'apple');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to hearing_screenings
ALTER TABLE public.hearing_screenings
  ADD COLUMN IF NOT EXISTS screening_method public.hearing_screening_method NOT NULL DEFAULT 'shawscope',
  ADD COLUMN IF NOT EXISTS source_pdf_path text,
  ADD COLUMN IF NOT EXISTS anc_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS frequency_set text DEFAULT 'advanced',
  ADD COLUMN IF NOT EXISTS left_thresholds jsonb,
  ADD COLUMN IF NOT EXISTS right_thresholds jsonb;
