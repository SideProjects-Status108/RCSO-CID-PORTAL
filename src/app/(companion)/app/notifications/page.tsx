import { redirect } from 'next/navigation'

import { CompanionNotificationsView } from '@/components/companion/companion-notifications-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchNotificationsForUser } from '@/lib/notifications/queries'

export const dynamic = 'force-dynamic'

export default async function CompanionNotificationsPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login?next=/app/notifications')

  const list = await fetchNotificationsForUser(session.user.id, 100)

  return (
    <div className="pb-4">
      <h1 className="font-heading text-lg font-semibold uppercase tracking-wide text-text-primary">
        Notifications
      </h1>
      <p className="mt-1 text-xs text-text-secondary">Tap an unread notification to mark it read.</p>
      <div className="mt-4">
        <CompanionNotificationsView initialNotifications={list} />
      </div>
    </div>
  )
}
