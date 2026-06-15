CREATE TABLE IF NOT EXISTS public.admin_authenticator_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_authenticator_factors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public.admin_authenticator_factors;
CREATE POLICY "Service role only"
ON public.admin_authenticator_factors
FOR ALL
USING (false)
WITH CHECK (false);

DROP TRIGGER IF EXISTS update_admin_authenticator_factors_updated_at ON public.admin_authenticator_factors;
CREATE TRIGGER update_admin_authenticator_factors_updated_at
BEFORE UPDATE ON public.admin_authenticator_factors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();