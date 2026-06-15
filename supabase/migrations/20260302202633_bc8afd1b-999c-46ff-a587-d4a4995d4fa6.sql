
-- Kit inventory tracking for reusable clinical instruments
CREATE TABLE public.kit_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_name text NOT NULL,
  service_type text NOT NULL, -- 'earwax_removal' or 'foot_care'
  total_kits integer NOT NULL DEFAULT 0,
  available_kits integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kit_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage kit inventory"
  ON public.kit_inventory FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Log each kit usage/cleaning event
CREATE TABLE public.kit_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kit_inventory(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'used' or 'cleaned'
  quantity integer NOT NULL DEFAULT 1,
  appointment_id uuid REFERENCES public.appointments(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kit_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage kit usage log"
  ON public.kit_usage_log FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER update_kit_inventory_updated_at
  BEFORE UPDATE ON public.kit_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
