
-- Table to store planned/scheduled outgoing communications
CREATE TABLE public.scheduled_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  channel text NOT NULL, -- 'email' or 'sms'
  trigger_type text NOT NULL, -- 'review_request', 'cryo_followup', 'sms_reminder'
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  subject text,
  scheduled_for timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
  metadata jsonb DEFAULT '{}'::jsonb, -- e.g. week_number for cryo
  cancelled_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_communications ENABLE ROW LEVEL SECURITY;

-- Only admins can manage scheduled communications
CREATE POLICY "Admins can manage scheduled communications"
  ON public.scheduled_communications
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Index for efficient lookups
CREATE INDEX idx_scheduled_comms_status ON public.scheduled_communications(status) WHERE status = 'pending';
CREATE INDEX idx_scheduled_comms_scheduled_for ON public.scheduled_communications(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_scheduled_comms_appointment ON public.scheduled_communications(appointment_id);
