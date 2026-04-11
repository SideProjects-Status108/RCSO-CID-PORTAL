import { redirect } from 'next/navigation'

import {
  fetchApprovalQueueWithNames,
  fetchMySubmissions,
  fetchPublishedTemplates,
} from '@/lib/forms/queries'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { FormsLibraryView } from '@/components/forms/forms-library-view'

export const dynamic = 'force-dynamic'

export default async function FormsPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  // Request-scoped anchor for client date-range filters on "My submissions".
  // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional per request
  const listGeneratedAt = Date.now()

  const canReview = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])

  const [templates, mySubmissions, approvalQueue] = await Promise.all([
    fetchPublishedTemplates(),
    fetchMySubmissions(session.user.id),
    canReview ? fetchApprovalQueueWithNames() : Promise.resolve([]),
  ])

  return (
    <FormsLibraryView
      templates={templates}
      mySubmissions={mySubmissions}
      approvalQueue={approvalQueue}
      canReview={canReview}
      listGeneratedAt={listGeneratedAt}
    />
  )
}
