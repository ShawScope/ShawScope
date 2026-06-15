-- Multi-question poll support
ALTER TABLE public.marketing_polls
  ADD COLUMN IF NOT EXISTS questions jsonb,
  ADD COLUMN IF NOT EXISTS notify_email text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.marketing_poll_responses
  ADD COLUMN IF NOT EXISTS answers jsonb;

-- Make selected_option nullable so multi-question responses can omit it
ALTER TABLE public.marketing_poll_responses
  ALTER COLUMN selected_option DROP NOT NULL;