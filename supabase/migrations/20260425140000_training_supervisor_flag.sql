-- RCSO CID Portal — Training Supervisor flag (Segment A.1 of Training Overhaul)
--
-- Adds an is_training_supervisor boolean to profiles. Exactly one profile at a
-- time may be flagged (enforced by a partial unique index). The flag is
-- additive to a user's underlying role: a user with role='supervision' and
-- is_training_supervisor=true has write access to the Training module, while
-- a user with role='supervision' and is_training_supervisor=false is
-- read + sign-only within Training.
--
-- The Training Supervisor seat is currently held by Sgt. Amanda McPherson.
-- We do NOT seed her id here because we cannot guarantee the profile row
-- exists at migration time; the UI on /training/dit-files exposes an
-- "Assign Training Supervisor" widget that lets admins/coordinators/supervision
-- admins flip the flag once her account exists.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_training_supervisor boolean NOT NULL DEFAULT false;

-- Partial unique index enforces "at most one Training Supervisor at a time".
-- Using the column expression (rather than a WHERE on a constant) keeps the
-- index small and side-steps the single-row-per-constant ambiguity.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_training_supervisor_idx
  ON public.profiles ((1))
  WHERE is_training_supervisor = true;

-- Convenience helper used by RLS policies in later Training migrations.
CREATE OR REPLACE FUNCTION public.is_training_writer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'supervision_admin', 'fto_coordinator')
        OR p.is_training_supervisor = true
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_training_writer() TO authenticated;
