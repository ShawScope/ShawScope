
-- Allow hearing screenings without a patient (general test mode)
ALTER TABLE public.hearing_screenings ALTER COLUMN patient_id DROP NOT NULL;

-- Drop the existing foreign key if it exists
ALTER TABLE public.hearing_screenings DROP CONSTRAINT IF EXISTS hearing_screenings_patient_id_fkey;

-- Re-add as optional foreign key
ALTER TABLE public.hearing_screenings ADD CONSTRAINT hearing_screenings_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;
