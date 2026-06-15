CREATE OR REPLACE FUNCTION public.admin_override_insert_appointment(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set the override flag for this transaction so the scheduling trigger allows overlaps
  PERFORM set_config('app.admin_override', 'true', true);
  
  INSERT INTO public.appointments (
    client_name, client_email, client_phone,
    appointment_date, appointment_time,
    notes, address, postcode, service_id, status,
    price, latitude, longitude, travel_fee, travel_distance_miles,
    locality, group_id, addon_selections, duration_minutes
  ) VALUES (
    p_payload->>'client_name',
    p_payload->>'client_email',
    p_payload->>'client_phone',
    (p_payload->>'appointment_date')::date,
    (p_payload->>'appointment_time')::time,
    p_payload->>'notes',
    p_payload->>'address',
    p_payload->>'postcode',
    CASE WHEN p_payload->>'service_id' IS NOT NULL THEN (p_payload->>'service_id')::uuid ELSE NULL END,
    COALESCE(p_payload->>'status', 'confirmed'),
    CASE WHEN p_payload->>'price' IS NOT NULL THEN (p_payload->>'price')::numeric ELSE NULL END,
    CASE WHEN p_payload->>'latitude' IS NOT NULL THEN (p_payload->>'latitude')::double precision ELSE NULL END,
    CASE WHEN p_payload->>'longitude' IS NOT NULL THEN (p_payload->>'longitude')::double precision ELSE NULL END,
    CASE WHEN p_payload->>'travel_fee' IS NOT NULL THEN (p_payload->>'travel_fee')::numeric ELSE 0 END,
    CASE WHEN p_payload->>'travel_distance_miles' IS NOT NULL THEN (p_payload->>'travel_distance_miles')::numeric ELSE NULL END,
    p_payload->>'locality',
    CASE WHEN p_payload->>'group_id' IS NOT NULL THEN (p_payload->>'group_id')::uuid ELSE NULL END,
    CASE WHEN p_payload ? 'addon_selections' THEN p_payload->'addon_selections' ELSE '[]'::jsonb END,
    CASE WHEN p_payload->>'duration_minutes' IS NOT NULL THEN (p_payload->>'duration_minutes')::integer ELSE NULL END
  );
END;
$$;