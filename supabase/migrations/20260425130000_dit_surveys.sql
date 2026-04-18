-- Segment A (Training Overhaul) — DIT pre-start onboarding surveys.
-- Shell only: stores token + status; question set and response capture land in a
-- later prompt (see TRAINING_OVERHAUL_MASTER_PLAN.md §4).

CREATE TABLE IF NOT EXISTS public.dit_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_record_id uuid NOT NULL REFERENCES public.dit_records (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'expired')
  ),
  sent_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL,
  learning_style jsonb,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dit_surveys_dit_record_id_idx ON public.dit_surveys (dit_record_id);
CREATE INDEX IF NOT EXISTS dit_surveys_status_idx ON public.dit_surveys (status);

DROP TRIGGER IF EXISTS dit_surveys_set_updated_at ON public.dit_surveys;
CREATE TRIGGER dit_surveys_set_updated_at
BEFORE UPDATE ON public.dit_surveys
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.dit_surveys ENABLE ROW LEVEL SECURITY;

-- Coordinator / supervision / admin read all. DITs can see their own survey row.
CREATE POLICY "dit_surveys_select_scope"
ON public.dit_surveys
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    WHERE dr.id = dit_surveys.dit_record_id
      AND dr.user_id = (SELECT auth.uid())
  )
);

-- Only training staff may create survey rows (done via server action / service role).
CREATE POLICY "dit_surveys_insert_staff"
ON public.dit_surveys
FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_reads_all_training()
  AND created_by = (SELECT auth.uid())
);

-- Staff can update (resend / mark expired / record completion until full flow lands).
CREATE POLICY "dit_surveys_update_staff"
ON public.dit_surveys
FOR UPDATE
TO authenticated
USING (public.profile_reads_all_training())
WITH CHECK (public.profile_reads_all_training());

CREATE POLICY "dit_surveys_delete_staff"
ON public.dit_surveys
FOR DELETE
TO authenticated
USING (public.profile_reads_all_training());
