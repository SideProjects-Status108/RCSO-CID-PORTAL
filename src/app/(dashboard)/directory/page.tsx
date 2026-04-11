import { redirect } from 'next/navigation'

import { DirectoryView } from '@/components/directory/directory-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import {
  fetchDistinctUnits,
  fetchPersonnelDirectory,
} from '@/lib/directory/queries'

export const dynamic = 'force-dynamic'

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const sp = await searchParams
  const highlightUserId = sp.userId ?? null

  const adminScope = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
  ])

  const initialRows = await fetchPersonnelDirectory(
    session.profile.role,
    adminScope,
    { status: 'active', systemRole: 'all' }
  )
  const units = await fetchDistinctUnits()

  const canManageDirectory = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
  ])
  const canDeactivate = session.profile.role === UserRole.admin

  return (
    <DirectoryView
      initialRows={initialRows}
      units={units}
      viewerRole={session.profile.role}
      canManageDirectory={canManageDirectory}
      canDeactivate={canDeactivate}
      highlightUserId={highlightUserId}
    />
  )
}
