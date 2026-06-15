UPDATE email_templates 
SET body_html = '<div style="font-family: Georgia, ''Times New Roman'', serif; max-width: 600px; margin: 0 auto; padding: 0;">
<div style="background-color: #292524; padding: 20px 24px; text-align: center;">
  <h1 style="color: #FAFAF9; font-size: 18px; letter-spacing: 2px; margin: 0; text-transform: uppercase;">ShawScope</h1>
</div>
<div style="padding: 32px 24px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; font-size: 28px; text-align: center;">⭐</div>
    <h2 style="color: #292524; margin: 12px 0 4px; font-size: 22px;">How Was Your Experience?</h2>
    <p style="color: #78716c; margin: 0; font-size: 14px;">Hi {{client_name}} — thank you for choosing ShawScope!</p>
  </div>

  <div style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 12px; padding: 24px 20px; margin-bottom: 24px; text-align: center;">
    <div style="font-size: 32px; margin-bottom: 8px;">🌟</div>
    <h3 style="color: #713f12; margin: 0 0 8px; font-size: 16px; font-weight: bold;">We''d Love a 5-Star Review!</h3>
    <p style="color: #92400e; font-size: 13px; margin: 0 0 20px; line-height: 1.5;">If you were happy with your treatment, a quick 5-star Google review would mean the world to us. It helps other patients find quality care.</p>
    <a href="https://g.page/r/CUuuLcg7IZpbEBM/review" style="display: inline-block; padding: 14px 36px; background-color: #292524; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">Leave a 5-Star Google Review ⭐</a>
  </div>

  <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 20px; margin-bottom: 24px; text-align: center;">
    <div style="font-size: 24px; margin-bottom: 8px;">💬</div>
    <h3 style="color: #44403c; margin: 0 0 8px; font-size: 15px; font-weight: bold;">Not 5 Stars?</h3>
    <p style="color: #78716c; font-size: 13px; margin: 0; line-height: 1.5;">If you don''t think we provided a 5-star service, please let us know how we can improve — we strive to be 5 stars! Contact us at <a href="mailto:matt@shaw-scope.co.uk" style="color: #2563eb; text-decoration: none; font-weight: bold;">matt@shaw-scope.co.uk</a></p>
  </div>

  <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
    <div style="font-size: 24px; margin-bottom: 8px;">👍</div>
    <h3 style="color: #1e40af; margin: 0 0 8px; font-size: 15px; font-weight: bold;">Follow Us on Facebook</h3>
    <p style="color: #3b82f6; font-size: 13px; margin: 0 0 16px; line-height: 1.5;">Stay updated with news and offers.</p>
    <a href="https://www.facebook.com/shawscope" style="display: inline-block; padding: 12px 32px; background-color: #1877F2; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Follow on Facebook</a>
  </div>

  <p style="color: #78716c; font-size: 14px; text-align: center; margin-bottom: 0;">Thanks again for your support, {{client_name}}!</p>
  <p style="color: #a8a29e; font-size: 13px; text-align: center; margin-top: 4px;"><strong>Matt Shaw</strong> · ShawScope</p>
</div>
<div style="background-color: #292524; padding: 16px 24px; text-align: center;">
  <p style="color: #a8a29e; font-size: 11px; margin: 0;">ShawScope Healthcare · Dorchester, Dorset</p>
</div>
</div>',
updated_at = now()
WHERE trigger_type = 'review_request';