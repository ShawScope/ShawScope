
-- Add signature and verbal consent witness fields to consultation_notes
ALTER TABLE public.consultation_notes 
ADD COLUMN IF NOT EXISTS patient_signature text,
ADD COLUMN IF NOT EXISTS practitioner_signature text,
ADD COLUMN IF NOT EXISTS verbal_consent_witness text,
ADD COLUMN IF NOT EXISTS ai_prefill_summary text;
