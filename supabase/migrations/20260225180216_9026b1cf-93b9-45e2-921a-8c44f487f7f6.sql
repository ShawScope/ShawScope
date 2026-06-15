
-- Table to store individual daily batches of a scheduled campaign
CREATE TABLE public.scheduled_campaign_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  body_html TEXT,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  batch_number INTEGER NOT NULL DEFAULT 1,
  total_batches INTEGER NOT NULL DEFAULT 1,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  failed_recipients JSONB DEFAULT '[]'::jsonb,
  parent_group_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_campaign_batches ENABLE ROW LEVEL SECURITY;

-- Admin only
CREATE POLICY "Admins can manage scheduled batches"
ON public.scheduled_campaign_batches
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
