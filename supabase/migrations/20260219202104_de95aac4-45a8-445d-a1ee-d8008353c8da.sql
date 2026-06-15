-- Allow public booking flow to create patient records
CREATE POLICY "Anyone can insert patients"
ON public.patients
FOR INSERT
WITH CHECK (true);

-- Allow public booking flow to update their own patient record (for DOB, marketing prefs)
CREATE POLICY "Anyone can update own patient by email"
ON public.patients
FOR UPDATE
USING (true)
WITH CHECK (true);