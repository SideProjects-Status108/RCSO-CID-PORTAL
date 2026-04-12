-- Phase 5 — TN Code Annotated: titles, chapters, sections (FTS + pgvector), bookmarks, recents.

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- tn_titles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tn_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_number integer NOT NULL UNIQUE,
  title_name text NOT NULL,
  description text,
  last_ingested_at timestamptz,
  last_ingest_skipped integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tn_titles
  ADD COLUMN IF NOT EXISTS last_ingest_skipped integer;

-- ---------------------------------------------------------------------------
-- tn_chapters
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tn_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id uuid NOT NULL REFERENCES public.tn_titles (id) ON DELETE CASCADE,
  chapter_number text NOT NULL,
  chapter_name text NOT NULL,
  last_ingested_at timestamptz,
  CONSTRAINT tn_chapters_title_chapter_key UNIQUE (title_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS tn_chapters_title_id_idx ON public.tn_chapters (title_id);

-- ---------------------------------------------------------------------------
-- tn_sections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tn_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.tn_chapters (id) ON DELETE CASCADE,
  title_id uuid NOT NULL REFERENCES public.tn_titles (id) ON DELETE CASCADE,
  section_number text NOT NULL UNIQUE,
  section_title text NOT NULL,
  section_text text NOT NULL,
  source_url text,
  last_ingested_at timestamptz,
  search_vector tsvector,
  embedding vector(1536)
);

CREATE INDEX IF NOT EXISTS tn_sections_chapter_id_idx ON public.tn_sections (chapter_id);
CREATE INDEX IF NOT EXISTS tn_sections_title_id_idx ON public.tn_sections (title_id);
CREATE INDEX IF NOT EXISTS tn_sections_search_vector_idx ON public.tn_sections USING gin (search_vector);

CREATE INDEX IF NOT EXISTS tn_sections_embedding_ivfflat_idx
ON public.tn_sections USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE OR REPLACE FUNCTION public.tn_sections_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector(
      'english',
      coalesce(NEW.section_number, '') || ' ' ||
      coalesce(NEW.section_title, '') || ' ' ||
      coalesce(NEW.section_text, '')
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tn_sections_search_vector_trg ON public.tn_sections;
CREATE TRIGGER tn_sections_search_vector_trg
BEFORE INSERT OR UPDATE OF section_number, section_title, section_text ON public.tn_sections
FOR EACH ROW
EXECUTE PROCEDURE public.tn_sections_search_vector_update();

-- ---------------------------------------------------------------------------
-- tn_bookmarks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tn_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.tn_sections (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tn_bookmarks_user_section_key UNIQUE (user_id, section_id)
);

CREATE INDEX IF NOT EXISTS tn_bookmarks_user_id_idx ON public.tn_bookmarks (user_id);

-- ---------------------------------------------------------------------------
-- tn_recents + rolling window (keep last 20 per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tn_recents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.tn_sections (id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tn_recents_user_viewed_idx ON public.tn_recents (user_id, viewed_at DESC);

CREATE OR REPLACE FUNCTION public.tn_recents_trim_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.tn_recents r
  WHERE r.user_id = NEW.user_id
    AND r.id NOT IN (
      SELECT id
      FROM public.tn_recents
      WHERE user_id = NEW.user_id
      ORDER BY viewed_at DESC
      LIMIT 20
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tn_recents_trim_trg ON public.tn_recents;
CREATE TRIGGER tn_recents_trim_trg
AFTER INSERT ON public.tn_recents
FOR EACH ROW
EXECUTE PROCEDURE public.tn_recents_trim_after_insert();

REVOKE ALL ON FUNCTION public.tn_recents_trim_after_insert() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Full-text search RPC (websearch syntax; RLS applies via SECURITY INVOKER)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tn_code_search_sections(
  search_query text,
  result_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  section_number text,
  section_title text,
  section_text text,
  title_number integer,
  chapter_number text,
  chapter_name text,
  rank double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.section_number,
    s.section_title,
    s.section_text,
    t.title_number,
    c.chapter_number,
    c.chapter_name,
    ts_rank_cd(s.search_vector, websearch_to_tsquery('english', search_query)) AS rank
  FROM public.tn_sections s
  JOIN public.tn_chapters c ON c.id = s.chapter_id
  JOIN public.tn_titles t ON t.id = s.title_id
  WHERE
    search_query IS NOT NULL
    AND btrim(search_query) <> ''
    AND s.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT greatest(1, least(coalesce(result_limit, 50), 100));
$$;

REVOKE ALL ON FUNCTION public.tn_code_search_sections(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tn_code_search_sections(text, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed seven in-scope titles (names are placeholders; ingestion may refine)
-- ---------------------------------------------------------------------------
INSERT INTO public.tn_titles (title_number, title_name, description)
VALUES
  (36, 'Title 36 — Domestic Relations', 'TN Code Title 36'),
  (37, 'Title 37 — Juveniles', 'TN Code Title 37'),
  (38, 'Title 38 — Prevention and Detection of Crime', 'TN Code Title 38'),
  (39, 'Title 39 — Criminal Offenses', 'TN Code Title 39'),
  (40, 'Title 40 — Criminal Procedure', 'TN Code Title 40'),
  (55, 'Title 55 — Motor and Other Vehicles', 'TN Code Title 55'),
  (57, 'Title 57 — Intoxicating Liquors', 'TN Code Title 57')
ON CONFLICT (title_number) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.tn_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tn_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tn_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tn_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tn_recents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tn_titles_select_authenticated"
ON public.tn_titles FOR SELECT TO authenticated USING (true);

CREATE POLICY "tn_titles_insert_admin"
ON public.tn_titles FOR INSERT TO authenticated
WITH CHECK (public.profile_is_admin());

CREATE POLICY "tn_titles_update_admin"
ON public.tn_titles FOR UPDATE TO authenticated
USING (public.profile_is_admin())
WITH CHECK (public.profile_is_admin());

CREATE POLICY "tn_titles_delete_admin"
ON public.tn_titles FOR DELETE TO authenticated
USING (public.profile_is_admin());

CREATE POLICY "tn_chapters_select_authenticated"
ON public.tn_chapters FOR SELECT TO authenticated USING (true);

CREATE POLICY "tn_chapters_insert_admin"
ON public.tn_chapters FOR INSERT TO authenticated
WITH CHECK (public.profile_is_admin());

CREATE POLICY "tn_chapters_update_admin"
ON public.tn_chapters FOR UPDATE TO authenticated
USING (public.profile_is_admin())
WITH CHECK (public.profile_is_admin());

CREATE POLICY "tn_chapters_delete_admin"
ON public.tn_chapters FOR DELETE TO authenticated
USING (public.profile_is_admin());

CREATE POLICY "tn_sections_select_authenticated"
ON public.tn_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "tn_sections_insert_admin"
ON public.tn_sections FOR INSERT TO authenticated
WITH CHECK (public.profile_is_admin());

CREATE POLICY "tn_sections_update_admin"
ON public.tn_sections FOR UPDATE TO authenticated
USING (public.profile_is_admin())
WITH CHECK (public.profile_is_admin());

CREATE POLICY "tn_sections_delete_admin"
ON public.tn_sections FOR DELETE TO authenticated
USING (public.profile_is_admin());

CREATE POLICY "tn_bookmarks_select_own"
ON public.tn_bookmarks FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "tn_bookmarks_insert_own"
ON public.tn_bookmarks FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "tn_bookmarks_delete_own"
ON public.tn_bookmarks FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "tn_recents_select_own"
ON public.tn_recents FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- No INSERT/UPDATE/DELETE for authenticated on tn_recents (service role only)

GRANT EXECUTE ON FUNCTION public.tn_recents_trim_after_insert() TO service_role;
