
-- 1. Add address to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS address text;

-- 2. Add consent_form_template_id to services (link service -> consent form)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS consent_form_template_id uuid REFERENCES public.consent_form_templates(id);

-- 3. Create patient profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text,
  phone text,
  email text,
  address text,
  date_of_birth date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Patients can view/edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Link appointments to patient profiles
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id);

-- 5. Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Allow authenticated users to view their own appointments
CREATE POLICY "Patients can view own appointments" ON public.appointments FOR SELECT TO authenticated USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_admin()
);
