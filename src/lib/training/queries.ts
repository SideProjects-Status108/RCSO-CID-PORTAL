import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type {
  DitMilestoneRow,
  DitRecordRow,
  EvaluationRow,
  FtoPairingRow,
  PairingPhaseEventRow,
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
