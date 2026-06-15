
-- ============================================================
-- HEALTHCARE-LEVEL SECURITY: Lock down patient PII
-- ============================================================

-- 1. APPOINTMENTS TABLE
-- Drop the dangerous blanket SELECT policy that exposes all patient data
DROP POLICY IF EXISTS "Clients can view own appointment by token" ON public.appointments;

-- Replace with token-based access: clients can only view their own appointment
-- by providing their unique access_token via a filter
CREATE POLICY "Clients can view own appointment by access token"
  ON public.appointments FOR SELECT
  USING (
    is_admin()
    OR (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    OR (access_token::text = current_setting('request.headers', true)::json->>'x-access-token')
  );

-- Keep existing policies (admin ALL, patient view own, anyone insert) - they're fine
-- But drop the redundant "Patients can view own appointments" since we merged it above
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;


-- 2. CONSENT_FORM_RESPONSES TABLE
-- Drop the dangerous blanket SELECT policy
DROP POLICY IF EXISTS "Anyone can view consent responses" ON public.consent_form_responses;

-- Only admins and authenticated users viewing their own appointment's responses
CREATE POLICY "Secure consent response access"
  ON public.consent_form_responses FOR SELECT
  USING (
    is_admin()
    OR (
      appointment_id IN (
        SELECT id FROM appointments
        WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  );


-- 3. CREATE SECURE FUNCTION for booking page to check booked slots
-- This returns ONLY time slots (no PII) for a given date
CREATE OR REPLACE FUNCTION public.get_booked_slots(target_date date)
RETURNS TABLE(appointment_time time)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.appointment_time
  FROM public.appointments a
  WHERE a.appointment_date = target_date
    AND a.status != 'cancelled';
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_booked_slots(date) TO anon, authenticated;
