
-- Add input validation to appointment inserts via trigger
CREATE OR REPLACE FUNCTION public.validate_appointment_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Validate client_name
  IF LENGTH(TRIM(NEW.client_name)) < 2 OR LENGTH(NEW.client_name) > 200 THEN
    RAISE EXCEPTION 'Invalid client name';
  END IF;

  -- Validate client_email format
  IF NEW.client_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  IF LENGTH(NEW.client_email) > 320 THEN
    RAISE EXCEPTION 'Email too long';
  END IF;

  -- Validate phone if provided
  IF NEW.client_phone IS NOT NULL AND LENGTH(NEW.client_phone) > 30 THEN
    RAISE EXCEPTION 'Phone number too long';
  END IF;

  -- Validate address length if provided
  IF NEW.address IS NOT NULL AND LENGTH(NEW.address) > 500 THEN
    RAISE EXCEPTION 'Address too long';
  END IF;

  -- Validate notes length if provided
  IF NEW.notes IS NOT NULL AND LENGTH(NEW.notes) > 2000 THEN
    RAISE EXCEPTION 'Notes too long';
  END IF;

  -- Prevent public users from setting admin_notes
  IF NEW.admin_notes IS NOT NULL AND NOT is_admin() THEN
    NEW.admin_notes := NULL;
  END IF;

  -- Prevent public users from setting price
  IF NEW.price IS NOT NULL AND NOT is_admin() THEN
    NEW.price := NULL;
  END IF;

  -- Sanitize: trim whitespace
  NEW.client_name := TRIM(NEW.client_name);
  NEW.client_email := LOWER(TRIM(NEW.client_email));

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_appointment_before_insert
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_appointment_insert();

-- Add input validation to SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.check_appointment_overlap(
  p_date date,
  p_time time without time zone,
  p_duration_minutes integer,
  p_buffer_minutes integer DEFAULT 15,
  p_exclude_appointment_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_duration_minutes < 1 OR p_duration_minutes > 480 THEN false
    WHEN p_buffer_minutes < 0 OR p_buffer_minutes > 120 THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.appointments a
      LEFT JOIN public.services s ON s.id = a.service_id
      WHERE a.appointment_date = p_date
        AND a.status NOT IN ('cancelled', 'rejected')
        AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
        AND (
          (EXTRACT(HOUR FROM p_time) * 60 + EXTRACT(MINUTE FROM p_time))
            < (EXTRACT(HOUR FROM a.appointment_time) * 60 + EXTRACT(MINUTE FROM a.appointment_time) + COALESCE(s.duration_minutes, 60) + p_buffer_minutes)
          AND
          (EXTRACT(HOUR FROM p_time) * 60 + EXTRACT(MINUTE FROM p_time) + p_duration_minutes + p_buffer_minutes)
            > (EXTRACT(HOUR FROM a.appointment_time) * 60 + EXTRACT(MINUTE FROM a.appointment_time))
        )
    )
  END;
$$;
