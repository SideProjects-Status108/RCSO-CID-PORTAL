import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { updateCase } from '@/lib/training/case-queries'
import { CASE_ROLES, CASE_STATUSES, type CaseRole, type CaseStatus } from '@/types/training'

// PATCH /api/training/cases/[id]
//   body: partial fields. When status flips to 'closed' and the caller
//   doesn't supply closed_at, we stamp now() on the server.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  let body: {
    title?: string
    case_number?: string | null
    complaint_number?: string | null
    dit_role?: CaseRole
    status?: CaseStatus
    closed_at?: string | null
    notes?: string | null
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.dit_role && !CASE_ROLES.includes(body.dit_role)) {
    return NextResponse.json({ error: 'Invalid dit_role' }, { status: 400 })
  }
  if (body.status && !CASE_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const patch: Parameters<typeof updateCase>[1] = { ...body }
  if (body.status === 'closed' && !('closed_at' in body)) {
    patch.closed_at = new Date().toISOString()
  }
  if (body.status && body.status !== 'closed' && !('closed_at' in body)) {
    patch.closed_at = null
  }

  try {
    const row = await updateCase(id, patch)
    return NextResponse.json({ case: row })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update case'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
