import type { UserRoleValue } from '@/lib/auth/roles'
import { UserRole } from '@/lib/auth/roles'
import type { PersonnelDirectoryRow } from '@/types/personnel'

/** DIT and non–admin-scope viewers: strip sensitive directory fields (server-side). */
export function maskPersonnelRow(
  row: PersonnelDirectoryRow,
  viewerRole: UserRoleValue,
  viewerIsAdminScope: boolean
): PersonnelDirectoryRow {
  if (viewerRole === UserRole.dit) {
    return {
      ...row,
      phone_cell: null,
      email: null,
      notes: null,
    }
  }
  if (!viewerIsAdminScope) {
    return {
      ...row,
      notes: null,
    }
  }
  return row
}
