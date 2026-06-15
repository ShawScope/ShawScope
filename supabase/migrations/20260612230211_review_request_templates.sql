INSERT INTO public.sms_templates (trigger_type, body_text, description, is_active)
VALUES (
  'review_request',
  E'Hi {{client_name}}, thank you for choosing ShawScope! 🌟\n\nWe''d love a 5-star Google review — it makes a huge difference: https://g.page/r/CUuuLcg7IZpbEBM/review\n\nIf you don''t think we provided a 5-star service, please let us know how we can improve — we strive to be 5 stars!\n📧 matt@shaw-scope.co.uk\n\nThanks again,\nMatt Shaw, ShawScope',
  'Sent ~24h after a completed appointment asking for a Google review.',
  true
)
ON CONFLICT DO NOTHING;

INSERT INTO public.email_templates (trigger_type, subject, body_html, description, is_active)
VALUES (
  'review_request',
  'How did we do, {{client_name}}? — ShawScope',
  '<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55;max-width:560px;margin:0 auto;padding:24px;"><h2 style="color:#0f172a;margin:0 0 16px;">Thank you for choosing ShawScope! 🌟</h2><p>Hi {{client_name}},</p><p>It was a pleasure looking after you. If we delivered a 5-star service, we''d be so grateful if you could share a quick Google review — it genuinely makes a huge difference to a small home-visiting service like ours.</p><p style="text-align:center;margin:28px 0;"><a href="https://g.page/r/CUuuLcg7IZpbEBM/review" style="background:#D4912A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;display:inline-block;">Leave a 5-star Google review</a></p><p>If you don''t feel we earned 5 stars, please tell us how we can improve — we strive to be 5 stars every visit. Just reply or email <a href="mailto:matt@shaw-scope.co.uk" style="color:#D4912A;">matt@shaw-scope.co.uk</a>.</p><p style="margin-top:24px;">Thanks again,<br/><strong>Matt Shaw</strong><br/>ShawScope — A Home Visiting Service</p></div>',
  'Sent ~24h after a completed appointment asking for a Google review.',
  true
)
ON CONFLICT DO NOTHING;
