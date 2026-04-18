import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import {
  fetchAttempt,
  fetchAttemptAnswers,
  fetchOptionsForQuestions,
  fetchQuizById,
  fetchQuizQuestions,
  finalizeAttempt,
} from '@/lib/training/quiz-queries'
import {
  scoreAttempt,
  tierNotificationTargets,
} from '@/lib/training/quizzes'

/**
 * GET — fetch an attempt (plus answers once submitted). Caller must be the
 * attempt owner, the DIT's assigned staff, or a training writer.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params

  const attempt = await fetchAttempt(id)
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const writer = isTrainingWriter(session.profile)
  if (!writer && attempt.attempted_by !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const answers = await fetchAttemptAnswers(id)
  return NextResponse.json({ attempt, answers })
}

/**
 * POST — submit answers and finalize the attempt. Computes score + tier
 * server-side. Returns the finalized attempt + a list of notification
 * targets that the UI should render + the in-app notification queue should
 * enqueue. (Actual notification delivery is wired via the existing email
 * preview path in logTrainingEmailPreview; a full notify rollout lives in
 * Segment E.)
 */
type PostBody = {
  answers?: Array<{ question_id: string; option_id: string | null }>
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: attemptId } = await ctx.params

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const answers = Array.isArray(body.answers) ? body.answers : []

  const attempt = await fetchAttempt(attemptId)
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (attempt.attempted_by !== session.user.id && !isTrainingWriter(session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: 'Attempt is already closed' }, { status: 409 })
  }

  const quiz = await fetchQuizById(attempt.quiz_id)
  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

  const questions = await fetchQuizQuestions(attempt.quiz_id)
  const options = await fetchOptionsForQuestions(questions.map((q) => q.id))

  const scoring = scoreAttempt({
    questions,
    options,
    answers: answers.map((a) => ({
      question_id: a.question_id,
      option_id: a.option_id,
    })),
    thresholds: {
      pass_threshold_green: quiz.pass_threshold_green,
      pass_threshold_amber: quiz.pass_threshold_amber,
    },
  })

  try {
    const finalized = await finalizeAttempt({
      attemptId,
      answers: answers.map((a) => ({ questionId: a.question_id, optionId: a.option_id })),
      scorePercent: scoring.scorePercent,
      tier: scoring.tier,
      answerMarks: scoring.answerMarks,
    })
    const targets = tierNotificationTargets(scoring.tier)
    return NextResponse.json({
      attempt: finalized,
      correct_count: scoring.correctCount,
      total_count: scoring.totalCount,
      notification_targets: targets,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to submit attempt'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
