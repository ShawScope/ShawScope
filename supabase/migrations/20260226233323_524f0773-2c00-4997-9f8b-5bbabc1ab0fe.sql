
CREATE OR REPLACE FUNCTION public.get_booked_slots_with_duration(target_date date)
 RETURNS TABLE(appointment_time time without time zone, duration_minutes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.appointment_time, 
    COALESCE(s.duration_minutes, 60) + COALESCE((
      SELECT SUM(COALESCE(sa.additional_duration_minutes, 0))::integer
      FROM jsonb_array_elements(COALESCE(a.addon_selections, '[]'::jsonb)) AS sel
      JOIN public.service_addons sa ON sa.id = (sel->>'addon_id')::uuid
    ), 0) as duration_minutes
  FROM public.appointments a
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.appointment_date = target_date
    AND a.status NOT IN ('cancelled', 'rejected');
$function$;
