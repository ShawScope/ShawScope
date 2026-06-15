
-- Add recurring appointment support
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS recurring_group_id uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurring_interval_weeks integer DEFAULT NULL;

-- Index for quickly finding all appointments in a recurring series
CREATE INDEX IF NOT EXISTS idx_appointments_recurring_group 
ON public.appointments (recurring_group_id) 
WHERE recurring_group_id IS NOT NULL;

COMMENT ON COLUMN public.appointments.recurring_group_id IS 'Links recurring appointments together in a series';
COMMENT ON COLUMN public.appointments.recurring_interval_weeks IS 'Interval in weeks between recurring appointments';
