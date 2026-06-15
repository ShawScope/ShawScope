
-- Add rejected_at timestamp to track when rejection happened (for 3-day hold expiry)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone;
