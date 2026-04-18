/**
 * Supabase-facing queries for Segment C quizzes. All writes use the
 * authenticated server client; RLS enforces the ultimate access check.
 *
 * The two notable wrinkles:
 *   - sanitizeOptionsForTaker strips is_correct before we hand options to
 *     the DIT. Authoring callers use the raw row instead.
 *   - scoreAttempt is the pure, testable scorer from lib/training/quizzes.ts;
 *     this module only handles I/O + tier side-effects (notification row
 *     writes are owned by the route handler, not here).
 */

import { createClient } from '@/lib/supabase/server'
import type {
  TrainingQuiz,
  TrainingQuizAttempt,
  TrainingQuizAttemptAnswer,
  TrainingQuizOption,
  TrainingQuizQuestion,
} from '@/types/training'

function mapQuiz(r: Record<string, unknown>): TrainingQuiz {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    description: r.description != null ? String(r.description) : null,
    topic: r.topic != null ? String(r.topic) : null,
    is_published: Boolean(r.is_published),
    pass_threshold_green: Number(r.pass_threshold_green ?? 80),
    pass_threshold_amber: Number(r.pass_threshold_amber ?? 61),
    created_by: String(r.created_by),
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

function mapQuestion(r: Record<string, unknown>): TrainingQuizQuestion {
  return {
    id: String(r.id),
    quiz_id: String(r.quiz_id),
    prompt: String(r.prompt ?? ''),
    display_order: Number(r.display_order ?? 0),
    explanation: r.explanation != null ? String(r.explanation) : null,
    created_at: String(r.created_at ?? ''),
  }
}

function mapOption(r: Record<string, unknown>): TrainingQuizOption {
  return {
    id: String(r.id),
    question_id: String(r.question_id),
    label: String(r.label ?? ''),
    is_correct: Boolean(r.is_correct),
    display_order: Number(r.display_order ?? 0),
    created_at: String(r.created_at ?? ''),
  }
}

function mapAttempt(r: Record<string, unknown>): TrainingQuizAttempt {
  return {
    id: String(r.id),
    quiz_id: String(r.quiz_id),
    dit_record_id: String(r.dit_record_id),
    attempted_by: String(r.attempted_by),
    started_at: String(r.started_at ?? ''),
    submitted_at: r.submitted_at != null ? String(r.submitted_at) : null,
    score_percent: r.score_percent != null ? Number(r.score_percent) : null,
    tier:
      r.tier === 'green' || r.tier === 'amber' || r.tier === 'red' ? r.tier : null,
    status: r.status as TrainingQuizAttempt['status'],
    created_at: String(r.created_at ?? ''),
  }
}

function mapAnswer(r: Record<string, unknown>): TrainingQuizAttemptAnswer {
  return {
    id: String(r.id),
    attempt_id: String(r.attempt_id),
    question_id: String(r.question_id),
    option_id: r.option_id != null ? String(r.option_id) : null,
    is_correct: r.is_correct != null ? Boolean(r.is_correct) : null,
    created_at: String(r.created_at ?? ''),
  }
}

export async function listQuizzes(opts: {
  publishedOnly?: boolean
} = {}): Promise<TrainingQuiz[]> {
  const supabase = await createClient()
  let q = supabase.from('training_quizzes').select('*').order('created_at', { ascending: false })
  if (opts.publishedOnly) q = q.eq('is_published', true)
  const { data } = await q
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapQuiz)
}

export async function fetchQuizById(id: string): Promise<TrainingQuiz | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('training_quizzes').select('*').eq('id', id).maybeSingle()
  return data ? mapQuiz(data as Record<string, unknown>) : null
}

export async function fetchQuizQuestions(
  quizId: string
): Promise<TrainingQuizQuestion[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('training_quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('display_order', { ascending: true })
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapQuestion)
}

export async function fetchOptionsForQuestions(
  questionIds: string[]
): Promise<TrainingQuizOption[]> {
  if (questionIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('training_quiz_options')
    .select('*')
    .in('question_id', questionIds)
    .order('display_order', { ascending: true })
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapOption)
}

export async function createQuiz(input: {
  title: string
  description: string | null
  topic: string | null
  passThresholdGreen?: number
  passThresholdAmber?: number
  createdBy: string
}): Promise<TrainingQuiz> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_quizzes')
    .insert({
      title: input.title,
      description: input.description,
      topic: input.topic,
      pass_threshold_green: input.passThresholdGreen ?? 80,
      pass_threshold_amber: input.passThresholdAmber ?? 61,
      created_by: input.createdBy,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create quiz')
  return mapQuiz(data as Record<string, unknown>)
}

export async function updateQuiz(
  id: string,
  patch: Partial<
    Pick<
      TrainingQuiz,
      'title' | 'description' | 'topic' | 'is_published' | 'pass_threshold_green' | 'pass_threshold_amber'
    >
  >
): Promise<TrainingQuiz> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_quizzes')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to update quiz')
  return mapQuiz(data as Record<string, unknown>)
}

export async function addQuestion(input: {
  quizId: string
  prompt: string
  displayOrder: number
  explanation: string | null
  options: Array<{ label: string; is_correct: boolean; displayOrder: number }>
}): Promise<{ question: TrainingQuizQuestion; options: TrainingQuizOption[] }> {
  const supabase = await createClient()
  const { data: q, error: qErr } = await supabase
    .from('training_quiz_questions')
    .insert({
      quiz_id: input.quizId,
      prompt: input.prompt,
      display_order: input.displayOrder,
      explanation: input.explanation,
    })
    .select('*')
    .single()
  if (qErr || !q) throw new Error(qErr?.message ?? 'Failed to add question')

  const question = mapQuestion(q as Record<string, unknown>)
  const rows = input.options.map((o) => ({
    question_id: question.id,
    label: o.label,
    is_correct: o.is_correct,
    display_order: o.displayOrder,
  }))
  const { data: opts, error: oErr } = await supabase
    .from('training_quiz_options')
    .insert(rows)
    .select('*')
  if (oErr) throw new Error(oErr.message)
  return {
    question,
    options: ((opts ?? []) as Array<Record<string, unknown>>).map(mapOption),
  }
}

export async function startAttempt(input: {
  quizId: string
  ditRecordId: string
  attemptedBy: string
}): Promise<TrainingQuizAttempt> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_quiz_attempts')
    .insert({
      quiz_id: input.quizId,
      dit_record_id: input.ditRecordId,
      attempted_by: input.attemptedBy,
      status: 'in_progress',
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to start attempt')
  return mapAttempt(data as Record<string, unknown>)
}

export async function fetchAttempt(id: string): Promise<TrainingQuizAttempt | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('training_quiz_attempts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data ? mapAttempt(data as Record<string, unknown>) : null
}

export async function fetchAttemptAnswers(
  attemptId: string
): Promise<TrainingQuizAttemptAnswer[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('training_quiz_attempt_answers')
    .select('*')
    .eq('attempt_id', attemptId)
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapAnswer)
}

/**
 * Upsert answers for an in-progress attempt, then finalize the attempt
 * with the computed score + tier. Caller must have verified the attempt
 * belongs to the authenticated DIT before invoking.
 */
export async function finalizeAttempt(input: {
  attemptId: string
  answers: Array<{ questionId: string; optionId: string | null }>
  scorePercent: number
  tier: 'green' | 'amber' | 'red'
  answerMarks: Map<string, boolean>
}): Promise<TrainingQuizAttempt> {
  const supabase = await createClient()

  // Replace any prior answers (in-progress attempts may have saved drafts).
  await supabase.from('training_quiz_attempt_answers').delete().eq('attempt_id', input.attemptId)

  if (input.answers.length > 0) {
    const rows = input.answers.map((a) => ({
      attempt_id: input.attemptId,
      question_id: a.questionId,
      option_id: a.optionId,
      is_correct: input.answerMarks.get(a.questionId) ?? false,
    }))
    const { error: aErr } = await supabase
      .from('training_quiz_attempt_answers')
      .insert(rows)
    if (aErr) throw new Error(aErr.message)
  }

  const { data, error } = await supabase
    .from('training_quiz_attempts')
    .update({
      submitted_at: new Date().toISOString(),
      score_percent: input.scorePercent,
      tier: input.tier,
      status: 'submitted',
    })
    .eq('id', input.attemptId)
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to finalize attempt')
  return mapAttempt(data as Record<string, unknown>)
}
