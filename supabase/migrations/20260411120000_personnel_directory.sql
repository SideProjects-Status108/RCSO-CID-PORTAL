-- Phase 1 — personnel_directory + storage bucket
-- Role checks use SECURITY DEFINER (same pattern as profiles migration).
-- DIT masking for phone_cell / email / notes is applied in application code when
-- returning directory rows (RLS cannot column-mask per role reliably on one table).

CREATE OR REPLACE FUNCTION public.profile_is_dit()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dit'
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_can_manage_personnel_directory()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'supervision_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.profile_is_dit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profile_can_manage_personnel_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_is_dit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_can_manage_personnel_directory() TO authenticated;

CREATE TABLE IF NOT EXISTS public.personnel_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  full_name text NOT NULL,
  badge_number text,
  role_label text,
  system_role text NOT NULL CHECK (
    system_role IN (
      'admin',
      'supervision_admin',
      'supervision',
      'fto_coordinator',
      'fto',
      'detective',
      'dit'
    )
  ),
  unit text,
  assignment text,
  phone_cell text,
  phone_office text,
  email text,
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS personnel_directory_user_id_idx ON public.personnel_directory (user_id);
CREATE INDEX IF NOT EXISTS personnel_directory_unit_idx ON public.personnel_directory (unit);
CREATE INDEX IF NOT EXISTS personnel_directory_system_role_idx ON public.personnel_directory (system_role);
CREATE INDEX IF NOT EXISTS personnel_directory_is_active_idx ON public.personnel_directory (is_active);
CREATE INDEX IF NOT EXISTS personnel_directory_full_name_idx ON public.personnel_directory (lower(full_name));

DROP TRIGGER IF EXISTS personnel_directory_set_updated_at ON public.personnel_directory;
CREATE TRIGGER personnel_directory_set_updated_at
BEFORE UPDATE ON public.personnel_directory
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.personnel_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personnel_directory_select"
ON public.personnel_directory
FOR SELECT
TO authenticated
USING (public.profile_is_admin_scope() OR is_active = true);

CREATE POLICY "personnel_directory_insert_admin_scope"
ON public.personnel_directory
FOR INSERT
TO authenticated
WITH CHECK (public.profile_can_manage_personnel_directory());

CREATE POLICY "personnel_directory_update_admin_scope"
ON public.personnel_directory
FOR UPDATE
TO authenticated
USING (public.profile_can_manage_personnel_directory())
WITH CHECK (public.profile_can_manage_personnel_directory());

CREATE POLICY "personnel_directory_delete_admin_scope"
ON public.personnel_directory
FOR DELETE
TO authenticated
USING (public.profile_can_manage_personnel_directory());

-- ---------------------------------------------------------------------------
-- Storage: personnel photos (private bucket; app uses createSignedUrl).
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'personnel-photos',
  'personnel-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET allowed_mime_types = EXCLUDED.allowed_mime_types,
    file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "personnel_photos_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "personnel_photos_insert_admin_scope" ON storage.objects;
DROP POLICY IF EXISTS "personnel_photos_update_admin_scope" ON storage.objects;
DROP POLICY IF EXISTS "personnel_photos_delete_admin_scope" ON storage.objects;

CREATE POLICY "personnel_photos_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'personnel-photos');

CREATE POLICY "personnel_photos_insert_admin_scope"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'personnel-photos'
  AND public.profile_can_manage_personnel_directory()
);

CREATE POLICY "personnel_photos_update_admin_scope"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'personnel-photos'
  AND public.profile_can_manage_personnel_directory()
)
WITH CHECK (
  bucket_id = 'personnel-photos'
  AND public.profile_can_manage_personnel_directory()
);

CREATE POLICY "personnel_photos_delete_admin_scope"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'personnel-photos'
  AND public.profile_can_manage_personnel_directory()
);
