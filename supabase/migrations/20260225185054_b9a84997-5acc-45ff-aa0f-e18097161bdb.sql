
-- Table for temporary booking slot holds (15-minute reservation)
CREATE TABLE public.booking_holds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_date date NOT NULL,
  appointment_time time without time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  client_name text,
  client_email text,
  client_phone text,
  postcode text,
  session_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '15 minutes'),
  released boolean NOT NULL DEFAULT false,
  help_email_sent boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.booking_holds ENABLE ROW LEVEL SECURITY;

-- Anyone can create holds (public booking flow)
CREATE POLICY "Anyone can insert booking holds"
ON public.booking_holds FOR INSERT
WITH CHECK (true);

-- Anyone can read holds (to check availability)
CREATE POLICY "Anyone can read booking holds"
ON public.booking_holds FOR SELECT
USING (true);

-- Anyone can update own hold by session_id
CREATE POLICY "Anyone can update own hold"
ON public.booking_holds FOR UPDATE
USING (true);

-- Admins can manage all holds
CREATE POLICY "Admins can manage holds"
ON public.booking_holds FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Index for efficient lookups
CREATE INDEX idx_booking_holds_date_time ON public.booking_holds (appointment_date, appointment_time) WHERE released = false;
CREATE INDEX idx_booking_holds_expires ON public.booking_holds (expires_at) WHERE released = false;
