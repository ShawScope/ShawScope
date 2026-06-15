
CREATE OR REPLACE FUNCTION public.patients_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- If only sync metadata changed, preserve the previous updated_at so
  -- the Google Contacts sync doesn't mark the patient as freshly changed.
  IF (NEW.google_contact_synced_at IS DISTINCT FROM OLD.google_contact_synced_at)
     AND NEW.client_name      IS NOT DISTINCT FROM OLD.client_name
     AND NEW.client_email     IS NOT DISTINCT FROM OLD.client_email
     AND NEW.client_phone     IS NOT DISTINCT FROM OLD.client_phone
     AND NEW.address          IS NOT DISTINCT FROM OLD.address
     AND NEW.date_of_birth    IS NOT DISTINCT FROM OLD.date_of_birth
     AND NEW.notes            IS NOT DISTINCT FROM OLD.notes
     AND NEW.alert_note       IS NOT DISTINCT FROM OLD.alert_note
     AND NEW.marketing_email  IS NOT DISTINCT FROM OLD.marketing_email
     AND NEW.marketing_sms    IS NOT DISTINCT FROM OLD.marketing_sms
  THEN
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.patients_set_updated_at();
