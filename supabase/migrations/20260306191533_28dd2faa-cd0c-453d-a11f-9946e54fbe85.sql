UPDATE sms_templates 
SET body_text = 'Hi {{client_name}}, thank you for choosing ShawScope! 🌟

We''d love a 5-star Google review — it makes a huge difference:
https://g.page/r/CUuuLcg7IZpbEBM/review

If you don''t think we provided a 5-star service, please let us know how we can improve — we strive to be 5 stars!
📧 matt@shaw-scope.co.uk

Thanks again,
Matt Shaw, ShawScope',
updated_at = now()
WHERE trigger_type = 'review_request';