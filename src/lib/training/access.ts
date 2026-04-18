import { hasRole, UserRole, type UserRoleValue } from '@/lib/auth/roles'
import type { Profile } from '@/types/profile'

/**
 * Profile-aware access helpers for the Training module.
 *
 * The Training module has a two-tier supervision model:
 *
 *   - Training Writers (full write) — admin, supervision_admin, fto_coordinator,
 *     and the one profile with is_training_supervisor = true (Sgt. McPherson
 *     initially). These can edit program config, suspend DITs, manage
 *     quizzes/PBLEs/rubrics, resolve signatures at the Training Supervisor
 *     step, etc.
 *
 *   - Readers + signers — everyone else with a legitimate reason to be here:
 *     generic `supervision` roles (read + sign only), `fto` (scoped to their
 *     paired DITs), `dit` (scoped to own record), and `detective` (scoped to
 *     DITs they're actively paired with as a temp FTO, read-only).
 *
 * Prefer the *_from_profile variants when you have a Profile; the legacy
 * role-only helpers are retained for callers that only have a role string.
 */

/** True if the profile can write across the Training module. */
export function isTrainingWriter(profile: Pick<Profile, 'role' | 'is_training_supervisor'>): boolean {
  if (profile.is_training_supervisor === true) return true
  return hasRole(profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.fto_coordinator,
  ])
}

/**
 * Legacy: full read across the training module by role alone. This is now
 * strictly weaker than isTrainingWriter because it can't see the
 * is_training_supervisor flag. Callers that previously used it to gate writes
 * should migrate to isTrainingWriter(profile). Retained so that read-only
 * surfaces (queries, list pages) can keep a simple role check.
 */
export function trainingFullRead(role: UserRoleValue): boolean {
  return hasRole(role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
    UserRole.fto_coordinator,
  ])
}

/** Profile-aware onboarding gate (create DIT, kick off survey, meeting brief). */
export function canManageOnboarding(
  profile: Pick<Profile, 'role' | 'is_training_supervisor'>
): boolean {
  return isTrainingWriter(profile)
}

/** Profile-aware gate for toggling dit_records.status (including suspended). */
export function canToggleDitStatus(
  profile: Pick<Profile, 'role' | 'is_training_supervisor'>
): boolean {
  return isTrainingWriter(profile)
}

/** Profile-aware gate for editing training_program_config. */
export function canEditProgramConfig(
  profile: Pick<Profile, 'role' | 'is_training_supervisor'>
): boolean {
  return isTrainingWriter(profile)
}

/**
 * True if the profile may sign documents at the Training Supervisor step in
 * signature routing. Supervision Admin is the fallback when the Training
 * Supervisor seat is vacant or out.
 */
export function canSignAsTrainingSupervisor(
  profile: Pick<Profile, 'role' | 'is_training_supervisor'>
): boolean {
  if (profile.is_training_supervisor === true) return true
  return profile.role === UserRole.supervision_admin
}

/** Supervision + admin (not coordinator). */
export function supervisionPlus(role: UserRoleValue): boolean {
  return hasRole(role, [UserRole.admin, UserRole.supervision_admin, UserRole.supervision])
}
