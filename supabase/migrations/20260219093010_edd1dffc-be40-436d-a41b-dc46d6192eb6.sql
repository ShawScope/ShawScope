
-- Drop the existing status check constraint and recreate with rejected_awaiting
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'requested', 'confirmed', 'rejected', 'rejected_awaiting', 'cancelled', 'completed', 'done', 'no_show'));
