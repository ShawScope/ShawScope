CREATE TABLE public.appointment_timings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(appointment_id)
);

ALTER TABLE public.appointment_timings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage appointment timings" ON public.appointment_timings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());