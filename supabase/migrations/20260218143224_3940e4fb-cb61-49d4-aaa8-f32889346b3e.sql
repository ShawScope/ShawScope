
-- Add form_type column to distinguish consent forms from consultation forms
ALTER TABLE public.consent_form_templates 
ADD COLUMN form_type text NOT NULL DEFAULT 'consent';

-- Add index for filtering by form_type
CREATE INDEX idx_consent_form_templates_form_type ON public.consent_form_templates(form_type);

-- Insert Earwax Removal consultation form
INSERT INTO public.consent_form_templates (title, description, form_type, fields) VALUES (
  'Earwax Removal - Consultation Form',
  'Procedure form completed by the practitioner during earwax removal appointments.',
  'consultation',
  '[
    {"label": "Olive Oil Compliance", "type": "checkbox", "required": false},
    {"label": "Days of Oil Use", "type": "text", "required": false},
    {"label": "Ear(s) Examined", "type": "text", "required": true},
    {"label": "Otoscopy Findings (Pre-procedure)", "type": "textarea", "required": true},
    {"label": "Contraindications Checked", "type": "checkbox", "required": true},
    {"label": "Contraindication Notes", "type": "textarea", "required": false},
    {"label": "Method Used", "type": "text", "required": true},
    {"label": "Equipment Used", "type": "text", "required": true},
    {"label": "Irrigation Pressure / Suction Settings", "type": "text", "required": false},
    {"label": "Tips Used", "type": "text", "required": false},
    {"label": "Wax Type / Consistency", "type": "text", "required": false},
    {"label": "Canal Condition", "type": "textarea", "required": false},
    {"label": "Otoscopy Findings (Post-procedure)", "type": "textarea", "required": true},
    {"label": "Outcome", "type": "textarea", "required": true},
    {"label": "Complications", "type": "textarea", "required": false},
    {"label": "Aftercare Advice Given", "type": "textarea", "required": false},
    {"label": "Follow-up Required", "type": "checkbox", "required": false},
    {"label": "Follow-up Notes", "type": "textarea", "required": false},
    {"label": "Completed By", "type": "text", "required": true}
  ]'::jsonb
);

-- Insert Cryotherapy consultation form
INSERT INTO public.consent_form_templates (title, description, form_type, fields) VALUES (
  'Cryotherapy - Consultation Form',
  'Procedure form completed by the practitioner during cryotherapy skin lesion treatment.',
  'consultation',
  '[
    {"label": "Lesion Location", "type": "text", "required": true},
    {"label": "Lesion Size (mm)", "type": "text", "required": true},
    {"label": "Lesion Type / Description", "type": "textarea", "required": true},
    {"label": "Fitzpatrick Skin Type", "type": "text", "required": false},
    {"label": "Number of Freeze Cycles", "type": "text", "required": true},
    {"label": "Freeze Time (seconds per cycle)", "type": "text", "required": true},
    {"label": "Equipment Used", "type": "text", "required": true},
    {"label": "Patient Response During Treatment", "type": "textarea", "required": false},
    {"label": "Immediate Post-Treatment Appearance", "type": "textarea", "required": true},
    {"label": "Complications", "type": "textarea", "required": false},
    {"label": "Before Photo Uploaded", "type": "checkbox", "required": false},
    {"label": "After Photo Uploaded", "type": "checkbox", "required": false},
    {"label": "Photo Notes", "type": "textarea", "required": false},
    {"label": "Aftercare Advice Given", "type": "textarea", "required": false},
    {"label": "Follow-up Required", "type": "checkbox", "required": false},
    {"label": "Follow-up Notes", "type": "textarea", "required": false},
    {"label": "Completed By", "type": "text", "required": true}
  ]'::jsonb
);

-- Insert Wellness Check consultation form
INSERT INTO public.consent_form_templates (title, description, form_type, fields) VALUES (
  'Wellness Check - Consultation Form',
  'Procedure form completed by the practitioner during wellness check appointments.',
  'consultation',
  '[
    {"label": "Presenting Complaint", "type": "textarea", "required": true},
    {"label": "Medical History", "type": "textarea", "required": false},
    {"label": "Current Medications", "type": "textarea", "required": false},
    {"label": "Allergies", "type": "textarea", "required": false},
    {"label": "Examination Findings", "type": "textarea", "required": true},
    {"label": "Procedure / Assessment Performed", "type": "textarea", "required": true},
    {"label": "Equipment Used", "type": "text", "required": false},
    {"label": "Outcome / Result", "type": "textarea", "required": true},
    {"label": "Complications", "type": "textarea", "required": false},
    {"label": "Aftercare Advice Given", "type": "textarea", "required": false},
    {"label": "Follow-up Required", "type": "checkbox", "required": false},
    {"label": "Follow-up Notes", "type": "textarea", "required": false},
    {"label": "Completed By", "type": "text", "required": true}
  ]'::jsonb
);

-- Insert Foot Care consultation form
INSERT INTO public.consent_form_templates (title, description, form_type, fields) VALUES (
  'Foot Care - Consultation Form',
  'Procedure form completed by the practitioner during foot care treatment appointments.',
  'consultation',
  '[
    {"label": "Presenting Complaint", "type": "textarea", "required": true},
    {"label": "Medical History", "type": "textarea", "required": false},
    {"label": "Current Medications", "type": "textarea", "required": false},
    {"label": "Allergies", "type": "textarea", "required": false},
    {"label": "Examination Findings", "type": "textarea", "required": true},
    {"label": "Treatment Performed", "type": "textarea", "required": true},
    {"label": "Equipment Used", "type": "text", "required": false},
    {"label": "Outcome", "type": "textarea", "required": true},
    {"label": "Complications", "type": "textarea", "required": false},
    {"label": "Aftercare Advice Given", "type": "textarea", "required": false},
    {"label": "Follow-up Required", "type": "checkbox", "required": false},
    {"label": "Follow-up Notes", "type": "textarea", "required": false},
    {"label": "Completed By", "type": "text", "required": true}
  ]'::jsonb
);
