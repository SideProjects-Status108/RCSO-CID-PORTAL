-- RCSO CID Portal — Segment D foundation.
--
-- Adds tables for:
--   * Cases / Call-Outs tab (Prompt 7)
--   * Documents & Resources (Prompt 9)
--   * PBLEs + artifacts + 6 seed templates (PTO hybrid addition)
--   * profiles.fto_color for the 10-week schedule grid (Prompt 8)
--
-- Activity tab (Prompt 6) reuses the pre-existing
-- training_activity_templates + training_activity_exposures tables from
-- 20260425120000_dit_weekly_training_system.sql; no schema change needed.
-- The 10-week schedule grid (Prompt 8) reads fto_pairings +
-- weekly_training_sessions directly.
--
-- Idempotent and safe to re-run.

-- ---------------------------------------------------------------------------
-- profiles.fto_color
-- ---------------------------------------------------------------------------
--
-- Stable per-FTO color used to decorate the 10-week schedule grid so DITs
-- can tell their FTOs apart at a glance. Editable by supervision in the
-- Training Settings page (Segment E). Null means "derive from fto_id hash
-- at render time" — safe fallback while Sgts fill in real colors.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fto_color text
    CHECK (fto_color IS NULL OR fto_color ~* '^#[0-9a-f]{6}$');

COMMENT ON COLUMN public.profiles.fto_color IS
  'Hex color (e.g. #3E7BFA) used by the training schedule grid to label this FTO. Nullable; UI falls back to a client-side hash of user id.';

-- ---------------------------------------------------------------------------
-- case_assignments — DIT case load (per-DIT, not tied to a single FTO pairing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.case_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_record_id uuid NOT NULL REFERENCES public.dit_records (id) ON DELETE CASCADE,
  case_number text,
  complaint_number text,
  title text NOT NULL,
  dit_role text NOT NULL DEFAULT 'assist' CHECK (
    dit_role IN ('lead', 'assist', 'observer')
  ),
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'closed', 'inactive')
  ),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  assigned_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_assignments_dit_record_id_idx
  ON public.case_assignments (dit_record_id);
CREATE INDEX IF NOT EXISTS case_assignments_status_idx
  ON public.case_assignments (status);

DROP TRIGGER IF EXISTS case_assignments_set_updated_at ON public.case_assignments;
CREATE TRIGGER case_assignments_set_updated_at
BEFORE UPDATE ON public.case_assignments
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;

-- Read: staff, the DIT themselves, or any currently-active FTO paired with that DIT.
DROP POLICY IF EXISTS "case_assignments_select_scope" ON public.case_assignments;
CREATE POLICY "case_assignments_select_scope"
ON public.case_assignments
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    WHERE dr.id = case_assignments.dit_record_id
      AND dr.user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    JOIN public.fto_pairings fp
      ON fp.dit_id = dr.user_id AND fp.is_active = true
    WHERE dr.id = case_assignments.dit_record_id
      AND fp.fto_id = (SELECT auth.uid())
  )
);

-- Write: supervision+ / fto_coordinator, or the DIT's currently-paired FTO.
DROP POLICY IF EXISTS "case_assignments_insert_scope" ON public.case_assignments;
CREATE POLICY "case_assignments_insert_scope"
ON public.case_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  assigned_by = (SELECT auth.uid())
  AND (
    public.profile_reads_all_training()
    OR EXISTS (
      SELECT 1
      FROM public.dit_records dr
      JOIN public.fto_pairings fp
        ON fp.dit_id = dr.user_id AND fp.is_active = true
      WHERE dr.id = dit_record_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "case_assignments_update_scope" ON public.case_assignments;
CREATE POLICY "case_assignments_update_scope"
ON public.case_assignments
FOR UPDATE
TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    JOIN public.fto_pairings fp
      ON fp.dit_id = dr.user_id AND fp.is_active = true
    WHERE dr.id = case_assignments.dit_record_id
      AND fp.fto_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    JOIN public.fto_pairings fp
      ON fp.dit_id = dr.user_id AND fp.is_active = true
    WHERE dr.id = case_assignments.dit_record_id
      AND fp.fto_id = (SELECT auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- call_out_logs — after-hours / on-call response log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_out_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_record_id uuid NOT NULL REFERENCES public.dit_records (id) ON DELETE CASCADE,
  responded_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 0
    CHECK (duration_minutes >= 0 AND duration_minutes <= 24 * 60),
  incident_type text,
  case_number text,
  off_duty boolean NOT NULL DEFAULT false,
  comp_time_eligible boolean NOT NULL DEFAULT false,
  -- Who the DIT responded with (usually their FTO; nullable because the
  -- DIT may roll with a detective outside their pairing on call-outs).
  responded_with uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  notes text,
  logged_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_out_logs_dit_record_id_idx
  ON public.call_out_logs (dit_record_id);
CREATE INDEX IF NOT EXISTS call_out_logs_responded_at_idx
  ON public.call_out_logs (responded_at DESC);

DROP TRIGGER IF EXISTS call_out_logs_set_updated_at ON public.call_out_logs;
CREATE TRIGGER call_out_logs_set_updated_at
BEFORE UPDATE ON public.call_out_logs
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.call_out_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "call_out_logs_select_scope" ON public.call_out_logs;
CREATE POLICY "call_out_logs_select_scope"
ON public.call_out_logs
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    WHERE dr.id = call_out_logs.dit_record_id
      AND dr.user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    JOIN public.fto_pairings fp
      ON fp.dit_id = dr.user_id AND fp.is_active = true
    WHERE dr.id = call_out_logs.dit_record_id
      AND fp.fto_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "call_out_logs_insert_scope" ON public.call_out_logs;
CREATE POLICY "call_out_logs_insert_scope"
ON public.call_out_logs
FOR INSERT
TO authenticated
WITH CHECK (
  logged_by = (SELECT auth.uid())
  AND (
    public.profile_reads_all_training()
    OR EXISTS (
      SELECT 1
      FROM public.dit_records dr
      JOIN public.fto_pairings fp
        ON fp.dit_id = dr.user_id AND fp.is_active = true
      WHERE dr.id = dit_record_id
        AND fp.fto_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "call_out_logs_update_scope" ON public.call_out_logs;
CREATE POLICY "call_out_logs_update_scope"
ON public.call_out_logs
FOR UPDATE
TO authenticated
USING (public.profile_reads_all_training() OR logged_by = (SELECT auth.uid()))
WITH CHECK (public.profile_reads_all_training() OR logged_by = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- training_documents — uploadable PDFs/slide decks/policies
-- ---------------------------------------------------------------------------
--
-- File bytes live in the "training-documents" Supabase Storage bucket;
-- this table stores metadata + the object_path we fetch signed URLs for.
CREATE TABLE IF NOT EXISTS public.training_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'policy' CHECK (
    category IN ('policy', 'reference', 'form', 'training_material', 'other')
  ),
  -- Visibility: 'all' = every authenticated user (incl. DITs and FTOs);
  -- 'staff' = supervision-plus + FTO coordinator + training writer.
  visibility text NOT NULL DEFAULT 'all' CHECK (
    visibility IN ('all', 'staff')
  ),
  storage_bucket text NOT NULL DEFAULT 'training-documents',
  object_path text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  uploaded_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_documents_category_idx
  ON public.training_documents (category);
CREATE INDEX IF NOT EXISTS training_documents_visibility_idx
  ON public.training_documents (visibility);

DROP TRIGGER IF EXISTS training_documents_set_updated_at ON public.training_documents;
CREATE TRIGGER training_documents_set_updated_at
BEFORE UPDATE ON public.training_documents
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.training_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_documents_select_scope" ON public.training_documents;
CREATE POLICY "training_documents_select_scope"
ON public.training_documents
FOR SELECT
TO authenticated
USING (
  visibility = 'all'
  OR public.profile_reads_all_training()
);

DROP POLICY IF EXISTS "training_documents_insert_writer" ON public.training_documents;
CREATE POLICY "training_documents_insert_writer"
ON public.training_documents
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_training_writer()
  AND uploaded_by = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "training_documents_update_writer" ON public.training_documents;
CREATE POLICY "training_documents_update_writer"
ON public.training_documents
FOR UPDATE
TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());

DROP POLICY IF EXISTS "training_documents_delete_writer" ON public.training_documents;
CREATE POLICY "training_documents_delete_writer"
ON public.training_documents
FOR DELETE
TO authenticated
USING (public.is_training_writer());

-- Create the storage bucket via supabase storage schema (idempotent).
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-documents', 'training-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS (readers: any authed; writers: training writers).
-- storage.objects policies are keyed by bucket_id.
DROP POLICY IF EXISTS "training_documents_bucket_select" ON storage.objects;
CREATE POLICY "training_documents_bucket_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'training-documents');

DROP POLICY IF EXISTS "training_documents_bucket_insert" ON storage.objects;
CREATE POLICY "training_documents_bucket_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-documents'
  AND public.is_training_writer()
);

DROP POLICY IF EXISTS "training_documents_bucket_update" ON storage.objects;
CREATE POLICY "training_documents_bucket_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'training-documents' AND public.is_training_writer())
WITH CHECK (bucket_id = 'training-documents' AND public.is_training_writer());

DROP POLICY IF EXISTS "training_documents_bucket_delete" ON storage.objects;
CREATE POLICY "training_documents_bucket_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'training-documents' AND public.is_training_writer());

-- ---------------------------------------------------------------------------
-- pto_pble_templates — curated PBLE scenarios seeded by the training team
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pto_pble_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_kind text NOT NULL CHECK (
    scenario_kind IN ('crime_scene', 'subpoena', 'search_warrant')
  ),
  title text NOT NULL,
  description text,
  recommended_phase integer NOT NULL DEFAULT 1
    CHECK (recommended_phase BETWEEN 1 AND 3),
  rubric jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pto_pble_templates_title_unique UNIQUE (title)
);

DROP TRIGGER IF EXISTS pto_pble_templates_set_updated_at ON public.pto_pble_templates;
CREATE TRIGGER pto_pble_templates_set_updated_at
BEFORE UPDATE ON public.pto_pble_templates
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.pto_pble_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pto_pble_templates_select_authed" ON public.pto_pble_templates;
CREATE POLICY "pto_pble_templates_select_authed"
ON public.pto_pble_templates
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pto_pble_templates_write_writer" ON public.pto_pble_templates;
CREATE POLICY "pto_pble_templates_write_writer"
ON public.pto_pble_templates
FOR ALL TO authenticated
USING (public.is_training_writer())
WITH CHECK (public.is_training_writer());

-- ---------------------------------------------------------------------------
-- pto_pbles — a template assigned to a DIT, with lifecycle + rubric scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pto_pbles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dit_record_id uuid NOT NULL REFERENCES public.dit_records (id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.pto_pble_templates (id) ON DELETE SET NULL,
  phase integer NOT NULL CHECK (phase BETWEEN 1 AND 3),
  scenario_kind text NOT NULL CHECK (
    scenario_kind IN ('crime_scene', 'subpoena', 'search_warrant')
  ),
  title text NOT NULL,
  -- Snapshot of template rubric at assign-time so later template edits
  -- don't mutate historical PBLE scores.
  rubric jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Scores written by the reviewing FTO/Coordinator:
  -- [{ criterion_key, score 1-5, notes }]
  rubric_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'assigned' CHECK (
    status IN ('assigned', 'in_progress', 'submitted', 'scored', 'passed', 'failed')
  ),
  assigned_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  submitted_at timestamptz,
  scored_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  scored_at timestamptz,
  overall_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pto_pbles_dit_record_id_idx
  ON public.pto_pbles (dit_record_id);
CREATE INDEX IF NOT EXISTS pto_pbles_status_idx
  ON public.pto_pbles (status);

DROP TRIGGER IF EXISTS pto_pbles_set_updated_at ON public.pto_pbles;
CREATE TRIGGER pto_pbles_set_updated_at
BEFORE UPDATE ON public.pto_pbles
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.pto_pbles ENABLE ROW LEVEL SECURITY;

-- Read: staff, the DIT themselves, or the DIT's active FTO.
DROP POLICY IF EXISTS "pto_pbles_select_scope" ON public.pto_pbles;
CREATE POLICY "pto_pbles_select_scope"
ON public.pto_pbles
FOR SELECT
TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    WHERE dr.id = pto_pbles.dit_record_id
      AND dr.user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    JOIN public.fto_pairings fp
      ON fp.dit_id = dr.user_id AND fp.is_active = true
    WHERE dr.id = pto_pbles.dit_record_id
      AND fp.fto_id = (SELECT auth.uid())
  )
);

-- Assign: staff only.
DROP POLICY IF EXISTS "pto_pbles_insert_staff" ON public.pto_pbles;
CREATE POLICY "pto_pbles_insert_staff"
ON public.pto_pbles
FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_reads_all_training()
  AND assigned_by = (SELECT auth.uid())
);

-- Update: staff (scoring, lifecycle) or the DIT (status transitions they
-- own: in_progress, submitted — enforced in the API layer, not SQL).
DROP POLICY IF EXISTS "pto_pbles_update_scope" ON public.pto_pbles;
CREATE POLICY "pto_pbles_update_scope"
ON public.pto_pbles
FOR UPDATE
TO authenticated
USING (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    WHERE dr.id = pto_pbles.dit_record_id
      AND dr.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  public.profile_reads_all_training()
  OR EXISTS (
    SELECT 1
    FROM public.dit_records dr
    WHERE dr.id = pto_pbles.dit_record_id
      AND dr.user_id = (SELECT auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- pto_pble_artifacts — files uploaded by a DIT to support their PBLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pto_pble_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pble_id uuid NOT NULL REFERENCES public.pto_pbles (id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'training-documents',
  object_path text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pto_pble_artifacts_pble_id_idx
  ON public.pto_pble_artifacts (pble_id);

ALTER TABLE public.pto_pble_artifacts ENABLE ROW LEVEL SECURITY;

-- Read: whoever can read the parent PBLE (inlining scope to avoid
-- recursive policy lookups; mirrors pto_pbles_select_scope).
DROP POLICY IF EXISTS "pto_pble_artifacts_select_scope" ON public.pto_pble_artifacts;
CREATE POLICY "pto_pble_artifacts_select_scope"
ON public.pto_pble_artifacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pto_pbles p
    JOIN public.dit_records dr ON dr.id = p.dit_record_id
    LEFT JOIN public.fto_pairings fp
      ON fp.dit_id = dr.user_id AND fp.is_active = true
    WHERE p.id = pto_pble_artifacts.pble_id
      AND (
        public.profile_reads_all_training()
        OR dr.user_id = (SELECT auth.uid())
        OR fp.fto_id = (SELECT auth.uid())
      )
  )
);

-- Insert: the DIT uploads their own artifacts; staff may also upload
-- (e.g. a coordinator attaching an exemplar).
DROP POLICY IF EXISTS "pto_pble_artifacts_insert_scope" ON public.pto_pble_artifacts;
CREATE POLICY "pto_pble_artifacts_insert_scope"
ON public.pto_pble_artifacts
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.pto_pbles p
    JOIN public.dit_records dr ON dr.id = p.dit_record_id
    WHERE p.id = pble_id
      AND (
        public.profile_reads_all_training()
        OR dr.user_id = (SELECT auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "pto_pble_artifacts_delete_scope" ON public.pto_pble_artifacts;
CREATE POLICY "pto_pble_artifacts_delete_scope"
ON public.pto_pble_artifacts
FOR DELETE
TO authenticated
USING (
  uploaded_by = (SELECT auth.uid())
  OR public.profile_reads_all_training()
);

-- ---------------------------------------------------------------------------
-- Seed 6 PBLE templates (1 Crime Scene + 2 Subpoena + 3 Search Warrant).
-- ---------------------------------------------------------------------------
--
-- These are idempotent (title is unique) and use a standard 4-criterion
-- rubric keyed to the master plan competencies. Coordinators can edit
-- rubric content inline later via the PBLE author UI.

INSERT INTO public.pto_pble_templates
  (scenario_kind, title, description, recommended_phase, rubric)
VALUES
  (
    'crime_scene',
    'Crime Scene — Residential Burglary',
    'DIT responds to a residential burglary, documents the scene, collects evidence, and produces a supplement.',
    2,
    '[
      { "key": "scene_safety",        "label": "Scene safety + security", "max_score": 5 },
      { "key": "evidence_collection", "label": "Evidence collection + chain of custody", "max_score": 5 },
      { "key": "documentation",       "label": "Report + photo documentation", "max_score": 5 },
      { "key": "witness_interviews",  "label": "Witness / victim interviews", "max_score": 5 }
    ]'::jsonb
  ),
  (
    'subpoena',
    'Subpoena — Cellular Records (CDR)',
    'Draft a subpoena for call detail records tied to an active case and articulate nexus to criminal activity.',
    1,
    '[
      { "key": "legal_basis",   "label": "Legal basis + relevance statement", "max_score": 5 },
      { "key": "specificity",   "label": "Specificity of request (numbers, dates, records sought)", "max_score": 5 },
      { "key": "formatting",    "label": "Formatting + court-ready language", "max_score": 5 },
      { "key": "chain_of_custody", "label": "Receipt + handling plan for returned records", "max_score": 5 }
    ]'::jsonb
  ),
  (
    'subpoena',
    'Subpoena — Bank / Financial Records',
    'Draft a subpoena duces tecum for financial records in a fraud or theft case.',
    2,
    '[
      { "key": "legal_basis",   "label": "Legal basis + relevance statement", "max_score": 5 },
      { "key": "specificity",   "label": "Account scope + date range specificity", "max_score": 5 },
      { "key": "formatting",    "label": "Formatting + court-ready language", "max_score": 5 },
      { "key": "privacy_notice","label": "Privacy / notice handling under RCW", "max_score": 5 }
    ]'::jsonb
  ),
  (
    'search_warrant',
    'Search Warrant — Residence (Narcotics)',
    'Author a residential search warrant affidavit for a narcotics case, including nexus, probable cause, and scope.',
    2,
    '[
      { "key": "probable_cause", "label": "Probable cause articulation", "max_score": 5 },
      { "key": "nexus",          "label": "Nexus between evidence + place to be searched", "max_score": 5 },
      { "key": "scope",          "label": "Scope + particularity of items to be seized", "max_score": 5 },
      { "key": "execution_plan", "label": "Execution + safety plan", "max_score": 5 }
    ]'::jsonb
  ),
  (
    'search_warrant',
    'Search Warrant — Vehicle (Stolen Property)',
    'Author a vehicle search warrant affidavit tied to a stolen property investigation.',
    2,
    '[
      { "key": "probable_cause", "label": "Probable cause articulation", "max_score": 5 },
      { "key": "nexus",          "label": "Nexus to specific vehicle + location", "max_score": 5 },
      { "key": "scope",          "label": "Scope + particularity of items to be seized", "max_score": 5 },
      { "key": "chain_of_custody","label": "Chain of custody plan", "max_score": 5 }
    ]'::jsonb
  ),
  (
    'search_warrant',
    'Search Warrant — Digital Device',
    'Author a search warrant for a cell phone / digital device, including Riley v. California analysis.',
    3,
    '[
      { "key": "probable_cause", "label": "Probable cause articulation", "max_score": 5 },
      { "key": "riley_scope",    "label": "Riley compliance + scope limits (apps, date ranges, categories)", "max_score": 5 },
      { "key": "forensic_plan",  "label": "Forensic examination plan + tools", "max_score": 5 },
      { "key": "return_plan",    "label": "Return of non-responsive data", "max_score": 5 }
    ]'::jsonb
  )
ON CONFLICT (title) DO NOTHING;
