ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS dismissed_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS clinical_audits_migrated_at timestamptz;