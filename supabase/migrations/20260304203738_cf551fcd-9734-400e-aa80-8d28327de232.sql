
CREATE TABLE public.ai_diagnostic_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name text,
  patient_email text,
  input_notes text,
  image_count integer NOT NULL DEFAULT 0,
  presenting_complaint text,
  examination_findings text,
  differential_considerations text[],
  suggested_procedure text,
  precautions text,
  equipment_suggested text,
  aftercare_advice text,
  patient_friendly_summary text,
  raw_ai_response jsonb
);

ALTER TABLE public.ai_diagnostic_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI diagnostic assessments"
  ON public.ai_diagnostic_assessments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
