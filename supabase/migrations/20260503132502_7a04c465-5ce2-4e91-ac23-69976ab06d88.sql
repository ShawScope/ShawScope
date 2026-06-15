ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS relationship_to_patient_id uuid NULL,
  ADD COLUMN IF NOT EXISTS relationship_label text NULL;

CREATE INDEX IF NOT EXISTS idx_patients_relationship_to_patient_id
  ON public.patients(relationship_to_patient_id);