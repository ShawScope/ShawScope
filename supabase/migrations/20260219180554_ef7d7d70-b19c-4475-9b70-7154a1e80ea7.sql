-- Add group_id to appointments for linking multi-person bookings
ALTER TABLE public.appointments ADD COLUMN group_id uuid DEFAULT NULL;

-- Index for fast group lookups
CREATE INDEX idx_appointments_group_id ON public.appointments (group_id) WHERE group_id IS NOT NULL;