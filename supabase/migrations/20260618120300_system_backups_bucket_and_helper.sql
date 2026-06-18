-- Private, admin-only storage bucket for database backup snapshots.
INSERT INTO storage.buckets (id, name, public)
VALUES ('system-backups', 'system-backups', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS backups_admin_only ON storage.objects;
CREATE POLICY backups_admin_only ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'system-backups' AND public.is_admin())
  WITH CHECK (bucket_id = 'system-backups' AND public.is_admin());

-- Helper used by the scheduled-backup Edge Function to discover every
-- table in the public schema dynamically, so backups never go stale if
-- tables are added or removed later.
CREATE OR REPLACE FUNCTION public.get_public_tables()
RETURNS TABLE(tablename text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT t.tablename::text
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
$$;
