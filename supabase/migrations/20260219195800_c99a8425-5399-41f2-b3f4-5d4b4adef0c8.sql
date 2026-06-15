
-- Add AI consent summary column to appointments
ALTER TABLE public.appointments ADD COLUMN ai_consent_summary text;

-- Allow admins to read/write this column (already covered by existing RLS)
COMMENT ON COLUMN public.appointments.ai_consent_summary IS 'AI-generated summary of patient consent form responses';
