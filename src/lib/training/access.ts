import { hasRole, UserRole, type UserRoleValue } from '@/lib/auth/roles'

/** Roles with full read across the training module (coordinator + supervision +). */
export function trainingFullRead(role: UserRoleValue): boolean {
  return hasRole(role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
    UserRole.fto_coordinator,
  ])
}

/** Roles that can see + operate the Onboarding (create DIT) surface. */
export function canManageOnboarding(role: UserRoleValue): boolean {
  return trainingFullRead(role)
}

/** Supervision + admin (not coordinator). */
export function supervisionPlus(role: UserRoleValue): boolean {
  return hasRole(role, [UserRole.admin, UserRole.supervision_admin, UserRole.supervision])
}
