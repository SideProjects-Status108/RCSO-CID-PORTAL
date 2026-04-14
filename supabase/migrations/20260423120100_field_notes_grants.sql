-- Ensure authenticated role can use field_notes when RLS allows (avoids silent empty / edge cases).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_notes TO authenticated;
GRANT ALL ON public.field_notes TO service_role;
