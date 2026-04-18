import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/profile'
import {
  DOC_SIGNATURE_TYPES,
  type DocSignatureType,
  type DocumentSignatureRow,
  type SignatureEventRow,
  type SignatureStep,
} from '@/types/training'
import { UserRole } from '@/lib/auth/roles'

/**
 * Canonical signature routing rules. Each document type maps to an ordered
 * array of step identifiers. The routing array is snapshotted into
 * document_signatures.routing_order when the route is created, so later rule
 * changes do not retroactively alter in-flight documents.
 *
 * IMPORTANT: 'sgt' is retired. The Training Supervisor step is named
 * 'training_supervisor' and resolves via canSignAsStep() against the
 * is_training_supervisor flag (with supervision_admin as the vacant-seat
 * fallback).
 */
export const routingRules: Record<DocSignatureType, SignatureStep[]> = {
  weekly_eval: ['fto', 'fto_coordinator', 'training_supervisor', 'lt'],
  deficiency: ['fto', 'fto_coordinator', 'training_supervisor', 'lt'],
  equipment_checkoff: ['fto_coordinator', 'training_supervisor', 'lt'],
  completion_cert: ['fto_coordinator', 'training_supervisor', 'lt', 'cpt'],
  fto_feedback: ['dit', 'fto_coordinator', 'training_supervisor'],
  absence_record: ['fto', 'fto_coordinator', 'training_supervisor'],
}

export function isKnownDocType(value: string): value is DocSignatureType {
  return (DOC_SIGNATURE_TYPES as readonly string[]).includes(value)
}

/**
 * Gate a profile's ability to sign at a given routing step.
 *
 * 'training_supervisor' resolves to:
 *   - any profile with is_training_supervisor = true (the active seat), OR
 *   - supervision_admin (fallback when the seat is vacant).
 */
export function canSignAsStep(
  step: SignatureStep,
  profile: Pick<Profile, 'role' | 'is_training_supervisor'>
): boolean {
  switch (step) {
    case 'fto':
      return profile.role === UserRole.fto || profile.role === UserRole.fto_coordinator
    case 'fto_coordinator':
      return profile.role === UserRole.fto_coordinator || profile.role === UserRole.admin
    case 'training_supervisor':
      return (
        profile.is_training_supervisor === true ||
        profile.role === UserRole.supervision_admin
      )
    case 'lt':
    case 'cpt':
      // Lt / Capt signatures are gated in-app by a settings-configured
      // whitelist (admin + supervision_admin for now); revisit when real
      // Lt/Capt accounts land. Until then, only admin / supervision_admin
      // can unblock these steps to avoid accidentally granting authority.
      return profile.role === UserRole.admin || profile.role === UserRole.supervision_admin
    case 'dit':
      return profile.role === UserRole.dit
    default:
      return false
  }
}

/** The step identifier expected at current_step (or null if routing finished). */
export function currentStepRole(
  routingOrder: SignatureStep[],
  currentStep: number
): SignatureStep | null {
  if (currentStep < 0 || currentStep >= routingOrder.length) return null
  return routingOrder[currentStep] ?? null
}

/**
 * Compute the next state after a signature at currentStep is applied.
 * Pure function — callers use the result to update the DB row.
 */
export function nextSignatureState(
  routingOrder: SignatureStep[],
  currentStep: number
): { nextStep: number; nextSigner: SignatureStep | null; status: 'in_progress' | 'completed' } {
  const nextStep = currentStep + 1
  if (nextStep >= routingOrder.length) {
    return { nextStep, nextSigner: null, status: 'completed' }
  }
  return {
    nextStep,
    nextSigner: routingOrder[nextStep] ?? null,
    status: 'in_progress',
  }
}

function mapDocumentSignature(r: Record<string, unknown>): DocumentSignatureRow {
  return {
    id: String(r.id),
    doc_type: r.doc_type as DocSignatureType,
    doc_id: String(r.doc_id),
    dit_record_id: r.dit_record_id != null ? String(r.dit_record_id) : null,
    routing_order: (Array.isArray(r.routing_order) ? r.routing_order : []).map(
      (s) => String(s) as SignatureStep
    ),
    current_step: Number(r.current_step ?? 0),
    current_signer_role:
      r.current_signer_role != null ? (String(r.current_signer_role) as SignatureStep) : null,
    status: r.status as DocumentSignatureRow['status'],
    created_by: String(r.created_by),
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
    completed_at: r.completed_at != null ? String(r.completed_at) : null,
  }
}

function mapSignatureEvent(r: Record<string, unknown>): SignatureEventRow {
  return {
    id: String(r.id),
    document_signature_id: String(r.document_signature_id),
    step_index: Number(r.step_index ?? 0),
    signer_role: r.signer_role as SignatureStep,
    signer_id: String(r.signer_id),
    signature_image: String(r.signature_image ?? ''),
    biometric_method: r.biometric_method != null ? String(r.biometric_method) : null,
    device_id: r.device_id != null ? String(r.device_id) : null,
    ip_address: r.ip_address != null ? String(r.ip_address) : null,
    signed_at: String(r.signed_at ?? ''),
  }
}

/**
 * Create a signature route for a new document. Pre-signed steps are inserted
 * as signature_events immediately. Returns the created row (or advances past
 * pre-signed steps automatically when provided).
 */
export async function createSignatureRoute(params: {
  docType: DocSignatureType
  docId: string
  ditRecordId: string | null
  createdBy: string
  preSigned?: Array<{
    step: SignatureStep
    signerId: string
    signatureImage: string
    biometricMethod?: string | null
    deviceId?: string | null
    ipAddress?: string | null
  }>
}): Promise<DocumentSignatureRow> {
  const supabase = await createClient()
  const routing = routingRules[params.docType]
  if (!routing || routing.length === 0) {
    throw new Error(`No routing rules for doc_type ${params.docType}`)
  }

  const preSigned = params.preSigned ?? []
  const currentStep = preSigned.length
  const completed = currentStep >= routing.length
  const nextSigner = completed ? null : routing[currentStep] ?? null

  const { data: row, error: insertErr } = await supabase
    .from('document_signatures')
    .insert({
      doc_type: params.docType,
      doc_id: params.docId,
      dit_record_id: params.ditRecordId,
      routing_order: routing,
      current_step: currentStep,
      current_signer_role: nextSigner,
      status: completed ? 'completed' : 'in_progress',
      created_by: params.createdBy,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .select('*')
    .single()
  if (insertErr || !row) {
    throw new Error(insertErr?.message ?? 'Failed to create signature route')
  }

  const signatureRow = mapDocumentSignature(row as Record<string, unknown>)

  if (preSigned.length > 0) {
    const events = preSigned.map((p, idx) => ({
      document_signature_id: signatureRow.id,
      step_index: idx,
      signer_role: p.step,
      signer_id: p.signerId,
      signature_image: p.signatureImage,
      biometric_method: p.biometricMethod ?? null,
      device_id: p.deviceId ?? null,
      ip_address: p.ipAddress ?? null,
    }))
    const { error: evErr } = await supabase.from('signature_events').insert(events)
    if (evErr) throw new Error(evErr.message)
  }

  return signatureRow
}

/**
 * Record a signature event and advance the routing pointer atomically
 * (best-effort — Supabase lacks a single RPC here, so we rely on the row's
 * current_step check to avoid double-advancing).
 *
 * Authorization MUST be checked upstream with canSignAsStep + a fetch of the
 * latest row; this helper re-validates current_step to detect stale writes.
 */
export async function recordSignature(params: {
  signatureRow: DocumentSignatureRow
  signer: Pick<Profile, 'id' | 'role' | 'is_training_supervisor'>
  signatureImage: string
  biometricMethod?: string | null
  deviceId?: string | null
  ipAddress?: string | null
}): Promise<{
  document: DocumentSignatureRow
  event: SignatureEventRow
}> {
  const { signatureRow, signer } = params
  if (signatureRow.status !== 'in_progress') {
    throw new Error('Signature route is no longer in progress')
  }
  const expectedStep = currentStepRole(signatureRow.routing_order, signatureRow.current_step)
  if (!expectedStep) throw new Error('Signature route has no remaining steps')
  if (!canSignAsStep(expectedStep, signer)) {
    throw new Error(`Not authorized to sign as ${expectedStep}`)
  }

  const supabase = await createClient()

  const { data: evRow, error: evErr } = await supabase
    .from('signature_events')
    .insert({
      document_signature_id: signatureRow.id,
      step_index: signatureRow.current_step,
      signer_role: expectedStep,
      signer_id: signer.id,
      signature_image: params.signatureImage,
      biometric_method: params.biometricMethod ?? null,
      device_id: params.deviceId ?? null,
      ip_address: params.ipAddress ?? null,
    })
    .select('*')
    .single()
  if (evErr || !evRow) throw new Error(evErr?.message ?? 'Failed to record signature')

  const next = nextSignatureState(signatureRow.routing_order, signatureRow.current_step)
  const completedAt = next.status === 'completed' ? new Date().toISOString() : null

  const { data: updated, error: updErr } = await supabase
    .from('document_signatures')
    .update({
      current_step: next.nextStep,
      current_signer_role: next.nextSigner,
      status: next.status,
      completed_at: completedAt ?? signatureRow.completed_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', signatureRow.id)
    .eq('current_step', signatureRow.current_step)
    .select('*')
    .single()
  if (updErr || !updated) {
    throw new Error(updErr?.message ?? 'Failed to advance signature route (stale state?)')
  }

  return {
    document: mapDocumentSignature(updated as Record<string, unknown>),
    event: mapSignatureEvent(evRow as Record<string, unknown>),
  }
}

/** Fetch a single signature row + its events. */
export async function fetchSignatureRoute(id: string): Promise<{
  document: DocumentSignatureRow
  events: SignatureEventRow[]
} | null> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('document_signatures')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!row) return null
  const { data: events } = await supabase
    .from('signature_events')
    .select('*')
    .eq('document_signature_id', id)
    .order('step_index', { ascending: true })
  return {
    document: mapDocumentSignature(row as Record<string, unknown>),
    events: ((events ?? []) as Array<Record<string, unknown>>).map(mapSignatureEvent),
  }
}

/**
 * Queue of signature requests waiting on a given user. Returns in-progress
 * routes whose current_signer_role matches something this profile can sign.
 */
export async function fetchSignatureQueue(
  profile: Pick<Profile, 'id' | 'role' | 'is_training_supervisor'>
): Promise<DocumentSignatureRow[]> {
  const supabase = await createClient()
  const signableSteps: SignatureStep[] = (
    ['fto', 'fto_coordinator', 'training_supervisor', 'lt', 'cpt', 'dit'] as SignatureStep[]
  ).filter((s) => canSignAsStep(s, profile))

  if (signableSteps.length === 0) return []

  let query = supabase
    .from('document_signatures')
    .select('*')
    .eq('status', 'in_progress')
    .in('current_signer_role', signableSteps)
    .order('updated_at', { ascending: true })

  // For 'fto' step, limit to DITs paired with this user; for 'dit' step, limit
  // to this user's own dit_record. The RLS SELECT policy already enforces this
  // in the database, but narrowing here avoids shipping extra rows to the client.
  if (
    profile.role === UserRole.fto &&
    !profile.is_training_supervisor
  ) {
    const { data: pairings } = await supabase
      .from('fto_pairings')
      .select('dit_id')
      .eq('fto_id', profile.id)
      .eq('is_active', true)
    const ditIds = Array.from(
      new Set(((pairings ?? []) as Array<{ dit_id: string }>).map((p) => p.dit_id))
    )
    if (ditIds.length === 0) return []
    const { data: records } = await supabase
      .from('dit_records')
      .select('id')
      .in('user_id', ditIds)
    const recordIds = ((records ?? []) as Array<{ id: string }>).map((r) => r.id)
    if (recordIds.length === 0) return []
    query = query.in('dit_record_id', recordIds)
  }

  const { data, error } = await query
  if (error || !data) return []
  return (data as Array<Record<string, unknown>>).map(mapDocumentSignature)
}
