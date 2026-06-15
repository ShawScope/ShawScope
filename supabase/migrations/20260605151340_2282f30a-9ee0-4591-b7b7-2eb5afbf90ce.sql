
-- Same as previous attempt but drop the business_policies row from the renewals view (column mismatch)

CREATE TABLE public.gov_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_date date NOT NULL,
  incident_time time,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  description text NOT NULL,
  patient_ref text,
  location text,
  immediate_actions text,
  lessons_learned text,
  reported_to text,
  status text NOT NULL DEFAULT 'open',
  file_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_incidents TO authenticated;
GRANT ALL ON public.gov_incidents TO service_role;
ALTER TABLE public.gov_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage incidents" ON public.gov_incidents FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER gov_incidents_updated BEFORE UPDATE ON public.gov_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_safeguarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concern_date date NOT NULL,
  subject_type text NOT NULL,
  subject_ref text,
  description text NOT NULL,
  reported_to text,
  outcome text,
  status text NOT NULL DEFAULT 'open',
  file_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_safeguarding TO authenticated;
GRANT ALL ON public.gov_safeguarding TO service_role;
ALTER TABLE public.gov_safeguarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage safeguarding" ON public.gov_safeguarding FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER gov_safeguarding_updated BEFORE UPDATE ON public.gov_safeguarding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_significant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  learning text,
  actions text,
  status text NOT NULL DEFAULT 'open',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_significant_events TO authenticated;
GRANT ALL ON public.gov_significant_events TO service_role;
ALTER TABLE public.gov_significant_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage significant events" ON public.gov_significant_events FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER gov_sig_events_updated BEFORE UPDATE ON public.gov_significant_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_ipc_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_date date NOT NULL,
  score integer,
  findings text,
  actions text,
  next_due date,
  file_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_ipc_audits TO authenticated;
GRANT ALL ON public.gov_ipc_audits TO service_role;
ALTER TABLE public.gov_ipc_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ipc audits" ON public.gov_ipc_audits FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER gov_ipc_updated BEFORE UPDATE ON public.gov_ipc_audits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  serial_number text,
  supplier text,
  purchase_date date,
  service_interval_days integer,
  last_service_date date,
  next_service_date date,
  filter_replacement_due date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_equipment TO authenticated;
GRANT ALL ON public.gov_equipment TO service_role;
ALTER TABLE public.gov_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage equipment" ON public.gov_equipment FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER gov_equipment_updated BEFORE UPDATE ON public.gov_equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_equipment_service_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.gov_equipment(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  service_type text NOT NULL DEFAULT 'service',
  performed_by text,
  notes text,
  certificate_path text,
  next_due date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_equipment_service_log TO authenticated;
GRANT ALL ON public.gov_equipment_service_log TO service_role;
ALTER TABLE public.gov_equipment_service_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage equipment service" ON public.gov_equipment_service_log FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE public.gov_calibration_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid REFERENCES public.gov_equipment(id) ON DELETE SET NULL,
  equipment_name text,
  check_date date NOT NULL,
  result text NOT NULL DEFAULT 'pass',
  notes text,
  next_due date,
  certificate_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_calibration_checks TO authenticated;
GRANT ALL ON public.gov_calibration_checks TO service_role;
ALTER TABLE public.gov_calibration_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage calibration" ON public.gov_calibration_checks FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE public.gov_clinical_waste (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_date date NOT NULL,
  weight_kg numeric(8,2),
  carrier text,
  consignment_note text,
  consignment_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_clinical_waste TO authenticated;
GRANT ALL ON public.gov_clinical_waste TO service_role;
ALTER TABLE public.gov_clinical_waste ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage waste" ON public.gov_clinical_waste FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE public.gov_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  hazards text,
  controls text,
  risk_rating text,
  last_reviewed date,
  next_review date,
  file_path text,
  status text NOT NULL DEFAULT 'current',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_risk_assessments TO authenticated;
GRANT ALL ON public.gov_risk_assessments TO service_role;
ALTER TABLE public.gov_risk_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage risk assessments" ON public.gov_risk_assessments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER gov_risk_updated BEFORE UPDATE ON public.gov_risk_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_lone_worker_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  expected_end timestamptz,
  location text,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  emergency_contact text,
  status text NOT NULL DEFAULT 'active',
  escalated boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_lone_worker_checkins TO authenticated;
GRANT ALL ON public.gov_lone_worker_checkins TO service_role;
ALTER TABLE public.gov_lone_worker_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lone worker" ON public.gov_lone_worker_checkins FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE public.gov_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_date date NOT NULL,
  complainant text,
  channel text,
  summary text NOT NULL,
  investigation text,
  response text,
  resolved_date date,
  outcome text,
  status text NOT NULL DEFAULT 'open',
  file_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_complaints TO authenticated;
GRANT ALL ON public.gov_complaints TO service_role;
ALTER TABLE public.gov_complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage complaints" ON public.gov_complaints FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER gov_complaints_updated BEFORE UPDATE ON public.gov_complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_compliments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_date date NOT NULL,
  source text,
  summary text NOT NULL,
  patient_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_compliments TO authenticated;
GRANT ALL ON public.gov_compliments TO service_role;
ALTER TABLE public.gov_compliments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage compliments" ON public.gov_compliments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE public.gov_patient_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_date date NOT NULL DEFAULT CURRENT_DATE,
  score integer CHECK (score BETWEEN 1 AND 5),
  comment text,
  source text,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_patient_feedback TO authenticated;
GRANT ALL ON public.gov_patient_feedback TO service_role;
ALTER TABLE public.gov_patient_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage feedback" ON public.gov_patient_feedback FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE public.gov_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  holder text NOT NULL,
  reference text,
  issuer text,
  issue_date date,
  expiry_date date,
  document_path text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_credentials TO authenticated;
GRANT ALL ON public.gov_credentials TO service_role;
ALTER TABLE public.gov_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage credentials" ON public.gov_credentials FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER gov_credentials_updated BEFORE UPDATE ON public.gov_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_training_cpd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_date date NOT NULL,
  topic text NOT NULL,
  provider text,
  hours numeric(5,2),
  evidence text,
  certificate_path text,
  staff_member text,
  next_due date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_training_cpd TO authenticated;
GRANT ALL ON public.gov_training_cpd TO service_role;
ALTER TABLE public.gov_training_cpd ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage training" ON public.gov_training_cpd FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE public.gov_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type text NOT NULL,
  audit_date date NOT NULL,
  sample_size integer,
  score integer,
  findings text,
  actions text,
  next_due date,
  file_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_audits TO authenticated;
GRANT ALL ON public.gov_audits TO service_role;
ALTER TABLE public.gov_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage audits" ON public.gov_audits FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER gov_audits_updated BEFORE UPDATE ON public.gov_audits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_gdpr_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breach_date date NOT NULL,
  breach_type text NOT NULL,
  scope text,
  data_subjects_affected integer,
  ico_reportable boolean NOT NULL DEFAULT false,
  ico_reported_at timestamptz,
  mitigation text,
  status text NOT NULL DEFAULT 'open',
  file_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_gdpr_breaches TO authenticated;
GRANT ALL ON public.gov_gdpr_breaches TO service_role;
ALTER TABLE public.gov_gdpr_breaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gdpr breaches" ON public.gov_gdpr_breaches FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER gov_gdpr_updated BEFORE UPDATE ON public.gov_gdpr_breaches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_continuity_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scenario text,
  version text,
  file_path text,
  last_tested date,
  next_test_due date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_continuity_plans TO authenticated;
GRANT ALL ON public.gov_continuity_plans TO service_role;
ALTER TABLE public.gov_continuity_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage continuity" ON public.gov_continuity_plans FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER gov_continuity_updated BEFORE UPDATE ON public.gov_continuity_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gov_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cqc_domain text NOT NULL,
  label text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  tags text[] NOT NULL DEFAULT '{}',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_documents TO authenticated;
GRANT ALL ON public.gov_documents TO service_role;
ALTER TABLE public.gov_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gov documents" ON public.gov_documents FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE public.gov_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  details jsonb,
  ip text,
  user_agent text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.gov_access_log TO authenticated;
GRANT ALL ON public.gov_access_log TO service_role;
ALTER TABLE public.gov_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read access log" ON public.gov_access_log FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Authenticated insert access log" ON public.gov_access_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX gov_access_log_occurred_at_idx ON public.gov_access_log (occurred_at DESC);

CREATE INDEX gov_incidents_date_idx ON public.gov_incidents (incident_date DESC);
CREATE INDEX gov_complaints_status_idx ON public.gov_complaints (status, received_date DESC);
CREATE INDEX gov_credentials_expiry_idx ON public.gov_credentials (expiry_date);
CREATE INDEX gov_equipment_next_service_idx ON public.gov_equipment (next_service_date);
CREATE INDEX gov_risk_next_review_idx ON public.gov_risk_assessments (next_review);

CREATE OR REPLACE VIEW public.gov_upcoming_renewals AS
SELECT 'credential'::text AS source, c.id, c.holder AS title, c.type AS subtype, c.expiry_date AS due_date, c.status FROM public.gov_credentials c WHERE c.expiry_date IS NOT NULL
UNION ALL
SELECT 'equipment_service', e.id, e.name, 'service', e.next_service_date, e.status FROM public.gov_equipment e WHERE e.next_service_date IS NOT NULL
UNION ALL
SELECT 'equipment_filter', e.id, e.name, 'filter', e.filter_replacement_due, e.status FROM public.gov_equipment e WHERE e.filter_replacement_due IS NOT NULL
UNION ALL
SELECT 'calibration', cc.id, COALESCE(cc.equipment_name, 'Equipment'), 'calibration', cc.next_due, cc.result FROM public.gov_calibration_checks cc WHERE cc.next_due IS NOT NULL
UNION ALL
SELECT 'risk_assessment', r.id, r.title, COALESCE(r.category,'risk'), r.next_review, r.status FROM public.gov_risk_assessments r WHERE r.next_review IS NOT NULL
UNION ALL
SELECT 'ipc_audit', i.id, 'IPC audit'::text, 'audit', i.next_due, 'scheduled'::text FROM public.gov_ipc_audits i WHERE i.next_due IS NOT NULL
UNION ALL
SELECT 'audit', a.id, a.audit_type, 'audit', a.next_due, 'scheduled'::text FROM public.gov_audits a WHERE a.next_due IS NOT NULL
UNION ALL
SELECT 'training', t.id, t.topic, 'training', t.next_due, 'scheduled'::text FROM public.gov_training_cpd t WHERE t.next_due IS NOT NULL
UNION ALL
SELECT 'continuity', bc.id, bc.title, 'bc_test', bc.next_test_due, 'scheduled'::text FROM public.gov_continuity_plans bc WHERE bc.next_test_due IS NOT NULL;

GRANT SELECT ON public.gov_upcoming_renewals TO authenticated;
GRANT SELECT ON public.gov_upcoming_renewals TO service_role;
