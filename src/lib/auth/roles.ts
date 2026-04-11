export enum UserRole {
  admin = 'admin',
  supervision_admin = 'supervision_admin',
  supervision = 'supervision',
  fto_coordinator = 'fto_coordinator',
  fto = 'fto',
  detective = 'detective',
  dit = 'dit',
}

export const USER_ROLE_VALUES = [
  UserRole.admin,
  UserRole.supervision_admin,
  UserRole.supervision,
  UserRole.fto_coordinator,
  UserRole.fto,
  UserRole.detective,
  UserRole.dit,
] as const

export type UserRoleValue = (typeof USER_ROLE_VALUES)[number]

export function isUserRole(value: string): value is UserRoleValue {
  return (USER_ROLE_VALUES as readonly string[]).includes(value)
}

export function hasRole(
  userRole: string | null | undefined,
  allowed: UserRoleValue[]
): boolean {
  if (!userRole || !isUserRole(userRole)) return false
  return allowed.includes(userRole)
}
