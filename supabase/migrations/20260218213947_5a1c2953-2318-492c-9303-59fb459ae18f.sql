
-- Create cryo followup templates table
CREATE TABLE public.cryo_followup_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number integer NOT NULL UNIQUE CHECK (week_number BETWEEN 1 AND 4),
  subject text NOT NULL,
  heading text NOT NULL,
  guidance_html text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cryo_followup_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cryo followup templates"
ON public.cryo_followup_templates FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE TRIGGER update_cryo_followup_templates_updated_at
BEFORE UPDATE ON public.cryo_followup_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
