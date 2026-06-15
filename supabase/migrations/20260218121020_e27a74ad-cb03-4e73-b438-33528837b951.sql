
-- Create blocked_times table for managing blocked calendar periods
CREATE TABLE public.blocked_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  reason TEXT,
  repeat_type TEXT NOT NULL DEFAULT 'none', -- none, daily, weekly
  repeat_until DATE,
  repeat_group_id UUID, -- groups recurring blocks together for bulk delete
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blocked times
CREATE POLICY "Admins can manage blocked times"
  ON public.blocked_times FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Anyone can read blocked times (needed for booking page to check availability)
CREATE POLICY "Anyone can read blocked times"
  ON public.blocked_times FOR SELECT
  USING (true);

-- Index for date lookups
CREATE INDEX idx_blocked_times_date ON public.blocked_times (blocked_date);
CREATE INDEX idx_blocked_times_group ON public.blocked_times (repeat_group_id);
