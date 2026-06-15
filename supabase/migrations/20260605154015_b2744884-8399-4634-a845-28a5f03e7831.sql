UPDATE public.sms_templates
SET body_text = 'Hi {{client_name}}, your ShawScope booking request for {{date}} at {{time}} has been received 👂\nPlease check your email/junk for updates.\n— Matt, ShawScope (no reply)',
    updated_at = now()
WHERE trigger_type = 'booking_received' AND is_active = true;