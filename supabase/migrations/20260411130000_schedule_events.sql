-- Phase 1 — schedule_events + RLS (SECURITY DEFINER helpers)

CREATE OR REPLACE FUNCTION public.profile_is_supervision_plus()
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
      AND role IN ('admin', 'supervision_admin', 'supervision')
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_is_fto_coordinator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'fto_coordinator'
  );
$$;

REVOKE ALL ON FUNCTION public.profile_is_supervision_plus() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profile_is_fto_coordinator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_is_supervision_plus() TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_is_fto_coordinator() TO authenticated;

CREATE TABLE IF NOT EXISTS public.schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (
    event_type IN (
      'regular',
      'on_call',
      'vacation',
      'school',
      'in_service',
      'fto_shift'
    )
  ),
  title text NOT NULL DEFAULT '',
  assigned_to uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  is_all_day boolean NOT NULL DEFAULT false,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_rule text,
  gcal_event_id text,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_events_range_chk CHECK (end_datetime >= start_datetime)
);

CREATE INDEX IF NOT EXISTS schedule_events_assigned_to_idx ON public.schedule_events (assigned_to);
CREATE INDEX IF NOT EXISTS schedule_events_start_idx ON public.schedule_events (start_datetime);
CREATE INDEX IF NOT EXISTS schedule_events_status_idx ON public.schedule_events (status);
CREATE INDEX IF NOT EXISTS schedule_events_type_idx ON public.schedule_events (event_type);

DROP TRIGGER IF EXISTS schedule_events_set_updated_at ON public.schedule_events;
CREATE TRIGGER schedule_events_set_updated_at
BEFORE UPDATE ON public.schedule_events
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

-- SELECT: supervision+ sees all rows (draft + published).
CREATE POLICY "schedule_events_select_supervision"
ON public.schedule_events
FOR SELECT
TO authenticated
USING (public.profile_is_supervision_plus());

-- SELECT: published personal / on-call rules for other authenticated roles.
CREATE POLICY "schedule_events_select_published_scope"
ON public.schedule_events
FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND (
    assigned_to = (SELECT auth.uid())
    OR (event_type = 'on_call' AND NOT public.profile_is_dit())
  )
);

-- INSERT: supervision+
CREATE POLICY "schedule_events_insert_supervision"
ON public.schedule_events
FOR INSERT
TO authenticated
WITH CHECK (public.profile_is_supervision_plus());

-- INSERT: FTO coordinator — only training-related event types.
CREATE POLICY "schedule_events_insert_fto_coordinator"
ON public.schedule_events
FOR INSERT
TO authenticated
WITH CHECK (
  public.profile_is_fto_coordinator()
  AND event_type IN ('fto_shift', 'school')
);

-- UPDATE: supervision+
CREATE POLICY "schedule_events_update_supervision"
ON public.schedule_events
FOR UPDATE
TO authenticated
USING (public.profile_is_supervision_plus())
WITH CHECK (public.profile_is_supervision_plus());

-- UPDATE: FTO coordinator — only fto_shift / school rows.
CREATE POLICY "schedule_events_update_fto_coordinator"
ON public.schedule_events
FOR UPDATE
TO authenticated
USING (
  public.profile_is_fto_coordinator()
  AND event_type IN ('fto_shift', 'school')
)
WITH CHECK (
  public.profile_is_fto_coordinator()
  AND event_type IN ('fto_shift', 'school')
);

-- DELETE: supervision+ (not used in UI yet; keeps data model consistent).
CREATE POLICY "schedule_events_delete_supervision"
ON public.schedule_events
FOR DELETE
TO authenticated
USING (public.profile_is_supervision_plus());
