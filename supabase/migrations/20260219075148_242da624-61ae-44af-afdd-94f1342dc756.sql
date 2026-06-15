
-- Create communications log table
CREATE TABLE public.communications_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  subject text,
  body_preview text,
  trigger_type text NOT NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communications_log ENABLE ROW LEVEL SECURITY;

-- Admin only access
CREATE POLICY "Admins can manage communications log"
ON public.communications_log
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Index for faster queries
CREATE INDEX idx_communications_log_created_at ON public.communications_log(created_at DESC);
CREATE INDEX idx_communications_log_channel ON public.communications_log(channel);
CREATE INDEX idx_communications_log_recipient ON public.communications_log(recipient_email);
