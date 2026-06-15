
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: is current user admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- RLS for user_roles
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin());

-- Business settings
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_hour INTEGER NOT NULL DEFAULT 9,
  end_hour INTEGER NOT NULL DEFAULT 17,
  buffer_minutes INTEGER NOT NULL DEFAULT 15,
  appointment_duration_minutes INTEGER NOT NULL DEFAULT 60,
  days_available INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.business_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON public.business_settings FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert settings" ON public.business_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- Insert default settings
INSERT INTO public.business_settings (start_hour, end_hour, buffer_minutes, appointment_duration_minutes, days_available)
VALUES (9, 17, 15, 60, '{1,2,3,4,5}');

-- Consent form templates
CREATE TABLE public.consent_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active templates" ON public.consent_form_templates FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins can insert templates" ON public.consent_form_templates FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update templates" ON public.consent_form_templates FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete templates" ON public.consent_form_templates FOR DELETE TO authenticated USING (public.is_admin());

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  access_token UUID NOT NULL DEFAULT gen_random_uuid(),
  consent_form_template_id UUID REFERENCES public.consent_form_templates(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with appointments" ON public.appointments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Anyone can insert appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Clients can view own appointment by token" ON public.appointments FOR SELECT USING (true);

-- Consent form responses
CREATE TABLE public.consent_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  consent_form_template_id UUID REFERENCES public.consent_form_templates(id) NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}',
  signature TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage consent responses" ON public.consent_form_responses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Anyone can insert consent responses" ON public.consent_form_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view consent responses" ON public.consent_form_responses FOR SELECT USING (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_consent_templates_updated_at BEFORE UPDATE ON public.consent_form_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
