-- RCSO CID Portal — Training Segment C foundation.
--
-- Introduces:
--   1. weekly_training_sessions: dit_absent_flag + reason (absence-aware evals)
--   2. deficiency_forms: extension_days + extension_override_by + extension_applied_at
--   3. training_quizzes + questions + options + attempts + attempt_answers
--   4. dit_journal_entries + dit_journal_reviews
--   5. fto_ctr_entries (FTO contact-time report)
--   6. dit_missed_day_nudges (dedup state for journal nudges)
--
-- Signature routing chains (weekly_eval, deficiency) already exist in
-- src/lib/training/signatures.ts; no changes to document_signatures itself.
--
-- All tables RLS-enabled. Training writes gate via is_training_writer();
-- DITs can insert/read their own journal + quiz attempts.


-- =============================================================================
-- 1. weekly_training_sessions — absence-aware evaluations
-- =============================================================================
--
-- When an eval week overlaps an acknowledged absence, the writer marks the
-- session as DIT-absent. Scoring UIs hide the competency grid and the
-- trajectory math in src/lib/training/scoring.ts skips these sessions.

ALTER TABLE public.weekly_training_sessions
  ADD COLUMN IF NOT EXISTS dit_absent_flag boolean NOT NULL DEFAULT false;

ALTER TABLE public.weekly_training_sessions
  ADD COLUMN IF NOT EXISTS dit_absent_reason text;

CREATE INDEX IF NOT EXISTS weekly_training_sessions_dit_absent_idx
  ON public.weekly_training_sessions (dit_absent_flag)
  WHERE dit_absent_flag = true;


-- =============================================================================
-- 2. deficiency_forms — tiered extensions
-- =============================================================================
--
-- Business rules (enforced in src/lib/training/deficiencies.ts, not SQL):
--   * First remedial for a given DIT: extension_days = 14 (default).
--   * Subsequent remedials: extension_days = 7.
--   * LT or Capt may override (0-60 inclusive) at sign-time.
-- extension_applied_at is set when the LT signature advances the route to
-- completion; that's also when dit_records.expected_graduation_date gets
-- extended by extension_days. Idempotency: the applier checks
-- extension_applied_at IS NULL before mutating.

ALTER TABLE public.deficiency_forms
  ADD COLUMN IF NOT EXISTS extension_days integer NOT NULL DEFAULT 14;

-- Guarded constraint add — PG rejects duplicate names, so drop-then-add.
ALTER TABLE public.deficiency_forms
  DROP CONSTRAINT IF EXISTS deficiency_forms_extension_days_chk;
ALTER TABLE public.deficiency_forms
  ADD CONSTRAINT deficiency_forms_extension_days_chk
  CHECK (extension_days >= 0 AND extension_days <= 60);

ALTER TABLE public.deficiency_forms
  ADD COLUMN IF NOT EXISTS extension_override_by uuid
    REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.deficiency_forms
  ADD COLUMN IF NOT EXISTS extension_applied_at timestamptz;


-- =============================================================================
-- 3. Training quizzes (non-gating diagnostic)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.training_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  topic text,
  is_published boolean NOT NULL DEFAULT false,
  pass_threshold_green integer NOT NULL DEFAULT 80
    CHECK (pass_threshold_green BETWEEN 0 AND 100),
  pass_threshold_amber integer NOT NULL DEFAULT 61
    CHECK (pass_threshold_amber BETWEEN 0 AND 100),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_quizzes_published_idx
  ON public.training_quizzes (is_published)
  WHERE is_published = true;

CREATE TABLE IF NOT EXISTS public.training_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.training_quizzes (id) ON DELETE CASCADE,
  prompt text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_quiz_questions_quiz_idx
  ON public.training_quiz_questions (quiz_id);

CREATE TABLE IF NOT EXISTS public.training_quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.training_quiz_questions (id) ON DELETE CASCADE,
  label text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_quiz_options_question_idx
  ON public.training_quiz_options (question_id);

CREATE TABLE IF NOT EXISTS public.training_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.training_quizzes (id) ON DELETE RESTRICT,
  dit_record_id uuid NOT NULL REFERENCES public.dit_records (id) ON DELETE CASCADE,
  attempted_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score_percent numeric(5, 2),
  tier text CHECK (tier IN ('green', 'amber', 'red')),
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'abandoned')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_quiz_attempts_dit_idx
  ON public.training_quiz_attempts (dit_record_id);
CREATE INDEX IF NOT EXISTS training_quiz_attempts_quiz_idx
  ON public.training_quiz_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS training_quiz_attempts_tier_idx
  ON public.training_quiz_attempts (tier)
  WHERE tier IN ('amber', 'red');

CREATE TABLE IF NOT EXISTS public.training_quiz_attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.training_quiz_attempts (id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.training_quiz_questions (id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.training_quiz_options (id) ON DELETE SET NULL,
  is_correct boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_quiz_attempt_answers_unique
    UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS training_quiz_attempt_answers_attempt_idx
  ON public.training_quiz_attempt_answers (attempt_id);


-- =============================================================================
-- 4. DIT journal (DIT daily entries + coordinator review)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dit_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_record_id uuid NOT NULL
    REFERENCES public.dit_records (id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  body text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dit_journal_entries_one_per_day UNIQUE (dit_record_id, entry_date)
);

CREATE INDEX IF NOT EXISTS dit_journal_entries_dit_idx
  ON public.dit_journal_entries (dit_record_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS public.dit_journal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL
    REFERENCES public.dit_journal_entries (id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dit_journal_reviews_entry_idx
  ON public.dit_journal_reviews (entry_id);


-- =============================================================================
-- 5. FTO Contact-Time Report (FTO-authored, not DIT-authored)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.fto_ctr_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_record_id uuid NOT NULL
    REFERENCES public.dit_records (id) ON DELETE CASCADE,
  pairing_id uuid REFERENCES public.fto_pairings (id) ON DELETE SET NULL,
  fto_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  contact_hours numeric(4, 2),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fto_ctr_entries_hours_chk
    CHECK (contact_hours IS NULL OR (contact_hours >= 0 AND contact_hours <= 24))
);

CREATE INDEX IF NOT EXISTS fto_ctr_entries_dit_idx
  ON public.fto_ctr_entries (dit_record_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS fto_ctr_entries_fto_idx
  ON public.fto_ctr_entries (fto_id, entry_date DESC);


-- =============================================================================
-- 6. Missed-day nudge state (dedup)
-- =============================================================================
--
-- The journal nudge rules (Day-2 DIT nudge, Day-3+ FTO notification) need to
-- avoid spamming the same person every page load. This table captures the
-- (dit_record_id, nudge_date) pair already surfaced so we only fire once.

CREATE TABLE IF NOT EXISTS public.dit_missed_day_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_record_id uuid NOT NULL
    REFERENCES public.dit_records (id) ON DELETE CASCADE,
  nudge_date date NOT NULL,
  nudge_kind text NOT NULL CHECK (
    nudge_kind IN ('dit_self', 'fto_notify')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dit_missed_day_nudges_unique
    UNIQUE (dit_record_id, nudge_date, nudge_kind)
);

CREATE INDEX IF NOT EXISTS dit_missed_day_nudges_dit_idx
  ON public.dit_missed_day_nudges (dit_record_id, nudge_date DESC);


-- =============================================================================
-- 7. RLS — quizzes & journal
-- =============================================================================

ALTER TABLE public.training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dit_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dit_journal_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fto_ctr_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dit_missed_day_nudges ENABLE ROW LEVEL SECURITY;

-- Quizzes: published quizzes are readable by any authenticated user; drafts
-- only by training writers. Writes require is_training_writer().
CREATE POLICY "training_quizzes_select_scope"
ON public.training_quizzes FOR SELECT TO authenticated
USING (is_published = true OR public.is_training_writer());

CREATE POLICY "training_quizzes_writer_all"
ON public.training_quizzes FOR ALL TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());

CREATE POLICY "training_quiz_questions_select_scope"
ON public.training_quiz_questions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.training_quizzes q
    WHERE q.id = training_quiz_questions.quiz_id
      AND (q.is_published = true OR public.is_training_writer())
  )
);

CREATE POLICY "training_quiz_questions_writer_all"
ON public.training_quiz_questions FOR ALL TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());

-- Options: readable if question is readable (published or writer).
-- Labels + order visible to takers; is_correct exposure is handled at query
-- time in the API (server strips it). RLS doesn't hide columns in Postgres,
-- so application code MUST omit is_correct when returning to DITs.
CREATE POLICY "training_quiz_options_select_scope"
ON public.training_quiz_options FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.training_quiz_questions qq
    JOIN public.training_quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = training_quiz_options.question_id
      AND (q.is_published = true OR public.is_training_writer())
  )
);

CREATE POLICY "training_quiz_options_writer_all"
ON public.training_quiz_options FOR ALL TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());

-- Attempts: the attempter can read/write their own; training staff can read
-- all scoped via profile_reads_all_training().
CREATE POLICY "training_quiz_attempts_select_scope"
ON public.training_quiz_attempts FOR SELECT TO authenticated
USING (
  attempted_by = (SELECT auth.uid())
  OR public.profile_reads_all_training()
);

CREATE POLICY "training_quiz_attempts_insert_self"
ON public.training_quiz_attempts FOR INSERT TO authenticated
WITH CHECK (attempted_by = (SELECT auth.uid()));

CREATE POLICY "training_quiz_attempts_update_self"
ON public.training_quiz_attempts FOR UPDATE TO authenticated
USING (attempted_by = (SELECT auth.uid()))
WITH CHECK (attempted_by = (SELECT auth.uid()));

-- Attempt answers: readable + writable by the attempt owner; readable by
-- training staff.
CREATE POLICY "training_quiz_attempt_answers_select_scope"
ON public.training_quiz_attempt_answers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.training_quiz_attempts a
    WHERE a.id = training_quiz_attempt_answers.attempt_id
      AND (a.attempted_by = (SELECT auth.uid()) OR public.profile_reads_all_training())
  )
);

CREATE POLICY "training_quiz_attempt_answers_insert_self"
ON public.training_quiz_attempt_answers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_quiz_attempts a
    WHERE a.id = training_quiz_attempt_answers.attempt_id
      AND a.attempted_by = (SELECT auth.uid())
  )
);

-- Journal entries: DIT writes their own; FTO Coordinator + training writers
-- read all. Paired FTO reads entries for their DIT.
CREATE POLICY "dit_journal_entries_select_scope"
ON public.dit_journal_entries FOR SELECT TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    JOIN public.fto_pairings fp ON fp.dit_id = dr.user_id AND fp.is_active = true
    WHERE dr.id = dit_journal_entries.dit_record_id
      AND fp.fto_id = (SELECT auth.uid())
  )
);

CREATE POLICY "dit_journal_entries_insert_self"
ON public.dit_journal_entries FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.dit_records dr
    WHERE dr.id = dit_journal_entries.dit_record_id
      AND dr.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "dit_journal_entries_update_self"
ON public.dit_journal_entries FOR UPDATE TO authenticated
USING (created_by = (SELECT auth.uid()))
WITH CHECK (created_by = (SELECT auth.uid()));

-- Journal reviews: FTO Coordinator + training writers author; the DIT reads
-- reviews of their own entries.
CREATE POLICY "dit_journal_reviews_select_scope"
ON public.dit_journal_reviews FOR SELECT TO authenticated
USING (
  reviewer_id = (SELECT auth.uid())
  OR public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.dit_journal_entries je
    JOIN public.dit_records dr ON dr.id = je.dit_record_id
    WHERE je.id = dit_journal_reviews.entry_id
      AND dr.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "dit_journal_reviews_writer_all"
ON public.dit_journal_reviews FOR ALL TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());

-- FTO CTR entries: the FTO author + training writers read/write. Paired FTO
-- only sees their own entries (distinct from the journal).
CREATE POLICY "fto_ctr_entries_select_scope"
ON public.fto_ctr_entries FOR SELECT TO authenticated
USING (
  fto_id = (SELECT auth.uid())
  OR public.profile_reads_all_training()
);

CREATE POLICY "fto_ctr_entries_insert_self"
ON public.fto_ctr_entries FOR INSERT TO authenticated
WITH CHECK (fto_id = (SELECT auth.uid()));

CREATE POLICY "fto_ctr_entries_update_self"
ON public.fto_ctr_entries FOR UPDATE TO authenticated
USING (fto_id = (SELECT auth.uid()) OR public.is_training_writer())
WITH CHECK (fto_id = (SELECT auth.uid()) OR public.is_training_writer());

-- Missed-day nudges: server-side only (service-role client inserts). Give
-- authenticated users read access to their own nudges so the DIT's own
-- dashboard can surface the banner; writers get all.
CREATE POLICY "dit_missed_day_nudges_select_scope"
ON public.dit_missed_day_nudges FOR SELECT TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1 FROM public.dit_records dr
    WHERE dr.id = dit_missed_day_nudges.dit_record_id
      AND dr.user_id = (SELECT auth.uid())
  )
);

-- No insert/update policies: only the service role (scheduler + API) writes.


-- =============================================================================
-- 8. updated_at triggers for mutable tables
-- =============================================================================

DROP TRIGGER IF EXISTS training_quizzes_set_updated_at ON public.training_quizzes;
CREATE TRIGGER training_quizzes_set_updated_at
BEFORE UPDATE ON public.training_quizzes
FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

DROP TRIGGER IF EXISTS dit_journal_entries_set_updated_at ON public.dit_journal_entries;
CREATE TRIGGER dit_journal_entries_set_updated_at
BEFORE UPDATE ON public.dit_journal_entries
FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

DROP TRIGGER IF EXISTS fto_ctr_entries_set_updated_at ON public.fto_ctr_entries;
CREATE TRIGGER fto_ctr_entries_set_updated_at
BEFORE UPDATE ON public.fto_ctr_entries
FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();
