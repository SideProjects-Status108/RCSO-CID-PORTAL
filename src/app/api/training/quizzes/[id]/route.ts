import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import {
  addQuestion,
  fetchOptionsForQuestions,
  fetchQuizById,
  fetchQuizQuestions,
  updateQuiz,
} from '@/lib/training/quiz-queries'
import { sanitizeOptionsForTaker } from '@/lib/training/quizzes'

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params

  const quiz = await fetchQuizById(id)
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Non-writers can only view published quizzes.
  const writer = isTrainingWriter(session.profile)
  if (!writer && !quiz.is_published) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const questions = await fetchQuizQuestions(id)
  const options = await fetchOptionsForQuestions(questions.map((q) => q.id))
  return NextResponse.json({
    quiz,
    questions,
    options: writer ? options : sanitizeOptionsForTaker(options),
  })
}

type PatchBody = {
  title?: string
  description?: string | null
  topic?: string | null
  is_published?: boolean
  pass_threshold_green?: number
  pass_threshold_amber?: number
  // Inline question addition.
  add_question?: {
    prompt: string
    display_order: number
    explanation: string | null
    options: Array<{ label: string; is_correct: boolean; display_order: number }>
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTrainingWriter(session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await ctx.params

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    if (body.add_question) {
      const q = body.add_question
      if (!q.prompt?.trim() || !Array.isArray(q.options) || q.options.length < 2) {
        return NextResponse.json(
          { error: 'Questions need a prompt and at least 2 options' },
          { status: 400 }
        )
      }
      if (!q.options.some((o) => o.is_correct)) {
        return NextResponse.json(
          { error: 'At least one option must be marked correct' },
          { status: 400 }
        )
      }
      const { question, options } = await addQuestion({
        quizId: id,
        prompt: q.prompt.trim(),
        displayOrder: q.display_order,
        explanation: q.explanation,
        options: q.options.map((o) => ({
          label: o.label,
          is_correct: o.is_correct,
          displayOrder: o.display_order,
        })),
      })
      return NextResponse.json({ question, options })
    }

    const patch: Parameters<typeof updateQuiz>[1] = {}
    if (typeof body.title === 'string') patch.title = body.title
    if (body.description !== undefined) patch.description = body.description
    if (body.topic !== undefined) patch.topic = body.topic
    if (typeof body.is_published === 'boolean') patch.is_published = body.is_published
    if (typeof body.pass_threshold_green === 'number')
      patch.pass_threshold_green = body.pass_threshold_green
    if (typeof body.pass_threshold_amber === 'number')
      patch.pass_threshold_amber = body.pass_threshold_amber

    const quiz = await updateQuiz(id, patch)
    return NextResponse.json({ quiz })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update quiz'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
