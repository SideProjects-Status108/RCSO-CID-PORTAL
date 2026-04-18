'use server'

import { randomBytes } from 'node:crypto'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { UserRole, type UserRoleValue } from '@/lib/auth/roles'
import { canManageOnboarding, supervisionPlus, trainingFullRead } from '@/lib/training/access'
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
import { logTrainingEmailPreview } from '@/lib/email/training-notifications'
import type { EvaluationScoreKey, EvaluationType, OverallRating } from '@/types/training'
import { EVALUATION_SCORE_KEYS } from '@/types/training'

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

// ---------------------------------------------------------------------------
// Segment A — Onboarding: createDitOnboardingAction
// ---------------------------------------------------------------------------

export type CreateDitOnboardingInput = {
  firstName: string
  lastName: string
  email: string
  cellNumber: string
  badgeNumber: string
}

export type CreateDitOnboardingResult =
  | {
      ok: true
      dit_record_id: string
      dit_user_id: string
      display_name: string
      survey_link: string
      survey_expires_at: string
    }
  | { ok: false; code: CreateDitOnboardingErrorCode; message: string }

export type CreateDitOnboardingErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'PROFILE_NOT_FOUND'
  | 'ALREADY_ACTIVE_DIT'
  | 'DUPLICATE_BADGE'
  | 'DUPLICATE_EMAIL'
  | 'INTERNAL'

function generateSurveyToken(): string {
  return randomBytes(24).toString('base64url')
}

function sevenDaysFromNow(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
}

async function buildSurveyLink(token: string): Promise<string> {
  const { getPublicOrigin } = await import('@/lib/url/public-origin')
  const origin = await getPublicOrigin()
  return `${origin}/survey/${token}`
}

export async function createDitOnboardingAction(
  input: CreateDitOnboardingInput
): Promise<CreateDitOnboardingResult> {
  const session = await getSessionUserWithProfile()
  if (!session) {
    return { ok: false, code: 'UNAUTHORIZED', message: 'Sign in required.' }
  }
  if (!canManageOnboarding(session.profile)) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: 'Only the FTO Coordinator or Training Supervisor can onboard DITs.',
    }
  }

  const email = input.email.trim().toLowerCase()
  const badge = input.badgeNumber.trim()
  const cell = input.cellNumber.trim()
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim()

  const supabase = await createClient()

  // Look up the auth user by email using the service-role client (auth.users is
  // not exposed to the SSR session client). profiles has no email column.
  const { createServiceRoleClient } = await import('@/lib/supabase/admin')
  const admin = createServiceRoleClient()
  if (!admin) {
    return {
      ok: false,
      code: 'INTERNAL',
      message: 'Service role credentials are not configured on the server.',
    }
  }
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listErr) {
    return { ok: false, code: 'INTERNAL', message: listErr.message }
  }
  const match = list?.users.find((u) => (u.email ?? '').toLowerCase() === email)
  if (!match) {
    return {
      ok: false,
      code: 'PROFILE_NOT_FOUND',
      message: 'No portal account found for that email. Create the account in Personnel first.',
    }
  }
  return onboardAgainstUser(match.id, match.email ?? email)

  async function onboardAgainstUser(
    ditUserId: string,
    resolvedEmail: string
  ): Promise<CreateDitOnboardingResult> {
    // 2. Badge uniqueness check (profiles).
    const { data: badgeClash } = await supabase
      .from('profiles')
      .select('id')
      .eq('badge_number', badge)
      .neq('id', ditUserId)
      .maybeSingle()
    if (badgeClash) {
      return {
        ok: false,
        code: 'DUPLICATE_BADGE',
        message: 'That badge number is already assigned to another user.',
      }
    }

    // 3. Update profile (set role=dit unless already higher; fill missing fields).
    const { data: existingProfile, error: pErr } = await supabase
      .from('profiles')
      .select('id, role, full_name, badge_number, phone_cell')
      .eq('id', ditUserId)
      .maybeSingle()
    if (pErr) {
      return { ok: false, code: 'INTERNAL', message: pErr.message }
    }

    const patch: Record<string, unknown> = {}
    if (!existingProfile?.full_name && fullName) patch.full_name = fullName
    if (!existingProfile?.badge_number) patch.badge_number = badge
    if (!existingProfile?.phone_cell) patch.phone_cell = cell
    if (!existingProfile || existingProfile.role === 'detective' || !existingProfile.role) {
      patch.role = UserRole.dit
    }

    if (!existingProfile) {
      const { error: insErr } = await supabase.from('profiles').insert({
        id: ditUserId,
        role: UserRole.dit,
        full_name: fullName,
        badge_number: badge,
        phone_cell: cell,
      })
      if (insErr) {
        return { ok: false, code: 'INTERNAL', message: insErr.message }
      }
    } else if (Object.keys(patch).length > 0) {
      const { error: updErr } = await supabase.from('profiles').update(patch).eq('id', ditUserId)
      if (updErr) {
        return { ok: false, code: 'INTERNAL', message: updErr.message }
      }
    }

    // 4. Ensure dit_records row (no active closed record).
    const { data: existingDit } = await supabase
      .from('dit_records')
      .select('id, status')
      .eq('user_id', ditUserId)
      .maybeSingle()

    if (existingDit && ['active', 'on_hold'].includes(String(existingDit.status))) {
      return {
        ok: false,
        code: 'ALREADY_ACTIVE_DIT',
        message: 'That person is already an active DIT.',
      }
    }

    let ditRecordId: string
    if (!existingDit) {
      const { data: inserted, error: drErr } = await supabase
        .from('dit_records')
        .insert({
          user_id: ditUserId,
          current_phase: 1,
          start_date: new Date().toISOString().slice(0, 10),
          status: 'active',
          created_by: session!.user.id,
        })
        .select('id')
        .single()
      if (drErr || !inserted) {
        return { ok: false, code: 'INTERNAL', message: drErr?.message ?? 'Failed to create DIT record' }
      }
      ditRecordId = String((inserted as { id: string }).id)
    } else {
      ditRecordId = String(existingDit.id)
      await supabase
        .from('dit_records')
        .update({ status: 'active', start_date: new Date().toISOString().slice(0, 10) })
        .eq('id', ditRecordId)
    }

    // 5. Issue (or refresh) a survey row.
    const token = generateSurveyToken()
    const expiresAt = sevenDaysFromNow()
    const { error: sErr } = await supabase.from('dit_surveys').insert({
      dit_record_id: ditRecordId,
      token,
      status: 'pending',
      expires_at: expiresAt,
      created_by: session!.user.id,
    })
    if (sErr) {
      return { ok: false, code: 'INTERNAL', message: sErr.message }
    }

    const link = await buildSurveyLink(token)

    logTrainingEmailPreview(
      'onboarding_survey',
      'Welcome to the CID Detective in Training program',
      `<p>Hello ${fullName},</p><p>Please complete your pre-start survey within 7 days: <a href="${link}">${link}</a></p>`,
      resolvedEmail
    )

    revalidatePath('/training')
    revalidatePath('/dashboard')

    return {
      ok: true,
      dit_record_id: ditRecordId,
      dit_user_id: ditUserId,
      display_name: fullName,
      survey_link: link,
      survey_expires_at: expiresAt,
    }
  }
}
