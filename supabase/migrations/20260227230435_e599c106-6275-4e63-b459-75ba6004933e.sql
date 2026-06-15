
-- Create enums for hearing screening
CREATE TYPE public.hearing_service_context AS ENUM ('earwax_removal', 'ear_wellness', 'standalone');
CREATE TYPE public.hearing_room_noise AS ENUM ('pass', 'fail', 'not_checked');
CREATE TYPE public.hearing_classification AS ENUM ('normal', 'mild', 'moderate', 'moderately_severe', 'severe', 'profound', 'inconclusive');
CREATE TYPE public.hearing_recommendation AS ENUM ('reassure', 'retest', 'refer_audiology', 'urgent_gp_ent');
CREATE TYPE public.hearing_ear AS ENUM ('left', 'right');

-- Create hearing_screenings table
CREATE TABLE public.hearing_screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id uuid NULL REFERENCES public.consultation_notes(id) ON DELETE SET NULL,
  clinician_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  service_context hearing_service_context NOT NULL DEFAULT 'standalone',
  room_noise_status hearing_room_noise NOT NULL DEFAULT 'not_checked',
  room_noise_metric numeric NULL,
  headphones_model text NOT NULL DEFAULT 'Sennheiser over-ear',
  volume_protocol text NOT NULL DEFAULT 'max',
  volume_confirmed boolean NOT NULL DEFAULT false,
  dnd_confirmed boolean NOT NULL DEFAULT false,
  disclaimer_ack boolean NOT NULL DEFAULT false,
  left_classification hearing_classification NULL,
  right_classification hearing_classification NULL,
  overall_recommendation hearing_recommendation NULL,
  clinical_summary text NULL,
  patient_friendly_summary text NULL,
  age_context_text text NULL,
  pdf_storage_path text NULL,
  notes text NULL
);

-- Create hearing_screening_points table
CREATE TABLE public.hearing_screening_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid NOT NULL REFERENCES public.hearing_screenings(id) ON DELETE CASCADE,
  ear hearing_ear NOT NULL,
  frequency_hz integer NOT NULL,
  step_level integer NOT NULL,
  estimated_dbhl numeric NOT NULL,
  stimulus_db_step numeric NULL,
  heard boolean NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  presentations integer NOT NULL DEFAULT 0,
  catch_trials integer NOT NULL DEFAULT 0,
  false_positives integer NOT NULL DEFAULT 0,
  raw_log jsonb NULL DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.hearing_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hearing_screening_points ENABLE ROW LEVEL SECURITY;

-- RLS policies - admin/staff only
CREATE POLICY "Admins can manage hearing screenings"
  ON public.hearing_screenings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage screening points"
  ON public.hearing_screening_points FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Index for fast patient lookups
CREATE INDEX idx_hearing_screenings_patient ON public.hearing_screenings(patient_id);
CREATE INDEX idx_hearing_screening_points_screening ON public.hearing_screening_points(screening_id);
