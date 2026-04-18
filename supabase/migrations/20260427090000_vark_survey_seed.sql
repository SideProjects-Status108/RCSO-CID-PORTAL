-- VARK survey seed: 10 scenario-based questions with weighted V/A/R/K options.
-- These are placeholder content. Final copy will be authored in-house by
-- training staff and can be swapped via the authoring UI (Segment E).
--
-- Rerun-safe: a unique index on (prompt) lets us use ON CONFLICT DO NOTHING
-- for the questions, and options are inserted only when none exist yet for
-- that question (so re-running will not create duplicate options).
--
-- NOTE: This file is written as a sequence of independent statements (no
-- DO $$ ... $$ block) so that ad-hoc SQL runners that split on semicolons
-- (Supabase Studio, Cursor SQL panel) execute it correctly.

-- ---------------------------------------------------------------------------
-- Uniqueness guard on prompt text so ON CONFLICT works.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS dit_survey_questions_prompt_uniq
  ON public.dit_survey_questions (prompt);

-- ---------------------------------------------------------------------------
-- Questions
-- ---------------------------------------------------------------------------
INSERT INTO public.dit_survey_questions (prompt, display_order, is_active) VALUES
  ('You arrive at a scene and need to understand what happened. You would rather:', 1, true),
  ('When you learn a new interview technique, what helps it stick?', 2, true),
  ('Given a complex case file to review, you would start by:', 3, true),
  ('You need to memorize a new radio code set. You would:', 4, true),
  ('When presenting findings at a case review, you prefer to:', 5, true),
  ('A new statute just came out. You learn it best by:', 6, true),
  ('When writing a search warrant affidavit, you rely most on:', 7, true),
  ('A witness gives inconsistent statements. You would:', 8, true),
  ('Your preferred way to get feedback from your FTO is:', 9, true),
  ('You remember a suspect''s face best by:', 10, true)
ON CONFLICT (prompt) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Options
--
-- Each block inserts 4 options for one question, gated by a NOT EXISTS check
-- so rerunning the migration won't duplicate options.
-- ---------------------------------------------------------------------------

-- Q1
INSERT INTO public.dit_survey_options (question_id, label, weights, display_order)
SELECT q.id, v.label, v.weights::jsonb, v.display_order
FROM public.dit_survey_questions q
CROSS JOIN (VALUES
  ('Walk the scene yourself and look at everything firsthand.', '{"v":2,"a":0,"r":0,"k":1}', 1),
  ('Listen to witnesses and first-arriving deputies explain it.', '{"v":0,"a":3,"r":0,"k":0}', 2),
  ('Read the initial report and any written statements first.', '{"v":0,"a":0,"r":3,"k":0}', 3),
  ('Re-enact the incident physically to understand the movement.', '{"v":0,"a":0,"r":0,"k":3}', 4)
) AS v(label, weights, display_order)
WHERE q.prompt = 'You arrive at a scene and need to understand what happened. You would rather:'
  AND NOT EXISTS (
    SELECT 1 FROM public.dit_survey_options o WHERE o.question_id = q.id
  );

-- Q2
INSERT INTO public.dit_survey_options (question_id, label, weights, display_order)
SELECT q.id, v.label, v.weights::jsonb, v.display_order
FROM public.dit_survey_questions q
CROSS JOIN (VALUES
  ('Watching a senior detective demonstrate it end-to-end.', '{"v":3,"a":0,"r":0,"k":0}', 1),
  ('Hearing the instructor explain it and asking questions out loud.', '{"v":0,"a":3,"r":0,"k":0}', 2),
  ('Studying a written SOP or article describing each step.', '{"v":0,"a":0,"r":3,"k":0}', 3),
  ('Practicing it in a mock interview with your FTO role-playing.', '{"v":0,"a":0,"r":0,"k":3}', 4)
) AS v(label, weights, display_order)
WHERE q.prompt = 'When you learn a new interview technique, what helps it stick?'
  AND NOT EXISTS (
    SELECT 1 FROM public.dit_survey_options o WHERE o.question_id = q.id
  );

-- Q3
INSERT INTO public.dit_survey_options (question_id, label, weights, display_order)
SELECT q.id, v.label, v.weights::jsonb, v.display_order
FROM public.dit_survey_questions q
CROSS JOIN (VALUES
  ('Flipping to photos, diagrams, and scene maps first.', '{"v":3,"a":0,"r":0,"k":0}', 1),
  ('Asking the lead detective to walk you through it.', '{"v":0,"a":3,"r":0,"k":0}', 2),
  ('Reading the narrative and supplemental reports in order.', '{"v":0,"a":0,"r":3,"k":0}', 3),
  ('Visiting the scene and tracing the suspect''s movements.', '{"v":0,"a":0,"r":0,"k":3}', 4)
) AS v(label, weights, display_order)
WHERE q.prompt = 'Given a complex case file to review, you would start by:'
  AND NOT EXISTS (
    SELECT 1 FROM public.dit_survey_options o WHERE o.question_id = q.id
  );

-- Q4
INSERT INTO public.dit_survey_options (question_id, label, weights, display_order)
SELECT q.id, v.label, v.weights::jsonb, v.display_order
FROM public.dit_survey_questions q
CROSS JOIN (VALUES
  ('Make a color-coded chart and pin it above your desk.', '{"v":3,"a":0,"r":0,"k":0}', 1),
  ('Repeat the codes out loud until they sound right.', '{"v":0,"a":3,"r":0,"k":0}', 2),
  ('Write the list out on flashcards and quiz yourself.', '{"v":0,"a":0,"r":3,"k":0}', 3),
  ('Run drills with them on the radio during patrol.', '{"v":0,"a":0,"r":0,"k":3}', 4)
) AS v(label, weights, display_order)
WHERE q.prompt = 'You need to memorize a new radio code set. You would:'
  AND NOT EXISTS (
    SELECT 1 FROM public.dit_survey_options o WHERE o.question_id = q.id
  );

-- Q5
INSERT INTO public.dit_survey_options (question_id, label, weights, display_order)
SELECT q.id, v.label, v.weights::jsonb, v.display_order
FROM public.dit_survey_questions q
CROSS JOIN (VALUES
  ('Show timelines, photos, and diagrams on screen.', '{"v":3,"a":0,"r":0,"k":0}', 1),
  ('Tell the story out loud and take questions.', '{"v":0,"a":3,"r":0,"k":0}', 2),
  ('Hand out a written briefing for people to read.', '{"v":0,"a":0,"r":3,"k":0}', 3),
  ('Walk the group through evidence physically.', '{"v":0,"a":0,"r":0,"k":3}', 4)
) AS v(label, weights, display_order)
WHERE q.prompt = 'When presenting findings at a case review, you prefer to:'
  AND NOT EXISTS (
    SELECT 1 FROM public.dit_survey_options o WHERE o.question_id = q.id
  );

-- Q6
INSERT INTO public.dit_survey_options (question_id, label, weights, display_order)
SELECT q.id, v.label, v.weights::jsonb, v.display_order
FROM public.dit_survey_questions q
CROSS JOIN (VALUES
  ('Watching a training video that breaks it down visually.', '{"v":3,"a":0,"r":0,"k":0}', 1),
  ('Discussing it in a squad meeting with hypotheticals.', '{"v":0,"a":3,"r":0,"k":0}', 2),
  ('Reading the statute text and an annotated summary.', '{"v":0,"a":0,"r":3,"k":0}', 3),
  ('Working a mock case that forces you to apply it.', '{"v":0,"a":0,"r":0,"k":3}', 4)
) AS v(label, weights, display_order)
WHERE q.prompt = 'A new statute just came out. You learn it best by:'
  AND NOT EXISTS (
    SELECT 1 FROM public.dit_survey_options o WHERE o.question_id = q.id
  );

-- Q7
INSERT INTO public.dit_survey_options (question_id, label, weights, display_order)
SELECT q.id, v.label, v.weights::jsonb, v.display_order
FROM public.dit_survey_questions q
CROSS JOIN (VALUES
  ('A template with highlighted sample language.', '{"v":2,"a":0,"r":2,"k":0}', 1),
  ('Talking the facts through with a peer as you draft.', '{"v":0,"a":3,"r":0,"k":0}', 2),
  ('Reading prior approved warrants to match the tone.', '{"v":0,"a":0,"r":3,"k":0}', 3),
  ('Drafting by hand, scratching out, and rewriting.', '{"v":0,"a":0,"r":0,"k":3}', 4)
) AS v(label, weights, display_order)
WHERE q.prompt = 'When writing a search warrant affidavit, you rely most on:'
  AND NOT EXISTS (
    SELECT 1 FROM public.dit_survey_options o WHERE o.question_id = q.id
  );

-- Q8
INSERT INTO public.dit_survey_options (question_id, label, weights, display_order)
SELECT q.id, v.label, v.weights::jsonb, v.display_order
FROM public.dit_survey_questions q
CROSS JOIN (VALUES
  ('Map their statements on a timeline chart to compare.', '{"v":3,"a":0,"r":0,"k":0}', 1),
  ('Re-interview and listen for tone, pauses, contradictions.', '{"v":0,"a":3,"r":0,"k":0}', 2),
  ('Read the transcripts side-by-side and highlight conflicts.', '{"v":0,"a":0,"r":3,"k":0}', 3),
  ('Walk them back through the scene for a cognitive interview.', '{"v":0,"a":0,"r":0,"k":3}', 4)
) AS v(label, weights, display_order)
WHERE q.prompt = 'A witness gives inconsistent statements. You would:'
  AND NOT EXISTS (
    SELECT 1 FROM public.dit_survey_options o WHERE o.question_id = q.id
  );

-- Q9
INSERT INTO public.dit_survey_options (question_id, label, weights, display_order)
SELECT q.id, v.label, v.weights::jsonb, v.display_order
FROM public.dit_survey_questions q
CROSS JOIN (VALUES
  ('A marked-up diagram or example showing what good looks like.', '{"v":3,"a":0,"r":0,"k":0}', 1),
  ('A verbal debrief right after the call.', '{"v":0,"a":3,"r":0,"k":0}', 2),
  ('Written notes you can re-read later.', '{"v":0,"a":0,"r":3,"k":0}', 3),
  ('A do-over where you run the scenario again.', '{"v":0,"a":0,"r":0,"k":3}', 4)
) AS v(label, weights, display_order)
WHERE q.prompt = 'Your preferred way to get feedback from your FTO is:'
  AND NOT EXISTS (
    SELECT 1 FROM public.dit_survey_options o WHERE o.question_id = q.id
  );

-- Q10
INSERT INTO public.dit_survey_options (question_id, label, weights, display_order)
SELECT q.id, v.label, v.weights::jsonb, v.display_order
FROM public.dit_survey_questions q
CROSS JOIN (VALUES
  ('Seeing a clear photo or sketch.', '{"v":3,"a":0,"r":0,"k":0}', 1),
  ('Hearing a detailed verbal description.', '{"v":0,"a":3,"r":0,"k":0}', 2),
  ('Reading a written description with distinguishing marks.', '{"v":0,"a":0,"r":3,"k":0}', 3),
  ('Having seen them in person on a prior contact.', '{"v":0,"a":0,"r":0,"k":3}', 4)
) AS v(label, weights, display_order)
WHERE q.prompt = 'You remember a suspect''s face best by:'
  AND NOT EXISTS (
    SELECT 1 FROM public.dit_survey_options o WHERE o.question_id = q.id
  );
