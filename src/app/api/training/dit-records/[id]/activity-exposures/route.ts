import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchActivityExposuresForDit, fetchDitRecordById } from '@/lib/training/queries'

// GET /api/training/dit-records/[id]/activity-exposures
//   [?week_start=YYYY-MM-DD] — optional filter to one Mon-Sun window.
//
// RLS on training_activity_exposures enforces the final visibility
// (staff / self-DIT / active-paired FTO). We still pre-check the DIT
// record exists so we can 404 cleanly rather than returning an empty
// list for a non-existent id.
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

  const url = new URL(_req.url)
  const weekStart = url.searchParams.get('week_start') ?? undefined

  const exposures = await fetchActivityExposuresForDit(id, weekStart)
  return NextResponse.json({ exposures })
}
