-- Free-text case type label; legacy FK case_type_id becomes optional.

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS case_type_label text;

UPDATE public.cases c
SET case_type_label = ct.name
FROM public.case_types ct
WHERE c.case_type_id = ct.id
  AND (c.case_type_label IS NULL);

UPDATE public.cases
SET case_type_label = 'Unknown'
WHERE case_type_label IS NULL OR trim(case_type_label) = '';

ALTER TABLE public.cases
  ALTER COLUMN case_type_label SET NOT NULL;

ALTER TABLE public.cases
  ALTER COLUMN case_type_id DROP NOT NULL;
