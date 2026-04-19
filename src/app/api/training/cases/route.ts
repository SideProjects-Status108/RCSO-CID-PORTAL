import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { createCase, listCases } from '@/lib/training/case-queries'
import { CASE_ROLES, type CaseRole } from '@/types/training'

// GET /api/training/cases?dit_record_id=...
// POST /api/training/cases
//   body: { dit_record_id, title, case_number?, complaint_number?,
//           dit_role?, notes? }
//
// RLS enforces the scope: any currently-paired FTO (or staff) may write.

export async function GET(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const ditRecordId = (url.searchParams.get('dit_record_id') ?? '').trim()
  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }

  try {
    const cases = await listCases(ditRecordId)
    return NextResponse.json({ cases })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list cases'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    dit_record_id?: string
    title?: string
    case_number?: string
    complaint_number?: string
    dit_role?: CaseRole
    notes?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ditRecordId = body.dit_record_id?.trim()
  const title = body.title?.trim()
  if (!ditRecordId || !title) {
    return NextResponse.json(
      { error: 'dit_record_id and title are required' },
      { status: 400 },
    )
  }
  if (body.dit_role && !CASE_ROLES.includes(body.dit_role)) {
    return NextResponse.json({ error: 'Invalid dit_role' }, { status: 400 })
  }

  try {
    const row = await createCase({
      dit_record_id: ditRecordId,
      title,
      case_number: body.case_number?.trim() || null,
      complaint_number: body.complaint_number?.trim() || null,
      dit_role: body.dit_role,
      notes: body.notes?.trim() || null,
      assigned_by: session.user.id,
    })
    return NextResponse.json({ case: row })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create case'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
