-- Process due scheduled communications (booking confirmations, consent
-- form emails, reminder SMS, etc.) every 5 minutes.
--
-- Authenticated with the project's anon/publishable key, which is safe to
-- include here -- it is the same key already shipped in the compiled
-- frontend bundle and is designed to be public. process-scheduled-comms
-- has verify_jwt = false (see supabase/config.toml) so this key is only
-- used to satisfy the function's own internal auth-guard check, not
-- platform-level JWT verification.
SELECT cron.unschedule('process-scheduled-comms')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-comms');

SELECT cron.schedule(
  'process-scheduled-comms',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://egsapqxzgjxgyckjbshz.supabase.co/functions/v1/process-scheduled-comms',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnc2FwcXh6Z2p4Z3lja2pic2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTQzMTIsImV4cCI6MjA5NzE5MDMxMn0.jYwXM9NlPIbkfYVswRyOkFz-_7z0vzR6Pb_QrpxU-fI'
    )::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Weekly full database backup (data only) into the system-backups bucket,
-- since the Supabase organisation is on the Free plan and does not
-- include built-in automated daily backups. See
-- docs/BACKUP_AND_ROLLBACK_PLAN.md for the retention policy.
SELECT cron.unschedule('scheduled-backup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scheduled-backup');

SELECT cron.schedule(
  'scheduled-backup',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://egsapqxzgjxgyckjbshz.supabase.co/functions/v1/scheduled-backup',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnc2FwcXh6Z2p4Z3lja2pic2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTQzMTIsImV4cCI6MjA5NzE5MDMxMn0.jYwXM9NlPIbkfYVswRyOkFz-_7z0vzR6Pb_QrpxU-fI'
    )::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
