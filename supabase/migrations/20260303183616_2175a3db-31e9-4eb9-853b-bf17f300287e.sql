ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS ready_from_time time without time zone DEFAULT NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;