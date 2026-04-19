import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireJsonSession } from '@/lib/training/api-auth'
import { isTrainingWriter } from '@/lib/training/access'
import {
  listSurveysForDit,
  upsertSurveyDraft,
} from '@/lib/training/feedback-queries'
import { validateRatings } from '@/lib/training/feedback'
import type { FtoFeedbackRatings } from '@/types/training'

/**
 * GET  /api/training/fto-feedback?dit_record_id=<id>
 *     Lists every survey the DIT has started or submitted for their
 *     FTOs. RLS governs visibility; the DIT owner sees everything,
 *     writers see everything, FTOs never hit this endpoint.
 *
 * POST /api/training/fto-feedback
 *     Body: { dit_record_id, fto_id, pairing_id?, ratings?, comments? }
 *     Upserts a DIT-owned draft row. A DIT can only upsert drafts for
 *     their own record (enforced via RLS). Writers may seed drafts on
 *     behalf of the DIT when needed.
 */
export async function GET(request: Request) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response

  const url = new URL(request.url)
  const ditRecordId = url.searchParams.get('dit_record_id')?.trim()
  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }

  const rows = await listSurveysForDit(ditRecordId)
  return NextResponse.json({ surveys: rows })
}

export async function POST(request: Request) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response

  const body = (await request.json().catch(() => ({}))) as {
    dit_record_id?: string
    fto_id?: string
    pairing_id?: string | null
    ratings?: FtoFeedbackRatings
    comments?: string | null
  }
  const ditRecordId = body.dit_record_id?.trim()
  const ftoId = body.fto_id?.trim()
  if (!ditRecordId || !ftoId) {
    return NextResponse.json(
      { error: 'dit_record_id and fto_id are required' },
      { status: 400 },
    )
  }

  // Gate: DIT themselves OR training writer.
  const supabase = await createClient()
  const { data: rec } = await supabase
    .from('dit_records')
    .select('user_id')
    .eq('id', ditRecordId)
    .maybeSingle()
  const isOwner =
    rec != null && String((rec as { user_id: string }).user_id) === gate.session.user.id
  if (!isOwner && !isTrainingWriter(gate.session.profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ratings = body.ratings ?? {}
  const err = validateRatings(ratings)
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  const row = await upsertSurveyDraft({
    dit_record_id: ditRecordId,
    fto_id: ftoId,
    pairing_id: body.pairing_id ?? null,
    ratings,
    comments: body.comments ?? null,
  })

  return NextResponse.json({ survey: row })
}
