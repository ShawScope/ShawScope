
-- ============================================================
-- SECURE PATIENT FILE STORAGE
-- ============================================================

-- 1. Create patient_files table to track uploaded documents
CREATE TABLE public.patient_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage patient files"
  ON public.patient_files FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2. Storage policies for shawscope bucket (admin-only)
CREATE POLICY "Admins can upload patient files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'shawscope' AND is_admin());

CREATE POLICY "Admins can view patient files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shawscope' AND is_admin());

CREATE POLICY "Admins can update patient files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'shawscope' AND is_admin());

CREATE POLICY "Admins can delete patient files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'shawscope' AND is_admin());
