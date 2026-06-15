
-- Heidi imports table
CREATE TABLE public.heidi_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text NOT NULL UNIQUE,
  gmail_thread_id text,
  subject text,
  snippet text,
  body_text text,
  from_address text,
  received_at timestamptz NOT NULL DEFAULT now(),
  matched_patient_name text,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  match_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_heidi_imports_appointment ON public.heidi_imports(appointment_id);
CREATE INDEX idx_heidi_imports_received ON public.heidi_imports(received_at DESC);

ALTER TABLE public.heidi_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage heidi_imports" ON public.heidi_imports
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_heidi_imports_updated
  BEFORE UPDATE ON public.heidi_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Poller state
CREATE TABLE public.gmail_poll_state (
  id integer PRIMARY KEY DEFAULT 1,
  last_history_id text,
  last_polled_at timestamptz,
  last_status text,
  last_error text,
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.gmail_poll_state (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.gmail_poll_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read gmail_poll_state" ON public.gmail_poll_state
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins update gmail_poll_state" ON public.gmail_poll_state
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Cron: poll every 5 minutes
SELECT cron.schedule(
  'gmail-heidi-poll-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://huiboexlxhafzywbdmpq.supabase.co/functions/v1/gmail-heidi-poll',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"trigger":"cron"}'::jsonb
  );
  $$
);
