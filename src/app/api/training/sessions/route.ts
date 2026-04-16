import { NextResponse } from 'next/server'

import { requireJsonSession, requireTrainingSessionEditor } from '@/lib/training/api-auth'
import { ensureWeeklyTrainingSession } from '@/lib/training/queries'

type PostBody = {
  pairing_id?: string
  week_start_date?: string
  week_end_date?: string
}

export async function POST(request: Request) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const pairing_id = body.pairing_id?.trim()
  const week_start_date = body.week_start_date?.trim()
  const week_end_date = body.week_end_date?.trim()
  if (!pairing_id || !week_start_date || !week_end_date) {
    return NextResponse.json(
      { error: 'pairing_id, week_start_date, and week_end_date are required' },
      { status: 400 }
    )
  }

  const allowed = await requireTrainingSessionEditor(
    gate.session.user.id,
    gate.session.profile.role,
    pairing_id
  )
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const session = await ensureWeeklyTrainingSession(pairing_id, week_start_date, week_end_date)
    return NextResponse.json({ session, session_id: session.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create session'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
