
-- Create consultation_notes table for clinical records filled by admin during appointments
CREATE TABLE public.consultation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  
  -- Patient history
  presenting_complaint TEXT,
  medical_history TEXT,
  current_medications TEXT,
  allergies TEXT,
  
  -- Examination / Procedure
  examination_findings TEXT,
  procedure_performed TEXT,
  procedure_notes TEXT,
  equipment_used TEXT,
  
  -- Outcomes
  outcome TEXT,
  complications TEXT,
  
  -- Aftercare
  aftercare_advice TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  
  -- Consent checkboxes
  verbal_consent_gained BOOLEAN DEFAULT false,
  written_consent_gained BOOLEAN DEFAULT false,
  risks_explained BOOLEAN DEFAULT false,
  patient_understood BOOLEAN DEFAULT false,
  
  -- Meta
  completed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultation_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage consultation notes
CREATE POLICY "Admins can manage consultation notes"
  ON public.consultation_notes
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_consultation_notes_updated_at
  BEFORE UPDATE ON public.consultation_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
