'use client'

import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type NavFlyoutLinkItem = {
  label: string
  href: string
  showRequestsBadge?: boolean
  badgeCount?: number
}

type NavFlyoutProps = {
  open: boolean
  groupLabel: string
  links: NavFlyoutLinkItem[]
  pathname: string
  /** Desktop: vertical offset from viewport top (px). */
  topPx: number
  placement: 'rail' | 'bottom'
}

export function NavFlyout({
  open,
  groupLabel,
  links,
  pathname,
  topPx,
  placement,
}: NavFlyoutProps) {
  if (!open || links.length === 0) return null

  return (
    <div
      role="navigation"
      aria-label={groupLabel}
      className={cn(
        'fixed z-[60] flex flex-col border-border-subtle bg-bg-elevated shadow-xl duration-150 animate-in fade-in',
        placement === 'rail' ? 'slide-in-from-left-2' : 'slide-in-from-bottom-2',
        placement === 'rail'
          ? 'left-16 w-[220px] border-r'
          : 'bottom-16 left-2 right-2 max-h-[min(50vh,360px)] w-auto overflow-y-auto rounded-lg border'
      )}
      style={placement === 'rail' ? { top: `${Math.max(8, topPx)}px` } : undefined}
    >
      <div className="shrink-0 border-b border-border-subtle px-3 py-2">
        <p className="font-heading text-[10px] font-medium uppercase tracking-wide text-text-secondary">
          {groupLabel}
        </p>
      </div>
      <ul className="flex flex-col gap-0.5 p-1.5">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            pathname.startsWith(`${link.href}/`) ||
            (link.href === '/operations/forms' && pathname.startsWith('/forms')) ||
            (link.href === '/operations/schedules' && pathname.startsWith('/schedule')) ||
            (link.href === '/operations/requests' && pathname.startsWith('/requests')) ||
            (link.href === '/tools/map' && pathname.startsWith('/map')) ||
            (link.href === '/tools/tca' && pathname.startsWith('/tn-code'))
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                  active
                    ? 'bg-accent-primary-muted/40 text-text-primary'
                    : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                )}
              >
                <span className="min-w-0 truncate">{link.label}</span>
                {link.showRequestsBadge ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-5 min-w-5 shrink-0 justify-center border px-1 font-mono text-[10px]',
                      (link.badgeCount ?? 0) > 0
                        ? 'border-accent-primary/40 bg-accent-primary/15 text-accent-primary'
                        : 'border-border-subtle bg-bg-app text-text-secondary'
                    )}
                  >
                    {(link.badgeCount ?? 0) > 99 ? '99+' : link.badgeCount ?? 0}
                  </Badge>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
