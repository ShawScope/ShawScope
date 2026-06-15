
-- Marketing Polls table
CREATE TABLE public.marketing_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage polls" ON public.marketing_polls
  FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Anyone can read active polls" ON public.marketing_polls
  FOR SELECT TO public USING (is_active = true);

-- Marketing Poll Responses table
CREATE TABLE public.marketing_poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.marketing_polls(id) ON DELETE CASCADE,
  selected_option text NOT NULL,
  comment text,
  respondent_email text,
  respondent_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_poll_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage poll responses" ON public.marketing_poll_responses
  FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Anyone can insert poll responses" ON public.marketing_poll_responses
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can read own poll response" ON public.marketing_poll_responses
  FOR SELECT TO public USING (true);
