-- Add image_url column to services for tile images
ALTER TABLE public.services ADD COLUMN image_url text;

-- Fix: allow "coming soon" services to be visible publicly
-- Update the RLS policy to also show coming_soon status services
DROP POLICY IF EXISTS "Anyone can read active services" ON public.services;
CREATE POLICY "Anyone can read active services"
ON public.services
FOR SELECT
USING ((is_active = true) OR (status = 'coming_soon') OR is_admin());

-- Fix the Foot Care service: coming_soon services should still be visible
UPDATE public.services SET is_active = true WHERE status = 'coming_soon' AND is_active = false;