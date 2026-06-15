
-- Fix services: drop restrictive, create permissive
DROP POLICY IF EXISTS "Anyone can read active services" ON public.services;
CREATE POLICY "Anyone can read active services" ON public.services FOR SELECT USING ((is_active = true) OR is_admin());

DROP POLICY IF EXISTS "Admins can insert services" ON public.services;
CREATE POLICY "Admins can insert services" ON public.services FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update services" ON public.services;
CREATE POLICY "Admins can update services" ON public.services FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete services" ON public.services;
CREATE POLICY "Admins can delete services" ON public.services FOR DELETE USING (is_admin());

-- Fix business_settings
DROP POLICY IF EXISTS "Anyone can read settings" ON public.business_settings;
CREATE POLICY "Anyone can read settings" ON public.business_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update settings" ON public.business_settings;
CREATE POLICY "Admins can update settings" ON public.business_settings FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert settings" ON public.business_settings;
CREATE POLICY "Admins can insert settings" ON public.business_settings FOR INSERT WITH CHECK (is_admin());

-- Fix available_dates
DROP POLICY IF EXISTS "Anyone can read available dates" ON public.available_dates;
CREATE POLICY "Anyone can read available dates" ON public.available_dates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert available dates" ON public.available_dates;
CREATE POLICY "Admins can insert available dates" ON public.available_dates FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update available dates" ON public.available_dates;
CREATE POLICY "Admins can update available dates" ON public.available_dates FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete available dates" ON public.available_dates;
CREATE POLICY "Admins can delete available dates" ON public.available_dates FOR DELETE USING (is_admin());

-- Fix appointments
DROP POLICY IF EXISTS "Anyone can insert appointments" ON public.appointments;
CREATE POLICY "Anyone can insert appointments" ON public.appointments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can do everything with appointments" ON public.appointments;
CREATE POLICY "Admins can do everything with appointments" ON public.appointments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Clients can view own appointment by access token" ON public.appointments;
CREATE POLICY "Clients can view own appointment by access token" ON public.appointments FOR SELECT USING (
  is_admin() OR 
  (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())) OR 
  ((access_token)::text = ((current_setting('request.headers'::text, true))::json ->> 'x-access-token'::text))
);

-- Fix user_roles
DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT USING (is_admin() OR auth.uid() = user_id);

-- Fix consent_form_templates
DROP POLICY IF EXISTS "Anyone can read active templates" ON public.consent_form_templates;
CREATE POLICY "Anyone can read active templates" ON public.consent_form_templates FOR SELECT USING ((is_active = true) OR is_admin());

DROP POLICY IF EXISTS "Admins can insert templates" ON public.consent_form_templates;
CREATE POLICY "Admins can insert templates" ON public.consent_form_templates FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update templates" ON public.consent_form_templates;
CREATE POLICY "Admins can update templates" ON public.consent_form_templates FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete templates" ON public.consent_form_templates;
CREATE POLICY "Admins can delete templates" ON public.consent_form_templates FOR DELETE USING (is_admin());

-- Fix consent_form_responses
DROP POLICY IF EXISTS "Admins can manage consent responses" ON public.consent_form_responses;
CREATE POLICY "Admins can manage consent responses" ON public.consent_form_responses FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Secure consent response access" ON public.consent_form_responses;
CREATE POLICY "Secure consent response access" ON public.consent_form_responses FOR SELECT USING (
  is_admin() OR (appointment_id IN (SELECT appointments.id FROM appointments WHERE appointments.profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Validated consent response insert" ON public.consent_form_responses;
CREATE POLICY "Validated consent response insert" ON public.consent_form_responses FOR INSERT WITH CHECK (
  is_admin() OR (EXISTS (SELECT 1 FROM appointments WHERE appointments.id = consent_form_responses.appointment_id))
);

-- Fix email_templates
DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates" ON public.email_templates FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Fix patient_files
DROP POLICY IF EXISTS "Admins can manage patient files" ON public.patient_files;
CREATE POLICY "Admins can manage patient files" ON public.patient_files FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Fix profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (is_admin()) WITH CHECK (is_admin());
