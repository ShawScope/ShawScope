
-- Add category to admin_todos for splitting into patient/admin/kit
ALTER TABLE public.admin_todos ADD COLUMN IF NOT EXISTS todo_category text NOT NULL DEFAULT 'admin';

-- Create reflections table for NMC Gibbs reflections
CREATE TABLE IF NOT EXISTS public.clinical_audit_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.clinical_audit_monthly_reviews(id) ON DELETE CASCADE NOT NULL,
  description text,
  feelings text,
  evaluation text,
  analysis text,
  conclusion text,
  action_plan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_audit_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reflections" ON public.clinical_audit_reflections
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Create compliance checks table
CREATE TABLE IF NOT EXISTS public.compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_month date NOT NULL,
  kit_id uuid REFERENCES public.kit_inventory(id) ON DELETE CASCADE NOT NULL,
  kit_name text NOT NULL,
  objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(check_month, kit_id)
);

ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage compliance checks" ON public.compliance_checks
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
