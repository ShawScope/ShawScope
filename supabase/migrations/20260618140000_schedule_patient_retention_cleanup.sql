-- Schedule the patient data retention cleanup, per the UK NHS Records
-- Management Code of Practice: adult patient records are deleted 8 years
-- after their last appointment; minors' records are kept until their
-- 25th birthday (26th if aged 17 at conclusion of treatment). The
-- function (cleanup-expired-patients) already implements this logic
-- correctly -- it just had no schedule triggering it.
--
-- Verified before scheduling: with the current dataset, zero patients
-- meet either deletion threshold yet, so this is safe to enable now.
--
-- Runs monthly (1st of the month, 04:00 UK) rather than more frequently,
-- since this is a low-frequency, non-urgent cleanup, not a time-critical
-- operation.
SELECT cron.unschedule('cleanup-expired-patients')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-patients');

SELECT cron.schedule(
  'cleanup-expired-patients',
  '0 4 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://egsapqxzgjxgyckjbshz.supabase.co/functions/v1/cleanup-expired-patients',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnc2FwcXh6Z2p4Z3lja2pic2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTQzMTIsImV4cCI6MjA5NzE5MDMxMn0.jYwXM9NlPIbkfYVswRyOkFz-_7z0vzR6Pb_QrpxU-fI'
    )::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
