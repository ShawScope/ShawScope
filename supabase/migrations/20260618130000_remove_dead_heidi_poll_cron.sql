-- gmail-heidi-poll-every-5min called an Edge Function (gmail-heidi-poll)
-- that was never exported into this codebase. Investigation (with
-- Lovable, who has visibility into the original project) confirmed this
-- was abandoned scaffolding from a May 2026 experiment: it only ever
-- caught Heidi Health billing receipt emails (never real clinical
-- transcripts), never wired up its own gmail_poll_state tracking table,
-- and stopped running around 20 May 2026. The actual Heidi workflow in
-- production use is a manual paste-in flow in ConsultationFormDialog.tsx
-- (the "Upload Heidi" panel), which does not depend on this function or
-- these tables at all.
--
-- Removing the cron schedule so it stops failing with 404 every 5
-- minutes against a function that doesn't exist on this project.
-- heidi_imports and gmail_poll_state tables are intentionally left in
-- place (3 archived rows, harmless) pending a decision on whether to
-- keep them for historical reference or drop them.

SELECT cron.unschedule('gmail-heidi-poll-every-5min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gmail-heidi-poll-every-5min');
