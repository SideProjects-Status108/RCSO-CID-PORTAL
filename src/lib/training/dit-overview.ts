import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { DitRecordStatus } from '@/types/training'

/**
 * Tile-grid status for the DIT Files page.
 *
 * Gray beats everything (suspended + on_hold). Otherwise: compute a health
 * signal from latest weekly session average + unobserved-competency count.
 *
 *   - green:  avg >= 4, no recent unobserved backlog, no open deficiency
 *   - amber:  avg 3-3.99, or 4+ unobserved in last 2 weeks, or open coaching
 *   - red:    avg < 3, escalated deficiency, or >=3 consecutive weeks <3
 *   - gray:   suspended / on_hold / graduated / separated / no data yet
 */
export type DitTileHealth = 'green' | 'amber' | 'red' | 'gray'

export type DitFilesOverviewRow = {
  dit_record_id: string
  dit_user_id: string
  dit_name: string
  badge_number: string | null
  status: DitRecordStatus
  current_phase: number
  start_date: string
  weeks_in_program: number
  latest_week_start: string | null
  latest_session_status: 'draft' | 'submitted' | 'approved' | null
  avg_score: number | null
  unobserved_recent: number
  open_deficiencies: number
  fto_user_id: string | null
  fto_name: string | null
  fto_phone_cell: string | null
  pairing_id: string | null
  health: DitTileHealth
  expected_graduation_date: string | null
}

function computeHealth(params: {
  status: DitRecordStatus
  avgScore: number | null
  unobservedRecent: number
  openDeficiencies: number
}): DitTileHealth {
  if (
    params.status === 'suspended' ||
    params.status === 'on_hold' ||
    params.status === 'graduated' ||
    params.status === 'separated'
  ) {
    return 'gray'
  }
  if (params.avgScore == null) return 'gray'
  if (params.avgScore < 3) return 'red'
  if (params.openDeficiencies > 0) return 'amber'
  if (params.unobservedRecent >= 4) return 'amber'
  if (params.avgScore < 4) return 'amber'
  return 'green'
}

function weeksBetween(startDate: string | null): number {
  if (!startDate) return 0
  const start = new Date(`${startDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) return 0
  const now = new Date()
  const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, Math.floor(days / 7) + 1)
}

/**
 * Overview for the tile grid. Scoped by role via RLS on the underlying
 * tables (dit_records has select_scope; weekly_* use pairing helpers), so
 * this function is safe to call for any role: an FTO only sees their own
 * DITs, a DIT only sees themselves, writers see everyone.
 */
export async function fetchDitFilesOverview(): Promise<DitFilesOverviewRow[]> {
  const supabase = await createClient()

  const { data: ditRows } = await supabase
    .from('dit_records')
    .select('id, user_id, current_phase, start_date, status, expected_graduation_date')
    .in('status', ['active', 'suspended', 'on_hold'])
    .order('start_date', { ascending: true })

  const records = (ditRows ?? []) as Array<{
    id: string
    user_id: string
    current_phase: number
    start_date: string | null
    status: DitRecordStatus
    expected_graduation_date: string | null
  }>

  if (records.length === 0) return []

  const userIds = Array.from(new Set(records.map((r) => r.user_id)))

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, full_name, badge_number, phone_cell')
    .in('id', userIds)
  const profileMap = new Map(
    ((profileRows ?? []) as Array<{
      id: string
      full_name: string
      badge_number: string | null
      phone_cell: string | null
    }>).map((p) => [p.id, p])
  )

  const { data: pairingRows } = await supabase
    .from('fto_pairings')
    .select('id, fto_id, dit_id')
    .in('dit_id', userIds)
    .eq('is_active', true)
  const pairingByDit = new Map(
    ((pairingRows ?? []) as Array<{ id: string; fto_id: string; dit_id: string }>).map((p) => [
      p.dit_id,
      p,
    ])
  )

  const ftoIds = Array.from(
    new Set(
      ((pairingRows ?? []) as Array<{ fto_id: string }>).map((p) => p.fto_id)
    )
  )
  const { data: ftoProfileRows } = ftoIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, phone_cell')
        .in('id', ftoIds)
    : { data: [] as Array<{ id: string; full_name: string; phone_cell: string | null }> }
  const ftoProfileMap = new Map(
    ((ftoProfileRows ?? []) as Array<{
      id: string
      full_name: string
      phone_cell: string | null
    }>).map((p) => [p.id, p])
  )

  const pairingIds = Array.from(pairingByDit.values()).map((p) => p.id)

  // Pull recent weekly sessions (last 6 weeks per pairing is enough for the
  // tile). We ask for the latest 6 in a single IN query and sort client-side.
  const { data: sessionRows } = pairingIds.length
    ? await supabase
        .from('weekly_training_sessions')
        .select('id, pairing_id, week_start_date, status')
        .in('pairing_id', pairingIds)
        .order('week_start_date', { ascending: false })
    : { data: [] as Array<{
        id: string
        pairing_id: string
        week_start_date: string
        status: 'draft' | 'submitted' | 'approved'
      }> }

  const sessionsByPairing = new Map<
    string,
    Array<{ id: string; week_start_date: string; status: 'draft' | 'submitted' | 'approved' }>
  >()
  for (const s of (sessionRows ?? []) as Array<{
    id: string
    pairing_id: string
    week_start_date: string
    status: 'draft' | 'submitted' | 'approved'
  }>) {
    const list = sessionsByPairing.get(s.pairing_id) ?? []
    list.push({ id: s.id, week_start_date: s.week_start_date, status: s.status })
    sessionsByPairing.set(s.pairing_id, list)
  }

  const sessionIds = (sessionRows ?? []).map((s) => (s as { id: string }).id)

  const { data: scoreRows } = sessionIds.length
    ? await supabase
        .from('weekly_competency_scores')
        .select('session_id, score')
        .in('session_id', sessionIds)
    : { data: [] as Array<{ session_id: string; score: number }> }

  const scoresBySession = new Map<string, number[]>()
  for (const s of (scoreRows ?? []) as Array<{ session_id: string; score: number }>) {
    const list = scoresBySession.get(s.session_id) ?? []
    list.push(s.score)
    scoresBySession.set(s.session_id, list)
  }

  const { data: unobservedRows } = sessionIds.length
    ? await supabase
        .from('unobserved_competencies')
        .select('session_id')
        .in('session_id', sessionIds)
    : { data: [] as Array<{ session_id: string }> }
  const unobservedBySession = new Map<string, number>()
  for (const u of (unobservedRows ?? []) as Array<{ session_id: string }>) {
    unobservedBySession.set(u.session_id, (unobservedBySession.get(u.session_id) ?? 0) + 1)
  }

  const { data: deficiencyRows } = pairingIds.length
    ? await supabase
        .from('deficiency_forms')
        .select('pairing_id, status')
        .in('pairing_id', pairingIds)
    : { data: [] as Array<{ pairing_id: string; status: string }> }
  const openDefsByPairing = new Map<string, number>()
  for (const d of (deficiencyRows ?? []) as Array<{ pairing_id: string; status: string }>) {
    if (d.status === 'resolved') continue
    openDefsByPairing.set(d.pairing_id, (openDefsByPairing.get(d.pairing_id) ?? 0) + 1)
  }

  return records.map((rec): DitFilesOverviewRow => {
    const ditProfile = profileMap.get(rec.user_id)
    const pairing = pairingByDit.get(rec.user_id) ?? null
    const ftoProfile = pairing ? ftoProfileMap.get(pairing.fto_id) : null

    const pairingSessions = pairing ? sessionsByPairing.get(pairing.id) ?? [] : []
    const latestSession = pairingSessions[0] ?? null

    // Average score across the last 2 weeks of submitted/approved sessions.
    const recentSessions = pairingSessions
      .filter((s) => s.status !== 'draft')
      .slice(0, 2)
    const recentSessionIds = recentSessions.map((s) => s.id)
    const recentScores: number[] = []
    for (const sid of recentSessionIds) {
      const arr = scoresBySession.get(sid)
      if (arr) recentScores.push(...arr)
    }
    const avgScore = recentScores.length
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      : null

    const unobservedRecent = recentSessionIds.reduce(
      (sum, sid) => sum + (unobservedBySession.get(sid) ?? 0),
      0
    )

    const openDeficiencies = pairing ? openDefsByPairing.get(pairing.id) ?? 0 : 0

    const health = computeHealth({
      status: rec.status,
      avgScore,
      unobservedRecent,
      openDeficiencies,
    })

    return {
      dit_record_id: rec.id,
      dit_user_id: rec.user_id,
      dit_name: ditProfile?.full_name ?? 'DIT',
      badge_number: ditProfile?.badge_number ?? null,
      status: rec.status,
      current_phase: rec.current_phase,
      start_date: rec.start_date ?? '',
      weeks_in_program: weeksBetween(rec.start_date),
      latest_week_start: latestSession?.week_start_date ?? null,
      latest_session_status: latestSession?.status ?? null,
      avg_score: avgScore,
      unobserved_recent: unobservedRecent,
      open_deficiencies: openDeficiencies,
      fto_user_id: pairing?.fto_id ?? null,
      fto_name: ftoProfile?.full_name ?? null,
      fto_phone_cell: ftoProfile?.phone_cell ?? null,
      pairing_id: pairing?.id ?? null,
      health,
      expected_graduation_date: rec.expected_graduation_date,
    }
  })
}
