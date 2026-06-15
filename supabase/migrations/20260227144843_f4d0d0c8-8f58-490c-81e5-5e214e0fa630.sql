
-- Table to track AI phone call conversation state
CREATE TABLE public.phone_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid text UNIQUE NOT NULL,
  caller_number text,
  conversation jsonb DEFAULT '[]'::jsonb,
  collected_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_call_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) can manage these
CREATE POLICY "Service role manages phone sessions"
ON public.phone_call_sessions FOR ALL
USING (false) WITH CHECK (false);

-- Auto-cleanup old sessions (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_phone_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.phone_call_sessions WHERE created_at < now() - interval '24 hours';
END;
$$;
