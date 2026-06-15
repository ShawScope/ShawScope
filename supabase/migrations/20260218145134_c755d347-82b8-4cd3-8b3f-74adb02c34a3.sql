
-- Fix: The appointments RLS policies are all RESTRICTIVE, which means access is denied
-- because PostgreSQL requires at least one PERMISSIVE policy to pass.
-- Change the SELECT and INSERT policies to PERMISSIVE so patients can view their
-- appointments via access_token and submit bookings.

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Clients can view own appointment by access token" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can do everything with appointments" ON public.appointments;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Clients can view own appointment by access token"
ON public.appointments
FOR SELECT
USING (
  is_admin() 
  OR (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR ((access_token)::text = ((current_setting('request.headers'::text, true))::json ->> 'x-access-token'::text))
);

CREATE POLICY "Anyone can insert appointments"
ON public.appointments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can do everything with appointments"
ON public.appointments
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
