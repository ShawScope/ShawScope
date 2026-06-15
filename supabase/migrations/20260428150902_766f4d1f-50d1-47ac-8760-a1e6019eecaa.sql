CREATE OR REPLACE FUNCTION public.admin_override_update_appointment(p_appointment_id uuid, p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.admin_override', 'true', true);
  
  UPDATE public.appointments SET
    client_name = COALESCE(p_payload->>'client_name', client_name),
    client_email = COALESCE(p_payload->>'client_email', client_email),
    client_phone = p_payload->>'client_phone',
    appointment_date = COALESCE((p_payload->>'appointment_date')::date, appointment_date),
    appointment_time = COALESCE((p_payload->>'appointment_time')::time, appointment_time),
    notes = p_payload->>'notes',
    address = p_payload->>'address',
    postcode = p_payload->>'postcode',
    service_id = CASE WHEN p_payload->>'service_id' IS NOT NULL THEN (p_payload->>'service_id')::uuid ELSE service_id END,
    status = COALESCE(p_payload->>'status', status),
    price = CASE WHEN p_payload->>'price' IS NOT NULL THEN (p_payload->>'price')::numeric ELSE price END,
    latitude = CASE WHEN p_payload->>'latitude' IS NOT NULL THEN (p_payload->>'latitude')::double precision ELSE latitude END,
    longitude = CASE WHEN p_payload->>'longitude' IS NOT NULL THEN (p_payload->>'longitude')::double precision ELSE longitude END,
    travel_fee = CASE WHEN p_payload->>'travel_fee' IS NOT NULL THEN (p_payload->>'travel_fee')::numeric ELSE travel_fee END,
    travel_distance_miles = CASE WHEN p_payload->>'travel_distance_miles' IS NOT NULL THEN (p_payload->>'travel_distance_miles')::numeric ELSE travel_distance_miles END,
    locality = p_payload->>'locality',
    duration_minutes = CASE WHEN p_payload->>'duration_minutes' IS NOT NULL THEN (p_payload->>'duration_minutes')::integer ELSE duration_minutes END,
    admin_notes = CASE WHEN p_payload ? 'admin_notes' THEN p_payload->>'admin_notes' ELSE admin_notes END,
    addon_selections = CASE WHEN p_payload ? 'addon_selections' THEN p_payload->'addon_selections' ELSE addon_selections END,
    ready_from_time = CASE WHEN p_payload->>'ready_from_time' IS NOT NULL THEN (p_payload->>'ready_from_time')::time ELSE ready_from_time END,
    come_to_practitioner = CASE WHEN p_payload ? 'come_to_practitioner' THEN (p_payload->>'come_to_practitioner')::boolean ELSE come_to_practitioner END
  WHERE id = p_appointment_id;
END;
$function$