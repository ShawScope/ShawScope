
-- Create SMS templates table
CREATE TABLE public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL UNIQUE,
  body_text text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage SMS templates"
ON public.sms_templates FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_sms_templates_updated_at
BEFORE UPDATE ON public.sms_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default SMS templates
INSERT INTO public.sms_templates (trigger_type, body_text, description) VALUES
('appointment_reminder', 'Hi {{client_name}}, this is a reminder from ShawScope about your {{service_name}} appointment tomorrow ({{date}}) at {{time}}. If you need to reschedule, please reply to this message or call us. Thank you!', 'Sent the day before an appointment'),
('appointment_approved', 'Hi {{client_name}}, your {{service_name}} appointment on {{date}} at {{time}} has been confirmed by ShawScope. We look forward to seeing you!', 'Sent when an appointment is approved'),
('appointment_rejected', 'Hi {{client_name}}, unfortunately your requested appointment on {{date}} could not be accommodated. {{admin_notes}} Please visit our website to rebook. Thank you, ShawScope.', 'Sent when an appointment is rejected'),
('appointment_rescheduled', 'Hi {{client_name}}, your ShawScope appointment has been rescheduled to {{date}} at {{time}}. If this doesn''t work for you, please get in touch. Thank you!', 'Sent when an appointment is rescheduled');
