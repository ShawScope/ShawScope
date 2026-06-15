DELETE FROM public.business_settings WHERE id = '7b09244d-bb27-4cb5-b960-0a21f5dbca0f';
CREATE UNIQUE INDEX IF NOT EXISTS business_settings_singleton ON public.business_settings ((true));