ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS deceased boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deceased_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_patients_deceased ON public.patients(deceased) WHERE deceased = true;