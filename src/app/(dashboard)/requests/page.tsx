import { redirect } from 'next/navigation'

import { RequestsView } from '@/components/requests/requests-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { fetchPersonnelAssignable, fetchPersonnelByUserIds } from '@/lib/directory/queries'
import { fetchRequestById, fetchRequestsList } from '@/lib/requests/queries'

export const dynamic = 'force-dynamic'

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>
}) {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const sp = await searchParams
  const openId = sp.open

  const supervisionPlus = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])

  const [initialAssigned, initialCreated, initialAllOpen, assignable] = await Promise.all([
    fetchRequestsList(session.user.id, {
      scope: 'assigned',
      urgency: 'all',
      request_type: 'all',
      status: 'all',
      assigned_to: 'all',
    }),
    fetchRequestsList(session.user.id, {
      scope: 'created',
      urgency: 'all',
      request_type: 'all',
      status: 'all',
      assigned_to: 'all',
    }),
    supervisionPlus
      ? fetchRequestsList(session.user.id, {
          scope: 'all_open',
          urgency: 'all',
          request_type: 'all',
          status: 'all',
          assigned_to: 'all',
        })
      : Promise.resolve([]),
    supervisionPlus ? fetchPersonnelAssignable() : Promise.resolve([]),
  ])

  const allRows = [...initialAssigned, ...initialCreated, ...initialAllOpen]
  const ids = [...new Set(allRows.flatMap((r) => [r.created_by, r.assigned_to].filter(Boolean)))] as string[]
  const personnel = await fetchPersonnelByUserIds(ids)
  const nameMap: Record<string, string> = {}
  for (const p of personnel) {
    if (p.user_id) nameMap[p.user_id] = p.full_name
  }

  let initialOpenRequest: Awaited<ReturnType<typeof fetchRequestById>> = null
  if (openId) {
    initialOpenRequest = await fetchRequestById(openId)
  }

  return (
    <RequestsView
      viewerId={session.user.id}
      viewerRole={session.profile.role}
      supervisionPlus={supervisionPlus}
      initialAssigned={initialAssigned}
      assignable={assignable}
      nameMap={nameMap}
      initialOpenRequest={initialOpenRequest}
    />
  )
}
