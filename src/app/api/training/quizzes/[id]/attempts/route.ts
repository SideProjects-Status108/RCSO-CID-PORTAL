import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchDitRecordByUserId } from '@/lib/training/queries'
import { fetchQuizById, startAttempt } from '@/lib/training/quiz-queries'

/**
 * POST /api/training/quizzes/[id]/attempts — the authenticated DIT starts
 * (or re-starts) an attempt on the published quiz. Writers can also start
 * attempts for preview/testing; they must pass dit_record_id explicitly.
 */
type PostBody = { dit_record_id?: string }

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: quizId } = await ctx.params

  const quiz = await fetchQuizById(quizId)
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!quiz.is_published) {
    return NextResponse.json({ error: 'Quiz is not published' }, { status: 409 })
  }

  let body: PostBody = {}
  try {
    body = (await request.json().catch(() => ({}))) as PostBody
  } catch {
    body = {}
  }

  // For DIT self-take, derive dit_record_id from their own record.
  let ditRecordId = body.dit_record_id?.trim() || null
  if (!ditRecordId) {
    const rec = await fetchDitRecordByUserId(session.user.id)
    if (!rec) {
      return NextResponse.json(
        { error: 'No DIT record found for this user' },
        { status: 400 }
      )
    }
    ditRecordId = rec.id
  }

  try {
    const attempt = await startAttempt({
      quizId,
      ditRecordId,
      attemptedBy: session.user.id,
    })
    return NextResponse.json({ attempt })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start attempt'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
