-- Phase 8B: purge cached section summaries after structured prompt + streaming format change.
-- App invalidates via prompt hash (SUMMARY_PROMPT_VERSION); this clears legacy rows.

DELETE FROM public.tn_ai_cache WHERE cache_type = 'summary';

-- Lookup answers also use the updated structured prompt (Phase 8B).
DELETE FROM public.tn_ai_lookup_cache;
