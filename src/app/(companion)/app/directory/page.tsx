import { redirect } from 'next/navigation'

import { CompanionDirectoryView } from '@/components/companion/companion-directory-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { fetchDistinctUnits, fetchPersonnelDirectory } from '@/lib/directory/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CompanionDirectoryPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login?next=/app/directory')

  const adminScope = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
  ])

  const [initialRows, units] = await Promise.all([
    fetchPersonnelDirectory(session.profile.role, adminScope, {
      status: 'active',
      systemRole: 'all',
    }),
    fetchDistinctUnits(),
  ])

  return (
    <CompanionDirectoryView
      initialRows={initialRows}
      units={units}
    />
  )
}
