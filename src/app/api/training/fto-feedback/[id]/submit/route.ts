import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireJsonSession } from '@/lib/training/api-auth'
import { createSignatureRoute } from '@/lib/training/signatures'
import { fetchSurveyById, markSurveySubmitted } from '@/lib/training/feedback-queries'
import { isRubricComplete } from '@/lib/training/feedback'

/**
 * POST /api/training/fto-feedback/[id]/submit
 *
 * DIT owner action. Verifies the rubric is complete, flips the row to
 * 'submitted', and opens a doc_type='fto_feedback' signature route
 * (dit → fto_coordinator → training_supervisor) that serves as the
 * acknowledgment chain.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  const { id } = await params

  const row = await fetchSurveyById(id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = await createClient()
  const { data: rec } = await supabase
    .from('dit_records')
    .select('user_id')
    .eq('id', row.dit_record_id)
    .maybeSingle()
  const isOwner =
    rec != null && String((rec as { user_id: string }).user_id) === gate.session.user.id
  if (!isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (row.status !== 'draft') {
    return NextResponse.json(
      { error: `Cannot submit a ${row.status} survey` },
      { status: 409 },
    )
  }
  if (!isRubricComplete(row.ratings)) {
    return NextResponse.json(
      { error: 'All rubric items must be rated 1–5 before submitting' },
      { status: 400 },
    )
  }

  const sigRoute = await createSignatureRoute({
    docType: 'fto_feedback',
    docId: row.id,
    ditRecordId: row.dit_record_id,
    createdBy: gate.session.user.id,
  })

  const updated = await markSurveySubmitted(row.id, sigRoute.id)
  return NextResponse.json({ survey: updated, signature_route_id: sigRoute.id })
}
