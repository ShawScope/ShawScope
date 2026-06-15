
-- 1) gov_attachments: polymorphic attachments across governance registers
CREATE TABLE public.gov_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL,
  record_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gov_attachments_record_idx ON public.gov_attachments(record_type, record_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_attachments TO authenticated;
GRANT ALL ON public.gov_attachments TO service_role;

ALTER TABLE public.gov_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attachments"
  ON public.gov_attachments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2) IPC audits checklist column
ALTER TABLE public.gov_ipc_audits
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;

-- 3) Emergency contact for lone-worker start-of-day SMS
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

UPDATE public.business_settings
  SET emergency_contact_name = COALESCE(emergency_contact_name, 'Wife'),
      emergency_contact_phone = COALESCE(emergency_contact_phone, '07704509505');
