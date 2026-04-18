import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { UserRole, hasRole } from '@/lib/auth/roles'
import { isTrainingWriter } from '@/lib/training/access'
import { createCtrEntry, listCtrEntries } from '@/lib/training/journal-queries'

export async function GET(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const ditRecordId = url.searchParams.get('dit_record_id')?.trim()
  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }
  const since = url.searchParams.get('since') ?? undefined
  const limit = Number(url.searchParams.get('limit') ?? '60') || 60

  const entries = await listCtrEntries(ditRecordId, { since, limit })
  return NextResponse.json({ entries })
}

type PostBody = {
  dit_record_id?: string
  pairing_id?: string | null
  entry_date?: string
  contact_hours?: number | null
  body?: string
}

export async function POST(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed =
    isTrainingWriter(session.profile) ||
    hasRole(session.profile.role, [UserRole.fto, UserRole.detective])
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ditRecordId = (body.dit_record_id ?? '').trim()
  const entryDate = (body.entry_date ?? '').trim()
  const text = (body.body ?? '').trim()
  if (!ditRecordId) return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    return NextResponse.json({ error: 'entry_date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (text.length < 1) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  const contactHours =
    typeof body.contact_hours === 'number' && body.contact_hours >= 0 ? body.contact_hours : null

  try {
    const entry = await createCtrEntry({
      ditRecordId,
      pairingId: body.pairing_id ?? null,
      ftoId: session.user.id,
      entryDate,
      contactHours,
      body: text,
    })
    return NextResponse.json({ entry })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to write CTR entry'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
