
-- Update new_request_client template
UPDATE public.email_templates SET body_html = '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">Mobile Ear Care &amp; Cryotherapy</p>
    </div>
    <div style="padding:32px 28px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:32px;margin:0 0 12px;">📨</div>
        <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">Booking Request Received</h2>
        <p style="color:#6B7280;margin:0;font-size:14px;">Thank you, {{client_name}} — we''ve received your request.</p>
      </div>
      <div style="background-color:#FEF9F0;border:1px solid #F5E6CC;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0 0 4px;font-size:12px;color:#92400E;font-weight:600;">⏳ What Happens Next?</p>
        <p style="margin:0;font-size:13px;color:#4B5563;">We''ll review your request and send you a confirmation email once it''s approved. This is usually within a few hours.</p>
      </div>
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;">📋</td><td style="padding:10px 0;color:#6B7280;font-size:14px;">Service</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;">{{service_name}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📅</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Requested Date</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{date}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">🕐</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Requested Time</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{time}}</td></tr>
          {{#has_price}}<tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">💷</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Estimated Price</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{#has_discount}}<span style="text-decoration:line-through;color:#9CA3AF;margin-right:6px;">{{original_price}}</span>{{/has_discount}}{{price}}</td></tr>{{/has_price}}
        </table>
      </div>
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;margin-bottom:20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#6B7280;font-weight:600;">📬 Check your junk/spam folder</p>
        <p style="margin:0;font-size:12px;color:#9CA3AF;">Our confirmation email may end up there — please add bookings@shaw-scope.co.uk to your contacts.</p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="{{cancel_url}}" style="display:inline-block;background-color:#fef2f2;color:#dc2626;text-decoration:none;padding:10px 24px;border:1px solid #fecaca;border-radius:10px;font-size:13px;font-weight:600;">Cancel This Appointment</a>
      </div>
      <div style="border-top:1px solid #E5E7EB;margin:24px 0 0;padding-top:20px;text-align:center;">
        <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/><a href="mailto:matt@shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shaw-scope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
      </div>
    </div>
    <div style="background-color:#0E1420;padding:16px 24px;text-align:center;margin-top:24px;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Dorchester, Dorset · <a href="https://shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;">shaw-scope.co.uk</a></p>
    </div>
  </div>
</body></html>', updated_at = now()
WHERE trigger_type = 'new_request_client';

-- Update approved template
UPDATE public.email_templates SET body_html = '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">Mobile Ear Care &amp; Cryotherapy</p>
    </div>
    <div style="padding:32px 28px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:32px;margin:0 0 12px;">✅</div>
        <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">Appointment Confirmed!</h2>
        <p style="color:#6B7280;margin:0;font-size:14px;">Great news, {{client_name}} — your appointment has been approved.</p>
      </div>
      {{#has_consent_form}}
      <div style="background-color:#fefce8;border:2px solid #eab308;border-radius:12px;padding:24px 20px;margin-bottom:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">📝</div>
        <h3 style="color:#713f12;margin:0 0 6px;font-size:18px;font-weight:bold;">Consent Form for {{client_name}}</h3>
        <p style="color:#92400e;font-size:13px;margin:0 0 16px;line-height:1.5;">⚠️ Please complete this <strong>as soon as possible</strong> — ideally before your appointment day.</p>
        <a href="{{consent_form_url}}" style="display:inline-block;padding:16px 40px;background-color:#D4912A;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:15px;">Complete Consent Form Now →</a>
        <p style="color:#a16207;font-size:11px;margin:14px 0 0;">If the button doesn''t work, copy and paste:<br/>{{consent_form_url}}</p>
      </div>
      {{/has_consent_form}}
      {{#is_group}}
      <div style="background-color:#FEF9F0;border:1px solid #F5E6CC;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0;font-size:13px;color:#92400E;">👥 This is a <strong>group booking for {{group_size}} people</strong>. Each person will receive their own confirmation and consent form.</p>
      </div>
      {{/is_group}}
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;">👤</td><td style="padding:10px 0;color:#6B7280;font-size:14px;">Name</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;">{{client_name}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📋</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Service</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{service_name}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📅</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Date</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{date}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">🕐</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Time</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{time}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📍</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Address</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{address}}</td></tr>
          {{#has_price}}<tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">💷</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Price</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{#has_discount}}<span style="text-decoration:line-through;color:#9CA3AF;font-size:12px;margin-right:6px;">{{original_price}}</span>{{/has_discount}}{{price}}{{#has_discount}} <span style="color:#16a34a;font-size:11px;font-weight:normal;">(group discount)</span>{{/has_discount}}</td></tr>{{/has_price}}
        </table>
      </div>
      <div style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0 0 4px;font-size:12px;color:#dc2626;font-weight:600;">🚗 Travel Note</p>
        <p style="margin:0;font-size:13px;color:#4B5563;">We aim to arrive on time, but please allow <strong>±15 minutes</strong> for travel variability.</p>
      </div>
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;margin-bottom:20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#6B7280;font-weight:600;">💳 Payment Methods</p>
        <p style="margin:0;font-size:13px;color:#0E1420;">💷 Cash – no fee · 🏦 Bank Transfer – no fee</p>
        <p style="margin:4px 0 0;font-size:12px;color:#0E1420;">💳 Card – 1.69% fee · 📄 Invoice – 2.5% fee</p>
        <p style="margin:4px 0 0;font-size:10px;color:#9CA3AF;">We prefer Cash or Bank Transfer — details provided after your appointment</p>
      </div>
      <div style="border-top:1px solid #E5E7EB;margin:24px 0 0;padding-top:20px;text-align:center;">
        <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/><a href="mailto:matt@shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shaw-scope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
      </div>
    </div>
    <div style="background-color:#0E1420;padding:16px 24px;text-align:center;margin-top:24px;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Dorchester, Dorset · <a href="https://shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;">shaw-scope.co.uk</a></p>
    </div>
  </div>
</body></html>', updated_at = now()
WHERE trigger_type = 'approved';

-- Update new_request_admin template
UPDATE public.email_templates SET body_html = '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">Admin Notification</p>
    </div>
    <div style="padding:32px 28px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:32px;margin:0 0 12px;">🔔</div>
        <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">New Booking Request</h2>
        <p style="color:#6B7280;margin:0;font-size:14px;">A new appointment request needs your review.</p>
      </div>
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;">👤</td><td style="padding:10px 0;color:#6B7280;font-size:14px;">Client</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;">{{client_name}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📧</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Email</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{client_email}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📱</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Phone</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{client_phone}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📋</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Service</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{service_name}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📅</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Date</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{date}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">🕐</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Time</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{time}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📍</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Address</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{address}}</td></tr>
        </table>
      </div>
      {{#notes}}
      <div style="background-color:#FEF9F0;border:1px solid #F5E6CC;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0 0 4px;font-size:12px;color:#92400E;font-weight:600;">📝 Patient Notes</p>
        <p style="margin:0;font-size:13px;color:#4B5563;">{{notes}}</p>
      </div>
      {{/notes}}
      <div style="text-align:center;margin:24px 0;">
        <a href="https://shawscope.lovable.app/admin" style="display:inline-block;background-color:#D4912A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">Open Admin Dashboard →</a>
      </div>
    </div>
    <div style="background-color:#0E1420;padding:16px 24px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Admin Notification</p>
    </div>
  </div>
</body></html>', updated_at = now()
WHERE trigger_type = 'new_request_admin';

-- Update cancelled template
UPDATE public.email_templates SET body_html = '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">Mobile Ear Care &amp; Cryotherapy</p>
    </div>
    <div style="padding:32px 28px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:32px;margin:0 0 12px;">❌</div>
        <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">Appointment Cancelled</h2>
        <p style="color:#6B7280;margin:0;font-size:14px;">Hi {{client_name}}, your appointment has been cancelled.</p>
      </div>
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;">🩺</td><td style="padding:10px 0;color:#6B7280;font-size:14px;">Service</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;">{{service_name}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📅</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Date</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{date}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">🕐</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Time</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{time}}</td></tr>
        </table>
      </div>
      <p style="color:#6B7280;font-size:14px;text-align:center;">If you did not request this cancellation or would like to rebook, please get in touch.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://shaw-scope.co.uk/booking" style="display:inline-block;background-color:#D4912A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">Book a New Appointment →</a>
      </div>
      <div style="border-top:1px solid #E5E7EB;margin:24px 0 0;padding-top:20px;text-align:center;">
        <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/><a href="mailto:matt@shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shaw-scope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
      </div>
    </div>
    <div style="background-color:#0E1420;padding:16px 24px;text-align:center;margin-top:24px;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Dorchester, Dorset · <a href="https://shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;">shaw-scope.co.uk</a></p>
    </div>
  </div>
</body></html>', updated_at = now()
WHERE trigger_type = 'cancelled';

-- Update rejected template
UPDATE public.email_templates SET body_html = '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">Mobile Ear Care &amp; Cryotherapy</p>
    </div>
    <div style="padding:32px 28px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:32px;margin:0 0 12px;">📋</div>
        <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">Appointment Update</h2>
        <p style="color:#6B7280;margin:0;font-size:14px;">Dear {{client_name}}</p>
      </div>
      <p style="color:#4B5563;font-size:14px;line-height:1.6;">Unfortunately, we are unable to accommodate your appointment on {{date}} at {{time}}.</p>
      {{#admin_notes}}
      <div style="background-color:#FEF9F0;border:1px solid #F5E6CC;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0 0 4px;font-size:12px;color:#92400E;font-weight:600;">💬 Message</p>
        <p style="margin:0;font-size:13px;color:#4B5563;">{{admin_notes}}</p>
      </div>
      {{/admin_notes}}
      {{#alternative}}
      <div style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0 0 4px;font-size:12px;color:#166534;font-weight:600;">✨ Suggested Alternative</p>
        <p style="margin:0;font-size:13px;color:#4B5563;">{{#alt_date}}📅 Date: <strong>{{alt_date}}</strong><br/>{{/alt_date}}{{#alt_time}}🕐 Time: <strong>{{alt_time}}</strong>{{/alt_time}}</p>
      </div>
      {{/alternative}}
      <p style="color:#4B5563;font-size:14px;">We apologise for any inconvenience. Please don''t hesitate to contact us.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://shaw-scope.co.uk/booking" style="display:inline-block;background-color:#D4912A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">Rebook Appointment</a>
      </div>
      <div style="border-top:1px solid #E5E7EB;margin:24px 0 0;padding-top:20px;text-align:center;">
        <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/><a href="mailto:matt@shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shaw-scope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
      </div>
    </div>
    <div style="background-color:#0E1420;padding:16px 24px;text-align:center;margin-top:24px;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Dorchester, Dorset · <a href="https://shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;">shaw-scope.co.uk</a></p>
    </div>
  </div>
</body></html>', updated_at = now()
WHERE trigger_type = 'rejected';

-- Update review_request template
UPDATE public.email_templates SET body_html = '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">Mobile Ear Care &amp; Cryotherapy</p>
    </div>
    <div style="padding:32px 28px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:32px;margin:0 0 12px;">⭐</div>
        <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">How Was Your Experience?</h2>
        <p style="color:#6B7280;margin:0;font-size:14px;">Hi {{client_name}} — thank you for choosing ShawScope!</p>
      </div>
      <div style="background-color:#FEF9F0;border:1px solid #F5E6CC;border-radius:12px;padding:24px 20px;margin-bottom:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🌟</div>
        <h3 style="color:#92400E;margin:0 0 8px;font-size:16px;font-weight:bold;">We''d Love a 5-Star Review!</h3>
        <p style="color:#4B5563;font-size:13px;margin:0 0 20px;line-height:1.5;">If you were happy with your treatment, a quick 5-star Google review would mean the world to us. It helps other patients find quality care.</p>
        <a href="https://g.page/r/CUuuLcg7IZpbEBM/review" style="display:inline-block;background-color:#D4912A;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;">Leave a 5-Star Google Review ⭐</a>
      </div>
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
        <div style="font-size:24px;margin-bottom:8px;">💬</div>
        <h3 style="color:#0E1420;margin:0 0 8px;font-size:15px;font-weight:bold;">Not 5 Stars?</h3>
        <p style="color:#6B7280;font-size:13px;margin:0;line-height:1.5;">If you don''t think we provided a 5-star service, please let us know how we can improve — we strive to be 5 stars! Contact us at <a href="mailto:matt@shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;font-weight:bold;">matt@shaw-scope.co.uk</a></p>
      </div>
      <div style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
        <div style="font-size:24px;margin-bottom:8px;">👍</div>
        <h3 style="color:#1e40af;margin:0 0 8px;font-size:15px;font-weight:bold;">Follow Us on Facebook</h3>
        <p style="color:#3b82f6;font-size:13px;margin:0 0 16px;line-height:1.5;">Stay updated with news and offers.</p>
        <a href="https://www.facebook.com/shawscope" style="display:inline-block;background-color:#1877F2;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;">Follow on Facebook</a>
      </div>
      <div style="border-top:1px solid #E5E7EB;margin:24px 0 0;padding-top:20px;text-align:center;">
        <p style="color:#9CA3AF;font-size:13px;margin:0;">Thanks again, {{client_name}}!<br/><strong style="color:#0E1420;">Matt Shaw</strong> · ShawScope</p>
      </div>
    </div>
    <div style="background-color:#0E1420;padding:16px 24px;text-align:center;margin-top:24px;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Dorchester, Dorset · <a href="https://shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;">shaw-scope.co.uk</a></p>
    </div>
  </div>
</body></html>', updated_at = now()
WHERE trigger_type = 'review_request';

-- Update appointment_changed template
UPDATE public.email_templates SET body_html = '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">Mobile Ear Care &amp; Cryotherapy</p>
    </div>
    <div style="padding:32px 28px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:32px;margin:0 0 12px;">🔄</div>
        <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;">Appointment Updated</h2>
        <p style="color:#6B7280;margin:0;font-size:14px;">Hi {{client_name}} — your appointment details have been updated.</p>
      </div>
      <div style="background-color:#FEF9F0;border:1px solid #F5E6CC;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0;font-size:13px;color:#92400E;">ℹ️ Please review the updated details below and make a note of any changes.</p>
      </div>
      <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;font-family:''DM Sans'',''Helvetica Neue'',Arial,sans-serif;">
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;">📋</td><td style="padding:10px 0;color:#6B7280;font-size:14px;">Service</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;">{{service_name}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📅</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Date</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{date}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">🕐</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Time</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{time}}</td></tr>
          <tr><td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;border-top:1px solid #F3F4F6;">📍</td><td style="padding:10px 0;color:#6B7280;font-size:14px;border-top:1px solid #F3F4F6;">Address</td><td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;border-top:1px solid #F3F4F6;">{{address}}</td></tr>
        </table>
      </div>
      <div style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0 0 4px;font-size:12px;color:#dc2626;font-weight:600;">🚗 Travel Note</p>
        <p style="margin:0;font-size:13px;color:#4B5563;">We aim to arrive on time, but please allow <strong>±15 minutes</strong> for travel variability.</p>
      </div>
      <p style="color:#6B7280;font-size:14px;text-align:center;">If you have any questions, please don''t hesitate to get in touch.</p>
      <div style="text-align:center;margin:16px 0;">
        <a href="mailto:matt@shaw-scope.co.uk" style="display:inline-block;background-color:#D4912A;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">📧 Contact Us</a>
      </div>
      <div style="border-top:1px solid #E5E7EB;margin:24px 0 0;padding-top:20px;text-align:center;">
        <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/><a href="mailto:matt@shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shaw-scope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
      </div>
    </div>
    <div style="background-color:#0E1420;padding:16px 24px;text-align:center;margin-top:24px;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
      </tr></table>
      <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Dorchester, Dorset · <a href="https://shaw-scope.co.uk" style="color:#D4912A;text-decoration:none;">shaw-scope.co.uk</a></p>
    </div>
  </div>
</body></html>', updated_at = now()
WHERE trigger_type = 'appointment_changed';
