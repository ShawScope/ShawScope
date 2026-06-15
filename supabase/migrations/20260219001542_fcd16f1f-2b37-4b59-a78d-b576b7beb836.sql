-- Create patient activity log table
CREATE TABLE public.patient_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'system'
);

-- Enable RLS
ALTER TABLE public.patient_activity_log ENABLE ROW LEVEL SECURITY;

-- Admin only access
CREATE POLICY "Admins can manage activity log" ON public.patient_activity_log
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Index for fast lookups by email
CREATE INDEX idx_patient_activity_log_email ON public.patient_activity_log (client_email, created_at DESC);