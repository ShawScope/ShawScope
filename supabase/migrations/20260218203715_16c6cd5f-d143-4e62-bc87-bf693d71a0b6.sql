-- Table to track cryotherapy follow-up emails sent
CREATE TABLE public.cryo_followups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  week_number integer NOT NULL CHECK (week_number BETWEEN 1 AND 4),
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  patient_response text,
  patient_photo_path text,
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, week_number)
);

-- Enable RLS
ALTER TABLE public.cryo_followups ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage cryo followups"
ON public.cryo_followups
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Patients can view their own followups via appointment access token
CREATE POLICY "Patients can view own followups"
ON public.cryo_followups
FOR SELECT
USING (
  appointment_id IN (
    SELECT a.id FROM public.appointments a
    WHERE a.access_token::text = (current_setting('request.headers', true)::json->>'x-access-token')
  )
);

-- Patients can update their own followup responses (for photo/message submission)
CREATE POLICY "Patients can respond to followups"
ON public.cryo_followups
FOR UPDATE
USING (
  appointment_id IN (
    SELECT a.id FROM public.appointments a
    WHERE a.access_token::text = (current_setting('request.headers', true)::json->>'x-access-token')
  )
);

-- Enable realtime for admin to see responses
ALTER PUBLICATION supabase_realtime ADD TABLE public.cryo_followups;

-- Enable pg_cron and pg_net extensions for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;