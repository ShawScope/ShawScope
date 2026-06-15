
-- Saved places (Base, Tesco Petrol, etc.)
CREATE TABLE public.mileage_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  postcode text NOT NULL,
  address text,
  is_base boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mileage_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage mileage places"
ON public.mileage_places FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_mileage_places_updated_at
BEFORE UPDATE ON public.mileage_places
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Manual or override journey entries
CREATE TABLE public.mileage_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_date date NOT NULL,
  from_label text,
  to_label text,
  from_postcode text,
  to_postcode text,
  miles numeric NOT NULL DEFAULT 0,
  purpose text,
  notes text,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual',
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mileage_journeys_date ON public.mileage_journeys (journey_date);
CREATE INDEX idx_mileage_journeys_appt ON public.mileage_journeys (appointment_id);

ALTER TABLE public.mileage_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage mileage journeys"
ON public.mileage_journeys FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_mileage_journeys_updated_at
BEFORE UPDATE ON public.mileage_journeys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Base place
INSERT INTO public.mileage_places (name, postcode, is_base) VALUES ('Base', 'DT2 8DG', true);
