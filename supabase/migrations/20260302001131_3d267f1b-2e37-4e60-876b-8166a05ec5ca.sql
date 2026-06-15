
-- Create admin todos table
CREATE TABLE public.admin_todos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  priority integer NOT NULL DEFAULT 0,
  due_date date,
  patient_id uuid REFERENCES public.patients(id),
  patient_name text,
  patient_email text,
  appointment_id uuid REFERENCES public.appointments(id),
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_interval text, -- 'daily', 'weekly', 'monthly'
  recurrence_end_date date,
  next_due_date date,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_todos ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage todos"
  ON public.admin_todos
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update timestamp trigger
CREATE TRIGGER update_admin_todos_updated_at
  BEFORE UPDATE ON public.admin_todos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
