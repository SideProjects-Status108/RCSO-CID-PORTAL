-- Phase 4 — Training: FTO pairings, evaluations, DIT records, milestones, phase audit.

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER; same pattern as profiles / schedule)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.profile_is_fto()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'fto'
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_reads_all_training()
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
      AND role IN ('admin', 'supervision_admin', 'supervision', 'fto_coordinator')
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_reads_evaluation_private()
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
      AND role IN ('admin', 'supervision_admin', 'supervision', 'fto_coordinator')
  );
$$;

REVOKE ALL ON FUNCTION public.profile_is_fto() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profile_reads_all_training() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profile_reads_evaluation_private() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_is_fto() TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_reads_all_training() TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_reads_evaluation_private() TO authenticated;

-- ---------------------------------------------------------------------------
-- fto_pairings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fto_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fto_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  dit_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  phase integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fto_pairings_fto_id_idx ON public.fto_pairings (fto_id);
CREATE INDEX IF NOT EXISTS fto_pairings_dit_id_idx ON public.fto_pairings (dit_id);
CREATE INDEX IF NOT EXISTS fto_pairings_is_active_idx ON public.fto_pairings (is_active);

DROP TRIGGER IF EXISTS fto_pairings_set_updated_at ON public.fto_pairings;
CREATE TRIGGER fto_pairings_set_updated_at
BEFORE UPDATE ON public.fto_pairings
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.fto_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fto_pairings_select_scope"
ON public.fto_pairings
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR fto_id = (SELECT auth.uid())
  OR dit_id = (SELECT auth.uid())
);

CREATE POLICY "fto_pairings_insert_staff"
ON public.fto_pairings
FOR INSERT
TO authenticated
WITH CHECK (
  (public.profile_is_supervision_plus() OR public.profile_is_fto_coordinator())
  AND created_by = (SELECT auth.uid())
);

CREATE POLICY "fto_pairings_update_staff"
ON public.fto_pairings
FOR UPDATE
TO authenticated
USING (public.profile_reads_all_training())
WITH CHECK (public.profile_reads_all_training());

-- ---------------------------------------------------------------------------
-- evaluations (public fields; coordinator-only text in evaluation_private_notes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id uuid NOT NULL REFERENCES public.fto_pairings (id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  evaluation_date date NOT NULL,
  evaluation_type text NOT NULL CHECK (
    evaluation_type IN ('daily', 'weekly', 'phase_end', 'special')
  ),
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_rating text NOT NULL CHECK (
    overall_rating IN ('excellent', 'satisfactory', 'needs_improvement', 'unsatisfactory')
  ),
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'approved')
  ),
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evaluations_pairing_id_idx ON public.evaluations (pairing_id);
CREATE INDEX IF NOT EXISTS evaluations_submitted_by_idx ON public.evaluations (submitted_by);
CREATE INDEX IF NOT EXISTS evaluations_status_idx ON public.evaluations (status);

DROP TRIGGER IF EXISTS evaluations_set_updated_at ON public.evaluations;
CREATE TRIGGER evaluations_set_updated_at
BEFORE UPDATE ON public.evaluations
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluations_select_scope"
ON public.evaluations
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR submitted_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.fto_pairings p
    WHERE p.id = evaluations.pairing_id
      AND p.fto_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.fto_pairings p
    WHERE p.id = evaluations.pairing_id
      AND p.dit_id = (SELECT auth.uid())
  )
);

CREATE POLICY "evaluations_insert_fto_or_coordinator"
ON public.evaluations
FOR INSERT
TO authenticated
WITH CHECK (
  submitted_by = (SELECT auth.uid())
  AND (
    public.profile_is_fto_coordinator()
    OR EXISTS (
      SELECT 1
      FROM public.fto_pairings p
      WHERE p.id = pairing_id
        AND p.fto_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "evaluations_update_author_or_staff"
ON public.evaluations
FOR UPDATE
TO authenticated
USING (
  submitted_by = (SELECT auth.uid())
  OR public.profile_reads_all_training()
)
WITH CHECK (
  submitted_by = (SELECT auth.uid())
  OR public.profile_reads_all_training()
);

-- ---------------------------------------------------------------------------
-- evaluation_private_notes (1:1 optional; RLS: coordinator + supervision+ only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluation_private_notes (
  evaluation_id uuid PRIMARY KEY REFERENCES public.evaluations (id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluation_private_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluation_private_notes_select"
ON public.evaluation_private_notes
FOR SELECT
TO authenticated
USING (public.profile_reads_evaluation_private());

CREATE POLICY "evaluation_private_notes_insert"
ON public.evaluation_private_notes
FOR INSERT
TO authenticated
WITH CHECK (public.profile_reads_evaluation_private());

CREATE POLICY "evaluation_private_notes_update"
ON public.evaluation_private_notes
FOR UPDATE
TO authenticated
USING (public.profile_reads_evaluation_private())
WITH CHECK (public.profile_reads_evaluation_private());

CREATE POLICY "evaluation_private_notes_delete"
ON public.evaluation_private_notes
FOR DELETE
TO authenticated
USING (public.profile_reads_evaluation_private());

-- ---------------------------------------------------------------------------
-- dit_records (one row per DIT user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dit_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  current_phase integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  graduation_date date,
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'on_hold', 'graduated', 'separated')
  ),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dit_records_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS dit_records_status_idx ON public.dit_records (status);

DROP TRIGGER IF EXISTS dit_records_set_updated_at ON public.dit_records;
CREATE TRIGGER dit_records_set_updated_at
BEFORE UPDATE ON public.dit_records
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.dit_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dit_records_select_scope"
ON public.dit_records
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.fto_pairings fp
    WHERE fp.dit_id = dit_records.user_id
      AND fp.fto_id = (SELECT auth.uid())
      AND fp.is_active = true
  )
);

CREATE POLICY "dit_records_insert_coordinator"
ON public.dit_records
FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_is_fto_coordinator()
  AND created_by = (SELECT auth.uid())
);

CREATE POLICY "dit_records_update_coordinator"
ON public.dit_records
FOR UPDATE
TO authenticated
USING (public.profile_is_fto_coordinator())
WITH CHECK (public.profile_is_fto_coordinator());

-- ---------------------------------------------------------------------------
-- dit_milestones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dit_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_record_id uuid NOT NULL REFERENCES public.dit_records (id) ON DELETE CASCADE,
  milestone_name text NOT NULL,
  description text,
  phase integer NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS dit_milestones_dit_record_id_idx ON public.dit_milestones (dit_record_id);

ALTER TABLE public.dit_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dit_milestones_select_scope"
ON public.dit_milestones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.dit_records dr
    WHERE dr.id = dit_milestones.dit_record_id
      AND (
        public.profile_reads_all_training()
        OR dr.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.fto_pairings fp
          WHERE fp.dit_id = dr.user_id
            AND fp.fto_id = (SELECT auth.uid())
            AND fp.is_active = true
        )
      )
  )
);

CREATE POLICY "dit_milestones_update_fto_or_coordinator"
ON public.dit_milestones
FOR UPDATE
TO authenticated
USING (
  public.profile_is_fto_coordinator()
  OR (
    public.profile_is_fto()
    AND EXISTS (
      SELECT 1
      FROM public.dit_records dr
      JOIN public.fto_pairings fp ON fp.dit_id = dr.user_id AND fp.is_active = true
      WHERE dr.id = dit_milestones.dit_record_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  public.profile_is_fto_coordinator()
  OR (
    public.profile_is_fto()
    AND EXISTS (
      SELECT 1
      FROM public.dit_records dr
      JOIN public.fto_pairings fp ON fp.dit_id = dr.user_id AND fp.is_active = true
      WHERE dr.id = dit_milestones.dit_record_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
);

-- Inserts only via trigger (SECURITY DEFINER); block direct client inserts
CREATE POLICY "dit_milestones_insert_none"
ON public.dit_milestones
FOR INSERT
TO authenticated
WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- Phase change audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fto_pairing_phase_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id uuid NOT NULL REFERENCES public.fto_pairings (id) ON DELETE CASCADE,
  from_phase integer NOT NULL,
  to_phase integer NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fto_pairing_phase_events_pairing_id_idx
ON public.fto_pairing_phase_events (pairing_id);

ALTER TABLE public.fto_pairing_phase_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fto_pairing_phase_events_select"
ON public.fto_pairing_phase_events
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1 FROM public.fto_pairings p
    WHERE p.id = pairing_id
      AND (p.fto_id = (SELECT auth.uid()) OR p.dit_id = (SELECT auth.uid()))
  )
);

CREATE POLICY "fto_pairing_phase_events_insert_coordinator"
ON public.fto_pairing_phase_events
FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_is_fto_coordinator()
  AND changed_by = (SELECT auth.uid())
);

-- ---------------------------------------------------------------------------
-- Seed standard milestones (SECURITY DEFINER; called from trigger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_dit_milestones_for_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dit_milestones (dit_record_id, milestone_name, description, phase, sort_order) VALUES
    (NEW.id, 'Orientation and policy review', NULL, 1, 1),
    (NEW.id, 'Firearms qualification', NULL, 1, 2),
    (NEW.id, 'Pursuit driving certification', NULL, 1, 3),
    (NEW.id, 'Introduction to case management procedures', NULL, 1, 4),
    (NEW.id, 'First supervised case observation', NULL, 1, 5),
    (NEW.id, 'Independent report writing (3 reports reviewed)', NULL, 2, 6),
    (NEW.id, 'Arrest procedures demonstrated', NULL, 2, 7),
    (NEW.id, 'Search warrant preparation (assisted)', NULL, 2, 8),
    (NEW.id, 'Evidence handling procedures', NULL, 2, 9),
    (NEW.id, 'Testify in court (if applicable) or mock testimony', NULL, 2, 10),
    (NEW.id, 'Independent case management (supervised)', NULL, 3, 11),
    (NEW.id, 'Complete all required certifications', NULL, 3, 12),
    (NEW.id, 'Final FTO evaluation completed', NULL, 3, 13),
    (NEW.id, 'Supervisory review and recommendation', NULL, 3, 14),
    (NEW.id, 'Phase graduation recommendation submitted', NULL, 3, 15);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dit_records_seed_milestones_trg ON public.dit_records;
CREATE TRIGGER dit_records_seed_milestones_trg
AFTER INSERT ON public.dit_records
FOR EACH ROW
EXECUTE PROCEDURE public.seed_dit_milestones_for_record();

REVOKE ALL ON FUNCTION public.seed_dit_milestones_for_record() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- notifications: extend type + reference_type
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'request_assigned',
    'request_urgent',
    'request_updated',
    'form_approval_needed',
    'form_reviewed',
    'schedule_published',
    'evaluation_submitted'
  )
);

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_reference_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_reference_type_check CHECK (
  reference_type IN ('request', 'form_submission', 'schedule_event', 'evaluation')
);
