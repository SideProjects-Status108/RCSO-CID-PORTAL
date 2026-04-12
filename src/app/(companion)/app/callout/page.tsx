import { redirect } from 'next/navigation'

import { CompanionCalloutView } from '@/components/companion/companion-callout-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchActiveCallOuts, fetchRecentCallOuts } from '@/lib/companion/callout-queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CompanionCalloutPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login?next=/app/callout')

  const [initialActive, initialRecent] = await Promise.all([
    fetchActiveCallOuts(session.user.id),
    fetchRecentCallOuts(session.user.id, 5),
  ])

  return <CompanionCalloutView initialActive={initialActive} initialRecent={initialRecent} />
}
