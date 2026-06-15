-- Add attempt tracking to login_otp_codes for brute-force protection
ALTER TABLE public.login_otp_codes ADD COLUMN verify_attempts integer NOT NULL DEFAULT 0;

-- Update get_appointment_by_token to add audit logging
CREATE OR REPLACE FUNCTION public.get_appointment_by_token(p_token uuid)
RETURNS TABLE(id uuid, client_name text, client_email text, appointment_date date, appointment_time time without time zone, service_id uuid, consent_form_template_id uuid, access_token uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the access attempt
  INSERT INTO public.patient_activity_log (client_email, event_type, message, created_by)
  SELECT a.client_email, 'consent_access', 'Appointment accessed via consent link', 'patient'
  FROM public.appointments a
  WHERE a.access_token = p_token
  ON CONFLICT DO NOTHING;

  RETURN QUERY
  SELECT a.id, a.client_name, a.client_email, a.appointment_date, a.appointment_time,
         a.service_id, a.consent_form_template_id, a.access_token
  FROM public.appointments a
  WHERE a.access_token = p_token
  LIMIT 1;
END;
$$;