
-- Release a booking hold (only if session_id matches)
CREATE OR REPLACE FUNCTION public.release_booking_hold(p_hold_id uuid, p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.booking_holds
  SET released = true
  WHERE id = p_hold_id AND session_id = p_session_id;
END;
$$;

-- Update booking hold fields (only if session_id matches)
CREATE OR REPLACE FUNCTION public.update_booking_hold(
  p_hold_id uuid,
  p_session_id text,
  p_client_name text DEFAULT NULL,
  p_client_email text DEFAULT NULL,
  p_client_phone text DEFAULT NULL,
  p_postcode text DEFAULT NULL,
  p_help_email_sent boolean DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.booking_holds SET
    client_name = COALESCE(p_client_name, client_name),
    client_email = COALESCE(p_client_email, client_email),
    client_phone = COALESCE(p_client_phone, client_phone),
    postcode = COALESCE(p_postcode, postcode),
    help_email_sent = COALESCE(p_help_email_sent, help_email_sent)
  WHERE id = p_hold_id AND session_id = p_session_id;
END;
$$;

-- Update chat log messages / fields (only if session_id matches)
CREATE OR REPLACE FUNCTION public.update_chat_log(
  p_session_id text,
  p_messages jsonb DEFAULT NULL,
  p_patient_email text DEFAULT NULL,
  p_patient_phone text DEFAULT NULL,
  p_escalated boolean DEFAULT NULL,
  p_escalation_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_logs SET
    messages = COALESCE(p_messages, messages),
    patient_email = COALESCE(p_patient_email, patient_email),
    patient_phone = COALESCE(p_patient_phone, patient_phone),
    escalated = COALESCE(p_escalated, escalated),
    escalation_reason = COALESCE(p_escalation_reason, escalation_reason),
    updated_at = now()
  WHERE session_id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_booking_hold(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_hold(uuid, text, text, text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_chat_log(text, jsonb, text, text, boolean, text) TO anon, authenticated;
