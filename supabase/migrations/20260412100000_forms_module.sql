-- Forms & Documents module: cases, form_templates, form_submissions (extended), RLS.

-- ---------------------------------------------------------------------------
-- cases (minimal; Operations module expands later)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL,
  case_type text,
  assigned_detective uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'closed')
  ),
  date_opened date,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cases_case_number_key ON public.cases (case_number);

CREATE INDEX IF NOT EXISTS cases_assigned_detective_idx ON public.cases (assigned_detective);
CREATE INDEX IF NOT EXISTS cases_created_by_idx ON public.cases (created_by);
CREATE INDEX IF NOT EXISTS cases_status_idx ON public.cases (status);

DROP TRIGGER IF EXISTS cases_set_updated_at ON public.cases;
CREATE TRIGGER cases_set_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cases_select_scope" ON public.cases;
CREATE POLICY "cases_select_scope"
ON public.cases
FOR SELECT
TO authenticated
USING (
  public.profile_is_supervision_plus()
  OR assigned_detective = (SELECT auth.uid())
  OR created_by = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "cases_insert_own" ON public.cases;
CREATE POLICY "cases_insert_own"
ON public.cases
FOR INSERT
TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "cases_update_authenticated" ON public.cases;
CREATE POLICY "cases_update_authenticated"
ON public.cases
FOR UPDATE
TO authenticated
USING (
  public.profile_is_supervision_plus()
  OR created_by = (SELECT auth.uid())
  OR assigned_detective = (SELECT auth.uid())
)
WITH CHECK (
  public.profile_is_supervision_plus()
  OR created_by = (SELECT auth.uid())
  OR assigned_detective = (SELECT auth.uid())
);

-- ---------------------------------------------------------------------------
-- form_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  version integer NOT NULL DEFAULT 1,
  fields_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  requires_approval boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_templates_category_idx ON public.form_templates (category);
CREATE INDEX IF NOT EXISTS form_templates_published_idx ON public.form_templates (is_published, is_archived);

DROP TRIGGER IF EXISTS form_templates_set_updated_at ON public.form_templates;
CREATE TRIGGER form_templates_set_updated_at
BEFORE UPDATE ON public.form_templates
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_templates_select_published" ON public.form_templates;
CREATE POLICY "form_templates_select_published"
ON public.form_templates
FOR SELECT
TO authenticated
USING (
  (is_published = true AND is_archived = false)
  OR public.profile_is_admin_scope()
);

DROP POLICY IF EXISTS "form_templates_insert_admin" ON public.form_templates;
CREATE POLICY "form_templates_insert_admin"
ON public.form_templates
FOR INSERT
TO authenticated
WITH CHECK (public.profile_is_admin_scope());

DROP POLICY IF EXISTS "form_templates_update_admin" ON public.form_templates;
CREATE POLICY "form_templates_update_admin"
ON public.form_templates
FOR UPDATE
TO authenticated
USING (public.profile_is_admin_scope())
WITH CHECK (public.profile_is_admin_scope());

DROP POLICY IF EXISTS "form_templates_delete_admin" ON public.form_templates;
CREATE POLICY "form_templates_delete_admin"
ON public.form_templates
FOR DELETE
TO authenticated
USING (public.profile_is_admin_scope());

-- ---------------------------------------------------------------------------
-- form_submissions (extend Phase 1 stub)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "form_submissions_select_supervision" ON public.form_submissions;
DROP POLICY IF EXISTS "form_submissions_select_own" ON public.form_submissions;
DROP POLICY IF EXISTS "form_submissions_insert_own" ON public.form_submissions;

DELETE FROM public.form_submissions;

ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.form_templates (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS template_version integer,
  ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.cases (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- NOT NULL after backfill (table empty)
ALTER TABLE public.form_submissions
  ALTER COLUMN template_id SET NOT NULL,
  ALTER COLUMN template_version SET NOT NULL,
  ALTER COLUMN form_data SET NOT NULL;

ALTER TABLE public.form_submissions DROP CONSTRAINT IF EXISTS form_submissions_status_check;
ALTER TABLE public.form_submissions
  ADD CONSTRAINT form_submissions_status_check CHECK (
    status IN ('draft', 'submitted', 'approved', 'rejected')
  );

ALTER TABLE public.form_submissions
  ALTER COLUMN status SET DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS form_submissions_template_id_idx ON public.form_submissions (template_id);
CREATE INDEX IF NOT EXISTS form_submissions_case_id_idx ON public.form_submissions (case_id);
CREATE INDEX IF NOT EXISTS form_submissions_status_idx ON public.form_submissions (status);

DROP TRIGGER IF EXISTS form_submissions_set_updated_at ON public.form_submissions;
CREATE TRIGGER form_submissions_set_updated_at
BEFORE UPDATE ON public.form_submissions
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

-- RLS form_submissions
CREATE POLICY "form_submissions_select_own"
ON public.form_submissions
FOR SELECT
TO authenticated
USING (submitted_by = (SELECT auth.uid()));

CREATE POLICY "form_submissions_select_supervision"
ON public.form_submissions
FOR SELECT
TO authenticated
USING (public.profile_is_supervision_plus());

CREATE POLICY "form_submissions_insert_own"
ON public.form_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  submitted_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.form_templates t
    WHERE t.id = template_id
      AND t.is_published = true
      AND t.is_archived = false
  )
  AND (
    case_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.cases c
      WHERE c.id = case_id
        AND (
          public.profile_is_supervision_plus()
          OR c.assigned_detective = (SELECT auth.uid())
          OR c.created_by = (SELECT auth.uid())
        )
    )
  )
);

CREATE POLICY "form_submissions_update_own_draft_submit"
ON public.form_submissions
FOR UPDATE
TO authenticated
USING (
  submitted_by = (SELECT auth.uid())
  AND status = 'draft'
)
WITH CHECK (
  submitted_by = (SELECT auth.uid())
  AND status IN ('draft', 'submitted')
  AND (
    case_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.cases c
      WHERE c.id = case_id
        AND (
          public.profile_is_supervision_plus()
          OR c.assigned_detective = (SELECT auth.uid())
          OR c.created_by = (SELECT auth.uid())
        )
    )
  )
);

CREATE POLICY "form_submissions_update_supervision"
ON public.form_submissions
FOR UPDATE
TO authenticated
USING (public.profile_is_supervision_plus())
WITH CHECK (public.profile_is_supervision_plus());

-- ---------------------------------------------------------------------------
-- Seed: five published templates (created_by NULL = system seed)
-- ---------------------------------------------------------------------------
INSERT INTO public.form_templates (
  name, category, version, fields_schema, requires_approval, is_published, is_archived, created_by
)
VALUES
(
  'Detective Activity Report',
  'case',
  1,
  $f$[
    {"id":"case_number","label":"Case Number","type":"text","required":true,"options":[],"placeholder":"","section":"Case Information"},
    {"id":"activity_date","label":"Activity Date","type":"date","required":true,"options":[],"placeholder":"","section":"Case Information"},
    {"id":"activity_type","label":"Activity Type","type":"select","required":true,"options":["Patrol","Interview","Court","Surveillance","Report Writing","Other"],"placeholder":"","section":"Case Information"},
    {"id":"description","label":"Description of Activity","type":"textarea","required":true,"options":[],"placeholder":"Summarize work performed","section":"Activity Details"},
    {"id":"hours_worked","label":"Hours Worked","type":"number","required":true,"options":[],"placeholder":"Decimal hours OK","section":"Time & Hours"},
    {"id":"detective_name","label":"Detective Name","type":"text","required":true,"options":[],"placeholder":"","section":"Time & Hours"},
    {"id":"supervisor_name","label":"Supervisor Name","type":"text","required":false,"options":[],"placeholder":"","section":"Time & Hours"}
  ]$f$::jsonb,
  false,
  true,
  false,
  NULL
),
(
  'Case Assignment / Intake Form',
  'case',
  1,
  $f$[
    {"id":"case_number","label":"Case Number","type":"text","required":true,"options":[],"placeholder":"","section":"Case Info"},
    {"id":"case_type","label":"Case Type","type":"select","required":true,"options":["Felony","Misdemeanor","Death Investigation","Property","Other"],"placeholder":"","section":"Case Info"},
    {"id":"date_assigned","label":"Date Assigned","type":"date","required":true,"options":[],"placeholder":"","section":"Assignment Details"},
    {"id":"assigned_to","label":"Assigned To (name)","type":"text","required":true,"options":[],"placeholder":"","section":"Assignment Details"},
    {"id":"referring_agency","label":"Referring Agency","type":"text","required":false,"options":[],"placeholder":"","section":"Assignment Details"},
    {"id":"initial_notes","label":"Initial Notes","type":"textarea","required":true,"options":[],"placeholder":"","section":"Assignment Details"}
  ]$f$::jsonb,
  true,
  true,
  false,
  NULL
),
(
  'Overtime / Extra Duty Request',
  'administrative',
  1,
  $f$[
    {"id":"detective_name","label":"Detective Name","type":"text","required":true,"options":[],"placeholder":"","section":"Request Details"},
    {"id":"date_of_overtime","label":"Date of Overtime / Extra Duty","type":"date","required":true,"options":[],"placeholder":"","section":"Request Details"},
    {"id":"start_time","label":"Start Time","type":"text","required":true,"options":[],"placeholder":"e.g. 1800","section":"Request Details"},
    {"id":"end_time","label":"End Time","type":"text","required":true,"options":[],"placeholder":"e.g. 0200","section":"Request Details"},
    {"id":"reason","label":"Reason / Justification","type":"textarea","required":true,"options":[],"placeholder":"","section":"Request Details"},
    {"id":"case_number","label":"Related Case Number (optional)","type":"text","required":false,"options":[],"placeholder":"","section":"Request Details"},
    {"id":"supervisor_name","label":"Supervisor Name (authorization)","type":"text","required":true,"options":[],"placeholder":"","section":"Authorization"}
  ]$f$::jsonb,
  true,
  true,
  false,
  NULL
),
(
  'DIT Daily Observation Report',
  'training',
  1,
  $f$[
    {"id":"dit_name","label":"DIT Name","type":"text","required":true,"options":[],"placeholder":"","section":"DIT Info"},
    {"id":"fto_name","label":"FTO Name","type":"text","required":true,"options":[],"placeholder":"","section":"DIT Info"},
    {"id":"observation_date","label":"Observation Date","type":"date","required":true,"options":[],"placeholder":"","section":"Observation"},
    {"id":"shift_start","label":"Shift Start","type":"text","required":true,"options":[],"placeholder":"","section":"Observation"},
    {"id":"shift_end","label":"Shift End","type":"text","required":true,"options":[],"placeholder":"","section":"Observation"},
    {"id":"tasks_observed","label":"Tasks Observed","type":"textarea","required":true,"options":[],"placeholder":"","section":"Observation"},
    {"id":"performance_notes","label":"Performance Notes","type":"textarea","required":true,"options":[],"placeholder":"","section":"Evaluation"},
    {"id":"areas_for_improvement","label":"Areas for Improvement","type":"textarea","required":false,"options":[],"placeholder":"","section":"Evaluation"},
    {"id":"overall_rating","label":"Overall Rating","type":"select","required":true,"options":["Excellent","Satisfactory","Needs Improvement","Unsatisfactory"],"placeholder":"","section":"Evaluation"}
  ]$f$::jsonb,
  false,
  true,
  false,
  NULL
),
(
  'Training Attendance / Completion Form',
  'training',
  1,
  $f$[
    {"id":"training_name","label":"Training Name / Course Title","type":"text","required":true,"options":[],"placeholder":"","section":"Training Info"},
    {"id":"training_date","label":"Training Date","type":"date","required":true,"options":[],"placeholder":"","section":"Training Info"},
    {"id":"training_location","label":"Location","type":"text","required":true,"options":[],"placeholder":"","section":"Training Info"},
    {"id":"instructor","label":"Instructor","type":"text","required":false,"options":[],"placeholder":"","section":"Training Info"},
    {"id":"attendee_name","label":"Attendee Name","type":"text","required":true,"options":[],"placeholder":"","section":"Attendee Info"},
    {"id":"badge_number","label":"Badge Number","type":"text","required":true,"options":[],"placeholder":"","section":"Attendee Info"},
    {"id":"completion_status","label":"Completion Status","type":"select","required":true,"options":["Completed","Partial","No-Show"],"placeholder":"","section":"Attendee Info"},
    {"id":"notes","label":"Notes","type":"textarea","required":false,"options":[],"placeholder":"","section":"Attendee Info"}
  ]$f$::jsonb,
  false,
  true,
  false,
  NULL
);
