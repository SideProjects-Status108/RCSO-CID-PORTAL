import { NextResponse } from 'next/server'

import { fetchPersonnelByUserIds } from '@/lib/directory/queries'
import { buildUnobservedCompetenciesEmail } from '@/lib/email/templates/training'
import { logTrainingEmailPreview } from '@/lib/email/training-notifications'
import { requireJsonSession, requireTrainingSessionEditor } from '@/lib/training/api-auth'
import {
  fetchPairingById,
  fetchSessionCompetencyScores,
  fetchWeeklySession,
  identifyUnobservedCompetencies,
  replaceUnobservedCompetenciesForSession,
  updateSessionStatus,
} from '@/lib/training/queries'

const MIN_EXPLANATION = 12

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: session_id } = await ctx.params
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response

  try {
    const session = await fetchWeeklySession(session_id)
    const canEdit = await requireTrainingSessionEditor(
      gate.session.user.id,
      gate.session.profile.role,
      session.pairing_id
    )
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
    await replaceUnobservedCompetenciesForSession(session_id)
    const unobserved = await identifyUnobservedCompetencies(session_id)

    const pairing = await fetchPairingById(session.pairing_id)
    if (pairing) {
      const personnel = await fetchPersonnelByUserIds([pairing.dit_id, pairing.fto_id, gate.session.user.id])
      const name = (uid: string) => personnel.find((p) => p.user_id === uid)?.full_name ?? 'Trainee'
      const weekLabel = `${session.week_start_date} – ${session.week_end_date}`
      const mail = buildUnobservedCompetenciesEmail({
        ditName: name(pairing.dit_id),
        ftoName: name(pairing.fto_id),
        weekLabel,
        items: unobserved.map((u) => ({ key: u.competency_key, label: u.competency_label })),
      })
      logTrainingEmailPreview('unobserved', mail.subject, mail.html)
    }

    return NextResponse.json({
      success: true,
      unobserved_count: unobserved.length,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to submit evaluation'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
