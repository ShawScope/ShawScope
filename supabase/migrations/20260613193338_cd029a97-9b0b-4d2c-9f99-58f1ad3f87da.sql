
CREATE TABLE public.gov_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.gov_folders(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_folders TO authenticated;
GRANT ALL ON public.gov_folders TO service_role;
ALTER TABLE public.gov_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gov_folders" ON public.gov_folders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_gov_folders_updated_at BEFORE UPDATE ON public.gov_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.gov_folders(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  file_path text NOT NULL,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_files TO authenticated;
GRANT ALL ON public.gov_files TO service_role;
ALTER TABLE public.gov_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gov_files" ON public.gov_files FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX gov_files_folder_idx ON public.gov_files(folder_id);
CREATE INDEX gov_folders_parent_idx ON public.gov_folders(parent_id);
CREATE TRIGGER update_gov_files_updated_at BEFORE UPDATE ON public.gov_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
