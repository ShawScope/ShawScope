
-- Fix: The "Anyone can insert" policy must be PERMISSIVE so unauthenticated users can book
-- Drop the restrictive one and recreate as permissive
DROP POLICY "Anyone can insert appointments" ON public.appointments;

CREATE POLICY "Anyone can insert appointments"
  ON public.appointments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also make the select policy permissive so clients can view via access token
DROP POLICY "Clients can view own appointment by access token" ON public.appointments;

CREATE POLICY "Clients can view own appointment by access token"
  ON public.appointments
  FOR SELECT
  TO anon, authenticated
  USING (
    is_admin()
    OR (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
    OR ((access_token)::text = ((current_setting('request.headers'::text, true))::json ->> 'x-access-token'::text))
  );

-- Make admin policy permissive too
DROP POLICY "Admins can do everything with appointments" ON public.appointments;

CREATE POLICY "Admins can do everything with appointments"
  ON public.appointments
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
