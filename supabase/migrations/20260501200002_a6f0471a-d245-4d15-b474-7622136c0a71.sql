
CREATE OR REPLACE FUNCTION public.process_marketing_unsubscribe(
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := NULLIF(LOWER(TRIM(COALESCE(p_email, ''))), '');
  v_phone text := NULLIF(TRIM(COALESCE(p_phone, '')), '');
BEGIN
  IF v_email IS NULL AND v_phone IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.marketing_unsubscribes (client_email, client_phone, reason)
  VALUES (v_email, v_phone, NULLIF(TRIM(COALESCE(p_reason, '')), ''));

  IF v_email IS NOT NULL THEN
    UPDATE public.patients
    SET marketing_email = false,
        marketing_sms = false,
        marketing_opted_in_at = NULL
    WHERE LOWER(client_email) = v_email;
  END IF;

  IF v_phone IS NOT NULL THEN
    UPDATE public.patients
    SET marketing_email = false,
        marketing_sms = false,
        marketing_opted_in_at = NULL
    WHERE client_phone = v_phone;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_marketing_unsubscribe(text, text, text) TO anon, authenticated;

-- Backfill: anyone in the unsubscribe list still flagged for marketing
UPDATE public.patients p
SET marketing_email = false,
    marketing_sms = false,
    marketing_opted_in_at = NULL
WHERE (p.marketing_email = true OR p.marketing_sms = true)
  AND (
    EXISTS (SELECT 1 FROM public.marketing_unsubscribes mu WHERE LOWER(mu.client_email) = LOWER(p.client_email))
    OR EXISTS (SELECT 1 FROM public.marketing_unsubscribes mu WHERE mu.client_phone IS NOT NULL AND mu.client_phone = p.client_phone)
  );
