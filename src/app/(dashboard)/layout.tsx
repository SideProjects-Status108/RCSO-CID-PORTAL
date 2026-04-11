import { redirect } from 'next/navigation'

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getSessionUser, getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchUnreadNotificationCount } from '@/lib/notifications/queries'
import { countMyAssignedOpenRequests } from '@/lib/requests/queries'

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionUserWithProfile()
  if (!session) {
    const userOnly = await getSessionUser()
    if (userOnly) {
      redirect('/login?error=no_profile')
    }
    redirect('/login')
  }

  const [initialUnreadNotifications, requestsInboxCount] = await Promise.all([
    fetchUnreadNotificationCount(session.user.id),
    countMyAssignedOpenRequests(session.user.id),
  ])

  return (
    <DashboardShell
      profile={session.profile}
      email={session.user.email}
      initialUnreadNotifications={initialUnreadNotifications}
      requestsInboxCount={requestsInboxCount}
    >
      {children}
    </DashboardShell>
  )
}
