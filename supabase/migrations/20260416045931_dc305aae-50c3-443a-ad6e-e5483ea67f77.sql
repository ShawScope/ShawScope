
CREATE TABLE public.foot_care_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  poll_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.foot_care_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist" ON public.foot_care_waitlist
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view waitlist" ON public.foot_care_waitlist
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can delete waitlist" ON public.foot_care_waitlist
  FOR DELETE USING (public.is_admin());
