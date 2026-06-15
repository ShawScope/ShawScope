
-- Keep only the earliest pending sms_reminder for Richard's appointment, cancel the rest
WITH keep AS (
  SELECT id FROM scheduled_communications
  WHERE appointment_id = 'b6d3871a-791b-45aa-9408-cecf3cf7a99c'
    AND trigger_type = 'sms_reminder'
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
)
UPDATE scheduled_communications
SET status = 'cancelled', cancelled_at = now()
WHERE appointment_id = 'b6d3871a-791b-45aa-9408-cecf3cf7a99c'
  AND trigger_type = 'sms_reminder'
  AND status = 'pending'
  AND id NOT IN (SELECT id FROM keep);
