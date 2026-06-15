
-- Fix: Use appointment-level duration_minutes override when set, falling back to service duration
-- This ensures manually adjusted durations (e.g. group bookings) are respected

CREATE OR REPLACE FUNCTION public.check_appointment_overlap(
  p_date date, 
  p_time time without time zone, 
  p_duration_minutes integer, 
  p_buffer_minutes integer DEFAULT 15, 
  p_exclude_appointment_id uuid DEFAULT NULL::uuid
)
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
        AND a.status NOT IN ('cancelled', 'rejected')
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

-- Also fix get_booked_slots_with_duration to respect appointment-level duration
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
    AND a.status NOT IN ('cancelled', 'rejected');
$function$;
