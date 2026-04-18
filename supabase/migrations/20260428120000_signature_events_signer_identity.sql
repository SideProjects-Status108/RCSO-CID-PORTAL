-- RCSO CID Portal — Add printed signer identity to signature_events.
--
-- Legal review feedback: a handwritten signature alone is often illegible, so
-- every signature event must persist the signer's printed name and badge at
-- the time of signing. These are snapshotted (not joined) so later renames or
-- badge reassignments never rewrite past legal records.
--
-- Columns:
--   signer_name   text NOT NULL — full name at time of sign (from profiles.full_name)
--   signer_badge  text          — badge at time of sign (nullable: civilian staff)
--
-- Backfill: any existing rows (dev data or pre-deployment test records) get
-- populated from the signer's current profile snapshot. Rows whose signer has
-- no profile (should never happen in production) get a neutral placeholder so
-- the NOT NULL constraint holds; those rows should be audited manually.

-- 1. Add columns (nullable first so backfill works).
ALTER TABLE public.signature_events
  ADD COLUMN IF NOT EXISTS signer_name text;

ALTER TABLE public.signature_events
  ADD COLUMN IF NOT EXISTS signer_badge text;

-- 2. Backfill from profiles snapshot.
UPDATE public.signature_events se
SET signer_name = COALESCE(p.full_name, '(unknown signer)'),
    signer_badge = p.badge_number
FROM public.profiles p
WHERE p.id = se.signer_id
  AND se.signer_name IS NULL;

-- 3. Any residual rows (profile missing for some reason) get a placeholder so
--    the NOT NULL constraint below still applies. Safer than dropping data.
UPDATE public.signature_events
SET signer_name = '(unknown signer)'
WHERE signer_name IS NULL;

-- 4. Enforce NOT NULL on signer_name going forward.
ALTER TABLE public.signature_events
  ALTER COLUMN signer_name SET NOT NULL;

-- 5. Helpful index for audit-trail lookups by badge (e.g. "show every
--    signature by badge 1234") and by name substring search. Keep it simple
--    with a btree on badge; full-text on name can come later if needed.
CREATE INDEX IF NOT EXISTS signature_events_signer_badge_idx
  ON public.signature_events (signer_badge)
  WHERE signer_badge IS NOT NULL;
