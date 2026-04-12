import { redirect } from 'next/navigation'

import { ScheduleView } from '@/components/schedule/schedule-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { loadSchedulePageData } from '@/app/(dashboard)/schedule/schedule-data'

export const dynamic = 'force-dynamic'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const sp = await searchParams
  const data = await loadSchedulePageData(sp.userId ?? null)
  if (!data) redirect('/login')

  return <ScheduleView data={data} />
}
