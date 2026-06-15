-- Make the shawscope bucket private
UPDATE storage.buckets SET public = false WHERE id = 'shawscope';
