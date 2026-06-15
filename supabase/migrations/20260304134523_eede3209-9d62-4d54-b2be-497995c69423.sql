
-- Add is_washable flag (default true for backwards compat with existing kits)
ALTER TABLE public.kit_inventory ADD COLUMN IF NOT EXISTS is_washable boolean NOT NULL DEFAULT true;

-- Add service_types array for multi-service support
ALTER TABLE public.kit_inventory ADD COLUMN IF NOT EXISTS service_types text[] NOT NULL DEFAULT '{}';

-- Migrate existing service_type values into the new array column
UPDATE public.kit_inventory SET service_types = ARRAY[service_type] WHERE service_types = '{}';
