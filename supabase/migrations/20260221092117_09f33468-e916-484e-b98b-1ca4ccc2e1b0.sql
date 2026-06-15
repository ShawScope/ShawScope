
-- Create marketing_unsubscribes table to track unsubscribe history
CREATE TABLE public.marketing_unsubscribes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_email text,
  client_phone text,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert unsubscribes" ON public.marketing_unsubscribes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage unsubscribes" ON public.marketing_unsubscribes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Create marketing_campaigns table to log sent campaigns
CREATE TABLE public.marketing_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name text NOT NULL,
  channel text NOT NULL,
  subject text,
  body_preview text,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns" ON public.marketing_campaigns
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
