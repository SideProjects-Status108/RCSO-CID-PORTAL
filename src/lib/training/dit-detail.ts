import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { DitRecordRow } from '@/types/training'

import { fetchDitRecordById, fetchMilestonesForRecord } from './queries'
import type { WeeklyScoreSummary } from './scoring'

export type DitDetailPayload = {
  record: DitRecordRow
  profile: {
    id: string
    full_name: string
    badge_number: string | null
    email: string | null
    phone_cell: string | null
  }
  activePairing: {
    id: string
    fto_id: string
    fto_name: string
    fto_phone_cell: string | null
    start_date: string
  } | null
  weekSummaries: WeeklyScoreSummary[]
  milestoneProgress: { total: number; completed: number }
  openDeficiencies: number
  recentUnobserved: number
  openAbsence: {
    id: string
    kind: string
    start_date: string
    description: string | null
  } | null
}

export async function fetchDitDetailPayload(
  ditRecordId: string
): Promise<DitDetailPayload | null> {
  const record = await fetchDitRecordById(ditRecordId)
  if (!record) return null

  const supabase = await createClient()

  const [
    { data: profileRow },
    { data: pairingRow },
    milestones,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, badge_number, email, phone_cell')
      .eq('id', record.user_id)
      .maybeSingle(),
    supabase
      .from('fto_pairings')
      .select('id, fto_id, start_date')
      .eq('dit_id', record.user_id)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchMilestonesForRecord(ditRecordId),
  ])

  const profile = (profileRow ?? {
    id: record.user_id,
    full_name: 'DIT',
    badge_number: null,
    email: null,
    phone_cell: null,
  }) as {
    id: string
    full_name: string
    badge_number: string | null
    email: string | null
    phone_cell: string | null
  }

  let activePairing: DitDetailPayload['activePairing'] = null
  if (pairingRow) {
    const p = pairingRow as { id: string; fto_id: string; start_date: string }
    const { data: ftoProfile } = await supabase
      .from('profiles')
      .select('full_name, phone_cell')
      .eq('id', p.fto_id)
      .maybeSingle()
    activePairing = {
      id: p.id,
      fto_id: p.fto_id,
      fto_name: (ftoProfile as { full_name?: string } | null)?.full_name ?? 'FTO',
      fto_phone_cell:
        (ftoProfile as { phone_cell?: string | null } | null)?.phone_cell ?? null,
      start_date: p.start_date,
    }
  }

  let weekSummaries: WeeklyScoreSummary[] = []
  let openDeficiencies = 0
  let recentUnobserved = 0

  if (activePairing) {
    const { data: sessions } = await supabase
      .from('weekly_training_sessions')
      .select('id, week_start_date, status')
      .eq('pairing_id', activePairing.id)
      .neq('status', 'draft')
      .order('week_start_date', { ascending: false })
      .limit(8)

    const sessionList = (sessions ?? []) as Array<{
      id: string
      week_start_date: string
      status: string
    }>
    const sessionIds = sessionList.map((s) => s.id)

    if (sessionIds.length > 0) {
      const [{ data: scoreRows }, { data: unobs }] = await Promise.all([
        supabase
          .from('weekly_competency_scores')
          .select('session_id, score')
          .in('session_id', sessionIds),
        supabase
          .from('unobserved_competencies')
          .select('session_id')
          .in('session_id', sessionIds.slice(0, 2)),
      ])

      const bySession = new Map<string, number[]>()
      for (const s of (scoreRows ?? []) as Array<{ session_id: string; score: number }>) {
        const list = bySession.get(s.session_id) ?? []
        list.push(s.score)
        bySession.set(s.session_id, list)
      }

      weekSummaries = sessionList.map((s) => {
        const arr = bySession.get(s.id) ?? []
        const sample_count = arr.length
        const avg_score =
          sample_count > 0 ? arr.reduce((a, b) => a + b, 0) / sample_count : 0
        return {
          week_start_date: s.week_start_date,
          avg_score,
          sample_count,
        }
      })

      recentUnobserved = (unobs ?? []).length
    }

    const { count: defCount } = await supabase
      .from('deficiency_forms')
      .select('id', { count: 'exact', head: true })
      .eq('pairing_id', activePairing.id)
      .neq('status', 'resolved')
    openDeficiencies = defCount ?? 0
  }

  const { data: absenceRow } = await supabase
    .from('dit_absence_records')
    .select('id, kind, start_date, description')
    .eq('dit_record_id', record.id)
    .in('status', ['draft', 'submitted', 'acknowledged'])
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const openAbsence = absenceRow
    ? (absenceRow as {
        id: string
        kind: string
        start_date: string
        description: string | null
      })
    : null

  const milestoneProgress = {
    total: milestones.length,
    completed: milestones.filter((m) => m.is_completed).length,
  }

  return {
    record,
    profile,
    activePairing,
    weekSummaries,
    milestoneProgress,
    openDeficiencies,
    recentUnobserved,
    openAbsence,
  }
}
