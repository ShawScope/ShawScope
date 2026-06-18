-- Fix RLS security regression introduced during self-host migration.
--
-- During migration, a blanket `admin_all_access` policy and duplicate
-- `anon_*` policies were added to every table as a defensive measure.
-- This was unnecessary (the original, more precisely-scoped policies
-- already provide complete coverage) and on a small number of
-- service-role-only tables it was actively unsafe: because Postgres RLS
-- policies are OR'd together, `admin_all_access` (TO authenticated,
-- USING is_admin()) let any authenticated admin read those tables
-- directly via the client SDK, bypassing the intended restriction that
-- they only be reachable through Edge Functions using the service role
-- key. This is most serious on admin_authenticator_factors, which stores
-- TOTP secrets.
--
-- gov_files and gov_folders are excluded: they were created manually
-- after the original schema push failed on them, so admin_all_access is
-- the only policy they have. Dropping it there would lock out admin
-- access entirely.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('gov_files', 'gov_folders')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin_all_access', r.tablename);
  END LOOP;
END $$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'anon\_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;
