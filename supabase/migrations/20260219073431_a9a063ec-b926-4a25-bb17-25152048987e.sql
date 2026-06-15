
-- Add status column to consent_form_responses to support drafts
ALTER TABLE public.consent_form_responses
ADD COLUMN status text NOT NULL DEFAULT 'completed';

-- Update existing rows to be 'completed'
UPDATE public.consent_form_responses SET status = 'completed' WHERE status = 'completed';
