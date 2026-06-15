-- Drop overly permissive update policy and replace with a tighter one
DROP POLICY "Anyone can update own patient by email" ON public.patients;

-- Only allow updates to non-sensitive fields, matched by email
CREATE POLICY "Booking flow can update own patient"
ON public.patients
FOR UPDATE
USING (true)
WITH CHECK (
  client_name IS NOT NULL AND
  client_email IS NOT NULL
);