-- VARK survey seed: 10 scenario-based questions with weighted V/A/R/K options.
-- These are placeholder content. Final copy will be authored in-house by
-- training staff and can be swapped via the authoring UI (Segment E). Rerun
-- safe: matches on prompt text before re-inserting.

DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Q1
  SELECT id INTO q_id FROM public.dit_survey_questions
    WHERE prompt = 'You arrive at a scene and need to understand what happened. You would rather:'
    LIMIT 1;
  IF q_id IS NULL THEN
    INSERT INTO public.dit_survey_questions (prompt, display_order, is_active)
    VALUES ('You arrive at a scene and need to understand what happened. You would rather:', 1, true)
    RETURNING id INTO q_id;
    INSERT INTO public.dit_survey_options (question_id, label, weights, display_order) VALUES
      (q_id, 'Walk the scene yourself and look at everything firsthand.', '{"v":2,"a":0,"r":0,"k":1}'::jsonb, 1),
      (q_id, 'Listen to witnesses and first-arriving deputies explain it.', '{"v":0,"a":3,"r":0,"k":0}'::jsonb, 2),
      (q_id, 'Read the initial report and any written statements first.', '{"v":0,"a":0,"r":3,"k":0}'::jsonb, 3),
      (q_id, 'Re-enact the incident physically to understand the movement.', '{"v":0,"a":0,"r":0,"k":3}'::jsonb, 4);
  END IF;

  -- Q2
  SELECT id INTO q_id FROM public.dit_survey_questions
    WHERE prompt = 'When you learn a new interview technique, what helps it stick?'
    LIMIT 1;
  IF q_id IS NULL THEN
    INSERT INTO public.dit_survey_questions (prompt, display_order, is_active)
    VALUES ('When you learn a new interview technique, what helps it stick?', 2, true)
    RETURNING id INTO q_id;
    INSERT INTO public.dit_survey_options (question_id, label, weights, display_order) VALUES
      (q_id, 'Watching a senior detective demonstrate it end-to-end.', '{"v":3,"a":0,"r":0,"k":0}'::jsonb, 1),
      (q_id, 'Hearing the instructor explain it and asking questions out loud.', '{"v":0,"a":3,"r":0,"k":0}'::jsonb, 2),
      (q_id, 'Studying a written SOP or article describing each step.', '{"v":0,"a":0,"r":3,"k":0}'::jsonb, 3),
      (q_id, 'Practicing it in a mock interview with your FTO role-playing.', '{"v":0,"a":0,"r":0,"k":3}'::jsonb, 4);
  END IF;

  -- Q3
  SELECT id INTO q_id FROM public.dit_survey_questions
    WHERE prompt = 'Given a complex case file to review, you would start by:'
    LIMIT 1;
  IF q_id IS NULL THEN
    INSERT INTO public.dit_survey_questions (prompt, display_order, is_active)
    VALUES ('Given a complex case file to review, you would start by:', 3, true)
    RETURNING id INTO q_id;
    INSERT INTO public.dit_survey_options (question_id, label, weights, display_order) VALUES
      (q_id, 'Flipping to photos, diagrams, and scene maps first.', '{"v":3,"a":0,"r":0,"k":0}'::jsonb, 1),
      (q_id, 'Asking the lead detective to walk you through it.', '{"v":0,"a":3,"r":0,"k":0}'::jsonb, 2),
      (q_id, 'Reading the narrative and supplemental reports in order.', '{"v":0,"a":0,"r":3,"k":0}'::jsonb, 3),
      (q_id, 'Visiting the scene and tracing the suspect''s movements.', '{"v":0,"a":0,"r":0,"k":3}'::jsonb, 4);
  END IF;

  -- Q4
  SELECT id INTO q_id FROM public.dit_survey_questions
    WHERE prompt = 'You need to memorize a new radio code set. You would:'
    LIMIT 1;
  IF q_id IS NULL THEN
    INSERT INTO public.dit_survey_questions (prompt, display_order, is_active)
    VALUES ('You need to memorize a new radio code set. You would:', 4, true)
    RETURNING id INTO q_id;
    INSERT INTO public.dit_survey_options (question_id, label, weights, display_order) VALUES
      (q_id, 'Make a color-coded chart and pin it above your desk.', '{"v":3,"a":0,"r":0,"k":0}'::jsonb, 1),
      (q_id, 'Repeat the codes out loud until they sound right.', '{"v":0,"a":3,"r":0,"k":0}'::jsonb, 2),
      (q_id, 'Write the list out on flashcards and quiz yourself.', '{"v":0,"a":0,"r":3,"k":0}'::jsonb, 3),
      (q_id, 'Run drills with them on the radio during patrol.', '{"v":0,"a":0,"r":0,"k":3}'::jsonb, 4);
  END IF;

  -- Q5
  SELECT id INTO q_id FROM public.dit_survey_questions
    WHERE prompt = 'When presenting findings at a case review, you prefer to:'
    LIMIT 1;
  IF q_id IS NULL THEN
    INSERT INTO public.dit_survey_questions (prompt, display_order, is_active)
    VALUES ('When presenting findings at a case review, you prefer to:', 5, true)
    RETURNING id INTO q_id;
    INSERT INTO public.dit_survey_options (question_id, label, weights, display_order) VALUES
      (q_id, 'Show timelines, photos, and diagrams on screen.', '{"v":3,"a":0,"r":0,"k":0}'::jsonb, 1),
      (q_id, 'Tell the story out loud and take questions.', '{"v":0,"a":3,"r":0,"k":0}'::jsonb, 2),
      (q_id, 'Hand out a written briefing for people to read.', '{"v":0,"a":0,"r":3,"k":0}'::jsonb, 3),
      (q_id, 'Walk the group through evidence physically.', '{"v":0,"a":0,"r":0,"k":3}'::jsonb, 4);
  END IF;

  -- Q6
  SELECT id INTO q_id FROM public.dit_survey_questions
    WHERE prompt = 'A new statute just came out. You learn it best by:'
    LIMIT 1;
  IF q_id IS NULL THEN
    INSERT INTO public.dit_survey_questions (prompt, display_order, is_active)
    VALUES ('A new statute just came out. You learn it best by:', 6, true)
    RETURNING id INTO q_id;
    INSERT INTO public.dit_survey_options (question_id, label, weights, display_order) VALUES
      (q_id, 'Watching a training video that breaks it down visually.', '{"v":3,"a":0,"r":0,"k":0}'::jsonb, 1),
      (q_id, 'Discussing it in a squad meeting with hypotheticals.', '{"v":0,"a":3,"r":0,"k":0}'::jsonb, 2),
      (q_id, 'Reading the statute text and an annotated summary.', '{"v":0,"a":0,"r":3,"k":0}'::jsonb, 3),
      (q_id, 'Working a mock case that forces you to apply it.', '{"v":0,"a":0,"r":0,"k":3}'::jsonb, 4);
  END IF;

  -- Q7
  SELECT id INTO q_id FROM public.dit_survey_questions
    WHERE prompt = 'When writing a search warrant affidavit, you rely most on:'
    LIMIT 1;
  IF q_id IS NULL THEN
    INSERT INTO public.dit_survey_questions (prompt, display_order, is_active)
    VALUES ('When writing a search warrant affidavit, you rely most on:', 7, true)
    RETURNING id INTO q_id;
    INSERT INTO public.dit_survey_options (question_id, label, weights, display_order) VALUES
      (q_id, 'A template with highlighted sample language.', '{"v":2,"a":0,"r":2,"k":0}'::jsonb, 1),
      (q_id, 'Talking the facts through with a peer as you draft.', '{"v":0,"a":3,"r":0,"k":0}'::jsonb, 2),
      (q_id, 'Reading prior approved warrants to match the tone.', '{"v":0,"a":0,"r":3,"k":0}'::jsonb, 3),
      (q_id, 'Drafting by hand, scratching out, and rewriting.', '{"v":0,"a":0,"r":0,"k":3}'::jsonb, 4);
  END IF;

  -- Q8
  SELECT id INTO q_id FROM public.dit_survey_questions
    WHERE prompt = 'A witness gives inconsistent statements. You would:'
    LIMIT 1;
  IF q_id IS NULL THEN
    INSERT INTO public.dit_survey_questions (prompt, display_order, is_active)
    VALUES ('A witness gives inconsistent statements. You would:', 8, true)
    RETURNING id INTO q_id;
    INSERT INTO public.dit_survey_options (question_id, label, weights, display_order) VALUES
      (q_id, 'Map their statements on a timeline chart to compare.', '{"v":3,"a":0,"r":0,"k":0}'::jsonb, 1),
      (q_id, 'Re-interview and listen for tone, pauses, contradictions.', '{"v":0,"a":3,"r":0,"k":0}'::jsonb, 2),
      (q_id, 'Read the transcripts side-by-side and highlight conflicts.', '{"v":0,"a":0,"r":3,"k":0}'::jsonb, 3),
      (q_id, 'Walk them back through the scene for a cognitive interview.', '{"v":0,"a":0,"r":0,"k":3}'::jsonb, 4);
  END IF;

  -- Q9
  SELECT id INTO q_id FROM public.dit_survey_questions
    WHERE prompt = 'Your preferred way to get feedback from your FTO is:'
    LIMIT 1;
  IF q_id IS NULL THEN
    INSERT INTO public.dit_survey_questions (prompt, display_order, is_active)
    VALUES ('Your preferred way to get feedback from your FTO is:', 9, true)
    RETURNING id INTO q_id;
    INSERT INTO public.dit_survey_options (question_id, label, weights, display_order) VALUES
      (q_id, 'A marked-up diagram or example showing what good looks like.', '{"v":3,"a":0,"r":0,"k":0}'::jsonb, 1),
      (q_id, 'A verbal debrief right after the call.', '{"v":0,"a":3,"r":0,"k":0}'::jsonb, 2),
      (q_id, 'Written notes you can re-read later.', '{"v":0,"a":0,"r":3,"k":0}'::jsonb, 3),
      (q_id, 'A do-over where you run the scenario again.', '{"v":0,"a":0,"r":0,"k":3}'::jsonb, 4);
  END IF;

  -- Q10
  SELECT id INTO q_id FROM public.dit_survey_questions
    WHERE prompt = 'You remember a suspect''s face best by:'
    LIMIT 1;
  IF q_id IS NULL THEN
    INSERT INTO public.dit_survey_questions (prompt, display_order, is_active)
    VALUES ('You remember a suspect''s face best by:', 10, true)
    RETURNING id INTO q_id;
    INSERT INTO public.dit_survey_options (question_id, label, weights, display_order) VALUES
      (q_id, 'Seeing a clear photo or sketch.', '{"v":3,"a":0,"r":0,"k":0}'::jsonb, 1),
      (q_id, 'Hearing a detailed verbal description.', '{"v":0,"a":3,"r":0,"k":0}'::jsonb, 2),
      (q_id, 'Reading a written description with distinguishing marks.', '{"v":0,"a":0,"r":3,"k":0}'::jsonb, 3),
      (q_id, 'Having seen them in person on a prior contact.', '{"v":0,"a":0,"r":0,"k":3}'::jsonb, 4);
  END IF;
END $$;
