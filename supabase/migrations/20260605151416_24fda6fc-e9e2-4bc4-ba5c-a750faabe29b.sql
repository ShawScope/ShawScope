
CREATE POLICY "Admins read governance files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'governance' AND public.is_admin());
CREATE POLICY "Admins upload governance files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'governance' AND public.is_admin());
CREATE POLICY "Admins update governance files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'governance' AND public.is_admin()) WITH CHECK (bucket_id = 'governance' AND public.is_admin());
CREATE POLICY "Admins delete governance files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'governance' AND public.is_admin());
