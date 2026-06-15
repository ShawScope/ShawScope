UPDATE public.sms_templates
SET body_text = 'Hi {{client_name}}, your {{service_name}} appointment on {{date}} at {{time}} has been confirmed by ShawScope. 📍 Your appointment will take place at: {{address}}, {{postcode}}. We look forward to seeing you!',
    updated_at = now()
WHERE trigger_type = 'appointment_approved';

UPDATE public.sms_templates
SET body_text = 'Hi {{client_name}}, thanks for booking with ShawScope! 📋 Your {{service_name}} request for {{date}} at {{time}} has been received — we usually approve within a few hours. 📍 Your appointment will take place at: {{address}}, {{postcode}}. 📧 Please check your email (and junk/spam folder!) Questions? Call 01305 340194. Thank you! — Matt, ShawScope',
    updated_at = now()
WHERE trigger_type = 'booking_received';
