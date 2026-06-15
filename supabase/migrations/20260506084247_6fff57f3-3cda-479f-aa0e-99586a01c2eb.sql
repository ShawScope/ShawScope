INSERT INTO public.email_templates (trigger_type, subject, body_html, description, is_active)
VALUES (
  'morning_reminder_clinic',
  'Your ShawScope Appointment Today at {{time}}',
  '<div style="text-align:center;margin-bottom:20px;"><div style="font-size:40px;">🏠</div><h2 style="color:#0E1420;margin:8px 0 6px;">Your Appointment is Today!</h2><p style="color:#6B7280;margin:0;">Hi {{client_name}}, your {{service_name}} is today at <strong>{{time}}</strong> at our Broadmayne location.</p></div><div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:20px;"><p style="color:#0E1420;font-size:14px;margin:0 0 12px;font-weight:600;">📍 Before you arrive:</p><p style="color:#0E1420;font-size:14px;margin:0 0 8px;"><strong>⏳ Please wait for our ready text</strong></p><p style="color:#6B7280;font-size:13px;margin:0 0 16px;">Please don''t arrive until you''ve received a text or email from us confirming we''re ready. If you haven''t heard from us, plan to arrive at your booked time of {{time}}.</p><p style="color:#0E1420;font-size:14px;margin:0 0 8px;"><strong>📍 Track Your Appointment</strong></p><p style="color:#6B7280;font-size:13px;margin:0 0 12px;">See where your appointment is in today''s schedule and whether we''re running on time.</p><p style="text-align:center;margin:16px 0 0;"><a href="{{tracking_url}}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">📍  Track Your Appointment</a></p></div>',
  'Morning reminder for clinic (Coming to Me) appointments',
  true
)
ON CONFLICT (trigger_type) DO NOTHING;

INSERT INTO public.sms_templates (trigger_type, body_text, description, is_active)
VALUES (
  'morning_reminder_clinic',
  'Hi {{client_name}}, your {{service_name}} is today at {{time}} at our Broadmayne location.

⏳ Please wait for our ready text before arriving. If you don''t hear from us, plan to arrive at {{time}}.

Track your appointment: {{tracking_url}}

Questions? 01305 340194

ShawScope',
  'Morning reminder SMS for clinic (Coming to Me) appointments',
  true
)
ON CONFLICT (trigger_type) DO NOTHING;