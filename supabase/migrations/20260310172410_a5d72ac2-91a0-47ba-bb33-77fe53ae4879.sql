UPDATE email_templates 
SET body_html = REPLACE(
  REPLACE(
    body_html,
    '<p style="margin: 0; font-size: 13px; color: #44403c;">💷 Cash &nbsp;&nbsp; 🏦 Bank Transfer &nbsp;&nbsp; 📄 Invoice</p>
    <p style="margin: 4px 0 0; font-size: 11px; color: #44403c;">💳 Card also accepted (+£2 transaction fee)</p>',
    '<p style="margin: 0; font-size: 13px; color: #44403c;">💷 Cash – no fee &nbsp;&nbsp; 🏦 Bank Transfer – no fee</p>
    <p style="margin: 4px 0 0; font-size: 12px; color: #44403c;">💳 Card – 1.69% processing fee &nbsp;&nbsp; 📄 Invoice – 2.5% processing fee</p>'
  ),
  'We prefer Cash or Bank Transfer — details provided after your appointment',
  'We prefer Cash or Bank Transfer — payment details provided after your appointment'
)
WHERE body_html LIKE '%+£2 transaction fee%';