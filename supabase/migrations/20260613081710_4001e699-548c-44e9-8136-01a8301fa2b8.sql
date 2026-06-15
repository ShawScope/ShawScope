CREATE OR REPLACE FUNCTION public.resolve_appointment_access_token(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_raw_token text := lower(trim(coalesce(p_token, '')));
  v_compact_token text := lower(regexp_replace(trim(coalesce(p_token, '')), '[^0-9a-f]', '', 'g'));
  v_access_token uuid;
  v_today date := (now() AT TIME ZONE 'Europe/London')::date;
BEGIN
  IF v_raw_token = '' THEN
    RETURN NULL;
  END IF;

  IF v_raw_token ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT a.access_token INTO v_access_token
    FROM public.appointments a
    WHERE a.access_token = v_raw_token::uuid
    LIMIT 1;

    IF v_access_token IS NOT NULL THEN
      RETURN v_access_token;
    END IF;
  END IF;

  IF v_compact_token ~ '^[0-9a-f]{8,32}$' THEN
    SELECT a.access_token INTO v_access_token
    FROM public.appointments a
    WHERE replace(a.access_token::text, '-', '') LIKE v_compact_token || '%'
    ORDER BY
      CASE
        WHEN a.status IN ('approved', 'confirmed') AND a.appointment_date = v_today THEN 0
        WHEN a.status IN ('approved', 'confirmed') AND a.appointment_date > v_today THEN 1
        WHEN a.status IN ('approved', 'confirmed') THEN 2
        ELSE 3
      END,
      abs(a.appointment_date - v_today),
      a.appointment_time ASC
    LIMIT 1;

    RETURN v_access_token;
  END IF;

  RETURN NULL;
END;
$$;

DROP FUNCTION IF EXISTS public.get_appointment_by_token(uuid);
DROP FUNCTION IF EXISTS public.get_appointment_by_token(text);

CREATE OR REPLACE FUNCTION public.get_appointment_by_token(p_token text)
RETURNS TABLE(id uuid, client_name text, client_email text, appointment_date date, appointment_time time without time zone, service_id uuid, consent_form_template_id uuid, access_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_access_token uuid := public.resolve_appointment_access_token(p_token);
BEGIN
  IF v_access_token IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.patient_activity_log (client_email, event_type, message, created_by)
  SELECT a.client_email, 'consent_access', 'Appointment accessed via secure patient link', 'patient'
  FROM public.appointments a
  WHERE a.access_token = v_access_token
  ON CONFLICT DO NOTHING;

  RETURN QUERY
  SELECT a.id, a.client_name, a.client_email, a.appointment_date, a.appointment_time,
         a.service_id, a.consent_form_template_id, a.access_token
  FROM public.appointments a
  WHERE a.access_token = v_access_token
  LIMIT 1;
END;
$$;

DROP FUNCTION IF EXISTS public.set_ready_from_time(uuid, time without time zone);
DROP FUNCTION IF EXISTS public.set_ready_from_time(text, time without time zone);

CREATE OR REPLACE FUNCTION public.set_ready_from_time(p_token text, p_ready_time time without time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_access_token uuid := public.resolve_appointment_access_token(p_token);
BEGIN
  IF v_access_token IS NULL THEN
    RAISE EXCEPTION 'Invalid access token';
  END IF;

  UPDATE public.appointments
  SET ready_from_time = p_ready_time
  WHERE access_token = v_access_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid access token';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_appointment_access_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_appointment_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_ready_from_time(text, time without time zone) TO anon, authenticated, service_role;