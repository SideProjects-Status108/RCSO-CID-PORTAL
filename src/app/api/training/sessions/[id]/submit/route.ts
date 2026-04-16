import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import {
  fetchSessionCompetencyScores,
  fetchWeeklySession,
  updateSessionStatus,
} from '@/lib/training/queries'

const MIN_EXPLANATION = 12

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: session_id } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const session = await fetchWeeklySession(session_id)
    if (session.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft sessions can be submitted' }, { status: 409 })
    }

    const scores = await fetchSessionCompetencyScores(session_id)
    for (const s of scores) {
      if (s.score == null) continue
      if (s.score === 1 || s.score === 2 || s.score === 5) {
        const t = (s.explanation ?? '').trim()
        if (t.length < MIN_EXPLANATION) {
          return NextResponse.json(
            {
              error: `Explanation required (at least ${MIN_EXPLANATION} characters) for competency: ${s.competency_label}`,
            },
            { status: 400 }
          )
        }
      }
    }

    await updateSessionStatus(session_id, 'submitted')
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to submit evaluation'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
