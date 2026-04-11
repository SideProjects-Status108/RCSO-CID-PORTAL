-- Phase 3: Requests (extended), request_updates, notifications, case_types, cases (FK).

-- ---------------------------------------------------------------------------
-- requests: extend columns + enforce no delete + assignee update rules
-- ---------------------------------------------------------------------------
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'routine',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_request_type_check;
ALTER TABLE public.requests ADD CONSTRAINT requests_request_type_check CHECK (
  request_type IN ('call_out', 'task', 'information', 'follow_up', 'other')
);

ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_urgency_check;
ALTER TABLE public.requests ADD CONSTRAINT requests_urgency_check CHECK (
  urgency IN ('routine', 'priority', 'urgent')
);

DROP POLICY IF EXISTS "requests_select_supervision" ON public.requests;
DROP POLICY IF EXISTS "requests_select_participant" ON public.requests;
DROP POLICY IF EXISTS "requests_insert_authenticated" ON public.requests;
DROP POLICY IF EXISTS "requests_update_supervision" ON public.requests;

-- Supervision+: full read
CREATE POLICY "requests_select_supervision"
ON public.requests
FOR SELECT
TO authenticated
USING (public.profile_is_supervision_plus());

-- Creator or assignee (DIT excluded — no matching row for dit-only users)
CREATE POLICY "requests_select_participant"
ON public.requests
FOR SELECT
TO authenticated
USING (
  NOT public.profile_is_dit()
  AND (
    created_by = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
  )
);

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

-- Assignee: may update own assigned row (trigger restricts columns)
CREATE POLICY "requests_update_assignee"
ON public.requests
FOR UPDATE
TO authenticated
USING (
  NOT public.profile_is_supervision_plus()
  AND assigned_to = (SELECT auth.uid())
)
WITH CHECK (
  assigned_to = (SELECT auth.uid())
);

-- No DELETE policy — deletes denied for all roles

CREATE OR REPLACE FUNCTION public.requests_assignee_may_only_change_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sup boolean;
BEGIN
  SELECT public.profile_is_supervision_plus() INTO sup;
  IF sup THEN
    RETURN NEW;
  END IF;
  IF OLD.assigned_to IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF OLD.assigned_to = (SELECT auth.uid()) THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
      OR NEW.created_by IS DISTINCT FROM OLD.created_by
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.request_type IS DISTINCT FROM OLD.request_type
      OR NEW.urgency IS DISTINCT FROM OLD.urgency
      OR NEW.address IS DISTINCT FROM OLD.address
      OR NEW.latitude IS DISTINCT FROM OLD.latitude
      OR NEW.longitude IS DISTINCT FROM OLD.longitude
    THEN
      RAISE EXCEPTION 'Assignees may only change status timestamps on assigned requests';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_assignee_guard ON public.requests;
CREATE TRIGGER requests_assignee_guard
BEFORE UPDATE ON public.requests
FOR EACH ROW
EXECUTE PROCEDURE public.requests_assignee_may_only_change_status();

REVOKE ALL ON FUNCTION public.requests_assignee_may_only_change_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.requests_assignee_may_only_change_status() TO authenticated;

-- ---------------------------------------------------------------------------
-- request_updates (audit trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.request_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests (id) ON DELETE CASCADE,
  updated_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  previous_status text,
  new_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS request_updates_request_id_idx ON public.request_updates (request_id);
CREATE INDEX IF NOT EXISTS request_updates_created_at_idx ON public.request_updates (created_at);

ALTER TABLE public.request_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "request_updates_select_visible"
ON public.request_updates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = request_id
      AND (
        public.profile_is_supervision_plus()
        OR (
          NOT public.profile_is_dit()
          AND (
            r.created_by = (SELECT auth.uid())
            OR r.assigned_to = (SELECT auth.uid())
          )
        )
      )
  )
);

CREATE POLICY "request_updates_insert"
ON public.request_updates
FOR INSERT
TO authenticated
WITH CHECK (
  updated_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = request_id
      AND (
        public.profile_is_supervision_plus()
        OR r.created_by = (SELECT auth.uid())
        OR r.assigned_to = (SELECT auth.uid())
      )
  )
);

-- ---------------------------------------------------------------------------
-- notifications (inserts via service role / admin client only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (
    type IN (
      'request_assigned',
      'request_urgent',
      'request_updated',
      'form_approval_needed',
      'form_reviewed',
      'schedule_published'
    )
  ),
  reference_id uuid NOT NULL,
  reference_type text NOT NULL CHECK (
    reference_type IN ('request', 'form_submission', 'schedule_event')
  ),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "notifications_update_own_read"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- No INSERT/DELETE for authenticated — service role bypasses RLS

-- ---------------------------------------------------------------------------
-- case_types + link cases
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.case_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prefix text NOT NULL DEFAULT '',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS case_types_name_key ON public.case_types (name);

DROP TRIGGER IF EXISTS case_types_set_updated_at ON public.case_types;
CREATE TRIGGER case_types_set_updated_at
BEFORE UPDATE ON public.case_types
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.case_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_types_select_active"
ON public.case_types
FOR SELECT
TO authenticated
USING (is_active = true OR public.profile_is_admin_scope());

CREATE POLICY "case_types_insert_admin"
ON public.case_types
FOR INSERT
TO authenticated
WITH CHECK (public.profile_is_admin_scope());

CREATE POLICY "case_types_update_admin"
ON public.case_types
FOR UPDATE
TO authenticated
USING (public.profile_is_admin_scope())
WITH CHECK (public.profile_is_admin_scope());

INSERT INTO public.case_types (name, prefix, description, is_active)
VALUES
  ('General CID', 'CID-', 'General criminal investigations', true),
  ('Homicide', 'HOM-', 'Homicide investigations', true),
  ('Property / Financial', 'PF-', 'Property and financial crimes', true),
  ('Special Victims', 'SV-', 'Special victims unit', true)
ON CONFLICT (name) DO NOTHING;

-- Ensure at least one case type exists for backfill
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.case_types LIMIT 1) THEN
    INSERT INTO public.case_types (name, prefix, description, is_active)
    VALUES ('General CID', 'CID-', 'General criminal investigations', true);
  END IF;
END;
$$;

-- cases: add FK to case_types and updated_by
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS case_type_id uuid REFERENCES public.case_types (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

UPDATE public.cases c
SET case_type_id = (
  SELECT id FROM public.case_types ct WHERE ct.name = 'General CID' LIMIT 1
)
WHERE c.case_type_id IS NULL;

-- If any row still null (no case_types), skip NOT NULL — should not happen after seed
ALTER TABLE public.cases
  ALTER COLUMN case_type_id SET NOT NULL;

ALTER TABLE public.cases DROP COLUMN IF EXISTS case_type;

CREATE INDEX IF NOT EXISTS cases_case_type_id_idx ON public.cases (case_type_id);

CREATE OR REPLACE FUNCTION public.cases_set_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cases_updated_by_trg ON public.cases;
CREATE TRIGGER cases_updated_by_trg
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE PROCEDURE public.cases_set_updated_by();

REVOKE ALL ON FUNCTION public.cases_set_updated_by() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cases_set_updated_by() TO authenticated;

-- DIT cannot create cases
DROP POLICY IF EXISTS "cases_insert_own" ON public.cases;
CREATE POLICY "cases_insert_own"
ON public.cases
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.profile_is_dit()
  AND created_by = (SELECT auth.uid())
);
