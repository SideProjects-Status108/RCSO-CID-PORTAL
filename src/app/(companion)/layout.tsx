import { redirect } from 'next/navigation'

import { CompanionShell } from '@/components/companion/companion-shell'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'

export default async function CompanionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionUserWithProfile()
  if (!session) {
    redirect('/login?next=/app/schedule')
  }

  return <CompanionShell>{children}</CompanionShell>
}
