-- The auth.refresh_tokens data migrated from the source project used
-- explicit primary key values without advancing the backing sequence.
-- This caused every new login to fail with a duplicate key violation
-- on refresh_tokens_pkey, since Postgres kept assigning already-used IDs.
SELECT setval('auth.refresh_tokens_id_seq', (SELECT COALESCE(MAX(id), 1) FROM auth.refresh_tokens));
