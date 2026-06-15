-- Add column to track when review request was sent
ALTER TABLE public.appointments ADD COLUMN review_request_sent_at timestamp with time zone;
