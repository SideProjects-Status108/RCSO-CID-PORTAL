import { NextResponse } from 'next/server'

import { fetchPersonnelByUserIds } from '@/lib/directory/queries'
import { buildUnobservedCompetenciesEmail } from '@/lib/email/templates/training'
import { logTrainingEmailPreview } from '@/lib/email/training-notifications'
import { requireJsonSession, requireTrainingSessionEditor } from '@/lib/training/api-auth'
import { extractLowScoreFlags, isLowScore } from '@/lib/training/eval-scoring'
import {
  createDeficiencyForm,
  fetchPairingById,
  fetchSessionCompetencyScores,
  fetchWeeklySession,
  identifyUnobservedCompetencies,
  replaceUnobservedCompetenciesForSession,
  updateSessionStatus,
} from '@/lib/training/queries'
import { createSignatureRoute } from '@/lib/training/signatures'
import { fetchDitRecordByUserId } from '@/lib/training/queries'

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

    // Absence-aware: if the week was flagged DIT-absent, skip the explanation
    // enforcement and low-score deficiency prefill. We still record zero-score
    // state; the week just gets a "DIT absent" banner in the reviewer UIs.
    if (!session.dit_absent_flag) {
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

    // Kick off the signature route (fto -> coordinator -> training_supervisor -> lt).
    // No pre-signing at this stage; the FTO signs from their queue after
    // reviewing. This preserves the existing signature-queue UX and keeps the
    // submit endpoint idempotent on retry — the signature route is only
    // created if none exists yet for this session.
    let signatureRouteId: string | null = null
    let autoDeficiencyId: string | null = null
    if (pairing) {
      const ditRecord = await fetchDitRecordByUserId(pairing.dit_id)
      const ditRecordId = ditRecord?.id ?? null

      // Check for an existing route for this eval (idempotency on retry).
      const { createClient: createServerClient } = await import('@/lib/supabase/server')
      const supabase = await createServerClient()
      const { data: existing } = await supabase
        .from('document_signatures')
        .select('id')
        .eq('doc_type', 'weekly_eval')
        .eq('doc_id', session_id)
        .maybeSingle()

      if (existing && 'id' in existing) {
        signatureRouteId = String((existing as { id: string }).id)
      } else {
        const route = await createSignatureRoute({
          docType: 'weekly_eval',
          docId: session_id,
          ditRecordId,
          createdBy: gate.session.user.id,
        })
        signatureRouteId = route.id
      }

      // Low-score auto-draft: if any competency scored <= 2 AND the week is
      // NOT DIT-absent, create a deficiency_form draft seeded with the
      // flagged competencies. This is idempotent by weekly_session_id;
      // we don't double-create if one already exists.
      if (!session.dit_absent_flag) {
        const flags = extractLowScoreFlags(
          scores.map((s) => ({
            competency_key: s.competency_key,
            competency_label: s.competency_label,
            score: s.score,
            explanation: s.explanation,
          }))
        )
        if (flags.length > 0) {
          const { data: existingDef } = await supabase
            .from('deficiency_forms')
            .select('id')
            .eq('weekly_session_id', session_id)
            .maybeSingle()
          if (existingDef && 'id' in existingDef) {
            autoDeficiencyId = String((existingDef as { id: string }).id)
          } else {
            const created = await createDeficiencyForm({
              pairing_id: session.pairing_id,
              weekly_session_id: session_id,
              status: 'submitted',
              priority_level: flags.some((f) => f.score <= 1) ? 'urgent' : 'routine',
              competencies_flagged: flags,
              additional_notes: null,
            })
            autoDeficiencyId = created.id
          }
        }
      }

      // Silence unused variable warning (low-score check uses helper)
      void isLowScore
    }

    return NextResponse.json({
      success: true,
      unobserved_count: unobserved.length,
      signature_route_id: signatureRouteId,
      auto_deficiency_id: autoDeficiencyId,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to submit evaluation'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
