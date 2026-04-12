-- Phase 6: Field map polygons, TN Code AI cache, Google Calendar tokens, case coordinates.

-- ---------------------------------------------------------------------------
-- cases: map coordinates (nullable)
-- ---------------------------------------------------------------------------
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE INDEX IF NOT EXISTS cases_lat_lng_idx ON public.cases (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ---------------------------------------------------------------------------
-- map_polygons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.map_polygons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  color text NOT NULL DEFAULT '#C8A84B',
  geojson jsonb NOT NULL,
  case_id uuid REFERENCES public.cases (id) ON DELETE SET NULL,
  operation_name text,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_polygons_created_by_idx ON public.map_polygons (created_by);
CREATE INDEX IF NOT EXISTS map_polygons_case_id_idx ON public.map_polygons (case_id);

DROP TRIGGER IF EXISTS map_polygons_set_updated_at ON public.map_polygons;
CREATE TRIGGER map_polygons_set_updated_at
BEFORE UPDATE ON public.map_polygons
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.map_polygons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "map_polygons_select_authenticated"
ON public.map_polygons FOR SELECT TO authenticated USING (true);

CREATE POLICY "map_polygons_insert_own"
ON public.map_polygons FOR INSERT TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "map_polygons_update_scope"
ON public.map_polygons FOR UPDATE TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR public.profile_is_supervision_plus()
)
WITH CHECK (
  created_by = (SELECT auth.uid())
  OR public.profile_is_supervision_plus()
);

CREATE POLICY "map_polygons_delete_scope"
ON public.map_polygons FOR DELETE TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR public.profile_is_supervision_plus()
);

-- ---------------------------------------------------------------------------
-- tn_ai_cache (service role writes from API routes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tn_ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.tn_sections (id) ON DELETE CASCADE,
  cache_type text NOT NULL CHECK (cache_type = 'summary'),
  prompt_hash text NOT NULL,
  ai_response text NOT NULL,
  model_used text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tn_ai_cache_section_type_key UNIQUE (section_id, cache_type)
);

CREATE INDEX IF NOT EXISTS tn_ai_cache_section_id_idx ON public.tn_ai_cache (section_id);

DROP TRIGGER IF EXISTS tn_ai_cache_set_updated_at ON public.tn_ai_cache;
CREATE TRIGGER tn_ai_cache_set_updated_at
BEFORE UPDATE ON public.tn_ai_cache
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.tn_ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tn_ai_cache_select_authenticated"
ON public.tn_ai_cache FOR SELECT TO authenticated USING (true);

-- No INSERT/UPDATE/DELETE for authenticated (service role only)

-- ---------------------------------------------------------------------------
-- user_gcal_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_gcal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  token_expiry timestamptz NOT NULL,
  gcal_email text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS user_gcal_tokens_set_updated_at ON public.user_gcal_tokens;
CREATE TRIGGER user_gcal_tokens_set_updated_at
BEFORE UPDATE ON public.user_gcal_tokens
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.user_gcal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_gcal_tokens_select_own"
ON public.user_gcal_tokens FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_gcal_tokens_delete_own"
ON public.user_gcal_tokens FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- INSERT/UPDATE: service role only (OAuth callback + token refresh)

-- ---------------------------------------------------------------------------
-- personnel_directory: allow users to update their own row (Settings profile)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "personnel_directory_update_own" ON public.personnel_directory;
CREATE POLICY "personnel_directory_update_own"
ON public.personnel_directory FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "personnel_photos_insert_own" ON storage.objects;
CREATE POLICY "personnel_photos_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'personnel-photos'
  AND split_part(name, '/', 1) IN (
    SELECT id::text FROM public.personnel_directory WHERE user_id = (SELECT auth.uid())
  )
);
