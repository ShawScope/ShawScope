UPDATE public.email_templates 
SET body_html = REPLACE(body_html, 'Mobile Ear Care &amp; Cryotherapy', 'A Home Visiting Service')
WHERE body_html LIKE '%Mobile Ear Care%';

UPDATE public.email_templates 
SET body_html = REPLACE(body_html, 'Mobile Ear Care & Cryotherapy', 'A Home Visiting Service')
WHERE body_html LIKE '%Mobile Ear Care%';