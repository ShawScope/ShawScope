-- Least-privilege hardening: anon/authenticated had TRUNCATE, REFERENCES,
-- and TRIGGER granted on every public table by Supabase's default schema
-- grants. The application only ever talks to Postgres through PostgREST,
-- which never issues these. They are unused defense-in-depth risk: if any
-- RLS policy ever has a gap, these widen the potential blast radius
-- unnecessarily. SELECT/INSERT/UPDATE/DELETE remain, gated by RLS.

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
