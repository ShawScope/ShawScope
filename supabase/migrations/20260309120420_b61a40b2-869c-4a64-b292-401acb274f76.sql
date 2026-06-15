
-- Update scheduling validation to skip form_only appointments
CREATE OR REPLACE FUNCTION public.validate_appointment_scheduling()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_duration integer;
  v_conflict boolean;
BEGIN
  -- Skip validation for cancelled/rejected/form_only appointments
  IF NEW.status IN ('cancelled', 'rejected', 'form_only') THEN
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

-- Exclude form_only from booked slots queries
CREATE OR REPLACE FUNCTION public.get_booked_slots_with_duration(target_date date)
 RETURNS TABLE(appointment_time time without time zone, duration_minutes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.appointment_time, 
    COALESCE(NULLIF(a.duration_minutes, 0), s.duration_minutes, 60) + COALESCE((
      SELECT SUM(COALESCE(sa.additional_duration_minutes, 0))::integer
      FROM jsonb_array_elements(COALESCE(a.addon_selections, '[]'::jsonb)) AS sel
      JOIN public.service_addons sa ON sa.id = (sel->>'addon_id')::uuid
    ), 0) as duration_minutes
  FROM public.appointments a
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.appointment_date = target_date
    AND a.status NOT IN ('cancelled', 'rejected', 'form_only');
$function$;

-- Exclude form_only from booked slots
CREATE OR REPLACE FUNCTION public.get_booked_slots(target_date date)
 RETURNS TABLE(appointment_time time without time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.appointment_time
  FROM public.appointments a
  WHERE a.appointment_date = target_date
    AND a.status NOT IN ('cancelled', 'form_only');
$function$;

-- Exclude form_only from overlap checks
CREATE OR REPLACE FUNCTION public.check_appointment_overlap(p_date date, p_time time without time zone, p_duration_minutes integer, p_buffer_minutes integer DEFAULT 15, p_exclude_appointment_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_duration_minutes < 1 OR p_duration_minutes > 480 THEN false
    WHEN p_buffer_minutes < 0 OR p_buffer_minutes > 120 THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.appointments a
      LEFT JOIN public.services s ON s.id = a.service_id
      WHERE a.appointment_date = p_date
        AND a.status NOT IN ('cancelled', 'rejected', 'form_only')
        AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
        AND (
          (EXTRACT(HOUR FROM p_time) * 60 + EXTRACT(MINUTE FROM p_time))
            < (EXTRACT(HOUR FROM a.appointment_time) * 60 + EXTRACT(MINUTE FROM a.appointment_time) 
               + COALESCE(NULLIF(a.duration_minutes, 0), s.duration_minutes, 60) 
               + COALESCE((
                   SELECT SUM(COALESCE(sa.additional_duration_minutes, 0))::integer
                   FROM jsonb_array_elements(COALESCE(a.addon_selections, '[]'::jsonb)) AS sel
                   JOIN public.service_addons sa ON sa.id = (sel->>'addon_id')::uuid
                 ), 0)
               + p_buffer_minutes)
          AND
          (EXTRACT(HOUR FROM p_time) * 60 + EXTRACT(MINUTE FROM p_time) + p_duration_minutes + p_buffer_minutes)
            > (EXTRACT(HOUR FROM a.appointment_time) * 60 + EXTRACT(MINUTE FROM a.appointment_time))
        )
    )
  END;
$function$;
