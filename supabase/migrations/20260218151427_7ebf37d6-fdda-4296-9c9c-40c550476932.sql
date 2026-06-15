-- Drop existing RLS policies on appointments
DROP POLICY IF EXISTS "Admins can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can view own appointment by access token" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can insert appointments" ON public.appointments;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can manage appointments"
ON public.appointments
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Clients can view own appointment by access token"
ON public.appointments
FOR SELECT
USING (
  (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR ((access_token)::text = ((current_setting('request.headers'::text, true))::json ->> 'x-access-token'::text))
);

CREATE POLICY "Anyone can insert appointments"
ON public.appointments
FOR INSERT
WITH CHECK (true);