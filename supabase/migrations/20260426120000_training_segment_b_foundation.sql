-- RCSO CID Portal — Training Segment B foundation.
--
-- Introduces:
--   1. dit_records schema updates: add 'suspended' status, expected_graduation_date
--   2. document_signatures (polymorphic) + signature_events
--   3. dit_absence_records
--   4. training_program_config (single-row tunables)
--   5. VARK survey authoring + responses (dit_survey_questions/options/responses)
--      + dit_surveys columns (scores jsonb, narrative text)
--
-- All tables RLS-enabled. Training writes gate via is_training_writer();
-- generic supervision remains in read + sign-only tier.

-- =============================================================================
-- 1. dit_records schema updates
-- =============================================================================

ALTER TABLE public.dit_records
  DROP CONSTRAINT IF EXISTS dit_records_status_check;

ALTER TABLE public.dit_records
  ADD CONSTRAINT dit_records_status_check
  CHECK (status IN ('active', 'on_hold', 'suspended', 'graduated', 'separated'));

ALTER TABLE public.dit_records
  ADD COLUMN IF NOT EXISTS expected_graduation_date date;

-- Broaden the update policy so any Training Writer (Training Supervisor,
-- FTO Coordinator, Supervision Admin, Admin) can update dit_records. The
-- old coordinator-only policy stays in place; we add a writer policy that
-- complements it so either clause grants the UPDATE.
DROP POLICY IF EXISTS "dit_records_update_writer" ON public.dit_records;
CREATE POLICY "dit_records_update_writer"
ON public.dit_records
FOR UPDATE
TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());


-- =============================================================================
-- 2. document_signatures + signature_events
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.document_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL CHECK (
    doc_type IN (
      'weekly_eval',
      'deficiency',
      'equipment_checkoff',
      'completion_cert',
      'fto_feedback',
      'absence_record'
    )
  ),
  doc_id uuid NOT NULL,
  dit_record_id uuid REFERENCES public.dit_records (id) ON DELETE SET NULL,
  routing_order text[] NOT NULL,
  current_step integer NOT NULL DEFAULT 0,
  current_signer_role text,
  status text NOT NULL DEFAULT 'in_progress' CHECK (
    status IN ('in_progress', 'completed', 'cancelled')
  ),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS document_signatures_doc_idx
  ON public.document_signatures (doc_type, doc_id);
CREATE INDEX IF NOT EXISTS document_signatures_dit_record_idx
  ON public.document_signatures (dit_record_id);
CREATE INDEX IF NOT EXISTS document_signatures_status_idx
  ON public.document_signatures (status);
CREATE INDEX IF NOT EXISTS document_signatures_current_signer_idx
  ON public.document_signatures (current_signer_role)
  WHERE status = 'in_progress';

ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_signatures_select_scope"
ON public.document_signatures
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR (
    -- FTO who owns the associated DIT record via an active pairing
    dit_record_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.fto_pairings fp
      JOIN public.dit_records dr ON dr.user_id = fp.dit_id
      WHERE dr.id = document_signatures.dit_record_id
        AND fp.fto_id = (SELECT auth.uid())
        AND fp.is_active = true
    )
  )
  OR (
    -- DIT reads their own
    dit_record_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.dit_records dr
      WHERE dr.id = document_signatures.dit_record_id
        AND dr.user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "document_signatures_insert_writer"
ON public.document_signatures
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_training_writer()
  AND created_by = (SELECT auth.uid())
);

CREATE POLICY "document_signatures_update_writer"
ON public.document_signatures
FOR UPDATE
TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());


CREATE TABLE IF NOT EXISTS public.signature_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_signature_id uuid NOT NULL
    REFERENCES public.document_signatures (id) ON DELETE CASCADE,
  step_index integer NOT NULL,
  signer_role text NOT NULL,
  signer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  signature_image text NOT NULL,
  biometric_method text,
  device_id text,
  ip_address text,
  signed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signature_events_doc_idx
  ON public.signature_events (document_signature_id);
CREATE INDEX IF NOT EXISTS signature_events_signer_idx
  ON public.signature_events (signer_id);

ALTER TABLE public.signature_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signature_events_select_scope"
ON public.signature_events
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR signer_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.document_signatures ds
    LEFT JOIN public.dit_records dr ON dr.id = ds.dit_record_id
    LEFT JOIN public.fto_pairings fp ON fp.dit_id = dr.user_id AND fp.is_active = true
    WHERE ds.id = signature_events.document_signature_id
      AND (
        dr.user_id = (SELECT auth.uid())
        OR fp.fto_id = (SELECT auth.uid())
      )
  )
);

CREATE POLICY "signature_events_insert_writer"
ON public.signature_events
FOR INSERT
TO authenticated
WITH CHECK (
  signer_id = (SELECT auth.uid())
);


-- =============================================================================
-- 3. dit_absence_records
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dit_absence_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_record_id uuid NOT NULL
    REFERENCES public.dit_records (id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  kind text NOT NULL CHECK (
    kind IN ('illness', 'oji', 'bereavement', 'personal', 'sick')
  ),
  description text,
  status text NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('draft', 'submitted', 'acknowledged', 'closed')
  ),
  originated_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dit_absence_records_date_order
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS dit_absence_records_dit_record_idx
  ON public.dit_absence_records (dit_record_id);
CREATE INDEX IF NOT EXISTS dit_absence_records_status_idx
  ON public.dit_absence_records (status);
CREATE INDEX IF NOT EXISTS dit_absence_records_date_range_idx
  ON public.dit_absence_records (dit_record_id, start_date, end_date);

DROP TRIGGER IF EXISTS dit_absence_records_set_updated_at
  ON public.dit_absence_records;
CREATE TRIGGER dit_absence_records_set_updated_at
BEFORE UPDATE ON public.dit_absence_records
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.dit_absence_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dit_absence_records_select_scope"
ON public.dit_absence_records
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    WHERE dr.id = dit_absence_records.dit_record_id
      AND dr.user_id = (SELECT auth.uid())
      AND dit_absence_records.status = 'closed'
  )
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    JOIN public.fto_pairings fp ON fp.dit_id = dr.user_id
    WHERE dr.id = dit_absence_records.dit_record_id
      AND fp.fto_id = (SELECT auth.uid())
      AND fp.is_active = true
  )
);

CREATE POLICY "dit_absence_records_insert_fto_or_writer"
ON public.dit_absence_records
FOR INSERT
TO authenticated
WITH CHECK (
  originated_by = (SELECT auth.uid())
  AND (
    public.is_training_writer()
    OR EXISTS (
      SELECT 1
      FROM public.dit_records dr
      JOIN public.fto_pairings fp ON fp.dit_id = dr.user_id
      WHERE dr.id = dit_absence_records.dit_record_id
        AND fp.fto_id = (SELECT auth.uid())
        AND fp.is_active = true
    )
  )
);

CREATE POLICY "dit_absence_records_update_writer"
ON public.dit_absence_records
FOR UPDATE
TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());


-- =============================================================================
-- 4. training_program_config (single row)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.training_program_config (
  id integer PRIMARY KEY CHECK (id = 1),
  extension_days_first integer NOT NULL DEFAULT 14 CHECK (extension_days_first BETWEEN 0 AND 60),
  extension_days_subsequent integer NOT NULL DEFAULT 7 CHECK (extension_days_subsequent BETWEEN 0 AND 60),
  quiz_amber_threshold integer NOT NULL DEFAULT 80 CHECK (quiz_amber_threshold BETWEEN 0 AND 100),
  quiz_red_threshold integer NOT NULL DEFAULT 60 CHECK (quiz_red_threshold BETWEEN 0 AND 100),
  journal_nudge_days integer NOT NULL DEFAULT 2 CHECK (journal_nudge_days BETWEEN 1 AND 14),
  journal_flag_fto_days integer NOT NULL DEFAULT 3 CHECK (journal_flag_fto_days BETWEEN 1 AND 14),
  survey_expiry_days integer NOT NULL DEFAULT 7 CHECK (survey_expiry_days BETWEEN 1 AND 90),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

INSERT INTO public.training_program_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.training_program_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_program_config_select_all_training"
ON public.training_program_config
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('fto', 'dit', 'detective')
  )
);

CREATE POLICY "training_program_config_update_writer"
ON public.training_program_config
FOR UPDATE
TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());


-- =============================================================================
-- 5. VARK survey tables
-- =============================================================================

ALTER TABLE public.dit_surveys
  ADD COLUMN IF NOT EXISTS scores jsonb,
  ADD COLUMN IF NOT EXISTS narrative text;

CREATE TABLE IF NOT EXISTS public.dit_survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dit_survey_questions_order_idx
  ON public.dit_survey_questions (display_order)
  WHERE is_active = true;

ALTER TABLE public.dit_survey_questions ENABLE ROW LEVEL SECURITY;

-- Public survey page reads questions anonymously (via a service-role API route
-- that validates the token). For authenticated users we also allow training
-- writers to read them for the authoring UI (Segment E).
CREATE POLICY "dit_survey_questions_select_writer"
ON public.dit_survey_questions
FOR SELECT
TO authenticated
USING (public.profile_reads_all_training());

CREATE POLICY "dit_survey_questions_write_writer"
ON public.dit_survey_questions
FOR ALL
TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());


CREATE TABLE IF NOT EXISTS public.dit_survey_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL
    REFERENCES public.dit_survey_questions (id) ON DELETE CASCADE,
  label text NOT NULL,
  weights jsonb NOT NULL DEFAULT '{"v":0,"a":0,"r":0,"k":0}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dit_survey_options_question_idx
  ON public.dit_survey_options (question_id, display_order);

ALTER TABLE public.dit_survey_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dit_survey_options_select_writer"
ON public.dit_survey_options
FOR SELECT
TO authenticated
USING (public.profile_reads_all_training());

CREATE POLICY "dit_survey_options_write_writer"
ON public.dit_survey_options
FOR ALL
TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());


CREATE TABLE IF NOT EXISTS public.dit_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL
    REFERENCES public.dit_surveys (id) ON DELETE CASCADE,
  question_id uuid NOT NULL
    REFERENCES public.dit_survey_questions (id) ON DELETE CASCADE,
  option_id uuid NOT NULL
    REFERENCES public.dit_survey_options (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dit_survey_responses_one_per_question
    UNIQUE (survey_id, question_id)
);

CREATE INDEX IF NOT EXISTS dit_survey_responses_survey_idx
  ON public.dit_survey_responses (survey_id);

ALTER TABLE public.dit_survey_responses ENABLE ROW LEVEL SECURITY;

-- Authenticated reads: training writers only. Public writes go through a
-- service-role API route (/api/survey/[token]) and never touch this policy.
CREATE POLICY "dit_survey_responses_select_writer"
ON public.dit_survey_responses
FOR SELECT
TO authenticated
USING (public.profile_reads_all_training());
