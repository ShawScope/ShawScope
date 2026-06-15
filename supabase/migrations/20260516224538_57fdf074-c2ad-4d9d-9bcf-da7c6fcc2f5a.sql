
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  category text NOT NULL DEFAULT 'Ear Health',
  icon_name text NOT NULL DEFAULT 'Newspaper',
  image_url text,
  read_time text NOT NULL DEFAULT '3 min read',
  status text NOT NULL DEFAULT 'pending',
  approval_token uuid NOT NULL DEFAULT gen_random_uuid(),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved blog posts"
ON public.blog_posts FOR SELECT
USING (status = 'approved');

CREATE POLICY "Admins can view all blog posts"
ON public.blog_posts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert blog posts"
ON public.blog_posts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blog posts"
ON public.blog_posts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blog posts"
ON public.blog_posts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_blog_posts_status_published ON public.blog_posts (status, published_at DESC);

-- Monthly cron: trigger the AI blog generator on the 1st of every month at 08:00 UTC
SELECT cron.schedule(
  'monthly-blog-generation',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://huiboexlxhafzywbdmpq.supabase.co/functions/v1/generate-monthly-blog',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
