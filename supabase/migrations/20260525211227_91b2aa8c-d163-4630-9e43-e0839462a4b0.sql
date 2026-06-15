
-- 1. PATIENTS: replace overly-permissive public UPDATE with secure RPC
DROP POLICY IF EXISTS "Booking flow can update own patient" ON public.patients;

CREATE OR REPLACE FUNCTION public.upsert_patient_from_booking(
  p_access_token uuid,
  p_client_name text,
  p_client_email text,
  p_client_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_marketing_email boolean DEFAULT false,
  p_marketing_sms boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_apt_id uuid;
BEGIN
  -- Validate access_token belongs to an appointment created in last 2 hours
  SELECT a.id INTO v_apt_id
  FROM public.appointments a
  WHERE a.access_token = p_access_token
    AND a.created_at > now() - interval '2 hours'
  LIMIT 1;

  IF v_apt_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired booking token';
  END IF;

  -- Basic validation
  IF p_client_name IS NULL OR length(trim(p_client_name)) < 2 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF p_client_email IS NULL OR p_client_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  SELECT id INTO v_patient_id
  FROM public.patients
  WHERE client_email = lower(trim(p_client_email))
    AND client_name ILIKE trim(p_client_name)
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    INSERT INTO public.patients (
      client_name, client_email, client_phone, address, date_of_birth,
      marketing_email, marketing_sms, marketing_opted_in_at
    ) VALUES (
      trim(p_client_name),
      lower(trim(p_client_email)),
      NULLIF(trim(coalesce(p_client_phone, '')), ''),
      NULLIF(trim(coalesce(p_address, '')), ''),
      p_date_of_birth,
      p_marketing_email,
      p_marketing_sms,
      CASE WHEN p_marketing_email OR p_marketing_sms THEN now() ELSE NULL END
    )
    RETURNING id INTO v_patient_id;
  ELSE
    UPDATE public.patients SET
      date_of_birth  = COALESCE(p_date_of_birth, date_of_birth),
      client_phone   = COALESCE(NULLIF(trim(coalesce(p_client_phone, '')), ''), client_phone),
      address        = COALESCE(NULLIF(trim(coalesce(p_address, '')), ''), address),
      marketing_email = CASE WHEN p_marketing_email THEN true ELSE marketing_email END,
      marketing_sms   = CASE WHEN p_marketing_sms THEN true ELSE marketing_sms END,
      marketing_opted_in_at = CASE WHEN p_marketing_email OR p_marketing_sms THEN now() ELSE marketing_opted_in_at END
    WHERE id = v_patient_id;
  END IF;

  RETURN v_patient_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_patient_from_booking(uuid, text, text, text, text, date, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_patient_from_booking(uuid, text, text, text, text, date, boolean, boolean) TO anon, authenticated;

-- 2. BOOKING HOLDS: restrict per-session via header
DROP POLICY IF EXISTS "Anyone can read booking holds" ON public.booking_holds;
DROP POLICY IF EXISTS "Anyone can update own hold" ON public.booking_holds;

CREATE POLICY "Read own hold via session header"
ON public.booking_holds FOR SELECT TO public
USING (
  session_id = ((current_setting('request.headers', true))::json ->> 'x-session-id')
);

CREATE POLICY "Update own hold via session header"
ON public.booking_holds FOR UPDATE TO public
USING (
  session_id = ((current_setting('request.headers', true))::json ->> 'x-session-id')
);

-- Helpers for public slot-availability checks (no PII)
CREATE OR REPLACE FUNCTION public.get_active_booking_holds_for_date(target_date date)
RETURNS TABLE(appointment_time time, duration_minutes integer, session_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT appointment_time, duration_minutes, session_id
  FROM public.booking_holds
  WHERE appointment_date = target_date
    AND released = false
    AND expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.get_active_booking_holds_summary()
RETURNS TABLE(appointment_date date, duration_minutes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT appointment_date, duration_minutes
  FROM public.booking_holds
  WHERE released = false
    AND expires_at > now()
    AND appointment_date >= CURRENT_DATE;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_booking_holds_for_date(date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_booking_holds_summary() TO anon, authenticated;

-- 3. CHAT LOGS: tighten update to session-header match
DROP POLICY IF EXISTS "Anyone can update own chat log" ON public.chat_logs;

CREATE POLICY "Update own chat log via session header"
ON public.chat_logs FOR UPDATE TO public
USING (
  session_id = ((current_setting('request.headers', true))::json ->> 'x-session-id')
);

-- 4. MARKETING POLL RESPONSES: drop public read, add aggregation RPC
DROP POLICY IF EXISTS "Anyone can read own poll response" ON public.marketing_poll_responses;

CREATE OR REPLACE FUNCTION public.get_poll_result_counts(p_poll_id uuid)
RETURNS TABLE(selected_option text, vote_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT selected_option, count(*)::bigint
  FROM public.marketing_poll_responses
  WHERE poll_id = p_poll_id
  GROUP BY selected_option;
$$;

GRANT EXECUTE ON FUNCTION public.get_poll_result_counts(uuid) TO anon, authenticated;

-- 5. BLOG POSTS: hide approval_token from anon/authenticated reads
REVOKE SELECT (approval_token) ON public.blog_posts FROM anon, authenticated;

-- 6. Sensitive SECURITY DEFINER functions: restrict EXECUTE to service_role only
REVOKE EXECUTE ON FUNCTION public.admin_override_insert_appointment(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_override_update_appointment(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_phone_sessions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_route_cache() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_marketing_unsubscribe(text, text, text) FROM PUBLIC, anon, authenticated;
