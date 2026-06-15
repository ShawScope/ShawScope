
-- Drop old email-only unique index
DROP INDEX IF EXISTS idx_patients_email;

-- Create new composite unique index on email + name (case-insensitive)
CREATE UNIQUE INDEX idx_patients_email_name ON public.patients USING btree (lower(client_email), lower(client_name));

-- Keep a non-unique index on email for fast lookups
CREATE INDEX idx_patients_email_lookup ON public.patients USING btree (lower(client_email));
