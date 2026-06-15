
-- Monthly audit reviews table
CREATE TABLE public.clinical_audit_monthly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_month date NOT NULL,
  review_text text,
  governance_score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(review_month)
);

ALTER TABLE public.clinical_audit_monthly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage monthly reviews"
  ON public.clinical_audit_monthly_reviews
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Monthly action items table
CREATE TABLE public.clinical_audit_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.clinical_audit_monthly_reviews(id) ON DELETE CASCADE,
  action_text text NOT NULL,
  deadline date,
  todo_id uuid REFERENCES public.admin_todos(id) ON DELETE SET NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_audit_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit actions"
  ON public.clinical_audit_actions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
