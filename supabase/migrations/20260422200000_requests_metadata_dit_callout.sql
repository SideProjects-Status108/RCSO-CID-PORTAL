-- Companion call-outs: optional metadata JSON + DIT may create call_out / information requests.

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "requests_select_participant" ON public.requests;
CREATE POLICY "requests_select_participant"
ON public.requests
FOR SELECT
TO authenticated
USING (
  (
    NOT public.profile_is_dit()
    AND (
      created_by = (SELECT auth.uid())
      OR assigned_to = (SELECT auth.uid())
    )
  )
  OR (
    public.profile_is_dit()
    AND created_by = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "requests_insert_authenticated" ON public.requests;
CREATE POLICY "requests_insert_authenticated"
ON public.requests
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND (
    NOT public.profile_is_dit()
    OR request_type IN ('call_out', 'information')
  )
);
