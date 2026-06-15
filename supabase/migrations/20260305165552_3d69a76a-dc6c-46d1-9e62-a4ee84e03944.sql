ALTER TABLE public.consent_form_responses 
ADD COLUMN IF NOT EXISTS template_snapshot jsonb DEFAULT NULL;