-- Field notes: structured scene notes, sharing, export (app uses docx route).

CREATE TABLE IF NOT EXISTS public.field_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  title text NOT NULL,
  incident_date date,
  location_description text,
  narrative text,
  evidence_notes text,
  persons_of_interest text,
  follow_up_actions text,
  is_shared boolean NOT NULL DEFAULT false,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS field_notes_created_by_idx ON public.field_notes (created_by);
CREATE INDEX IF NOT EXISTS field_notes_updated_at_idx ON public.field_notes (updated_at DESC);

ALTER TABLE public.field_notes ENABLE ROW LEVEL SECURITY;

-- Owner: full CRUD on own rows
CREATE POLICY field_notes_owner_all
ON public.field_notes
FOR ALL
TO authenticated
USING (created_by = (SELECT auth.uid()))
WITH CHECK (created_by = (SELECT auth.uid()));

-- Supervision / admin: read all (no write on others)
CREATE POLICY field_notes_supervision_select
ON public.field_notes
FOR SELECT
TO authenticated
USING (public.profile_is_supervision_plus());

DROP TRIGGER IF EXISTS field_notes_set_updated_at ON public.field_notes;
CREATE TRIGGER field_notes_set_updated_at
BEFORE UPDATE ON public.field_notes
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();
