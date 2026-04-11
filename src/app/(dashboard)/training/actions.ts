'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole, type UserRoleValue } from '@/lib/auth/roles'
import { fetchProfileName, insertNotifications } from '@/lib/notifications/insert-notifications'
import {
  fetchDitRecordById,
  fetchEvaluationById,
  fetchEvaluationsForDitUser,
  fetchEvaluationsForPairing,
  fetchFormSubmissionsForDit,
  fetchMilestonesForRecord,
  fetchPairingPhaseEvents,
} from '@/lib/training/queries'
import type { EvaluationScoreKey, EvaluationType, OverallRating } from '@/types/training'
import { EVALUATION_SCORE_KEYS } from '@/types/training'

function trainingFullRead(role: UserRoleValue) {
  return hasRole(role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
    UserRole.fto_coordinator,
  ])
}

function supervisionPlus(role: UserRoleValue) {
  return hasRole(role, [UserRole.admin, UserRole.supervision_admin, UserRole.supervision])
}

function canReadPrivateNotes(role: UserRoleValue) {
  return trainingFullRead(role)
}

function isFto(role: UserRoleValue) {
  return role === UserRole.fto
}

async function fetchFtoCoordinatorIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'fto_coordinator')
    .eq('is_active', true)
  if (error || !data) return []
  return data.map((r) => String((r as { id: string }).id))
}

export async function loadEvaluationAction(id: string) {
  const session = await getSessionUserWithProfile()
  if (!session) return null
  return fetchEvaluationById(id)
}

export async function loadPairingDrawerDataAction(pairingId: string) {
  const session = await getSessionUserWithProfile()
  if (!session) return null
  const [evaluations, phaseEvents] = await Promise.all([
    fetchEvaluationsForPairing(pairingId),
    fetchPairingPhaseEvents(pairingId),
  ])
  return { evaluations, phaseEvents }
}

export async function loadDitDrawerDataAction(ditRecordId: string) {
  const session = await getSessionUserWithProfile()
  if (!session) return null
  const rec = await fetchDitRecordById(ditRecordId)
  if (!rec) return null
  const [milestones, evaluations, forms] = await Promise.all([
    fetchMilestonesForRecord(ditRecordId),
    fetchEvaluationsForDitUser(rec.user_id),
    fetchFormSubmissionsForDit(rec.user_id),
  ])
  return { record: rec, milestones, evaluations, forms }
}

export async function enrollDitAction(input: {
  ditUserId: string
  ftoUserId: string
  startDate: string
  initialPhase: number
  notes: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (session.profile.role !== UserRole.fto_coordinator) throw new Error('Forbidden')

  const supabase = await createClient()
  const { data: existing, error: exErr } = await supabase
    .from('dit_records')
    .select('id, status')
    .eq('user_id', input.ditUserId)
    .maybeSingle()
  if (exErr) throw new Error(exErr.message)

  if (existing && ['graduated', 'separated'].includes(String((existing as { status: string }).status))) {
    throw new Error('DIT record is closed. Contact an administrator to reactivate.')
  }

  await supabase
    .from('fto_pairings')
    .update({ is_active: false, end_date: input.startDate })
    .eq('dit_id', input.ditUserId)
    .eq('is_active', true)

  let ditRecordId: string
  if (!existing) {
    const { data: dr, error: dErr } = await supabase
      .from('dit_records')
      .insert({
        user_id: input.ditUserId,
        current_phase: input.initialPhase,
        start_date: input.startDate,
        status: 'active',
        created_by: session.user.id,
      })
      .select('id')
      .single()
    if (dErr || !dr) throw new Error(dErr?.message ?? 'Failed to create DIT record')
    ditRecordId = String((dr as { id: string }).id)
  } else {
    ditRecordId = String((existing as { id: string }).id)
    const { error: up } = await supabase
      .from('dit_records')
      .update({
        current_phase: input.initialPhase,
        start_date: input.startDate,
        status: 'active',
      })
      .eq('id', ditRecordId)
    if (up) throw new Error(up.message)
  }

  const { error: pErr } = await supabase.from('fto_pairings').insert({
    fto_id: input.ftoUserId,
    dit_id: input.ditUserId,
    phase: input.initialPhase,
    start_date: input.startDate,
    is_active: true,
    notes: input.notes?.trim() || null,
    created_by: session.user.id,
  })
  if (pErr) throw new Error(pErr.message)

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function createPairingOnlyAction(input: {
  ditUserId: string
  ftoUserId: string
  startDate: string
  phase: number
  notes: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (!supervisionPlus(session.profile.role) && session.profile.role !== UserRole.fto_coordinator) {
    throw new Error('Forbidden')
  }

  const supabase = await createClient()
  const { data: dr, error: dErr } = await supabase
    .from('dit_records')
    .select('id')
    .eq('user_id', input.ditUserId)
    .maybeSingle()
  if (dErr) throw new Error(dErr.message)
  if (!dr) throw new Error('DIT must be enrolled first (no DIT record).')

  await supabase
    .from('fto_pairings')
    .update({ is_active: false, end_date: input.startDate })
    .eq('dit_id', input.ditUserId)
    .eq('is_active', true)

  const { error: pErr } = await supabase.from('fto_pairings').insert({
    fto_id: input.ftoUserId,
    dit_id: input.ditUserId,
    phase: input.phase,
    start_date: input.startDate,
    is_active: true,
    notes: input.notes?.trim() || null,
    created_by: session.user.id,
  })
  if (pErr) throw new Error(pErr.message)

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function advancePairingPhaseAction(pairingId: string) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (session.profile.role !== UserRole.fto_coordinator) throw new Error('Forbidden')

  const supabase = await createClient()
  const { data: row, error: lErr } = await supabase
    .from('fto_pairings')
    .select('phase, dit_id')
    .eq('id', pairingId)
    .maybeSingle()
  if (lErr || !row) throw new Error('Pairing not found')
  const fromPhase = Number((row as { phase: number }).phase)
  const toPhase = fromPhase + 1

  const { error: u1 } = await supabase
    .from('fto_pairings')
    .update({ phase: toPhase })
    .eq('id', pairingId)
  if (u1) throw new Error(u1.message)

  const { error: evErr } = await supabase.from('fto_pairing_phase_events').insert({
    pairing_id: pairingId,
    from_phase: fromPhase,
    to_phase: toPhase,
    changed_by: session.user.id,
  })
  if (evErr) throw new Error(evErr.message)

  const ditId = String((row as { dit_id: string }).dit_id)
  const { data: rec } = await supabase.from('dit_records').select('id').eq('user_id', ditId).maybeSingle()
  if (rec) {
    await supabase
      .from('dit_records')
      .update({ current_phase: toPhase })
      .eq('id', String((rec as { id: string }).id))
  }

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function closePairingAction(pairingId: string, endDate: string) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (session.profile.role !== UserRole.fto_coordinator) throw new Error('Forbidden')

  const supabase = await createClient()
  const { error } = await supabase
    .from('fto_pairings')
    .update({ is_active: false, end_date: endDate })
    .eq('id', pairingId)
  if (error) throw new Error(error.message)

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function saveEvaluationAction(input: {
  id?: string | null
  pairingId: string
  evaluationType: EvaluationType
  evaluationDate: string
  scores: Partial<Record<EvaluationScoreKey, number>>
  overallRating: OverallRating
  notes: string | null
  privateNotes: string | null
  submit: boolean
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  const role = session.profile.role
  if (!isFto(role) && role !== UserRole.fto_coordinator) throw new Error('Forbidden')

  const supabase = await createClient()
  const { data: pairing, error: pe } = await supabase
    .from('fto_pairings')
    .select('fto_id')
    .eq('id', input.pairingId)
    .maybeSingle()
  if (pe || !pairing) throw new Error('Pairing not found')
  if (isFto(role) && String((pairing as { fto_id: string }).fto_id) !== session.user.id) {
    throw new Error('Forbidden')
  }

  const scores: Record<string, number> = {}
  for (const k of EVALUATION_SCORE_KEYS) {
    const v = input.scores[k]
    if (typeof v === 'number' && v >= 1 && v <= 5) scores[k] = v
  }

  const status = input.submit ? 'submitted' : 'draft'

  let evalId = input.id ?? null
  let previousStatus: string | null = null
  if (evalId) {
    const { data: prevRow } = await supabase.from('evaluations').select('status').eq('id', evalId).maybeSingle()
    previousStatus = prevRow ? String((prevRow as { status: string }).status) : null
  }

  if (!evalId) {
    const { data: ins, error: iErr } = await supabase
      .from('evaluations')
      .insert({
        pairing_id: input.pairingId,
        submitted_by: session.user.id,
        evaluation_date: input.evaluationDate,
        evaluation_type: input.evaluationType,
        scores,
        overall_rating: input.overallRating,
        notes: input.notes?.trim() || null,
        status,
      })
      .select('id')
      .single()
    if (iErr || !ins) throw new Error(iErr?.message ?? 'Insert failed')
    evalId = String((ins as { id: string }).id)
  } else {
    let q = supabase
      .from('evaluations')
      .update({
        evaluation_date: input.evaluationDate,
        evaluation_type: input.evaluationType,
        scores,
        overall_rating: input.overallRating,
        notes: input.notes?.trim() || null,
        status,
      })
      .eq('id', evalId)
    if (!trainingFullRead(role)) {
      q = q.eq('submitted_by', session.user.id)
    }
    const { error: uErr } = await q
    if (uErr) throw new Error(uErr.message)
  }

  if (canReadPrivateNotes(role) && input.privateNotes != null) {
    const trimmed = input.privateNotes.trim()
    if (trimmed) {
      const { error: pnErr } = await supabase.from('evaluation_private_notes').upsert(
        { evaluation_id: evalId, notes: trimmed, updated_at: new Date().toISOString() },
        { onConflict: 'evaluation_id' }
      )
      if (pnErr) throw new Error(pnErr.message)
    } else {
      await supabase.from('evaluation_private_notes').delete().eq('evaluation_id', evalId)
    }
  }

  const shouldNotifySubmit =
    input.submit && (previousStatus === null || previousStatus === 'draft')

  if (shouldNotifySubmit) {
    const coordinators = await fetchFtoCoordinatorIds()
    const { data: pr } = await supabase
      .from('fto_pairings')
      .select('dit_id')
      .eq('id', input.pairingId)
      .maybeSingle()
    const ditName =
      (pr?.dit_id ? await fetchProfileName(String((pr as { dit_id: string }).dit_id)) : null) ?? 'DIT'
    const rows = coordinators.map((user_id) => ({
      user_id,
      type: 'evaluation_submitted' as const,
      reference_id: evalId,
      reference_type: 'evaluation' as const,
      message: `Evaluation submitted for ${ditName} (${input.evaluationType.replaceAll('_', ' ')})`,
    }))
    await insertNotifications(rows)
  }

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function approveEvaluationAction(evaluationId: string) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (!trainingFullRead(session.profile.role)) throw new Error('Forbidden')

  const supabase = await createClient()
  const { error } = await supabase
    .from('evaluations')
    .update({
      status: 'approved',
      approved_by: session.user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', evaluationId)
  if (error) throw new Error(error.message)

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function toggleMilestoneAction(milestoneId: string, completed: boolean) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (!isFto(session.profile.role) && session.profile.role !== UserRole.fto_coordinator) {
    throw new Error('Forbidden')
  }

  const supabase = await createClient()
  const patch = completed
    ? {
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: session.user.id,
      }
    : {
        is_completed: false,
        completed_at: null,
        completed_by: null,
      }
  const { error } = await supabase.from('dit_milestones').update(patch).eq('id', milestoneId)
  if (error) throw new Error(error.message)

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function updateDitRecordPhaseAction(ditRecordId: string, currentPhase: number) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (session.profile.role !== UserRole.fto_coordinator) throw new Error('Forbidden')

  const supabase = await createClient()
  const { error } = await supabase.from('dit_records').update({ current_phase: currentPhase }).eq('id', ditRecordId)
  if (error) throw new Error(error.message)

  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export async function updateDitRecordStatusAction(
  ditRecordId: string,
  status: 'active' | 'on_hold' | 'graduated' | 'separated'
) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (session.profile.role !== UserRole.fto_coordinator) throw new Error('Forbidden')

  const supabase = await createClient()
  const patch: Record<string, unknown> = { status }
  if (status === 'graduated') {
    patch.graduation_date = new Date().toISOString().slice(0, 10)
  }
  const { error } = await supabase.from('dit_records').update(patch).eq('id', ditRecordId)
  if (error) throw new Error(error.message)

  revalidatePath('/training')
  revalidatePath('/dashboard')
}
