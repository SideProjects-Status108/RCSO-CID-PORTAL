-- RCSO CID Portal — Segment C cleanup.
--
-- Retires the legacy `evaluations` table (the pre-overhaul daily/weekly
-- blended evaluations surface) by marking it deprecated in the schema.
-- Data is NOT dropped; existing rows remain queryable for audit/history.
--
-- New writes come through `weekly_training_sessions` + `weekly_competency_scores`
-- (Segment B + C) plus the deficiency/quiz/journal surfaces.
--
-- This migration is idempotent and safe to re-run.

-- 1) Stamp a deprecation comment on the table so the Supabase schema
--    explorer and migration reviewers know the surface is retired.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'evaluations'
  ) THEN
    EXECUTE $cmt$
      COMMENT ON TABLE public.evaluations IS
        'DEPRECATED (2026-04-30, Segment C). Legacy daily/weekly evaluations.
         Do not accept new writes. New evaluations live in
         weekly_training_sessions + weekly_competency_scores. Retained
         read-only for audit/history.'
    $cmt$;
  END IF;
END
$$;

-- 2) Revoke INSERT/UPDATE/DELETE on the legacy table from the two roles
--    the app uses. SELECT is preserved for audit. Running this against a
--    project that already revoked is a no-op.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'evaluations'
  ) THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.evaluations FROM authenticated';
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.evaluations FROM anon';
  END IF;
END
$$;

-- 3) Likewise, any RLS write policies on the legacy table should be
--    dropped so nothing sneaks through. We leave SELECT policies intact.
--    We don't fail if the policies never existed.
DO $$
DECLARE
  p record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'evaluations'
  ) THEN
    RETURN;
  END IF;

  FOR p IN
    SELECT polname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evaluations'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.evaluations', p.polname);
  END LOOP;
END
$$;
