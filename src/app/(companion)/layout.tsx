import { redirect } from 'next/navigation'

import { CompanionShell } from '@/components/companion/companion-shell'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchActiveCallOutCount } from '@/lib/companion/callout-queries'

export default async function CompanionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionUserWithProfile()
  if (!session) {
    redirect('/login?next=/app/schedule')
  }

  const callOutBadgeCount = await fetchActiveCallOutCount(session.user.id)

  return <CompanionShell callOutBadgeCount={callOutBadgeCount}>{children}</CompanionShell>
}
