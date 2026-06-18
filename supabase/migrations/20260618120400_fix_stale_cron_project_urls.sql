-- The monthly-blog-generation cron job was carried over from the source
-- project's schema dump with its original hardcoded URL still pointing
-- at the old live project (huiboexlxhafzywbdmpq.supabase.co) instead of
-- this self-hosted project. Repointing it so it calls the function that
-- is actually deployed here.
--
-- NOTE: a second pre-existing cron job, gmail-heidi-poll-every-5min, is
-- intentionally NOT touched here. The function it calls
-- (gmail-heidi-poll) does not exist in this codebase or on this project
-- at all -- it was never exported from the source Lovable project.
-- Repointing that cron job now would just make it fail with 404 instead
-- of whatever it currently does against the old project. See
-- docs/MIGRATION_SOURCE_NOTE.md -- the missing function needs to be
-- requested from Lovable before this job can be safely repointed.

SELECT cron.unschedule('monthly-blog-generation')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-blog-generation');

SELECT cron.schedule(
  'monthly-blog-generation',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://egsapqxzgjxgyckjbshz.supabase.co/functions/v1/generate-monthly-blog',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
