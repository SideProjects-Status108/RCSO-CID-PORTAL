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
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/app/schedule', label: 'Schedule', icon: Calendar },
  { href: '/app/callout', label: 'Call-Out', icon: Bell },
  { href: '/app/forms', label: 'Forms', icon: FileText },
  { href: '/app/directory', label: 'Directory', icon: Users },
  { href: '/app/more', label: 'More', icon: Grid3x3 },
] as const

export function CompanionShell({ children }: { children: React.ReactNode }) {
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
        <span className="text-sm font-semibold tracking-wide text-text-primary">RCSO CID</span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-20 pt-12">{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch justify-around border-t border-border-subtle bg-bg-surface px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
        aria-label="Companion navigation"
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/app/more'
              ? pathname === '/app/more'
              : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium transition-colors',
                active ? 'text-accent-gold' : 'text-text-secondary'
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="max-w-full truncate">{label}</span>
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
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated"
            >
              <Map className="size-5 text-accent-gold" strokeWidth={1.75} aria-hidden />
              Field map
            </Link>
          </li>
          <li>
            <Link
              href="/app/tn-code"
              onClick={() => setMoreOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated"
            >
              <BookOpen className="size-5 text-accent-gold" strokeWidth={1.75} aria-hidden />
              TN Code
            </Link>
          </li>
          <li>
            <Link
              href="/settings"
              onClick={() => setMoreOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated"
            >
              <Settings className="size-5 text-accent-gold" strokeWidth={1.75} aria-hidden />
              Settings
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard"
              onClick={() => setMoreOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated"
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
