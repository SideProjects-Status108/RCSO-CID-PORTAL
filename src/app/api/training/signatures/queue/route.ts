import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchSignatureQueue } from '@/lib/training/signatures'

export const dynamic = 'force-dynamic'

/**
 * GET /api/training/signatures/queue
 *
 * Returns in-progress document_signatures rows awaiting a signature from the
 * current user. Response shape is minimal by design — UI consumers can fetch
 * the full audit trail per row via the audit-trail endpoint.
 */
export async function GET() {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await fetchSignatureQueue(session.profile)
  return NextResponse.json({ rows })
}
