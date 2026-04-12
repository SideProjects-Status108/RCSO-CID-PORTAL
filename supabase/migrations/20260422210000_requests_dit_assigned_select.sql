-- DIT users may SELECT call_out requests assigned to them via metadata (in addition to rows they created).

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
    AND (
      created_by = (SELECT auth.uid())
      OR (
        request_type = 'call_out'
        AND (metadata->>'assigned_to') = (SELECT auth.uid())::text
      )
    )
  )
);
