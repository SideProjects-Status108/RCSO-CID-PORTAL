-- DIT Weekly Training System: activity templates & exposures, weekly sessions,
-- competency scoring, unobserved tracking, deficiency workflow, excellence log.

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helper (only references public.fto_pairings — safe before new tables)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.weekly_training_pairing_accessible(p_pairing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.profile_reads_all_training()
    OR EXISTS (
      SELECT 1
      FROM public.fto_pairings fp
      WHERE fp.id = p_pairing_id
        AND (fp.fto_id = (SELECT auth.uid()) OR fp.dit_id = (SELECT auth.uid()))
    );
$$;

REVOKE ALL ON FUNCTION public.weekly_training_pairing_accessible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.weekly_training_pairing_accessible(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 1. training_activity_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_activity_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name text NOT NULL,
  category text NOT NULL,
  required_exposures_phase_1 integer NOT NULL DEFAULT 0,
  required_exposures_phase_2 integer NOT NULL DEFAULT 0,
  required_exposures_phase_3 integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_activity_templates_activity_name_key UNIQUE (activity_name)
);

CREATE INDEX IF NOT EXISTS training_activity_templates_category_idx
ON public.training_activity_templates (category);

DROP TRIGGER IF EXISTS training_activity_templates_set_updated_at
ON public.training_activity_templates;
CREATE TRIGGER training_activity_templates_set_updated_at
BEFORE UPDATE ON public.training_activity_templates
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.training_activity_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_activity_templates_select_authenticated"
ON public.training_activity_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "training_activity_templates_insert_staff"
ON public.training_activity_templates
FOR INSERT
TO authenticated
WITH CHECK (public.profile_reads_all_training());

CREATE POLICY "training_activity_templates_update_staff"
ON public.training_activity_templates
FOR UPDATE
TO authenticated
USING (public.profile_reads_all_training())
WITH CHECK (public.profile_reads_all_training());

CREATE POLICY "training_activity_templates_delete_staff"
ON public.training_activity_templates
FOR DELETE
TO authenticated
USING (public.profile_reads_all_training());

-- ---------------------------------------------------------------------------
-- 2. training_activity_exposures
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_activity_exposures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_record_id uuid NOT NULL REFERENCES public.dit_records (id) ON DELETE CASCADE,
  activity_template_id uuid NOT NULL REFERENCES public.training_activity_templates (id) ON DELETE RESTRICT,
  fto_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  exposure_date date NOT NULL,
  case_complaint_number text,
  role text NOT NULL CHECK (role IN ('observer', 'assistant', 'lead')),
  duration_minutes integer,
  fto_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_activity_exposures_dit_record_id_idx
ON public.training_activity_exposures (dit_record_id);
CREATE INDEX IF NOT EXISTS training_activity_exposures_activity_template_id_idx
ON public.training_activity_exposures (activity_template_id);
CREATE INDEX IF NOT EXISTS training_activity_exposures_exposure_date_idx
ON public.training_activity_exposures (exposure_date);
CREATE INDEX IF NOT EXISTS training_activity_exposures_fto_id_idx
ON public.training_activity_exposures (fto_id);

DROP TRIGGER IF EXISTS training_activity_exposures_set_updated_at
ON public.training_activity_exposures;
CREATE TRIGGER training_activity_exposures_set_updated_at
BEFORE UPDATE ON public.training_activity_exposures
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

-- RLS for exposures is applied after training_activity_exposure_accessible() is created.

-- ---------------------------------------------------------------------------
-- 4. competency_masters (reference; created before weekly scores FK)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competency_masters (
  key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL CHECK (
    category IN (
      'PROFESSIONALISM & DEMEANOR',
      'KNOWLEDGE & PROCEDURES',
      'INVESTIGATIVE CORE SKILLS',
      'OPERATIONAL MANAGEMENT',
      'INTERPERSONAL & SAFETY'
    )
  ),
  sort_order integer NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competency_masters_label_key UNIQUE (label)
);

CREATE INDEX IF NOT EXISTS competency_masters_category_idx
ON public.competency_masters (category);
CREATE INDEX IF NOT EXISTS competency_masters_sort_order_idx
ON public.competency_masters (sort_order);

ALTER TABLE public.competency_masters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competency_masters_select_authenticated"
ON public.competency_masters
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "competency_masters_insert_staff"
ON public.competency_masters
FOR INSERT
TO authenticated
WITH CHECK (public.profile_reads_all_training());

CREATE POLICY "competency_masters_update_staff"
ON public.competency_masters
FOR UPDATE
TO authenticated
USING (public.profile_reads_all_training())
WITH CHECK (public.profile_reads_all_training());

CREATE POLICY "competency_masters_delete_staff"
ON public.competency_masters
FOR DELETE
TO authenticated
USING (public.profile_reads_all_training());

INSERT INTO public.competency_masters (key, label, category, sort_order, description) VALUES
  ('general_appearance', 'General Appearance', 'PROFESSIONALISM & DEMEANOR', 1, NULL),
  ('acceptance_of_feedback', 'Acceptance of Feedback', 'PROFESSIONALISM & DEMEANOR', 2, NULL),
  ('attitude_toward_investigations', 'Attitude Toward Investigations', 'PROFESSIONALISM & DEMEANOR', 3, NULL),
  ('knowledge_policies_procedures', 'Knowledge of Policies/Procedures', 'KNOWLEDGE & PROCEDURES', 4, NULL),
  ('knowledge_laws_criminal_procedures', 'Knowledge of Laws/Criminal Procedures', 'KNOWLEDGE & PROCEDURES', 5, NULL),
  ('response_initial_investigation', 'Response to Initial Investigation', 'INVESTIGATIVE CORE SKILLS', 6, NULL),
  ('crime_scene_management', 'Crime Scene Management', 'INVESTIGATIVE CORE SKILLS', 7, NULL),
  ('time_management', 'Time Management', 'INVESTIGATIVE CORE SKILLS', 8, NULL),
  ('stress_management', 'Stress Management', 'INVESTIGATIVE CORE SKILLS', 9, NULL),
  ('general_investigative_skills', 'General Investigative Skills', 'INVESTIGATIVE CORE SKILLS', 10, NULL),
  ('interview_skills', 'Interview Skills', 'INVESTIGATIVE CORE SKILLS', 11, NULL),
  ('report_writing_documentation', 'Report Writing/Documentation', 'INVESTIGATIVE CORE SKILLS', 12, NULL),
  ('computer_data_entry', 'Computer/Data Entry', 'INVESTIGATIVE CORE SKILLS', 13, NULL),
  ('problem_solving_decision_making', 'Problem Solving/Decision Making', 'INVESTIGATIVE CORE SKILLS', 14, NULL),
  ('self_initiated_investigative_skills', 'Self-Initiated Investigative Skills', 'INVESTIGATIVE CORE SKILLS', 15, NULL),
  ('innovative_investigative_skills', 'Innovative Investigative Skills', 'INVESTIGATIVE CORE SKILLS', 16, NULL),
  ('officer_safety', 'Officer Safety', 'OPERATIONAL MANAGEMENT', 17, NULL),
  ('relationship_with_citizens', 'Relationship with Citizens', 'INTERPERSONAL & SAFETY', 18, NULL),
  ('relationships_within_cid_department', 'Relationships within CID/Department', 'INTERPERSONAL & SAFETY', 19, NULL),
  ('work_ethic', 'Work Ethic', 'INTERPERSONAL & SAFETY', 20, NULL)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. weekly_training_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id uuid NOT NULL REFERENCES public.fto_pairings (id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  submitted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  submitted_at timestamptz,
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_training_sessions_week_chk CHECK (week_end_date >= week_start_date),
  CONSTRAINT weekly_training_sessions_pairing_week_uniq UNIQUE (pairing_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS weekly_training_sessions_pairing_id_idx
ON public.weekly_training_sessions (pairing_id);
CREATE INDEX IF NOT EXISTS weekly_training_sessions_status_idx
ON public.weekly_training_sessions (status);
CREATE INDEX IF NOT EXISTS weekly_training_sessions_week_start_date_idx
ON public.weekly_training_sessions (week_start_date);

DROP TRIGGER IF EXISTS weekly_training_sessions_set_updated_at
ON public.weekly_training_sessions;
CREATE TRIGGER weekly_training_sessions_set_updated_at
BEFORE UPDATE ON public.weekly_training_sessions
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helpers that reference new tables (must run after CREATE TABLE)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.weekly_training_session_accessible(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.profile_reads_all_training()
    OR EXISTS (
      SELECT 1
      FROM public.weekly_training_sessions w
      JOIN public.fto_pairings fp ON fp.id = w.pairing_id
      WHERE w.id = p_session_id
        AND (fp.fto_id = (SELECT auth.uid()) OR fp.dit_id = (SELECT auth.uid()))
    );
$$;

CREATE OR REPLACE FUNCTION public.training_activity_exposure_accessible(p_exposure_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.profile_reads_all_training()
    OR EXISTS (
      SELECT 1
      FROM public.training_activity_exposures e
      JOIN public.dit_records dr ON dr.id = e.dit_record_id
      LEFT JOIN public.fto_pairings fp
        ON fp.dit_id = dr.user_id AND fp.is_active = true
      WHERE e.id = p_exposure_id
        AND (
          dr.user_id = (SELECT auth.uid())
          OR fp.fto_id = (SELECT auth.uid())
        )
    );
$$;

REVOKE ALL ON FUNCTION public.weekly_training_session_accessible(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.training_activity_exposure_accessible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.weekly_training_session_accessible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.training_activity_exposure_accessible(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: training_activity_exposures, weekly_training_sessions
-- ---------------------------------------------------------------------------

ALTER TABLE public.training_activity_exposures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_activity_exposures_select_scope"
ON public.training_activity_exposures
FOR SELECT
TO authenticated
USING (public.training_activity_exposure_accessible(id));

CREATE POLICY "training_activity_exposures_insert_scope"
ON public.training_activity_exposures
FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_reads_all_training()
  OR (
    fto_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.dit_records dr
      JOIN public.fto_pairings fp ON fp.dit_id = dr.user_id AND fp.is_active = true
      WHERE dr.id = dit_record_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "training_activity_exposures_update_scope"
ON public.training_activity_exposures
FOR UPDATE
TO authenticated
USING (public.training_activity_exposure_accessible(id))
WITH CHECK (
  public.profile_reads_all_training()
  OR (
    fto_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.dit_records dr
      JOIN public.fto_pairings fp ON fp.dit_id = dr.user_id AND fp.is_active = true
      WHERE dr.id = dit_record_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "training_activity_exposures_delete_scope"
ON public.training_activity_exposures
FOR DELETE
TO authenticated
USING (
  public.profile_reads_all_training()
  OR (
    EXISTS (
      SELECT 1
      FROM public.dit_records dr
      JOIN public.fto_pairings fp ON fp.dit_id = dr.user_id AND fp.is_active = true
      WHERE dr.id = dit_record_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
);

ALTER TABLE public.weekly_training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_training_sessions_select_scope"
ON public.weekly_training_sessions
FOR SELECT
TO authenticated
USING (public.weekly_training_session_accessible(id));

CREATE POLICY "weekly_training_sessions_insert_scope"
ON public.weekly_training_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_reads_all_training()
  OR (
    EXISTS (
      SELECT 1
      FROM public.fto_pairings fp
      WHERE fp.id = pairing_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "weekly_training_sessions_update_scope"
ON public.weekly_training_sessions
FOR UPDATE
TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.fto_pairings fp
    WHERE fp.id = pairing_id
      AND fp.fto_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.fto_pairings fp
    WHERE fp.id = pairing_id
      AND fp.fto_id = (SELECT auth.uid())
  )
);

CREATE POLICY "weekly_training_sessions_delete_staff"
ON public.weekly_training_sessions
FOR DELETE
TO authenticated
USING (public.profile_reads_all_training());

-- ---------------------------------------------------------------------------
-- 5. weekly_competency_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_competency_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.weekly_training_sessions (id) ON DELETE CASCADE,
  competency_key text NOT NULL REFERENCES public.competency_masters (key) ON UPDATE CASCADE ON DELETE RESTRICT,
  competency_label text NOT NULL,
  category text NOT NULL,
  score integer NOT NULL CHECK (score >= 1 AND score <= 5),
  explanation text,
  explanation_required boolean NOT NULL DEFAULT false,
  prior_week_score integer CHECK (prior_week_score IS NULL OR (prior_week_score >= 1 AND prior_week_score <= 5)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_competency_scores_session_competency_uniq UNIQUE (session_id, competency_key)
);

CREATE INDEX IF NOT EXISTS weekly_competency_scores_session_id_idx
ON public.weekly_competency_scores (session_id);
CREATE INDEX IF NOT EXISTS weekly_competency_scores_score_idx
ON public.weekly_competency_scores (score);

DROP TRIGGER IF EXISTS weekly_competency_scores_set_updated_at
ON public.weekly_competency_scores;
CREATE TRIGGER weekly_competency_scores_set_updated_at
BEFORE UPDATE ON public.weekly_competency_scores
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.weekly_competency_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_competency_scores_select_scope"
ON public.weekly_competency_scores
FOR SELECT
TO authenticated
USING (public.weekly_training_session_accessible(session_id));

CREATE POLICY "weekly_competency_scores_write_scope"
ON public.weekly_competency_scores
FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_reads_all_training()
  OR (
    public.weekly_training_session_accessible(session_id)
    AND EXISTS (
      SELECT 1
      FROM public.weekly_training_sessions w
      JOIN public.fto_pairings fp ON fp.id = w.pairing_id
      WHERE w.id = session_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "weekly_competency_scores_update_scope"
ON public.weekly_competency_scores
FOR UPDATE
TO authenticated
USING (
  public.profile_reads_all_training()
  OR (
    public.weekly_training_session_accessible(session_id)
    AND EXISTS (
      SELECT 1
      FROM public.weekly_training_sessions w
      JOIN public.fto_pairings fp ON fp.id = w.pairing_id
      WHERE w.id = session_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  public.profile_reads_all_training()
  OR (
    public.weekly_training_session_accessible(session_id)
    AND EXISTS (
      SELECT 1
      FROM public.weekly_training_sessions w
      JOIN public.fto_pairings fp ON fp.id = w.pairing_id
      WHERE w.id = session_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "weekly_competency_scores_delete_staff"
ON public.weekly_competency_scores
FOR DELETE
TO authenticated
USING (public.profile_reads_all_training());

-- ---------------------------------------------------------------------------
-- 6. unobserved_competencies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unobserved_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.weekly_training_sessions (id) ON DELETE CASCADE,
  competency_key text NOT NULL REFERENCES public.competency_masters (key) ON UPDATE CASCADE ON DELETE RESTRICT,
  competency_label text NOT NULL,
  days_since_last_observed integer,
  dit_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unobserved_competencies_session_competency_uniq UNIQUE (session_id, competency_key)
);

CREATE INDEX IF NOT EXISTS unobserved_competencies_session_id_idx
ON public.unobserved_competencies (session_id);

ALTER TABLE public.unobserved_competencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unobserved_competencies_select_scope"
ON public.unobserved_competencies
FOR SELECT
TO authenticated
USING (public.weekly_training_session_accessible(session_id));

CREATE POLICY "unobserved_competencies_insert_scope"
ON public.unobserved_competencies
FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_reads_all_training()
  OR (
    public.weekly_training_session_accessible(session_id)
    AND EXISTS (
      SELECT 1
      FROM public.weekly_training_sessions w
      JOIN public.fto_pairings fp ON fp.id = w.pairing_id
      WHERE w.id = session_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "unobserved_competencies_update_scope"
ON public.unobserved_competencies
FOR UPDATE
TO authenticated
USING (
  public.profile_reads_all_training()
  OR (
    public.weekly_training_session_accessible(session_id)
    AND EXISTS (
      SELECT 1
      FROM public.weekly_training_sessions w
      JOIN public.fto_pairings fp ON fp.id = w.pairing_id
      WHERE w.id = session_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  public.profile_reads_all_training()
  OR (
    public.weekly_training_session_accessible(session_id)
    AND EXISTS (
      SELECT 1
      FROM public.weekly_training_sessions w
      JOIN public.fto_pairings fp ON fp.id = w.pairing_id
      WHERE w.id = session_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "unobserved_competencies_delete_staff"
ON public.unobserved_competencies
FOR DELETE
TO authenticated
USING (public.profile_reads_all_training());

-- ---------------------------------------------------------------------------
-- 7. deficiency_forms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deficiency_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id uuid NOT NULL REFERENCES public.fto_pairings (id) ON DELETE CASCADE,
  weekly_session_id uuid NOT NULL REFERENCES public.weekly_training_sessions (id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'submitted' CHECK (
    status IN (
      'submitted',
      'coordinator_reviewing',
      'coaching_active',
      'escalated_to_sgt',
      'escalated_to_lt',
      'resolved'
    )
  ),
  priority_level text NOT NULL DEFAULT 'routine' CHECK (priority_level IN ('routine', 'urgent')),
  competencies_flagged jsonb NOT NULL DEFAULT '[]'::jsonb,
  additional_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deficiency_forms_pairing_id_idx
ON public.deficiency_forms (pairing_id);
CREATE INDEX IF NOT EXISTS deficiency_forms_status_idx
ON public.deficiency_forms (status);
CREATE INDEX IF NOT EXISTS deficiency_forms_weekly_session_id_idx
ON public.deficiency_forms (weekly_session_id);

DROP TRIGGER IF EXISTS deficiency_forms_set_updated_at
ON public.deficiency_forms;
CREATE TRIGGER deficiency_forms_set_updated_at
BEFORE UPDATE ON public.deficiency_forms
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.deficiency_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deficiency_forms_select_scope"
ON public.deficiency_forms
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR public.weekly_training_pairing_accessible(pairing_id)
);

CREATE POLICY "deficiency_forms_insert_scope"
ON public.deficiency_forms
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND (
    public.profile_reads_all_training()
    OR (
      public.weekly_training_pairing_accessible(pairing_id)
      AND EXISTS (
        SELECT 1
        FROM public.fto_pairings fp
        WHERE fp.id = pairing_id
          AND fp.fto_id = (SELECT auth.uid())
      )
    )
  )
);

CREATE POLICY "deficiency_forms_update_scope"
ON public.deficiency_forms
FOR UPDATE
TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.fto_pairings fp
    WHERE fp.id = pairing_id
      AND fp.fto_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.fto_pairings fp
    WHERE fp.id = pairing_id
      AND fp.fto_id = (SELECT auth.uid())
  )
);

CREATE POLICY "deficiency_forms_delete_staff"
ON public.deficiency_forms
FOR DELETE
TO authenticated
USING (public.profile_reads_all_training());

-- ---------------------------------------------------------------------------
-- 8. deficiency_form_actions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deficiency_form_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deficiency_form_id uuid NOT NULL REFERENCES public.deficiency_forms (id) ON DELETE CASCADE,
  action_level text NOT NULL CHECK (action_level IN ('coordinator', 'fto_sgt', 'lt')),
  actor_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  action_type text NOT NULL CHECK (
    action_type IN (
      'coordinator_review',
      'scheduled_meeting',
      'escalate_to_sgt',
      'escalate_to_lt',
      'resolve'
    )
  ),
  action_notes text,
  calendar_meeting_id text,
  meeting_date date,
  meeting_attendees text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deficiency_form_actions_deficiency_form_id_idx
ON public.deficiency_form_actions (deficiency_form_id);
CREATE INDEX IF NOT EXISTS deficiency_form_actions_actor_id_idx
ON public.deficiency_form_actions (actor_id);

ALTER TABLE public.deficiency_form_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deficiency_form_actions_select_scope"
ON public.deficiency_form_actions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.deficiency_forms df
    WHERE df.id = deficiency_form_actions.deficiency_form_id
      AND (
        public.profile_reads_all_training()
        OR public.weekly_training_pairing_accessible(df.pairing_id)
      )
  )
);

CREATE POLICY "deficiency_form_actions_insert_scope"
ON public.deficiency_form_actions
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.deficiency_forms df
    WHERE df.id = deficiency_form_id
      AND (
        public.profile_reads_all_training()
        OR (
          public.weekly_training_pairing_accessible(df.pairing_id)
          AND EXISTS (
            SELECT 1
            FROM public.fto_pairings fp
            WHERE fp.id = df.pairing_id
              AND fp.fto_id = (SELECT auth.uid())
          )
        )
      )
  )
);

CREATE POLICY "deficiency_form_actions_delete_staff"
ON public.deficiency_form_actions
FOR DELETE
TO authenticated
USING (public.profile_reads_all_training());

-- ---------------------------------------------------------------------------
-- 9. excellence_recognitions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.excellence_recognitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.weekly_training_sessions (id) ON DELETE CASCADE,
  competency_key text NOT NULL REFERENCES public.competency_masters (key) ON UPDATE CASCADE ON DELETE RESTRICT,
  competency_label text NOT NULL,
  dit_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  fto_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  explanation text,
  sent_to_recipients text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS excellence_recognitions_session_id_idx
ON public.excellence_recognitions (session_id);
CREATE INDEX IF NOT EXISTS excellence_recognitions_dit_user_id_idx
ON public.excellence_recognitions (dit_user_id);
CREATE INDEX IF NOT EXISTS excellence_recognitions_fto_user_id_idx
ON public.excellence_recognitions (fto_user_id);

ALTER TABLE public.excellence_recognitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "excellence_recognitions_select_scope"
ON public.excellence_recognitions
FOR SELECT
TO authenticated
USING (
  public.weekly_training_session_accessible(session_id)
  OR dit_user_id = (SELECT auth.uid())
  OR fto_user_id = (SELECT auth.uid())
);

CREATE POLICY "excellence_recognitions_insert_scope"
ON public.excellence_recognitions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.weekly_training_sessions w
    JOIN public.fto_pairings fp ON fp.id = w.pairing_id
    WHERE w.id = session_id
      AND fp.dit_id = dit_user_id
      AND fp.fto_id = fto_user_id
  )
  AND (
    public.profile_reads_all_training()
    OR (
      fto_user_id = (SELECT auth.uid())
      AND public.weekly_training_session_accessible(session_id)
    )
  )
);

CREATE POLICY "excellence_recognitions_delete_staff"
ON public.excellence_recognitions
FOR DELETE
TO authenticated
USING (public.profile_reads_all_training());

-- ---------------------------------------------------------------------------
-- Grants (authenticated client + service role; RLS still applies)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_activity_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_activity_exposures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_training_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competency_masters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_competency_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unobserved_competencies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deficiency_forms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deficiency_form_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.excellence_recognitions TO authenticated;

GRANT ALL ON public.training_activity_templates TO service_role;
GRANT ALL ON public.training_activity_exposures TO service_role;
GRANT ALL ON public.weekly_training_sessions TO service_role;
GRANT ALL ON public.competency_masters TO service_role;
GRANT ALL ON public.weekly_competency_scores TO service_role;
GRANT ALL ON public.unobserved_competencies TO service_role;
GRANT ALL ON public.deficiency_forms TO service_role;
GRANT ALL ON public.deficiency_form_actions TO service_role;
GRANT ALL ON public.excellence_recognitions TO service_role;
