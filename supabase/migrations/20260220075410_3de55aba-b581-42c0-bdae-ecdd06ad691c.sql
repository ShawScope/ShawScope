
-- Chat log table for AI Bot admin tab
CREATE TABLE public.chat_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  patient_email text,
  patient_phone text,
  escalated boolean NOT NULL DEFAULT false,
  escalation_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert chat logs" ON public.chat_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own chat log" ON public.chat_logs FOR UPDATE USING (true);
CREATE POLICY "Admins can manage chat logs" ON public.chat_logs FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER update_chat_logs_updated_at BEFORE UPDATE ON public.chat_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
