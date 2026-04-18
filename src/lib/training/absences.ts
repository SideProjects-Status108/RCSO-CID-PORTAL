import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type {
  AbsenceKind,
  AbsenceStatus,
  DitAbsenceRecord,
  DocumentSignatureRow,
} from '@/types/training'

import {
  createSignatureRoute,
  fetchSignatureRoute,
  routingRules,
} from './signatures'
import type { Profile } from '@/types/profile'
import { UserRole } from '@/lib/auth/roles'

function mapAbsence(r: Record<string, unknown>): DitAbsenceRecord {
  return {
    id: String(r.id),
    dit_record_id: String(r.dit_record_id),
    start_date: String(r.start_date ?? ''),
    end_date: r.end_date != null ? String(r.end_date) : null,
    kind: r.kind as AbsenceKind,
    description: r.description != null ? String(r.description) : null,
    status: r.status as AbsenceStatus,
    originated_by: String(r.originated_by),
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

export async function fetchAbsencesForDitRecord(
  ditRecordId: string
): Promise<DitAbsenceRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dit_absence_records')
    .select('*')
    .eq('dit_record_id', ditRecordId)
    .order('start_date', { ascending: false })
  if (error || !data) return []
  return (data as Array<Record<string, unknown>>).map(mapAbsence)
}

export async function fetchAbsenceById(id: string): Promise<DitAbsenceRecord | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('dit_absence_records')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  return mapAbsence(data as Record<string, unknown>)
}

/**
 * Returns the signature route row attached to an absence record, if any.
 * Matches on doc_type='absence_record' + doc_id = absence.id.
 */
export async function fetchAbsenceSignatureRoute(
  absenceId: string
): Promise<DocumentSignatureRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('document_signatures')
    .select('*')
    .eq('doc_type', 'absence_record')
    .eq('doc_id', absenceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const full = await fetchSignatureRoute(String((data as { id: string }).id))
  return full?.document ?? null
}

/**
 * Is this profile authorized to document an absence against the given DIT
 * record? Writers can always; the DIT's active FTO can for that specific DIT.
 */
export async function canDocumentAbsence(
  profile: Pick<Profile, 'id' | 'role' | 'is_training_supervisor'>,
  ditRecordId: string
): Promise<boolean> {
  if (
    profile.role === UserRole.admin ||
    profile.role === UserRole.supervision_admin ||
    profile.role === UserRole.fto_coordinator ||
    profile.is_training_supervisor === true
  ) {
    return true
  }
  if (profile.role !== UserRole.fto) return false
  const supabase = await createClient()
  const { data } = await supabase
    .from('fto_pairings')
    .select('id')
    .eq('fto_id', profile.id)
    .eq('is_active', true)
    .limit(20)
  const pairingIds = ((data ?? []) as Array<{ id: string }>).map((p) => p.id)
  if (pairingIds.length === 0) return false
  const { data: ditRow } = await supabase
    .from('dit_records')
    .select('id, user_id')
    .eq('id', ditRecordId)
    .maybeSingle()
  if (!ditRow) return false
  const ditUserId = (ditRow as { user_id: string }).user_id
  const { count } = await supabase
    .from('fto_pairings')
    .select('id', { count: 'exact', head: true })
    .eq('fto_id', profile.id)
    .eq('dit_id', ditUserId)
    .eq('is_active', true)
  return (count ?? 0) > 0
}

/**
 * Create a new absence record and its signature route. The FTO (originator)
 * signature is captured at absence-create time and passed through as a
 * pre-signed step so the queue advances directly to the Coordinator.
 *
 * `preSignedImage` is the data-URL captured from the signature-pad on the
 * documenting screen. It MAY be null when a writer documents an absence
 * retroactively and just wants to stage the route to the FTO first; in that
 * case the route's first step is simply 'fto'.
 */
export async function createAbsenceWithRoute(params: {
  ditRecordId: string
  startDate: string
  endDate: string | null
  kind: AbsenceKind
  description: string | null
  originator: Pick<
    Profile,
    'id' | 'role' | 'is_training_supervisor' | 'full_name' | 'badge_number'
  >
  preSignedImage: string | null
  preSignedDeviceId?: string | null
  preSignedIpAddress?: string | null
}): Promise<{
  absence: DitAbsenceRecord
  signature: DocumentSignatureRow
}> {
  const supabase = await createClient()

  const { data: insertedRow, error: insertErr } = await supabase
    .from('dit_absence_records')
    .insert({
      dit_record_id: params.ditRecordId,
      start_date: params.startDate,
      end_date: params.endDate,
      kind: params.kind,
      description: params.description,
      status: 'submitted',
      originated_by: params.originator.id,
    })
    .select('*')
    .single()
  if (insertErr || !insertedRow) {
    throw new Error(insertErr?.message ?? 'Failed to create absence record')
  }
  const absence = mapAbsence(insertedRow as Record<string, unknown>)

  // Pre-sign the 'fto' step when the originator provided a signature and is
  // currently permitted to sign as FTO (FTOs themselves, or fto_coordinator).
  const canPreSignFto =
    params.preSignedImage &&
    (params.originator.role === UserRole.fto ||
      params.originator.role === UserRole.fto_coordinator)

  const signature = await createSignatureRoute({
    docType: 'absence_record',
    docId: absence.id,
    ditRecordId: absence.dit_record_id,
    createdBy: params.originator.id,
    preSigned: canPreSignFto
      ? [
          {
            step: routingRules.absence_record[0],
            signerId: params.originator.id,
            signerName: params.originator.full_name,
            signerBadge: params.originator.badge_number ?? null,
            signatureImage: params.preSignedImage!,
            biometricMethod: null,
            deviceId: params.preSignedDeviceId ?? null,
            ipAddress: params.preSignedIpAddress ?? null,
          },
        ]
      : undefined,
  })

  return { absence, signature }
}

/**
 * Close an absence: set end_date if null, compute days_missed, extend the
 * DIT's expected_graduation_date by that count, and — if the DIT is
 * suspended — flip status back to active.
 *
 * Returns the updated absence, the days_missed count, and the new expected
 * graduation date (or null if there was no prior value).
 */
export async function closeAbsenceAndExtend(params: {
  absenceId: string
  endDate: string | null
  closedBy: string
}): Promise<{
  absence: DitAbsenceRecord
  daysMissed: number
  newExpectedGraduationDate: string | null
}> {
  const supabase = await createClient()

  const existing = await fetchAbsenceById(params.absenceId)
  if (!existing) throw new Error('Absence not found')
  if (existing.status === 'closed') {
    throw new Error('Absence is already closed')
  }

  const endDate = params.endDate ?? existing.end_date ?? new Date().toISOString().slice(0, 10)
  const daysMissed = daysBetween(existing.start_date, endDate)

  const { data: updatedAbsence, error: updErr } = await supabase
    .from('dit_absence_records')
    .update({
      end_date: endDate,
      status: 'closed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.absenceId)
    .select('*')
    .single()
  if (updErr || !updatedAbsence) {
    throw new Error(updErr?.message ?? 'Failed to close absence')
  }

  const { data: ditRow } = await supabase
    .from('dit_records')
    .select('id, status, expected_graduation_date')
    .eq('id', existing.dit_record_id)
    .maybeSingle()

  let newExpected: string | null = null
  if (ditRow) {
    const current = ditRow as {
      id: string
      status: string
      expected_graduation_date: string | null
    }
    if (current.expected_graduation_date) {
      newExpected = addDays(current.expected_graduation_date, daysMissed)
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (newExpected) patch.expected_graduation_date = newExpected
    if (current.status === 'suspended') patch.status = 'active'

    if (Object.keys(patch).length > 1) {
      await supabase.from('dit_records').update(patch).eq('id', current.id)
    }
  }

  return {
    absence: mapAbsence(updatedAbsence as Record<string, unknown>),
    daysMissed,
    newExpectedGraduationDate: newExpected,
  }
}

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00Z`)
  const end = new Date(`${endIso}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff + 1)
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
