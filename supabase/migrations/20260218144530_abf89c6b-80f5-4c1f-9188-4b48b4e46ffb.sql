
-- Add consent_sent_at to track when consent forms were emailed
ALTER TABLE public.appointments ADD COLUMN consent_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create Wellness Check Consent Form
INSERT INTO public.consent_form_templates (title, description, form_type, fields) VALUES (
  'Wellness Check Consent Form',
  'Please complete this form before your wellness check appointment. All information is kept confidential.',
  'consent',
  '[
    {"label": "Full Name", "type": "text", "required": true},
    {"label": "Date of Birth", "type": "text", "required": true},
    {"label": "GP Name & Surgery", "type": "text", "required": true},
    {"label": "Do you have any known allergies?", "type": "textarea", "required": false},
    {"label": "Are you currently taking any medications?", "type": "textarea", "required": false},
    {"label": "Please list any relevant medical history", "type": "textarea", "required": false},
    {"label": "Do you have any mobility or accessibility needs?", "type": "text", "required": false},
    {"label": "I understand the nature of the wellness check and what it involves", "type": "checkbox", "required": true},
    {"label": "I confirm the information provided is accurate to the best of my knowledge", "type": "checkbox", "required": true},
    {"label": "I consent to the wellness check being carried out", "type": "checkbox", "required": true},
    {"label": "Patient Signature", "type": "signature", "required": true}
  ]'::jsonb
);

-- Create Foot Care Consent Form
INSERT INTO public.consent_form_templates (title, description, form_type, fields) VALUES (
  'Foot Care Consent Form',
  'Please complete this form before your foot care appointment. All information is kept confidential.',
  'consent',
  '[
    {"label": "Full Name", "type": "text", "required": true},
    {"label": "Date of Birth", "type": "text", "required": true},
    {"label": "GP Name & Surgery", "type": "text", "required": true},
    {"label": "Do you have diabetes?", "type": "text", "required": true},
    {"label": "Do you have any circulatory problems?", "type": "text", "required": false},
    {"label": "Are you on blood-thinning medication (e.g. Warfarin)?", "type": "text", "required": true},
    {"label": "Do you have any known allergies?", "type": "textarea", "required": false},
    {"label": "Are you currently taking any other medications?", "type": "textarea", "required": false},
    {"label": "Do you have any fungal nail or skin infections?", "type": "text", "required": false},
    {"label": "Please list any relevant medical history", "type": "textarea", "required": false},
    {"label": "I understand the nature of the foot care treatment and what it involves", "type": "checkbox", "required": true},
    {"label": "I understand the risks including minor discomfort, bleeding, and infection", "type": "checkbox", "required": true},
    {"label": "I confirm the information provided is accurate to the best of my knowledge", "type": "checkbox", "required": true},
    {"label": "I consent to the foot care treatment being carried out", "type": "checkbox", "required": true},
    {"label": "Patient Signature", "type": "signature", "required": true}
  ]'::jsonb
);

-- Link consent forms to services (update Wellness Check and Foot Care)
UPDATE public.services SET consent_form_template_id = (
  SELECT id FROM public.consent_form_templates WHERE title = 'Wellness Check Consent Form' LIMIT 1
) WHERE name = 'Wellness Check';

UPDATE public.services SET consent_form_template_id = (
  SELECT id FROM public.consent_form_templates WHERE title = 'Foot Care Consent Form' LIMIT 1
) WHERE name = 'Foot Care Treatment';
