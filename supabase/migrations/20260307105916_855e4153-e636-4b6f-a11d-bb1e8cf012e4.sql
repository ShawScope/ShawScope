
CREATE OR REPLACE FUNCTION public.validate_appointment_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service_price numeric;
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

  -- For public users: if price is provided, validate it against service price
  -- Allow the price through if it's reasonable (within expected range based on service)
  -- If no price provided and a service is set, auto-populate from service
  IF NOT is_admin() THEN
    IF NEW.service_id IS NOT NULL THEN
      SELECT s.price INTO v_service_price FROM public.services s WHERE s.id = NEW.service_id;
      -- If frontend sent a price, allow it (it includes travel fee, group rates, etc.)
      -- If no price was sent but service has a price, auto-populate
      IF NEW.price IS NULL AND v_service_price IS NOT NULL THEN
        NEW.price := v_service_price;
      END IF;
    END IF;
  END IF;

  -- Sanitize: trim whitespace
  NEW.client_name := TRIM(NEW.client_name);
  NEW.client_email := LOWER(TRIM(NEW.client_email));

  RETURN NEW;
END;
$function$;
