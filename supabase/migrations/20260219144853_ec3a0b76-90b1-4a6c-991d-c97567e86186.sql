
-- Add submitter_name to consent_form_responses for per-person duplicate prevention
ALTER TABLE public.consent_form_responses
  ADD COLUMN submitter_name text;

-- Backfill existing records with the appointment's client_name
UPDATE public.consent_form_responses cr
SET submitter_name = a.client_name
FROM public.appointments a
WHERE cr.appointment_id = a.id
  AND cr.submitter_name IS NULL;

-- Add unique constraint: one submission per person per appointment per template
ALTER TABLE public.consent_form_responses
  ADD CONSTRAINT unique_consent_per_person_appointment
  UNIQUE (appointment_id, consent_form_template_id, submitter_name);

-- Update submit_consent_response with duplicate prevention and size validation
CREATE OR REPLACE FUNCTION public.submit_consent_response(
  p_token uuid,
  p_template_id uuid,
  p_responses jsonb,
  p_signature text DEFAULT NULL,
  p_submitter_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_apt_id uuid;
  v_response_id uuid;
  v_name text;
BEGIN
  -- Validate JSONB size (max 50KB)
  IF length(p_responses::text) > 50000 THEN
    RAISE EXCEPTION 'Consent response data exceeds maximum size';
  END IF;

  -- Validate signature size (max 100KB for base64 image)
  IF p_signature IS NOT NULL AND length(p_signature) > 100000 THEN
    RAISE EXCEPTION 'Signature data exceeds maximum size';
  END IF;

  SELECT a.id INTO v_apt_id
  FROM public.appointments a
  WHERE a.access_token = p_token;

  IF v_apt_id IS NULL THEN
    RAISE EXCEPTION 'Invalid access token';
  END IF;

  -- Determine submitter name
  IF p_submitter_name IS NOT NULL AND TRIM(p_submitter_name) <> '' THEN
    v_name := TRIM(p_submitter_name);
  ELSE
    SELECT a.client_name INTO v_name FROM public.appointments a WHERE a.id = v_apt_id;
  END IF;

  -- Check for duplicate submission by same person
  IF EXISTS (
    SELECT 1 FROM public.consent_form_responses cr
    WHERE cr.appointment_id = v_apt_id
      AND cr.consent_form_template_id = p_template_id
      AND cr.submitter_name = v_name
  ) THEN
    RAISE EXCEPTION 'Consent form already submitted by this person for this appointment';
  END IF;

  INSERT INTO public.consent_form_responses (
    appointment_id, consent_form_template_id, responses, signature, signed_at, submitter_name
  ) VALUES (
    v_apt_id, p_template_id, p_responses,
    NULLIF(TRIM(p_signature), ''),
    CASE WHEN TRIM(COALESCE(p_signature, '')) <> '' THEN now() ELSE NULL END,
    v_name
  )
  RETURNING id INTO v_response_id;

  RETURN v_response_id;
END;
$$;
