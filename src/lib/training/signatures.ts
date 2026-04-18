import 'server-only'

import type { Profile } from '@/types/profile'
import {
  DOC_SIGNATURE_TYPES,
  type DocSignatureType,
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
