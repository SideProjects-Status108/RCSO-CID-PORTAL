import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { computeActivityProgress } from '@/lib/training/activity-progress'
import {
  fetchActivityExposuresForDit,
  fetchActivityTemplates,
  fetchDitRecordById,
} from '@/lib/training/queries'

// GET /api/training/dit-records/[id]/activity-progress
//
// Returns the phase-scoped per-template progress summary the Activity
// tab + DIT overview tile render. Computed fresh from the two source
// tables; RLS handles visibility for both.
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserWithProfile()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const record = await fetchDitRecordById(id)
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [templates, exposures] = await Promise.all([
    fetchActivityTemplates(),
    fetchActivityExposuresForDit(id),
  ])

  const summary = computeActivityProgress({
    phase: record.current_phase,
    templates,
    exposures,
  })

  return NextResponse.json({ progress: summary })
}
