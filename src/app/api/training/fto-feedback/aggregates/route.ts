import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireJsonSession } from '@/lib/training/api-auth'
import { isTrainingWriter } from '@/lib/training/access'
import { aggregateSurveysForFto } from '@/lib/training/feedback'
import {
  listAllSubmittedSurveys,
  listSurveysForFto,
} from '@/lib/training/feedback-queries'
import { UserRole, hasRole } from '@/lib/auth/roles'

/**
 * GET /api/training/fto-feedback/aggregates
 *
 * Writers: returns an aggregate per FTO they've seen feedback for,
 * including response counts and rubric means (with FTO names).
 *
 * FTOs:   returns their own single aggregate, with fto_name nulled on
 * a "self" row — the caller already knows who they are — and
 * response_count clamped so a single response can't identify the
 * author. Raw comments and per-DIT breakdowns are never returned.
 *
 * Anyone else: 403.
 */
const SELF_AGGREGATE_MIN_RESPONSES = 3

export async function GET() {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  const { session } = gate

  const isWriter = isTrainingWriter(session.profile)
  const isFto = hasRole(session.profile.role, [UserRole.fto])

  if (isWriter) {
    const rows = await listAllSubmittedSurveys()
    const byFto = new Map<string, typeof rows>()
    for (const r of rows) {
      const arr = byFto.get(r.fto_id) ?? []
      arr.push(r)
      byFto.set(r.fto_id, arr)
    }

    // Hydrate names for the table.
    const ids = Array.from(byFto.keys())
    const supabase = await createClient()
    const { data: profs } =
      ids.length === 0
        ? { data: [] as Array<{ id: string; full_name: string | null }> }
        : await supabase.from('profiles').select('id, full_name').in('id', ids)
    const nameById = new Map<string, string | null>()
    for (const p of profs ?? []) {
      const r = p as { id: string; full_name: string | null }
      nameById.set(String(r.id), r.full_name)
    }

    const aggregates = Array.from(byFto.entries()).map(([fto_id, surveys]) =>
      aggregateSurveysForFto({
        fto_id,
        fto_name: nameById.get(fto_id) ?? null,
        surveys,
      }),
    )
    aggregates.sort((a, b) => (a.fto_name ?? '').localeCompare(b.fto_name ?? ''))
    return NextResponse.json({ aggregates, scope: 'writer' })
  }

  if (isFto) {
    const surveys = await listSurveysForFto(session.user.id)
    const agg = aggregateSurveysForFto({
      fto_id: session.user.id,
      fto_name: session.profile.full_name,
      surveys,
    })
    // Anonymity floor: don't reveal means until at least N responses.
    if (agg.response_count < SELF_AGGREGATE_MIN_RESPONSES) {
      return NextResponse.json({
        aggregates: [
          {
            fto_id: agg.fto_id,
            fto_name: agg.fto_name,
            response_count: agg.response_count,
            means: {},
            overall_mean: null,
          },
        ],
        scope: 'self',
        min_responses: SELF_AGGREGATE_MIN_RESPONSES,
      })
    }
    return NextResponse.json({
      aggregates: [agg],
      scope: 'self',
      min_responses: SELF_AGGREGATE_MIN_RESPONSES,
    })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
