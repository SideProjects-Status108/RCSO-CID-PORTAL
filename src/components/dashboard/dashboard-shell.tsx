'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'

import { signOut } from '@/app/actions/auth'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/profile'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NotificationBell } from '@/components/notifications/notification-bell'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { dashboardNav, routeTitles } from '@/components/dashboard/nav-config'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
}

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
  const pageTitle =
    routeTitles[pathname] ??
    (pathname.startsWith('/dashboard') ? 'Dashboard' : 'CID PORTAL')
  const showAdminNav = hasRole(profile.role, [UserRole.admin])

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-border-subtle bg-bg-surface">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle px-4">
          <Shield
            className="size-5 shrink-0 text-accent-primary"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="font-heading text-sm font-semibold tracking-wide text-text-primary">
            CID PORTAL
          </span>
        </div>
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="flex flex-col gap-0.5" aria-label="Main">
            {dashboardNav
              .filter((item) => !item.adminOnly || showAdminNav)
              .map(({ label, href, icon: Icon, showRequestsBadge }) => {
                const active =
                  href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'relative flex items-center gap-2 rounded-md px-3 py-2 font-heading text-[13px] tracking-wide transition-colors',
                      active
                        ? 'border-l-2 border-accent-primary bg-accent-primary-muted/35 text-text-primary'
                        : 'border-l-2 border-transparent text-text-secondary hover:bg-bg-elevated/25 hover:text-text-primary'
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                    <span className="flex-1 truncate">{label}</span>
                    {showRequestsBadge ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-5 min-w-5 justify-center border px-1 font-mono text-[10px]',
                          requestsInboxCount > 0
                            ? 'border-accent-primary/40 bg-accent-primary/15 text-accent-primary'
                            : 'border-border-subtle bg-bg-app text-text-secondary'
                        )}
                      >
                        {requestsInboxCount > 99 ? '99+' : requestsInboxCount}
                      </Badge>
                    ) : null}
                  </Link>
                )
              })}
          </nav>
        </ScrollArea>
        <div className="shrink-0 border-t border-border-subtle p-3">
          <div className="flex items-center gap-2 rounded-md bg-bg-elevated/30 px-2 py-2">
            <Avatar className="size-9 border border-border-subtle">
              <AvatarFallback className="bg-accent-teal/20 text-xs text-text-primary">
                {initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {profile.full_name || email || 'User'}
              </p>
              <p className="truncate text-xs text-text-secondary capitalize">
                {profile.role.replaceAll('_', ' ')}
              </p>
            </div>
          </div>
          <form action={signOut} className="mt-2">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full border-accent-teal/40 text-accent-teal hover:bg-accent-teal/10 hover:text-accent-teal"
            >
              Log out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pl-[240px]">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-bg-app/95 px-6 backdrop-blur-sm">
          <h1 className="truncate font-heading text-lg font-medium tracking-wide text-text-primary">
            {pageTitle}
          </h1>
          <div className="flex items-center gap-2">
            <NotificationBell initialUnread={initialUnreadNotifications} />
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'rounded-full text-text-secondary'
                )}
              >
                <Avatar className="size-8 border border-border-subtle">
                  <AvatarFallback className="bg-bg-elevated text-xs text-text-primary">
                    {initials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-border-subtle bg-bg-elevated text-text-primary"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate font-medium">
                      {profile.full_name}
                    </span>
                    <span className="truncate text-xs text-text-secondary">
                      {email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border-subtle" />
                <div className="p-1">
                  <form action={signOut}>
                    <Button
                      type="submit"
                      variant="ghost"
                      className="w-full justify-start text-text-primary hover:bg-bg-app hover:text-text-primary"
                    >
                      Log out
                    </Button>
                  </form>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 bg-bg-app p-6 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
