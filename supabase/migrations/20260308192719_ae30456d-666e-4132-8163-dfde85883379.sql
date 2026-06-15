
CREATE TABLE public.clinical_audit_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'incident',
  title text NOT NULL,
  description text,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name text,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'low',
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_at timestamp with time zone,
  cpd_hours numeric DEFAULT 0,
  cpd_provider text,
  cpd_certificate_path text,
  tags text[] DEFAULT '{}'::text[]
);

ALTER TABLE public.clinical_audit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage clinical audit entries"
  ON public.clinical_audit_entries
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
