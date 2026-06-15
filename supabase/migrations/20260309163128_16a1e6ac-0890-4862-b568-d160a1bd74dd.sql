
CREATE TABLE IF NOT EXISTS public.business_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  heading text NOT NULL,
  description text,
  policy_text text,
  last_reviewed_at timestamptz,
  review_notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage business policies" ON public.business_policies
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
