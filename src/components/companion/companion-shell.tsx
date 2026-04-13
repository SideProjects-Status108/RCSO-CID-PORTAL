'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Bell,
  BookOpen,
  Calendar,
  FileText,
  Grid3x3,
  Map,
  Monitor,
  Settings,
  Users,
} from 'lucide-react'

import { BottomSheet } from '@/components/companion/bottom-sheet'
import { CompanionInstallBanner } from '@/components/companion/companion-install-banner'
import { CompanionPullRefresh } from '@/components/companion/companion-pull-refresh'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/app/schedule', label: 'Schedule', icon: Calendar },
  { href: '/app/callout', label: 'Call-Out', icon: Bell },
  { href: '/app/forms', label: 'Forms', icon: FileText },
  { href: '/app/directory', label: 'Directory', icon: Users },
  { href: '/app/more', label: 'More', icon: Grid3x3 },
] as const

export function CompanionShell({
  children,
  callOutBadgeCount = 0,
}: {
  children: React.ReactNode
  callOutBadgeCount?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(pathname === '/app/more')

  useEffect(() => {
    setMoreOpen(pathname === '/app/more')
  }, [pathname])

  const closeMore = () => {
    setMoreOpen(false)
    if (pathname === '/app/more') router.replace('/app/schedule')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-app text-text-primary">
      <header className="fixed left-0 right-0 top-0 z-30 flex h-12 items-center border-b border-border-subtle bg-bg-surface px-4">
        <span className="font-heading text-xs font-semibold uppercase tracking-widest text-accent-primary">
          CID PORTAL
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-12 pb-20">
        <CompanionInstallBanner />
        <CompanionPullRefresh>
          <div className="px-4">{children}</div>
        </CompanionPullRefresh>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch justify-around border-t border-border-subtle bg-bg-surface px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
        aria-label="Companion navigation"
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/app/more'
              ? pathname === '/app/more'
              : pathname === href || pathname.startsWith(`${href}/`)
          const showCallBadge = href === '/app/callout' && callOutBadgeCount > 0
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 font-heading text-[10px] font-medium tracking-wide transition-colors',
                active ? 'text-accent-gold' : 'text-text-secondary'
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="max-w-full truncate">{label}</span>
              {showCallBadge ? (
                <span className="absolute right-1 top-1 flex min-w-[1.125rem] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold leading-none text-white">
                  {callOutBadgeCount > 9 ? '9+' : callOutBadgeCount}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <BottomSheet open={moreOpen} onClose={closeMore} title="More">
        <ul className="space-y-1">
          <li>
            <Link
              href="/app/map"
              onClick={() => setMoreOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-sans text-sm text-text-primary hover:bg-bg-elevated"
            >
              <Map className="size-5 text-accent-gold" strokeWidth={1.75} aria-hidden />
              Field map
            </Link>
          </li>
          <li>
            <Link
              href="/app/tn-code"
              onClick={() => setMoreOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-sans text-sm text-text-primary hover:bg-bg-elevated"
            >
              <BookOpen className="size-5 text-accent-gold" strokeWidth={1.75} aria-hidden />
              TN Code
            </Link>
          </li>
          <li>
            <Link
              href="/settings"
              onClick={() => setMoreOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-sans text-sm text-text-primary hover:bg-bg-elevated"
            >
              <Settings className="size-5 text-accent-gold" strokeWidth={1.75} aria-hidden />
              Settings
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard"
              onClick={() => setMoreOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-sans text-sm text-text-primary hover:bg-bg-elevated"
            >
              <Monitor className="size-5 text-accent-gold" strokeWidth={1.75} aria-hidden />
              Switch to desktop
            </Link>
          </li>
        </ul>
      </BottomSheet>
    </div>
  )
}
