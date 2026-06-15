
CREATE OR REPLACE FUNCTION public.validate_appointment_scheduling()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_duration integer;
  v_conflict boolean;
BEGIN
  -- Skip validation for cancelled/rejected appointments
  IF NEW.status IN ('cancelled', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Skip overlap validation when only status or non-scheduling fields change
  IF TG_OP = 'UPDATE' THEN
    IF NEW.appointment_date = OLD.appointment_date
       AND NEW.appointment_time = OLD.appointment_time
       AND COALESCE(NEW.duration_minutes, 0) = COALESCE(OLD.duration_minutes, 0)
       AND COALESCE(NEW.service_id, '00000000-0000-0000-0000-000000000000') = COALESCE(OLD.service_id, '00000000-0000-0000-0000-000000000000')
    THEN
      RETURN NEW;
    END IF;
  END IF;

  v_duration := COALESCE(NEW.duration_minutes, 0);
  IF v_duration <= 0 AND NEW.service_id IS NOT NULL THEN
    SELECT COALESCE(s.duration_minutes, 60)
    INTO v_duration
    FROM public.services s
    WHERE s.id = NEW.service_id;
  END IF;
  v_duration := COALESCE(NULLIF(v_duration, 0), 60);

  SELECT public.check_appointment_overlap(
    NEW.appointment_date,
    NEW.appointment_time,
    v_duration,
    5,
    CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END
  ) INTO v_conflict;

  IF v_conflict THEN
    RAISE EXCEPTION 'This time slot is no longer available. Please choose another time.';
  END IF;

  RETURN NEW;
END;
$function$;
