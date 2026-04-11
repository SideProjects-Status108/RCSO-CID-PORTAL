import { redirect } from 'next/navigation'

import { CaseTypesManager } from '@/components/operations/case-types-manager'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { fetchCaseTypes } from '@/lib/operations/queries'

export const dynamic = 'force-dynamic'

export default async function CaseTypesPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const allowed = hasRole(session.profile.role, [UserRole.admin, UserRole.supervision_admin])
  if (!allowed) redirect('/operations')

  const types = await fetchCaseTypes(true)

  return <CaseTypesManager initialTypes={types} />
}
