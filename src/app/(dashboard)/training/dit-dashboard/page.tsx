import { redirect } from 'next/navigation'

import { DitDashboardView, type DitDashboardPayload } from '@/components/training/dit-dashboard-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { UserRole } from '@/lib/auth/roles'
import { fetchPersonnelByUserIds } from '@/lib/directory/queries'
import {
  fetchActivityExposuresForDit,
  fetchCompetencyMasters,
  fetchDeficiencyActions,
  fetchDeficiencyFormsForPairing,
  fetchDitRecordByUserId,
  fetchActivePairingForDitUser,
  fetchExcellenceRecognitions,
  fetchSessionCompetencyScores,
  fetchWeeklyScoreTrendForPairing,
  fetchWeeklySessionsForPairing,
  identifyUnobservedCompetencies,
} from '@/lib/training/queries'

export const dynamic = 'force-dynamic'

function mondayOfWeekContaining(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = x.getDay()
  const delta = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + delta)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const x = new Date(y, m - 1, d)
  x.setDate(x.getDate() + days)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

function daysSinceUtcDate(iso: string): number {
  const start = new Date(iso).getTime()
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000))
}

const COACHING_STATUSES = new Set([
  'coordinator_reviewing',
  'coaching_active',
  'escalated_to_sgt',
  'escalated_to_lt',
])

export default async function DitDashboardPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')
  if (session.profile.role !== UserRole.dit) {
    redirect('/training')
  }

  const pairing = await fetchActivePairingForDitUser(session.user.id)
  if (!pairing) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-text-primary">DIT weekly progress</h1>
        <p className="text-sm text-text-secondary">
          You do not have an active FTO pairing on file. When a coordinator assigns you to an FTO, your
          weekly snapshot will appear here.
        </p>
      </div>
    )
  }

  const ditRecord = await fetchDitRecordByUserId(session.user.id)
  const personnel = await fetchPersonnelByUserIds([pairing.fto_id, pairing.dit_id])
  const name = (uid: string) => personnel.find((p) => p.user_id === uid)?.full_name ?? '—'
  const ftoName = name(pairing.fto_id)
  const ditName = name(pairing.dit_id)

  const sessions = await fetchWeeklySessionsForPairing(pairing.id, 1)
  const latest = sessions[0] ?? null
  const anchorStart = latest?.week_start_date ?? mondayOfWeekContaining()
  const anchorEnd = latest?.week_end_date ?? addDaysYmd(anchorStart, 6)
  const weekLabel = `${anchorStart} – ${anchorEnd}`

  const masters = await fetchCompetencyMasters()
  const scoresList = latest ? await fetchSessionCompetencyScores(latest.id) : []
  const scoresByKey: DitDashboardPayload['scoresByKey'] = {}
  for (const m of masters) {
    scoresByKey[m.key] = { score: null, explanation: null, prior_week_score: null }
  }
  for (const s of scoresList) {
    scoresByKey[s.competency_key] = {
      score: s.score,
      explanation: s.explanation,
      prior_week_score: s.prior_week_score,
    }
  }

  let unobserved: DitDashboardPayload['unobserved'] = []
  if (latest?.status === 'submitted' || latest?.status === 'approved') {
    const rows = await identifyUnobservedCompetencies(latest.id)
    unobserved = rows.map((u) => ({
      id: u.id,
      competency_key: u.competency_key,
      competency_label: u.competency_label,
      created_at: u.created_at,
      days_since:
        u.days_since_last_observed > 0 ? u.days_since_last_observed : daysSinceUtcDate(u.created_at),
    }))
  } else {
    unobserved = masters
      .filter((m) => scoresByKey[m.key]?.score == null)
      .map((m) => ({
        id: `pending-${m.key}`,
        competency_key: m.key,
        competency_label: m.label,
        created_at: '',
        days_since: null,
      }))
  }

  const ratedCount = masters.filter((m) => scoresByKey[m.key]?.score != null).length
  const notObservedCount =
    latest?.status === 'submitted' || latest?.status === 'approved'
      ? unobserved.length
      : masters.filter((m) => scoresByKey[m.key]?.score == null).length

  const exposures =
    ditRecord != null
      ? await fetchActivityExposuresForDit(ditRecord.id, anchorStart)
      : []
  const expFtoIds = [...new Set(exposures.map((e) => e.fto_id))]
  const expPeople = expFtoIds.length ? await fetchPersonnelByUserIds(expFtoIds) : []
  const weekActivities = exposures.map((e) => ({
    id: e.id,
    exposure_date: e.exposure_date,
    role: e.role,
    fto_name: expPeople.find((p) => p.user_id === e.fto_id)?.full_name ?? 'FTO',
  }))

  const trendKeys = masters.slice(0, 4).map((m) => ({ key: m.key, label: m.label }))
  const trendRaw = await fetchWeeklyScoreTrendForPairing(
    pairing.id,
    trendKeys.map((k) => k.key),
    4
  )
  const trend = trendRaw.map((r) => ({ week_start_date: r.week_start_date, scores: r.scores }))

  const deficiencyForms = await fetchDeficiencyFormsForPairing(pairing.id)
  const activeDef = deficiencyForms.filter((f) => COACHING_STATUSES.has(f.status))
  const actionsByFormId: Record<string, Awaited<ReturnType<typeof fetchDeficiencyActions>>> = {}
  const actorIds = new Set<string>()
  for (const f of activeDef) {
    const acts = await fetchDeficiencyActions(f.id)
    actionsByFormId[f.id] = acts
    const sched = acts.filter((a) => a.action_type === 'scheduled_meeting').at(-1)
    if (sched) actorIds.add(sched.actor_id)
  }
  const coachPeople = actorIds.size ? await fetchPersonnelByUserIds([...actorIds]) : []
  const coaching: DitDashboardPayload['coaching'] = activeDef.map((f) => {
    const acts = actionsByFormId[f.id] ?? []
    const sched = acts.filter((a) => a.action_type === 'scheduled_meeting').at(-1)
    const coordName = sched
      ? coachPeople.find((p) => p.user_id === sched.actor_id)?.full_name ?? 'Coordinator'
      : 'Coordinator'
    const competencies = f.competencies_flagged.map((c) => c.competency_label).join(', ')
    return {
      formId: f.id,
      status: f.status,
      competencies: competencies || 'Deficiency follow-up',
      coordinatorName: coordName,
      meetingWhen: sched?.meeting_date ?? (sched?.created_at ? new Date(sched.created_at).toLocaleString() : null),
      plan: sched?.action_notes ?? f.additional_notes,
    }
  })

  const excellenceAll = await fetchExcellenceRecognitions(session.user.id)
  const excellenceSource = latest
    ? excellenceAll.filter((e) => e.session_id === latest.id)
    : excellenceAll
  const excellence = excellenceSource.slice(0, 5).map((e) => ({
    competency_label: e.competency_label,
    explanation: e.explanation,
    created_at: e.created_at,
  }))

  const data: DitDashboardPayload = {
    weekLabel,
    anchor_week_start: anchorStart,
    anchor_week_end: anchorEnd,
    pairingId: pairing.id,
    ftoName,
    ditName,
    session: latest
      ? {
          id: latest.id,
          status: latest.status,
          week_start_date: latest.week_start_date,
          week_end_date: latest.week_end_date,
        }
      : null,
    ratedCount,
    totalCompetencies: masters.length,
    notObservedCount,
    masters,
    scoresByKey,
    unobserved,
    weekActivities,
    trend,
    trendKeys,
    coaching,
    excellence,
    dit_record_id: ditRecord?.id ?? null,
    default_fto_id: pairing.fto_id,
    fto_options: [{ id: pairing.fto_id, name: ftoName }],
  }

  return (
    <div className="p-6">
      <DitDashboardView data={data} />
    </div>
  )
}
