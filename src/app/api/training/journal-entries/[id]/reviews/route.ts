import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { UserRole, hasRole } from '@/lib/auth/roles'
import { isTrainingWriter } from '@/lib/training/access'
import { addJournalReview } from '@/lib/training/journal-queries'

/**
 * Only FTOs, training writers, and detectives paired as temp FTO can add
 * reviews. RLS backs this up; we gate here too for fast failure + clear errors.
 */
type PostBody = { notes?: string | null }

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed =
    isTrainingWriter(session.profile) ||
    hasRole(session.profile.role, [UserRole.fto, UserRole.detective])
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: entryId } = await ctx.params
  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const notes = body.notes != null ? String(body.notes).trim() || null : null
  try {
    const review = await addJournalReview({
      entryId,
      reviewerId: session.user.id,
      notes,
    })
    return NextResponse.json({ review })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to add review'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
