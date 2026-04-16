import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { ensureWeeklyTrainingSession } from '@/lib/training/queries'

type PostBody = {
  pairing_id?: string
  week_start_date?: string
  week_end_date?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  try {
    const session = await ensureWeeklyTrainingSession(pairing_id, week_start_date, week_end_date)
    return NextResponse.json({ session })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create session'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
