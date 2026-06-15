-- Make shawscope bucket public so service images are accessible
UPDATE storage.buckets SET public = true WHERE id = 'shawscope';

-- Ensure public read access for service images
CREATE POLICY "Public read service images" ON storage.objects
FOR SELECT USING (bucket_id = 'shawscope' AND (storage.foldername(name))[1] = 'service-images');

-- Admin can upload service images
CREATE POLICY "Admins can upload service images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'shawscope' AND (storage.foldername(name))[1] = 'service-images' AND public.is_admin());

-- Admin can delete service images
CREATE POLICY "Admins can delete service images" ON storage.objects
FOR DELETE USING (bucket_id = 'shawscope' AND (storage.foldername(name))[1] = 'service-images' AND public.is_admin());