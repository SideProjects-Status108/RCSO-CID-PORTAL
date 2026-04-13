import { redirect } from 'next/navigation'

import { DashboardHome } from '@/components/dashboard/dashboard-home'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { loadDashboardData } from '@/lib/dashboard/load-dashboard'
import { getPublicOrigin } from '@/lib/url/public-origin'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const data = await loadDashboardData()
  if (!data) redirect('/login')

  let companionPhoneUrl: string | undefined
  if (data.supervisionPlus) {
    const origin = await getPublicOrigin()
    companionPhoneUrl = `${origin}/app/schedule`
  }

  return <DashboardHome data={data} companionPhoneUrl={companionPhoneUrl} />
}
