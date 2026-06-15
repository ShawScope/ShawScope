
-- Table for audit file attachments
CREATE TABLE public.clinical_audit_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_entry_id uuid NOT NULL REFERENCES public.clinical_audit_entries(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_audit_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit files"
  ON public.clinical_audit_files
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Table for case update logs
CREATE TABLE public.clinical_audit_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_entry_id uuid NOT NULL REFERENCES public.clinical_audit_entries(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_audit_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit updates"
  ON public.clinical_audit_updates
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
