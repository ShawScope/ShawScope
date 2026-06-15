
-- Add status column to services (replacing is_active boolean)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Migrate existing data
UPDATE public.services SET status = CASE WHEN is_active = true THEN 'active' ELSE 'inactive' END;

-- Create service_addons table for sub-services/treatment options
CREATE TABLE public.service_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  additional_price numeric DEFAULT 0,
  additional_duration_minutes integer DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage service addons"
ON public.service_addons FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Anyone can read active addons (for booking flow)
CREATE POLICY "Anyone can read active addons"
ON public.service_addons FOR SELECT
USING (is_active = true OR is_admin());

-- Create service_waitlist table for coming soon services
CREATE TABLE public.service_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text,
  notified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_waitlist ENABLE ROW LEVEL SECURITY;

-- Admins can manage waitlist
CREATE POLICY "Admins can manage service waitlist"
ON public.service_waitlist FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Anyone can join waitlist (public booking page)
CREATE POLICY "Anyone can join service waitlist"
ON public.service_waitlist FOR INSERT
WITH CHECK (true);

-- Add addon_selections to appointments for tracking what add-ons were selected
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS addon_selections jsonb DEFAULT '[]'::jsonb;
