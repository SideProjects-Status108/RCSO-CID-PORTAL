import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { decideNudges, computeMissedStreak } from '@/lib/training/journal'
import {
  fetchMissedDayInputs,
  recordNudgeOnce,
} from '@/lib/training/journal-queries'
import { fetchDitRecordByUserId } from '@/lib/training/queries'
import type { DitRecordStatus } from '@/types/training'

/**
 * POST /api/training/nudges
 *
 * Compute and record any missed-day nudges for the authenticated DIT (or
 * for the provided dit_record_id if the caller is a writer). Idempotent
 * via the (dit_record_id, nudge_date, nudge_kind) unique index.
 *
 * Returns:
 *   - streak: consecutive missed write-days leading up to today
 *   - nudge_dit: true when streak >= 2
 *   - nudge_fto: true when streak >= 3
 *   - created_dit / created_fto: true when this call actually wrote the nudge
 *     row (vs. a no-op because today's nudge was already recorded).
 *
 * The UI can poll this once on DIT dashboard mount to keep the state fresh,
 * and fire again whenever an entry is saved (streak drops to 0).
 */
type PostBody = { dit_record_id?: string }

export async function POST(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: PostBody = {}
  try {
    body = (await request.json().catch(() => ({}))) as PostBody
  } catch {
    body = {}
  }

  let ditRecordId = body.dit_record_id?.trim() || null
  if (!ditRecordId) {
    const rec = await fetchDitRecordByUserId(session.user.id)
    if (!rec) {
      return NextResponse.json(
        { error: 'No DIT record for this user and no dit_record_id provided' },
        { status: 400 }
      )
    }
    ditRecordId = rec.id
  }

  const inputs = await fetchMissedDayInputs(ditRecordId)
  const status = (inputs.status as DitRecordStatus) ?? 'active'
  const streak = computeMissedStreak({
    status,
    entries: inputs.entries,
    absences: inputs.absences,
  })
  const decision = decideNudges(streak, status)

  const today = new Date().toISOString().slice(0, 10)

  let createdDit = false
  let createdFto = false
  if (decision.nudgeDit) {
    const r = await recordNudgeOnce({
      ditRecordId,
      nudgeDate: today,
      nudgeKind: 'dit_self',
    })
    createdDit = r.created
  }
  if (decision.nudgeFto) {
    const r = await recordNudgeOnce({
      ditRecordId,
      nudgeDate: today,
      nudgeKind: 'fto_notify',
    })
    createdFto = r.created
  }

  return NextResponse.json({
    streak,
    nudge_dit: decision.nudgeDit,
    nudge_fto: decision.nudgeFto,
    created_dit: createdDit,
    created_fto: createdFto,
    status,
  })
}
