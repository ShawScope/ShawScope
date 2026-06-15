CREATE TABLE public.accounts_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  category TEXT NOT NULL,
  match_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (keyword)
);

ALTER TABLE public.accounts_category_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage category mappings"
ON public.accounts_category_mappings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_accounts_category_mappings_updated_at
BEFORE UPDATE ON public.accounts_category_mappings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_accounts_category_mappings_keyword ON public.accounts_category_mappings (keyword);