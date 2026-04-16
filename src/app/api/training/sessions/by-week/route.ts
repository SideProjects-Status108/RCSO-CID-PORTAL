import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import {
  fetchCompetencyPriorsMap,
  fetchSessionCompetencyScores,
  fetchWeeklySessionByPairingAndWeek,
} from '@/lib/training/queries'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const pairing_id = (url.searchParams.get('pairing_id') ?? '').trim()
  const week_start_date = (url.searchParams.get('week_start_date') ?? '').trim()
  const dit_record_id = (url.searchParams.get('dit_record_id') ?? '').trim()

  if (!pairing_id || !week_start_date || !dit_record_id) {
    return NextResponse.json(
      { error: 'pairing_id, week_start_date, and dit_record_id are required' },
      { status: 400 }
    )
  }

  try {
    const { data: masters, error: mErr } = await supabase
      .from('competency_masters')
      .select('key, label, category, sort_order, description')
      .order('sort_order', { ascending: true })
    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 })
    }

    const session = await fetchWeeklySessionByPairingAndWeek(pairing_id, week_start_date)
    const keys = (masters ?? []).map((r) => String((r as { key: string }).key))
    const priors = await fetchCompetencyPriorsMap(dit_record_id, keys)
    const scores = session ? await fetchSessionCompetencyScores(session.id) : []

    return NextResponse.json({
      session,
      scores,
      masters: masters ?? [],
      priors,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load weekly session bundle'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
