
-- Fix services RLS: drop restrictive and recreate as permissive
DROP POLICY IF EXISTS "Anyone can read active services" ON public.services;
CREATE POLICY "Anyone can read active services" ON public.services FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin());

-- Fix appointments RLS
DROP POLICY IF EXISTS "Anyone can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can view own appointment by token" ON public.appointments;
CREATE POLICY "Anyone can insert appointments" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Clients can view own appointment by token" ON public.appointments FOR SELECT TO anon USING (true);

-- Fix business_settings RLS
DROP POLICY IF EXISTS "Anyone can read settings" ON public.business_settings;
CREATE POLICY "Anyone can read settings" ON public.business_settings FOR SELECT TO anon, authenticated USING (true);

-- Fix consent_form_templates RLS
DROP POLICY IF EXISTS "Anyone can read active templates" ON public.consent_form_templates;
CREATE POLICY "Anyone can read active templates" ON public.consent_form_templates FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin());

-- Fix consent_form_responses RLS
DROP POLICY IF EXISTS "Anyone can insert consent responses" ON public.consent_form_responses;
DROP POLICY IF EXISTS "Anyone can view consent responses" ON public.consent_form_responses;
CREATE POLICY "Anyone can insert consent responses" ON public.consent_form_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can view consent responses" ON public.consent_form_responses FOR SELECT TO anon, authenticated USING (true);

-- Fix available_dates RLS
DROP POLICY IF EXISTS "Anyone can read available dates" ON public.available_dates;
CREATE POLICY "Anyone can read available dates" ON public.available_dates FOR SELECT TO anon, authenticated USING (true);
