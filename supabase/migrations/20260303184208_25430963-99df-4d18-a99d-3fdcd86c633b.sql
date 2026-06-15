CREATE OR REPLACE FUNCTION public.set_ready_from_time(p_token uuid, p_ready_time time without time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.appointments
  SET ready_from_time = p_ready_time
  WHERE access_token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid access token';
  END IF;
END;
$$;