-- Add NEWS observations column to consultation_notes
ALTER TABLE public.consultation_notes 
ADD COLUMN IF NOT EXISTS news_observations jsonb DEFAULT '[]'::jsonb;