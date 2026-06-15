
CREATE TABLE public.mileage_day_submissions (
  journey_date date PRIMARY KEY,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  submitted_by uuid,
  total_miles numeric NOT NULL DEFAULT 0,
  notes text
);

ALTER TABLE public.mileage_day_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage mileage day submissions"
  ON public.mileage_day_submissions
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
