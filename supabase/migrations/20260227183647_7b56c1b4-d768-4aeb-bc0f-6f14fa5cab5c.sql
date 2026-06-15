-- Prevent double-booking by validating schedule overlap at write time
CREATE OR REPLACE FUNCTION public.validate_appointment_scheduling()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_duration integer;
  v_conflict boolean;
BEGIN
  -- Ignore cancelled/rejected rows
  IF NEW.status IN ('cancelled', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Resolve duration from row, service, or default
  v_duration := COALESCE(NEW.duration_minutes, 0);
  IF v_duration <= 0 AND NEW.service_id IS NOT NULL THEN
    SELECT COALESCE(s.duration_minutes, 60)
    INTO v_duration
    FROM public.services s
    WHERE s.id = NEW.service_id;
  END IF;
  v_duration := COALESCE(NULLIF(v_duration, 0), 60);

  -- Atomic overlap check using existing helper
  SELECT public.check_appointment_overlap(
    NEW.appointment_date,
    NEW.appointment_time,
    v_duration,
    15,
    CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END
  ) INTO v_conflict;

  IF v_conflict THEN
    RAISE EXCEPTION 'This time slot is no longer available. Please choose another time.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_appointment_scheduling ON public.appointments;

CREATE TRIGGER trg_validate_appointment_scheduling
BEFORE INSERT OR UPDATE OF appointment_date, appointment_time, duration_minutes, service_id, status
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_appointment_scheduling();