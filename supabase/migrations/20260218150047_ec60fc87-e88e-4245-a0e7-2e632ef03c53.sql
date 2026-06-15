
-- Create SECURITY DEFINER functions so patients can access their appointment
-- and submit consent responses using their access_token (bypassing RLS).

-- 1. Get appointment by access token
CREATE OR REPLACE FUNCTION public.get_appointment_by_token(p_token uuid)
RETURNS TABLE(
  id uuid,
  client_name text,
  client_email text,
  appointment_date date,
  appointment_time time,
  service_id uuid,
  consent_form_template_id uuid,
  access_token uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.client_name, a.client_email, a.appointment_date, a.appointment_time,
         a.service_id, a.consent_form_template_id, a.access_token
  FROM public.appointments a
  WHERE a.access_token = p_token
  LIMIT 1;
$$;

-- 2. Insert consent response validated by access token
CREATE OR REPLACE FUNCTION public.submit_consent_response(
  p_token uuid,
  p_template_id uuid,
  p_responses jsonb,
  p_signature text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apt_id uuid;
  v_response_id uuid;
BEGIN
  SELECT a.id INTO v_apt_id
  FROM public.appointments a
  WHERE a.access_token = p_token;

  IF v_apt_id IS NULL THEN
    RAISE EXCEPTION 'Invalid access token';
  END IF;

  INSERT INTO public.consent_form_responses (
    appointment_id, consent_form_template_id, responses, signature, signed_at
  ) VALUES (
    v_apt_id, p_template_id, p_responses,
    NULLIF(TRIM(p_signature), ''),
    CASE WHEN TRIM(COALESCE(p_signature, '')) <> '' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_response_id;

  RETURN v_response_id;
END;
$$;

-- 3. Check if consent already completed for a token
CREATE OR REPLACE FUNCTION public.check_consent_completed(p_token uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.consent_form_responses cr
    JOIN public.appointments a ON a.id = cr.appointment_id
    WHERE a.access_token = p_token
  );
$$;
