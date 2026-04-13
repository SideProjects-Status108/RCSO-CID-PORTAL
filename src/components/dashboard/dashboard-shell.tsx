'use client'

import { usePathname } from 'next/navigation'

import type { Profile } from '@/types/profile'
import { NavRail } from '@/components/dashboard/nav-rail'
import { routeTitleForPath } from '@/components/dashboard/nav-config'

type DashboardShellProps = {
  profile: Profile
  email: string | undefined
  children: React.ReactNode
  initialUnreadNotifications: number
  requestsInboxCount: number
}

export function DashboardShell({
  profile,
  email,
  children,
  initialUnreadNotifications,
  requestsInboxCount,
}: DashboardShellProps) {
  const pathname = usePathname()
  const pageTitle = routeTitleForPath(pathname)

  return (
    <div className="flex min-h-0 flex-1">
      <NavRail
        profile={profile}
        email={email}
        initialUnreadNotifications={initialUnreadNotifications}
        requestsInboxCount={requestsInboxCount}
      />

      <div className="flex min-w-0 flex-1 flex-col pl-0 md:pl-16">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle bg-bg-app/95 pl-14 pr-4 backdrop-blur-sm md:pl-6">
          <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-medium tracking-wide text-text-primary">
            {pageTitle}
          </h1>
        </header>
        <main className="flex-1 bg-bg-app p-4 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
