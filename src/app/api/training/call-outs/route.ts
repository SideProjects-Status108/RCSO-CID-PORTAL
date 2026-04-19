import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { createCallOut, listCallOuts } from '@/lib/training/case-queries'

// GET /api/training/call-outs?dit_record_id=...
// POST /api/training/call-outs
//   body: { dit_record_id, responded_at, duration_minutes,
//           incident_type?, case_number?, off_duty?,
//           comp_time_eligible?, responded_with?, notes? }

export async function GET(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const ditRecordId = (url.searchParams.get('dit_record_id') ?? '').trim()
  if (!ditRecordId) {
    return NextResponse.json({ error: 'dit_record_id is required' }, { status: 400 })
  }

  try {
    const logs = await listCallOuts(ditRecordId)
    return NextResponse.json({ call_outs: logs })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list call-outs'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    dit_record_id?: string
    responded_at?: string
    duration_minutes?: number
    incident_type?: string
    case_number?: string
    off_duty?: boolean
    comp_time_eligible?: boolean
    responded_with?: string | null
    notes?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ditRecordId = body.dit_record_id?.trim()
  const respondedAt = body.responded_at?.trim()
  const duration = Number(body.duration_minutes)
  if (!ditRecordId || !respondedAt || !Number.isFinite(duration) || duration < 0) {
    return NextResponse.json(
      { error: 'dit_record_id, responded_at, and non-negative duration_minutes are required' },
      { status: 400 },
    )
  }
  if (duration > 24 * 60) {
    return NextResponse.json(
      { error: 'duration_minutes must be <= 1440 (24h)' },
      { status: 400 },
    )
  }

  try {
    const row = await createCallOut({
      dit_record_id: ditRecordId,
      responded_at: respondedAt,
      duration_minutes: duration,
      incident_type: body.incident_type?.trim() || null,
      case_number: body.case_number?.trim() || null,
      off_duty: Boolean(body.off_duty),
      comp_time_eligible: Boolean(body.comp_time_eligible),
      responded_with: body.responded_with ?? null,
      notes: body.notes?.trim() || null,
      logged_by: session.user.id,
    })
    return NextResponse.json({ call_out: row })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create call-out'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
