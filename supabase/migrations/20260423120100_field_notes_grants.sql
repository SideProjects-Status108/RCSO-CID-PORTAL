-- Depends on: 20260421130000_field_notes.sql (creates public.field_notes). Run that migration first.
-- Ensure authenticated role can use field_notes when RLS allows (avoids silent empty / edge cases).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_notes TO authenticated;
GRANT ALL ON public.field_notes TO service_role;
