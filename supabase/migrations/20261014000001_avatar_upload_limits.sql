-- Enforce avatar limits at Storage so direct API requests cannot bypass the UI.
-- Existing objects and ownership policies are unchanged.
update storage.buckets
set
  file_size_limit = 2097152,
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/avif'
  ]::text[]
where id = 'avatars';
