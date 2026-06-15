-- Allow public booking flow to insert agreement logs
CREATE POLICY "Anyone can insert activity logs"
ON public.patient_activity_log
FOR INSERT
WITH CHECK (true);