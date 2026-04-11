import { redirect } from 'next/navigation'

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getSessionUser, getSessionUserWithProfile } from '@/lib/auth/get-session'

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

  return (
    <DashboardShell profile={session.profile} email={session.user.email}>
      {children}
    </DashboardShell>
  )
}
