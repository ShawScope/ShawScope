
CREATE TABLE public.clinic_visit_enquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  service_name TEXT,
  number_of_people INTEGER DEFAULT 1,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_visit_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit enquiry" ON public.clinic_visit_enquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view enquiries" ON public.clinic_visit_enquiries
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update enquiries" ON public.clinic_visit_enquiries
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete enquiries" ON public.clinic_visit_enquiries
  FOR DELETE USING (public.is_admin());

CREATE TRIGGER update_clinic_visit_enquiries_updated_at
  BEFORE UPDATE ON public.clinic_visit_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
