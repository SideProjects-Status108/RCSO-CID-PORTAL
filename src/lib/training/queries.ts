import 'server-only'

import { unstable_cache } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import type {
  ActivityExposure,
  ActivityTemplate,
  CompetencyMaster,
  DeficiencyCompetency,
  DeficiencyForm,
  DeficiencyFormAction,
  DitMilestoneRow,
  DitRecordRow,
  EvaluationRow,
  ExcellenceRecognition,
  FtoPairingRow,
  PairingPhaseEventRow,
  UnobservedCompetency,
  WeeklyCompetencyScore,
  WeeklyTrainingSession,
} from '@/types/training'

function mapPairing(r: Record<string, unknown>): FtoPairingRow {
  return {
    id: String(r.id),
    fto_id: String(r.fto_id),
    dit_id: String(r.dit_id),
    phase: Number(r.phase ?? 1),
    start_date: String(r.start_date ?? ''),
    end_date: r.end_date != null ? String(r.end_date) : null,
    is_active: Boolean(r.is_active),
    notes: r.notes != null ? String(r.notes) : null,
    created_by: String(r.created_by),
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

function mapDitRecord(r: Record<string, unknown>): DitRecordRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    current_phase: Number(r.current_phase ?? 1),
    start_date: String(r.start_date ?? ''),
    graduation_date: r.graduation_date != null ? String(r.graduation_date) : null,
    status: r.status as DitRecordRow['status'],
    created_by: String(r.created_by),
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

function mapMilestone(r: Record<string, unknown>): DitMilestoneRow {
  return {
    id: String(r.id),
    dit_record_id: String(r.dit_record_id),
    milestone_name: String(r.milestone_name ?? ''),
    description: r.description != null ? String(r.description) : null,
    phase: Number(r.phase ?? 1),
    is_completed: Boolean(r.is_completed),
    completed_at: r.completed_at != null ? String(r.completed_at) : null,
    completed_by: r.completed_by != null ? String(r.completed_by) : null,
    sort_order: Number(r.sort_order ?? 0),
  }
}

function mapEvaluation(
  r: Record<string, unknown>,
  privateNotes: string | null
): EvaluationRow {
  const scores = (r.scores as Record<string, unknown> | null) ?? {}
  const numeric: Record<string, number> = {}
  for (const [k, v] of Object.entries(scores)) {
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isNaN(n)) numeric[k] = n
  }
  return {
    id: String(r.id),
    pairing_id: String(r.pairing_id),
    submitted_by: String(r.submitted_by),
    evaluation_date: String(r.evaluation_date ?? ''),
    evaluation_type: r.evaluation_type as EvaluationRow['evaluation_type'],
    scores: numeric,
    overall_rating: r.overall_rating as EvaluationRow['overall_rating'],
    notes: r.notes != null ? String(r.notes) : null,
    status: r.status as EvaluationRow['status'],
    approved_by: r.approved_by != null ? String(r.approved_by) : null,
    approved_at: r.approved_at != null ? String(r.approved_at) : null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
    private_notes: privateNotes,
  }
}

export type PairingsListScope = 'all' | 'fto' | 'dit'

export async function fetchFtoPairingsList(
  userId: string,
  scope: PairingsListScope
): Promise<FtoPairingRow[]> {
  const supabase = await createClient()
  let q = supabase.from('fto_pairings').select('*').order('start_date', { ascending: false })
  if (scope === 'fto') q = q.eq('fto_id', userId)
  else if (scope === 'dit') q = q.eq('dit_id', userId)
  const { data, error } = await q
  if (error || !data) return []
  return data.map((r) => mapPairing(r as Record<string, unknown>))
}

export async function fetchPairingById(id: string): Promise<FtoPairingRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('fto_pairings').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return mapPairing(data as Record<string, unknown>)
}

export async function fetchPairingPhaseEvents(pairingId: string): Promise<PairingPhaseEventRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fto_pairing_phase_events')
    .select('*')
    .eq('pairing_id', pairingId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map(
    (r) =>
      ({
        id: String(r.id),
        pairing_id: String(r.pairing_id),
        from_phase: Number(r.from_phase),
        to_phase: Number(r.to_phase),
        changed_by: String(r.changed_by),
        created_at: String(r.created_at ?? ''),
      }) satisfies PairingPhaseEventRow
  )
}

export type DitRecordsListMode = 'all' | 'fto_scope' | 'dit_own'

export async function fetchDitRecordsList(
  userId: string,
  mode: DitRecordsListMode
): Promise<DitRecordRow[]> {
  const supabase = await createClient()
  if (mode === 'all') {
    const { data, error } = await supabase.from('dit_records').select('*').order('start_date', { ascending: false })
    if (error || !data) return []
    return data.map((r) => mapDitRecord(r as Record<string, unknown>))
  }
  if (mode === 'dit_own') {
    const { data, error } = await supabase.from('dit_records').select('*').eq('user_id', userId).maybeSingle()
    if (error || !data) return []
    return [mapDitRecord(data as Record<string, unknown>)]
  }
  const { data: pairRows } = await supabase
    .from('fto_pairings')
    .select('dit_id')
    .eq('fto_id', userId)
    .eq('is_active', true)
  const ditIds = [...new Set((pairRows ?? []).map((p) => String((p as { dit_id: string }).dit_id)))]
  if (ditIds.length === 0) return []
  const { data, error } = await supabase
    .from('dit_records')
    .select('*')
    .in('user_id', ditIds)
    .order('start_date', { ascending: false })
  if (error || !data) return []
  return data.map((r) => mapDitRecord(r as Record<string, unknown>))
}

export async function fetchDitRecordById(id: string): Promise<DitRecordRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('dit_records').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return mapDitRecord(data as Record<string, unknown>)
}

export async function fetchDitRecordByUserId(userId: string): Promise<DitRecordRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('dit_records').select('*').eq('user_id', userId).maybeSingle()
  if (error || !data) return null
  return mapDitRecord(data as Record<string, unknown>)
}

export async function fetchMilestonesForRecord(ditRecordId: string): Promise<DitMilestoneRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dit_milestones')
    .select('*')
    .eq('dit_record_id', ditRecordId)
    .order('sort_order')
  if (error || !data) return []
  return data.map((r) => mapMilestone(r as Record<string, unknown>))
}

export async function countMilestoneProgress(ditRecordId: string): Promise<{ total: number; completed: number }> {
  const milestones = await fetchMilestonesForRecord(ditRecordId)
  const total = milestones.length
  const completed = milestones.filter((m) => m.is_completed).length
  return { total, completed }
}

export async function fetchEvaluationById(id: string): Promise<EvaluationRow | null> {
  const supabase = await createClient()
  const { data: ev, error } = await supabase.from('evaluations').select('*').eq('id', id).maybeSingle()
  if (error || !ev) return null
  const hydrated = await hydrateEvaluationsPrivate(supabase, [ev as Record<string, unknown>])
  return hydrated[0] ?? null
}

export async function fetchEvaluationsForPairing(pairingId: string): Promise<EvaluationRow[]> {
  const supabase = await createClient()
  const { data: evals, error } = await supabase
    .from('evaluations')
    .select('*')
    .eq('pairing_id', pairingId)
    .order('evaluation_date', { ascending: false })
  if (error || !evals) return []
  const ids = evals.map((e) => String((e as { id: string }).id))
  const { data: priv } = await supabase
    .from('evaluation_private_notes')
    .select('evaluation_id, notes')
    .in('evaluation_id', ids)
  const privMap = new Map<string, string>()
  for (const row of priv ?? []) {
    privMap.set(String((row as { evaluation_id: string }).evaluation_id), String((row as { notes: string }).notes))
  }
  return evals.map((r) =>
    mapEvaluation(r as Record<string, unknown>, privMap.get(String((r as { id: string }).id)) ?? null)
  )
}

export async function fetchEvaluationsList(
  userId: string,
  trainingFullRead: boolean
): Promise<EvaluationRow[]> {
  const supabase = await createClient()
  if (trainingFullRead) {
    const { data: evals, error } = await supabase
      .from('evaluations')
      .select('*')
      .order('evaluation_date', { ascending: false })
      .limit(200)
    if (error || !evals) return []
    return hydrateEvaluationsPrivate(supabase, evals as Record<string, unknown>[])
  }
  const { data: asFto } = await supabase.from('fto_pairings').select('id').eq('fto_id', userId)
  const { data: asDit } = await supabase.from('fto_pairings').select('id').eq('dit_id', userId)
  const pairingIds = [
    ...new Set([
      ...(asFto ?? []).map((p) => String((p as { id: string }).id)),
      ...(asDit ?? []).map((p) => String((p as { id: string }).id)),
    ]),
  ]
  if (pairingIds.length === 0) return []
  const { data: evals, error } = await supabase
    .from('evaluations')
    .select('*')
    .in('pairing_id', pairingIds)
    .order('evaluation_date', { ascending: false })
  if (error || !evals) return []
  return hydrateEvaluationsPrivate(supabase, evals as Record<string, unknown>[])
}

async function hydrateEvaluationsPrivate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  evals: Record<string, unknown>[]
): Promise<EvaluationRow[]> {
  if (evals.length === 0) return []
  const ids = evals.map((e) => String(e.id))
  const { data: priv } = await supabase
    .from('evaluation_private_notes')
    .select('evaluation_id, notes')
    .in('evaluation_id', ids)
  const privMap = new Map<string, string>()
  for (const row of priv ?? []) {
    privMap.set(String((row as { evaluation_id: string }).evaluation_id), String((row as { notes: string }).notes))
  }
  return evals.map((r) => mapEvaluation(r, privMap.get(String(r.id)) ?? null))
}

export async function fetchEvaluationsForDitUser(ditUserId: string): Promise<EvaluationRow[]> {
  const supabase = await createClient()
  const { data: pairings } = await supabase.from('fto_pairings').select('id').eq('dit_id', ditUserId)
  const ids = (pairings ?? []).map((p) => String((p as { id: string }).id))
  if (ids.length === 0) return []
  const { data: evals, error } = await supabase
    .from('evaluations')
    .select('*')
    .in('pairing_id', ids)
    .order('evaluation_date', { ascending: false })
  if (error || !evals) return []
  return hydrateEvaluationsPrivate(supabase, evals as Record<string, unknown>[])
}

export async function fetchFormSubmissionsForDit(ditUserId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      `
      id,
      status,
      created_at,
      form_templates ( name )
    `
    )
    .eq('submitted_by', ditUserId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  return data.map((r) => {
    const ft = r.form_templates as { name?: string } | null
    return {
      id: String(r.id),
      status: String(r.status ?? ''),
      created_at: String(r.created_at ?? ''),
      template_name: ft?.name ?? 'Form',
    }
  })
}

export async function countActiveDitRecords(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('dit_records')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  if (error) return 0
  return count ?? 0
}

export async function fetchActivePairingForFto(ftoId: string): Promise<FtoPairingRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fto_pairings')
    .select('*')
    .eq('fto_id', ftoId)
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return mapPairing(data as Record<string, unknown>)
}

export async function fetchDitProgressForUser(userId: string): Promise<{ total: number; completed: number } | null> {
  const rec = await fetchDitRecordByUserId(userId)
  if (!rec) return null
  return countMilestoneProgress(rec.id)
}

// ---------------------------------------------------------------------------
// DIT weekly training — helpers & errors
// ---------------------------------------------------------------------------

function throwTraining(message: string, cause?: unknown): never {
  const suffix = cause instanceof Error ? `: ${cause.message}` : ''
  throw new Error(`[training] ${message}${suffix}`)
}

export function isDeficiencyCompetency(value: unknown): value is DeficiencyCompetency {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return (
    typeof o.competency_key === 'string' &&
    typeof o.competency_label === 'string' &&
    typeof o.score === 'number' &&
    Number.isFinite(o.score) &&
    typeof o.fto_recommendation === 'string'
  )
}

/** Parses JSONB `competencies_flagged` from deficiency_forms. */
export function parseDeficiencyCompetenciesFlagged(raw: unknown): DeficiencyCompetency[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isDeficiencyCompetency)
}

function addDaysIsoDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) throwTraining(`Invalid date: ${isoDate}`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function mapActivityTemplate(r: Record<string, unknown>): ActivityTemplate {
  return {
    id: String(r.id),
    activity_name: String(r.activity_name ?? ''),
    category: String(r.category ?? ''),
    required_exposures_phase_1: Number(r.required_exposures_phase_1 ?? 0),
    required_exposures_phase_2: Number(r.required_exposures_phase_2 ?? 0),
    required_exposures_phase_3: Number(r.required_exposures_phase_3 ?? 0),
    description: r.description != null ? String(r.description) : null,
  }
}

function mapActivityExposure(r: Record<string, unknown>): ActivityExposure {
  return {
    id: String(r.id),
    dit_record_id: String(r.dit_record_id),
    activity_template_id: String(r.activity_template_id),
    fto_id: String(r.fto_id),
    exposure_date: String(r.exposure_date ?? ''),
    case_complaint_number: r.case_complaint_number != null ? String(r.case_complaint_number) : null,
    role: r.role as ActivityExposure['role'],
    duration_minutes: r.duration_minutes != null ? Number(r.duration_minutes) : null,
    fto_notes: r.fto_notes != null ? String(r.fto_notes) : null,
    created_at: String(r.created_at ?? ''),
  }
}

function mapWeeklySession(r: Record<string, unknown>): WeeklyTrainingSession {
  return {
    id: String(r.id),
    pairing_id: String(r.pairing_id),
    week_start_date: String(r.week_start_date ?? ''),
    week_end_date: String(r.week_end_date ?? ''),
    status: r.status as WeeklyTrainingSession['status'],
    submitted_by: r.submitted_by != null ? String(r.submitted_by) : null,
    submitted_at: r.submitted_at != null ? String(r.submitted_at) : null,
    approved_by: r.approved_by != null ? String(r.approved_by) : null,
    approved_at: r.approved_at != null ? String(r.approved_at) : null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

function mapCompetencyMaster(r: Record<string, unknown>): CompetencyMaster {
  return {
    key: String(r.key),
    label: String(r.label ?? ''),
    category: String(r.category ?? ''),
    sort_order: Number(r.sort_order ?? 0),
    description: r.description != null ? String(r.description) : null,
  }
}

function mapWeeklyCompetencyScore(r: Record<string, unknown>): WeeklyCompetencyScore {
  const s = r.score
  const scoreVal = s == null ? null : Number(s)
  return {
    id: String(r.id),
    session_id: String(r.session_id),
    competency_key: String(r.competency_key ?? ''),
    competency_label: String(r.competency_label ?? ''),
    category: String(r.category ?? ''),
    score: scoreVal != null && !Number.isNaN(scoreVal) ? scoreVal : null,
    explanation: r.explanation != null ? String(r.explanation) : null,
    explanation_required: Boolean(r.explanation_required),
    prior_week_score:
      r.prior_week_score != null && r.prior_week_score !== ''
        ? Number(r.prior_week_score)
        : null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

function mapUnobserved(r: Record<string, unknown>): UnobservedCompetency {
  const days = r.days_since_last_observed
  return {
    id: String(r.id),
    session_id: String(r.session_id),
    competency_key: String(r.competency_key ?? ''),
    competency_label: String(r.competency_label ?? ''),
    days_since_last_observed: days != null && days !== '' ? Number(days) : 0,
    dit_notified_at: r.dit_notified_at != null ? String(r.dit_notified_at) : null,
    created_at: String(r.created_at ?? ''),
  }
}

function mapDeficiencyForm(r: Record<string, unknown>): DeficiencyForm {
  return {
    id: String(r.id),
    pairing_id: String(r.pairing_id),
    weekly_session_id: String(r.weekly_session_id),
    created_by: String(r.created_by),
    created_at: String(r.created_at ?? ''),
    status: r.status as DeficiencyForm['status'],
    priority_level: (r.priority_level as DeficiencyForm['priority_level']) ?? 'routine',
    competencies_flagged: parseDeficiencyCompetenciesFlagged(r.competencies_flagged),
    additional_notes: r.additional_notes != null ? String(r.additional_notes) : null,
    updated_at: String(r.updated_at ?? ''),
  }
}

function mapDeficiencyAction(r: Record<string, unknown>): DeficiencyFormAction {
  const attendees = r.meeting_attendees
  let meeting_attendees: string[] | null = null
  if (Array.isArray(attendees)) {
    meeting_attendees = attendees.map((x) => String(x))
  }
  return {
    id: String(r.id),
    deficiency_form_id: String(r.deficiency_form_id),
    action_level: r.action_level as DeficiencyFormAction['action_level'],
    actor_id: String(r.actor_id),
    action_type: r.action_type as DeficiencyFormAction['action_type'],
    action_notes: r.action_notes != null ? String(r.action_notes) : null,
    calendar_meeting_id: r.calendar_meeting_id != null ? String(r.calendar_meeting_id) : null,
    meeting_date: r.meeting_date != null ? String(r.meeting_date) : null,
    meeting_attendees,
    created_at: String(r.created_at ?? ''),
  }
}

function mapExcellence(r: Record<string, unknown>): ExcellenceRecognition {
  const rec = r.sent_to_recipients
  const sent = Array.isArray(rec) ? rec.map((x) => String(x)) : []
  return {
    id: String(r.id),
    session_id: String(r.session_id),
    competency_key: String(r.competency_key ?? ''),
    competency_label: String(r.competency_label ?? ''),
    dit_user_id: String(r.dit_user_id),
    fto_user_id: String(r.fto_user_id),
    explanation: r.explanation != null ? String(r.explanation) : '',
    sent_to_recipients: sent,
    created_at: String(r.created_at ?? ''),
  }
}

/** Reference list; cached (1h) — same catalog for every role; RLS allows SELECT for authenticated. */
export async function fetchCompetencyMasters(): Promise<CompetencyMaster[]> {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('competency_masters')
        .select('key, label, category, sort_order, description')
        .order('sort_order', { ascending: true })
      if (error) throwTraining('Failed to load competency masters', error)
      return (data ?? []).map((row) => mapCompetencyMaster(row as Record<string, unknown>))
    },
    ['training-competency-masters'],
    { revalidate: 3600, tags: ['competency_masters'] }
  )()
}

export async function fetchActivityTemplates(): Promise<ActivityTemplate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_activity_templates')
    .select(
      'id, activity_name, category, required_exposures_phase_1, required_exposures_phase_2, required_exposures_phase_3, description'
    )
    .order('category')
    .order('activity_name')
  if (error) throwTraining('Failed to load activity templates', error)
  return (data ?? []).map((row) => mapActivityTemplate(row as Record<string, unknown>))
}

export async function logActivityExposure(exposure: Partial<ActivityExposure>): Promise<ActivityExposure> {
  const dit_record_id = exposure.dit_record_id
  const activity_template_id = exposure.activity_template_id
  const fto_id = exposure.fto_id
  const exposure_date = exposure.exposure_date
  const role = exposure.role
  if (!dit_record_id || !activity_template_id || !fto_id || !exposure_date || !role) {
    throwTraining(
      'logActivityExposure requires dit_record_id, activity_template_id, fto_id, exposure_date, and role'
    )
  }
  const supabase = await createClient()
  const payload = {
    dit_record_id,
    activity_template_id,
    fto_id,
    exposure_date,
    case_complaint_number: exposure.case_complaint_number ?? null,
    role,
    duration_minutes: exposure.duration_minutes ?? null,
    fto_notes: exposure.fto_notes ?? null,
  }
  const { data, error } = await supabase
    .from('training_activity_exposures')
    .insert(payload)
    .select('*')
    .single()
  if (error || !data) throwTraining('Failed to log activity exposure', error)
  return mapActivityExposure(data as Record<string, unknown>)
}

export async function fetchActivityExposuresForDit(
  dit_record_id: string,
  week_start?: string
): Promise<ActivityExposure[]> {
  const supabase = await createClient()
  let q = supabase
    .from('training_activity_exposures')
    .select('*')
    .eq('dit_record_id', dit_record_id)
    .order('exposure_date', { ascending: false })
  if (week_start?.trim()) {
    const weekEnd = addDaysIsoDate(week_start.trim(), 6)
    q = q.gte('exposure_date', week_start.trim()).lte('exposure_date', weekEnd)
  }
  const { data, error } = await q
  if (error) throwTraining('Failed to load activity exposures', error)
  return (data ?? []).map((row) => mapActivityExposure(row as Record<string, unknown>))
}

export async function getActivityProgressForTemplate(
  dit_record_id: string,
  template_id: string
): Promise<{ required: number; completed: number; pending: ActivityExposure[] }> {
  const supabase = await createClient()
  const [{ data: dr, error: e1 }, { data: tpl, error: e2 }] = await Promise.all([
    supabase.from('dit_records').select('id, current_phase').eq('id', dit_record_id).maybeSingle(),
    supabase.from('training_activity_templates').select('*').eq('id', template_id).maybeSingle(),
  ])
  if (e1) throwTraining('Failed to load DIT record for progress', e1)
  if (e2) throwTraining('Failed to load activity template for progress', e2)
  if (!dr || !tpl) throwTraining('DIT record or activity template not found')

  const phase = Number((dr as { current_phase: number }).current_phase ?? 1)
  const t = tpl as Record<string, unknown>
  const required =
    phase <= 1
      ? Number(t.required_exposures_phase_1 ?? 0)
      : phase === 2
        ? Number(t.required_exposures_phase_2 ?? 0)
        : Number(t.required_exposures_phase_3 ?? 0)

  const { data: exposures, error: e3 } = await supabase
    .from('training_activity_exposures')
    .select('*')
    .eq('dit_record_id', dit_record_id)
    .eq('activity_template_id', template_id)
    .order('exposure_date', { ascending: false })
  if (e3) throwTraining('Failed to load exposures for progress', e3)
  const rows = (exposures ?? []).map((r) => mapActivityExposure(r as Record<string, unknown>))
  const completed = rows.length
  const pending = rows.filter((r) => r.duration_minutes == null)
  return { required, completed, pending }
}

export async function createWeeklySession(
  pairing_id: string,
  week_start: string
): Promise<WeeklyTrainingSession> {
  const week_start_date = week_start.trim()
  const week_end_date = addDaysIsoDate(week_start_date, 6)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_training_sessions')
    .insert({
      pairing_id,
      week_start_date,
      week_end_date,
      status: 'draft',
    })
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') {
      throwTraining('A weekly session already exists for this pairing and week start date')
    }
    throwTraining('Failed to create weekly training session', error)
  }
  return mapWeeklySession(data as Record<string, unknown>)
}

export async function fetchWeeklySession(session_id: string): Promise<WeeklyTrainingSession> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_training_sessions')
    .select('*')
    .eq('id', session_id)
    .maybeSingle()
  if (error) throwTraining('Failed to load weekly training session', error)
  if (!data) throwTraining('Weekly training session not found')
  return mapWeeklySession(data as Record<string, unknown>)
}

export async function updateSessionStatus(
  session_id: string,
  status: WeeklyTrainingSession['status']
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throwTraining('Not authenticated')

  const patch: Record<string, unknown> = { status }
  if (status === 'submitted') {
    patch.submitted_by = user.id
    patch.submitted_at = new Date().toISOString()
  } else if (status === 'approved') {
    patch.approved_by = user.id
    patch.approved_at = new Date().toISOString()
  }

  const { error } = await supabase.from('weekly_training_sessions').update(patch).eq('id', session_id)
  if (error) throwTraining('Failed to update weekly session status', error)
}

export async function saveCompetencyScore(score: WeeklyCompetencyScore): Promise<void> {
  if (score.score == null || Number.isNaN(score.score)) {
    throwTraining('saveCompetencyScore requires a numeric score (1–5)')
  }
  if (score.score < 1 || score.score > 5) {
    throwTraining('Competency score must be between 1 and 5')
  }
  const supabase = await createClient()
  const row = {
    session_id: score.session_id,
    competency_key: score.competency_key,
    competency_label: score.competency_label,
    category: score.category,
    score: score.score,
    explanation: score.explanation,
    explanation_required: score.explanation_required,
    prior_week_score: score.prior_week_score,
  }
  const { error } = await supabase.from('weekly_competency_scores').upsert(row, {
    onConflict: 'session_id,competency_key',
  })
  if (error) throwTraining('Failed to save competency score', error)
}

export async function fetchSessionCompetencyScores(session_id: string): Promise<WeeklyCompetencyScore[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_competency_scores')
    .select('*')
    .eq('session_id', session_id)
    .order('competency_key')
  if (error) throwTraining('Failed to load session competency scores', error)
  return (data ?? []).map((row) => mapWeeklyCompetencyScore(row as Record<string, unknown>))
}

export async function getPriorWeekScore(
  dit_record_id: string,
  competency_key: string
): Promise<number | null> {
  const supabase = await createClient()
  const { data: rec, error: e0 } = await supabase
    .from('dit_records')
    .select('user_id')
    .eq('id', dit_record_id)
    .maybeSingle()
  if (e0) throwTraining('Failed to load DIT record for prior score', e0)
  if (!rec) return null
  const ditUserId = String((rec as { user_id: string }).user_id)

  const { data: pairings, error: e1 } = await supabase
    .from('fto_pairings')
    .select('id')
    .eq('dit_id', ditUserId)
    .eq('is_active', true)
  if (e1) throwTraining('Failed to load pairings for prior score', e1)
  const pairingIds = (pairings ?? []).map((p) => String((p as { id: string }).id))
  if (pairingIds.length === 0) return null

  const { data: sessions, error: e2 } = await supabase
    .from('weekly_training_sessions')
    .select('id, week_start_date')
    .in('pairing_id', pairingIds)
    .order('week_start_date', { ascending: false })
  if (e2) throwTraining('Failed to load weekly sessions for prior score', e2)
  const ordered = sessions ?? []
  if (ordered.length < 2) return null

  for (let i = 1; i < ordered.length; i++) {
    const sid = String((ordered[i] as { id: string }).id)
    const { data: row, error: e3 } = await supabase
      .from('weekly_competency_scores')
      .select('score')
      .eq('session_id', sid)
      .eq('competency_key', competency_key)
      .maybeSingle()
    if (e3) throwTraining('Failed to read prior competency score', e3)
    if (row && (row as { score: number }).score != null) {
      return Number((row as { score: number }).score)
    }
  }
  return null
}

export async function identifyUnobservedCompetencies(session_id: string): Promise<UnobservedCompetency[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('unobserved_competencies')
    .select('*')
    .eq('session_id', session_id)
    .order('competency_key')
  if (error) throwTraining('Failed to load unobserved competencies', error)
  return (data ?? []).map((row) => mapUnobserved(row as Record<string, unknown>))
}

export async function markUnobservedNotified(unobserved_id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('unobserved_competencies')
    .update({ dit_notified_at: new Date().toISOString() })
    .eq('id', unobserved_id)
  if (error) throwTraining('Failed to mark unobserved competency notified', error)
}

export async function createDeficiencyForm(form: Partial<DeficiencyForm>): Promise<DeficiencyForm> {
  const pairing_id = form.pairing_id
  const weekly_session_id = form.weekly_session_id
  if (!pairing_id || !weekly_session_id) {
    throwTraining('createDeficiencyForm requires pairing_id and weekly_session_id')
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throwTraining('Not authenticated')

  const competencies_flagged = parseDeficiencyCompetenciesFlagged(form.competencies_flagged as unknown)

  const { data, error } = await supabase
    .from('deficiency_forms')
    .insert({
      pairing_id,
      weekly_session_id,
      created_by: user.id,
      status: form.status ?? 'submitted',
      priority_level: form.priority_level ?? 'routine',
      competencies_flagged,
      additional_notes: form.additional_notes ?? null,
    })
    .select('*')
    .single()
  if (error || !data) throwTraining('Failed to create deficiency form', error)
  return mapDeficiencyForm(data as Record<string, unknown>)
}

export async function fetchDeficiencyForm(form_id: string): Promise<DeficiencyForm> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('deficiency_forms').select('*').eq('id', form_id).maybeSingle()
  if (error) throwTraining('Failed to load deficiency form', error)
  if (!data) throwTraining('Deficiency form not found')
  return mapDeficiencyForm(data as Record<string, unknown>)
}

export async function fetchDeficiencyFormsForCoordinator(status?: string): Promise<DeficiencyForm[]> {
  const supabase = await createClient()
  let q = supabase.from('deficiency_forms').select('*').order('created_at', { ascending: false }).limit(200)
  if (status?.trim()) q = q.eq('status', status.trim())
  const { data, error } = await q
  if (error) throwTraining('Failed to load deficiency forms', error)
  return (data ?? []).map((row) => mapDeficiencyForm(row as Record<string, unknown>))
}

export async function updateDeficiencyFormStatus(
  form_id: string,
  status: DeficiencyForm['status']
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('deficiency_forms').update({ status }).eq('id', form_id)
  if (error) throwTraining('Failed to update deficiency form status', error)
}

export async function addDeficiencyAction(action: Partial<DeficiencyFormAction>): Promise<void> {
  const deficiency_form_id = action.deficiency_form_id
  const action_level = action.action_level
  const action_type = action.action_type
  if (!deficiency_form_id || !action_level || !action_type) {
    throwTraining('addDeficiencyAction requires deficiency_form_id, action_level, and action_type')
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throwTraining('Not authenticated')

  const { error } = await supabase.from('deficiency_form_actions').insert({
    deficiency_form_id,
    action_level,
    actor_id: action.actor_id ?? user.id,
    action_type,
    action_notes: action.action_notes ?? null,
    calendar_meeting_id: action.calendar_meeting_id ?? null,
    meeting_date: action.meeting_date ?? null,
    meeting_attendees: action.meeting_attendees ?? null,
  })
  if (error) throwTraining('Failed to add deficiency form action', error)
}

export async function fetchDeficiencyActions(form_id: string): Promise<DeficiencyFormAction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deficiency_form_actions')
    .select('*')
    .eq('deficiency_form_id', form_id)
    .order('created_at', { ascending: true })
  if (error) throwTraining('Failed to load deficiency form actions', error)
  return (data ?? []).map((row) => mapDeficiencyAction(row as Record<string, unknown>))
}

export async function createExcellenceRecognition(recognition: Partial<ExcellenceRecognition>): Promise<void> {
  const session_id = recognition.session_id
  const competency_key = recognition.competency_key
  const competency_label = recognition.competency_label
  const dit_user_id = recognition.dit_user_id
  const fto_user_id = recognition.fto_user_id
  if (!session_id || !competency_key || !competency_label || !dit_user_id || !fto_user_id) {
    throwTraining(
      'createExcellenceRecognition requires session_id, competency_key, competency_label, dit_user_id, and fto_user_id'
    )
  }
  const supabase = await createClient()
  const { error } = await supabase.from('excellence_recognitions').insert({
    session_id,
    competency_key,
    competency_label,
    dit_user_id,
    fto_user_id,
    explanation: recognition.explanation ?? null,
    sent_to_recipients: recognition.sent_to_recipients ?? [],
  })
  if (error) throwTraining('Failed to create excellence recognition', error)
}

export async function fetchExcellenceRecognitions(dit_user_id: string): Promise<ExcellenceRecognition[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('excellence_recognitions')
    .select('*')
    .eq('dit_user_id', dit_user_id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throwTraining('Failed to load excellence recognitions', error)
  return (data ?? []).map((row) => mapExcellence(row as Record<string, unknown>))
}
