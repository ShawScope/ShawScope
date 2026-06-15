INSERT INTO scheduled_communications (channel, trigger_type, recipient_name, recipient_email, recipient_phone, scheduled_for, status)
VALUES 
  ('email', 'review_request', 'Matt', 'matt@shaw-scope.co.uk', null, now(), 'pending'),
  ('sms', 'review_request', 'Matt', 'matt@shaw-scope.co.uk', '+447793575498', now(), 'pending');