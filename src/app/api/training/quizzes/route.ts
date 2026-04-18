import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import { createQuiz, listQuizzes } from '@/lib/training/quiz-queries'

export async function GET(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const publishedOnly = url.searchParams.get('published') === 'true'
  // Writers see all; everyone else only published.
  const showAll = isTrainingWriter(session.profile) && !publishedOnly
  const quizzes = await listQuizzes({ publishedOnly: !showAll })
  return NextResponse.json({ quizzes })
}

type PostBody = {
  title?: string
  description?: string | null
  topic?: string | null
  pass_threshold_green?: number
  pass_threshold_amber?: number
}

export async function POST(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTrainingWriter(session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title = (body.title ?? '').trim()
  if (title.length < 2) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  try {
    const quiz = await createQuiz({
      title,
      description: body.description ?? null,
      topic: body.topic ?? null,
      passThresholdGreen: body.pass_threshold_green,
      passThresholdAmber: body.pass_threshold_amber,
      createdBy: session.user.id,
    })
    return NextResponse.json({ quiz })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create quiz'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
