
-- Drop all existing policies on appointments and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can view own appointment by access token" ON public.appointments;
DROP POLICY IF EXISTS "Admins can do everything with appointments" ON public.appointments;

-- Recreate as PERMISSIVE
CREATE POLICY "Anyone can insert appointments"
  ON public.appointments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Clients can view own appointment by access token"
  ON public.appointments
  FOR SELECT
  TO public
  USING (
    is_admin() OR 
    (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())) OR 
    ((access_token)::text = ((current_setting('request.headers'::text, true))::json ->> 'x-access-token'::text))
  );

CREATE POLICY "Admins can do everything with appointments"
  ON public.appointments
  FOR ALL
  TO public
  USING (is_admin())
  WITH CHECK (is_admin());
