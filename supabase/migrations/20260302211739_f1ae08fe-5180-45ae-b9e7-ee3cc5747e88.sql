
-- Table to store Google OAuth tokens for contacts sync
CREATE TABLE public.google_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamp with time zone NOT NULL,
  scopes text NOT NULL DEFAULT 'https://www.googleapis.com/auth/contacts',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can access tokens
CREATE POLICY "Admins can manage google oauth tokens"
  ON public.google_oauth_tokens
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Timestamp trigger
CREATE TRIGGER update_google_oauth_tokens_updated_at
  BEFORE UPDATE ON public.google_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
