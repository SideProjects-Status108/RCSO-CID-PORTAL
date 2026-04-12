import { redirect } from 'next/navigation'

import { OperationsView } from '@/components/operations/operations-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { fetchPersonnelByUserIds } from '@/lib/directory/queries'
import { fetchCaseTypes, fetchCasesList } from '@/lib/operations/queries'

export const dynamic = 'force-dynamic'

export default async function OperationsCasesPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const supervisionPlus = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])

  const canManageCaseTypes = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
  ])

  const [initialCases, caseTypes] = await Promise.all([
    fetchCasesList(session.user.id, supervisionPlus, {}),
    fetchCaseTypes(false),
  ])

  const ids = [
    ...new Set(
      initialCases.flatMap((c) => [c.created_by, c.assigned_detective, c.updated_by].filter(Boolean))
    ),
  ] as string[]
  const personnel = await fetchPersonnelByUserIds(ids.filter(Boolean) as string[])
  const nameMap: Record<string, string> = {}
  for (const p of personnel) {
    if (p.user_id) nameMap[p.user_id] = p.full_name
  }

  return (
    <OperationsView
      viewerRole={session.profile.role}
      viewerId={session.user.id}
      supervisionPlus={supervisionPlus}
      canManageCaseTypes={canManageCaseTypes}
      initialCases={initialCases}
      caseTypes={caseTypes}
      nameMap={nameMap}
    />
  )
}
