ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS dictation_consent boolean NOT NULL DEFAULT true;