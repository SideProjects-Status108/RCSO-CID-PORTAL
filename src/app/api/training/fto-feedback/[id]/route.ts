import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireJsonSession } from '@/lib/training/api-auth'
import { isTrainingWriter } from '@/lib/training/access'
import {
  fetchSurveyById,
  updateSurveyDraft,
  voidSurvey,
} from '@/lib/training/feedback-queries'
import { validateRatings } from '@/lib/training/feedback'
import type { FtoFeedbackRatings } from '@/types/training'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  const { id } = await params
  const row = await fetchSurveyById(id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ survey: row })
}

/**
 * PATCH /api/training/fto-feedback/[id]
 * Body: { ratings?, comments?, void_reason? (writer-only) }
 *
 * Draft-only for DIT owners (RLS enforces); writers can edit any row.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  const { id } = await params
  const row = await fetchSurveyById(id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isWriter = isTrainingWriter(gate.session.profile)
  const supabase = await createClient()
  const { data: rec } = await supabase
    .from('dit_records')
    .select('user_id')
    .eq('id', row.dit_record_id)
    .maybeSingle()
  const isOwner =
    rec != null && String((rec as { user_id: string }).user_id) === gate.session.user.id

  if (!isWriter && !(isOwner && row.status === 'draft')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    ratings?: FtoFeedbackRatings
    comments?: string | null
  }
  if (body.ratings) {
    const err = validateRatings(body.ratings)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }
  const updated = await updateSurveyDraft({
    id,
    ratings: body.ratings,
    comments: body.comments,
  })
  return NextResponse.json({ survey: updated })
}

/**
 * DELETE /api/training/fto-feedback/[id]
 * Writer action — soft-voids the survey so it's excluded from
 * aggregates but the audit record remains.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  if (!isTrainingWriter(gate.session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { void_reason?: string }
  const updated = await voidSurvey({
    id,
    voided_by: gate.session.user.id,
    void_reason: body.void_reason?.trim() || null,
  })
  return NextResponse.json({ survey: updated })
}
