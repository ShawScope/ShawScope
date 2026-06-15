
-- Create patient_recalls table
CREATE TABLE public.patient_recalls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  service_name TEXT,
  recall_months INTEGER NOT NULL CHECK (recall_months >= 1 AND recall_months <= 36),
  recall_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.patient_recalls ENABLE ROW LEVEL SECURITY;

-- Admin only access
CREATE POLICY "Admins can manage recalls"
  ON public.patient_recalls
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
