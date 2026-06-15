
-- Add price column to appointments
ALTER TABLE public.appointments ADD COLUMN price numeric NULL;

-- Create email templates table
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_type text NOT NULL UNIQUE,
  subject text NOT NULL,
  body_html text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  description text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates" ON public.email_templates FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Anyone can read active templates" ON public.email_templates FOR SELECT USING (is_active = true OR is_admin());

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.email_templates (trigger_type, subject, body_html, description) VALUES
('new_request_admin', 'New Booking Request: {{client_name}}', '<h2>New Booking Request</h2><p>A new appointment request has been submitted:</p><ul><li><strong>Client:</strong> {{client_name}}</li><li><strong>Email:</strong> {{client_email}}</li><li><strong>Phone:</strong> {{client_phone}}</li><li><strong>Service:</strong> {{service_name}}</li><li><strong>Date:</strong> {{date}}</li><li><strong>Time:</strong> {{time}}</li><li><strong>Address:</strong> {{address}}</li>{{#notes}}<li><strong>Notes:</strong> {{notes}}</li>{{/notes}}</ul><p>Log in to your admin dashboard to approve or reject this request.</p>', 'Email sent to admin when a new booking request is submitted'),
('new_request_client', 'Booking Request Received — ShawScope', '<h2>Booking Request Received</h2><p>Dear {{client_name}},</p><p>Thank you for your booking request. We will review it and get back to you shortly.</p><ul><li><strong>Service:</strong> {{service_name}}</li><li><strong>Date:</strong> {{date}}</li><li><strong>Time:</strong> {{time}}</li></ul><p>You will receive a confirmation email once your appointment is approved.</p>', 'Confirmation email sent to client after submitting a booking request'),
('approved', 'Appointment Confirmed — ShawScope', '<h2>Your Appointment is Confirmed!</h2><p>Dear {{client_name}},</p><p>Great news — your appointment has been approved:</p><ul><li><strong>Service:</strong> {{service_name}}</li><li><strong>Date:</strong> {{date}}</li><li><strong>Time:</strong> {{time}}</li></ul><p>We look forward to seeing you!</p>', 'Email sent to client when appointment is approved'),
('rejected', 'Appointment Update — ShawScope', '<h2>Appointment Update</h2><p>Dear {{client_name}},</p><p>Unfortunately, we are unable to accommodate your appointment on {{date}} at {{time}}.</p>{{#admin_notes}}<p><strong>Message:</strong> {{admin_notes}}</p>{{/admin_notes}}{{#alternative}}<p><strong>We''d like to suggest an alternative:</strong></p><ul>{{#alt_date}}<li><strong>Date:</strong> {{alt_date}}</li>{{/alt_date}}{{#alt_time}}<li><strong>Time:</strong> {{alt_time}}</li>{{/alt_time}}</ul><p>Please visit our booking page to reschedule.</p>{{/alternative}}<p>We apologise for any inconvenience. Please don''t hesitate to contact us.</p>', 'Email sent to client when appointment is rejected'),
('follow_up', 'How was your appointment? — ShawScope', '<h2>Thank You for Your Visit!</h2><p>Dear {{client_name}},</p><p>We hope your {{service_name}} appointment on {{date}} went well.</p><p>If you have any questions or feedback, please don''t hesitate to get in touch.</p><p>We look forward to seeing you again!</p>', 'Follow-up email sent after appointment completion'),
('appointment_changed', 'Appointment Updated — ShawScope', '<h2>Your Appointment Has Been Updated</h2><p>Dear {{client_name}},</p><p>Your appointment details have been updated:</p><ul><li><strong>Service:</strong> {{service_name}}</li><li><strong>Date:</strong> {{date}}</li><li><strong>Time:</strong> {{time}}</li></ul><p>If you have any questions, please contact us.</p>', 'Email sent to client when appointment details are changed');
