import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import {
  deleteWeeklyCompetencyScore,
  fetchWeeklySession,
  saveCompetencyScore,
} from '@/lib/training/queries'
import type { WeeklyCompetencyScore } from '@/types/training'

type ScoreRow = {
  competency_key: string
  competency_label: string
  category: string
  score?: number | null
  explanation?: string | null
  explanation_required?: boolean
  prior_week_score?: number | null
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: session_id } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { scores?: ScoreRow[] }
  try {
    body = (await request.json()) as { scores?: ScoreRow[] }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rows = body.scores
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: 'scores array is required' }, { status: 400 })
  }

  try {
    const session = await fetchWeeklySession(session_id)
    if (session.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft sessions can be edited' }, { status: 409 })
    }

    for (const r of rows) {
      if (!r.competency_key || !r.competency_label || !r.category) {
        return NextResponse.json({ error: 'Each score row needs competency_key, label, and category' }, { status: 400 })
      }
      if (r.score == null || Number.isNaN(Number(r.score))) {
        await deleteWeeklyCompetencyScore(session_id, r.competency_key)
        continue
      }
      const n = Number(r.score)
      if (n < 1 || n > 5) {
        return NextResponse.json({ error: `Invalid score for ${r.competency_key}` }, { status: 400 })
      }
      const explanation_required = Boolean(
        r.explanation_required ?? (n === 1 || n === 2 || n === 5)
      )
      const row: WeeklyCompetencyScore = {
        id: '',
        session_id,
        competency_key: r.competency_key,
        competency_label: r.competency_label,
        category: r.category,
        score: n,
        explanation: r.explanation ?? null,
        explanation_required,
        prior_week_score: r.prior_week_score ?? null,
        created_at: '',
        updated_at: '',
      }
      await saveCompetencyScore(row)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to save draft'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
