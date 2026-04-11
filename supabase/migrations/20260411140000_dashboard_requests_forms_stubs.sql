-- Phase 1 — minimal requests + form_submissions for dashboard counts.
-- Phase 2/3 migrations may ALTER these tables; keep column names stable.

CREATE TABLE IF NOT EXISTS public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'acknowledged', 'in_progress', 'complete', 'closed')
  ),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS requests_status_idx ON public.requests (status);
CREATE INDEX IF NOT EXISTS requests_assigned_to_idx ON public.requests (assigned_to);

DROP TRIGGER IF EXISTS requests_set_updated_at ON public.requests;
CREATE TRIGGER requests_set_updated_at
BEFORE UPDATE ON public.requests
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requests_select_supervision"
ON public.requests
FOR SELECT
TO authenticated
USING (public.profile_is_supervision_plus());

CREATE POLICY "requests_select_participant"
ON public.requests
FOR SELECT
TO authenticated
USING (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()));

CREATE POLICY "requests_insert_authenticated"
ON public.requests
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.profile_is_dit()
  AND created_by = (SELECT auth.uid())
);

CREATE POLICY "requests_update_supervision"
ON public.requests
FOR UPDATE
TO authenticated
USING (public.profile_is_supervision_plus())
WITH CHECK (public.profile_is_supervision_plus());

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_submissions_submitted_by_idx ON public.form_submissions (submitted_by);
CREATE INDEX IF NOT EXISTS form_submissions_created_at_idx ON public.form_submissions (created_at);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_submissions_select_supervision"
ON public.form_submissions
FOR SELECT
TO authenticated
USING (public.profile_is_supervision_plus());

CREATE POLICY "form_submissions_select_own"
ON public.form_submissions
FOR SELECT
TO authenticated
USING (submitted_by = (SELECT auth.uid()));

CREATE POLICY "form_submissions_insert_own"
ON public.form_submissions
FOR INSERT
TO authenticated
WITH CHECK (submitted_by = (SELECT auth.uid()));
