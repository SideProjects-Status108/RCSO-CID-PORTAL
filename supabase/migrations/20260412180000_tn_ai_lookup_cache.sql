-- AI Lookup question cache (exact query match, 7-day TTL enforced in app).
-- Kept separate from tn_ai_cache (section summaries) to avoid changing summary upsert constraints.

CREATE TABLE IF NOT EXISTS public.tn_ai_lookup_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text text NOT NULL,
  answer text NOT NULL,
  cited_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_used text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tn_ai_lookup_cache_query_text_key UNIQUE (query_text)
);

CREATE INDEX IF NOT EXISTS tn_ai_lookup_cache_updated_at_idx
  ON public.tn_ai_lookup_cache (updated_at DESC);

DROP TRIGGER IF EXISTS tn_ai_lookup_cache_set_updated_at ON public.tn_ai_lookup_cache;
CREATE TRIGGER tn_ai_lookup_cache_set_updated_at
BEFORE UPDATE ON public.tn_ai_lookup_cache
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.tn_ai_lookup_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tn_ai_lookup_cache_select_authenticated"
ON public.tn_ai_lookup_cache FOR SELECT TO authenticated USING (true);

-- Writes only via service role (API routes), matching tn_ai_cache pattern

GRANT SELECT ON TABLE public.tn_ai_lookup_cache TO authenticated;
