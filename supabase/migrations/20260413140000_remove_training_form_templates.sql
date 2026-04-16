-- Remove legacy Forms-module training templates. Weekly evaluation is the built-in
-- Training > pairing flow, not a form_templates row.
DELETE FROM public.form_submissions
WHERE template_id IN (
  SELECT id
  FROM public.form_templates
  WHERE name IN (
    'DIT Daily Observation Report',
    'Training Attendance / Completion Form'
  )
);

DELETE FROM public.form_templates
WHERE name IN (
  'DIT Daily Observation Report',
  'Training Attendance / Completion Form'
);
