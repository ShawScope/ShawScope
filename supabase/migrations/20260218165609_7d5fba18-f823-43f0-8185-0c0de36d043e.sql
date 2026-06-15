
-- Create a function to check for appointment time overlaps
-- Returns TRUE if the proposed time conflicts with existing appointments
CREATE OR REPLACE FUNCTION public.check_appointment_overlap(
  p_date date,
  p_time time,
  p_duration_minutes integer,
  p_buffer_minutes integer DEFAULT 15,
  p_exclude_appointment_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    LEFT JOIN public.services s ON s.id = a.service_id
    WHERE a.appointment_date = p_date
      AND a.status NOT IN ('cancelled', 'rejected')
      AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
      AND (
        -- Convert times to minutes for overlap check
        -- New slot: [p_time, p_time + p_duration + buffer)
        -- Existing slot: [existing_time, existing_time + existing_duration + buffer)
        (EXTRACT(HOUR FROM p_time) * 60 + EXTRACT(MINUTE FROM p_time))
          < (EXTRACT(HOUR FROM a.appointment_time) * 60 + EXTRACT(MINUTE FROM a.appointment_time) + COALESCE(s.duration_minutes, 60) + p_buffer_minutes)
        AND
        (EXTRACT(HOUR FROM p_time) * 60 + EXTRACT(MINUTE FROM p_time) + p_duration_minutes + p_buffer_minutes)
          > (EXTRACT(HOUR FROM a.appointment_time) * 60 + EXTRACT(MINUTE FROM a.appointment_time))
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_appointment_overlap(date, time, integer, integer, uuid) TO anon, authenticated;

-- Also update get_booked_slots to return duration info
CREATE OR REPLACE FUNCTION public.get_booked_slots_with_duration(target_date date)
RETURNS TABLE(appointment_time time, duration_minutes integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.appointment_time, COALESCE(s.duration_minutes, 60) as duration_minutes
  FROM public.appointments a
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.appointment_date = target_date
    AND a.status NOT IN ('cancelled', 'rejected');
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_slots_with_duration(date) TO anon, authenticated;
