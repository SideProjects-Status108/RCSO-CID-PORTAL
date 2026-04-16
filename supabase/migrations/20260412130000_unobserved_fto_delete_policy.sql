-- Allow the assigned FTO to delete unobserved rows for their own weekly sessions
-- so submit-time "replace unobserved set" can clear prior keys before insert.
CREATE POLICY "unobserved_competencies_delete_fto_own_session"
ON public.unobserved_competencies
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.weekly_training_sessions w
    JOIN public.fto_pairings fp ON fp.id = w.pairing_id
    WHERE w.id = unobserved_competencies.session_id
      AND fp.fto_id = (SELECT auth.uid())
  )
);
