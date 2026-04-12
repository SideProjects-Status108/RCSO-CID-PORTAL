'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, startTransition } from 'react'

import { signOut } from '@/app/actions/auth'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { NavFlyout } from '@/components/dashboard/nav-flyout'
import {
  getActiveNavGroupId,
  groupContainsPathname,
  navRailGroupsVisible,
  type NavRailGroup,
} from '@/components/dashboard/nav-config'
import type { Profile } from '@/types/profile'
import { cn } from '@/lib/utils'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
}

type NavRailProps = {
  profile: Profile
  email: string | undefined
  initialUnreadNotifications: number
  requestsInboxCount: number
}

export function NavRail({
  profile,
  email,
  initialUnreadNotifications,
  requestsInboxCount,
}: NavRailProps) {
  const pathname = usePathname()
  const showCaseTypesNav = hasRole(profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
  ])
  const groups = useMemo(() => navRailGroupsVisible(showCaseTypesNav), [showCaseTypesNav])
  const currentGroupId = getActiveNavGroupId(pathname, groups)

  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null)
  const [flyoutTopPx, setFlyoutTopPx] = useState(64)
  const [mdUp, setMdUp] = useState(true)
  const railRef = useRef<HTMLDivElement>(null)
  const iconRefs = useRef<Map<string, HTMLButtonElement | HTMLAnchorElement>>(new Map())

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setMdUp(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!openFlyoutId) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (railRef.current?.contains(t)) return
      const fly = document.querySelector('[data-cid-nav-flyout]')
      if (fly?.contains(t)) return
      setOpenFlyoutId(null)
    }
    document.addEventListener('mousedown', onDoc, true)
    document.addEventListener('touchstart', onDoc, true)
    return () => {
      document.removeEventListener('mousedown', onDoc, true)
      document.removeEventListener('touchstart', onDoc, true)
    }
  }, [openFlyoutId])

  useEffect(() => {
    if (!openFlyoutId || !mdUp) return
    const el = iconRefs.current.get(openFlyoutId)
    if (el) {
      const r = el.getBoundingClientRect()
      setFlyoutTopPx(r.top)
    }
  }, [openFlyoutId, mdUp, pathname])

  const setIconRef = (id: string, el: HTMLButtonElement | HTMLAnchorElement | null) => {
    if (el) iconRefs.current.set(id, el)
    else iconRefs.current.delete(id)
  }

  const toggleFlyout = (group: NavRailGroup & { kind: 'flyout' }, el: HTMLButtonElement) => {
    const r = el.getBoundingClientRect()
    setFlyoutTopPx(r.top)
    setOpenFlyoutId((prev) => (prev === group.id ? null : group.id))
  }

  const openFlyoutGroup = groups.find((g) => g.id === openFlyoutId && g.kind === 'flyout') as
    | (NavRailGroup & { kind: 'flyout' })
    | undefined

  const flyoutLinks =
    openFlyoutGroup?.children.map((c) => ({
      label: c.label,
      href: c.href,
      showRequestsBadge: c.showRequestsBadge,
      badgeCount: c.showRequestsBadge ? requestsInboxCount : undefined,
    })) ?? []

  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (!openFlyoutId) {
      prevPathname.current = pathname
      return
    }
    if (prevPathname.current === pathname) return
    prevPathname.current = pathname
    const g = groups.find((x) => x.id === openFlyoutId)
    if (!g || g.kind !== 'flyout') return
    if (!groupContainsPathname(g, pathname)) {
      startTransition(() => setOpenFlyoutId(null))
    }
  }, [pathname, openFlyoutId, groups])

  const renderIcon = (group: NavRailGroup) => {
    const active = currentGroupId === group.id
    const Icon = group.icon
    const baseBtn =
      'flex size-11 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-colors hover:bg-bg-elevated/40 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40'
    const activeCls = active ? 'border-accent-primary/30 bg-accent-primary-muted/35 text-accent-primary' : ''

    if (group.kind === 'direct') {
      return (
        <Link
          key={group.id}
          href={group.href}
          ref={(el) => setIconRef(group.id, el)}
          title={group.label}
          onClick={() => setOpenFlyoutId(null)}
          className={cn(baseBtn, activeCls)}
        >
          <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="sr-only">{group.label}</span>
        </Link>
      )
    }

    const flyoutOpen = openFlyoutId === group.id
    return (
      <button
        key={group.id}
        type="button"
        title={group.label}
        aria-expanded={flyoutOpen}
        ref={(el) => {
          if (el) setIconRef(group.id, el)
        }}
        onClick={(e) => toggleFlyout(group, e.currentTarget)}
        className={cn(baseBtn, activeCls, flyoutOpen && 'bg-bg-elevated/50')}
      >
        <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">{group.label}</span>
      </button>
    )
  }

  const railNav = (
    <nav
      className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-2"
      aria-label="Primary"
    >
      {groups.map((g) => renderIcon(g))}
    </nav>
  )

  const bottomActions = (
    <div className="flex shrink-0 flex-col items-center gap-2 border-t border-border-subtle py-2">
      <NotificationBell
        initialUnread={initialUnreadNotifications}
        triggerClassName="size-11 rounded-lg border border-transparent text-text-secondary hover:bg-bg-elevated/40 hover:text-accent-primary"
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'size-11 rounded-lg border border-transparent text-text-secondary hover:bg-bg-elevated/40'
          )}
          aria-label="Account menu"
        >
          <Avatar className="size-8 border border-border-subtle">
            <AvatarFallback className="bg-bg-elevated text-xs text-text-primary">
              {initials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={mdUp ? 'right' : 'top'}
          align="end"
          className="w-56 border-border-subtle bg-bg-elevated text-text-primary"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="truncate font-medium">{profile.full_name || email || 'User'}</span>
              <span className="truncate text-xs text-text-secondary capitalize">
                {profile.role.replaceAll('_', ' ')}
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
  )

  const wordmark = (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center border-b border-border-subtle">
      <Link
        href="/dashboard"
        onClick={() => setOpenFlyoutId(null)}
        className="flex h-full w-full flex-col items-center justify-center px-1 text-center font-heading text-[9px] font-semibold leading-tight tracking-wide text-text-primary hover:text-accent-primary"
        title="CID PORTAL — Dashboard"
      >
        <span>CID</span>
        <span>PORTAL</span>
      </Link>
    </div>
  )

  const flyoutPanel =
    openFlyoutGroup != null ? (
      <div data-cid-nav-flyout>
        <NavFlyout
          open
          groupLabel={openFlyoutGroup.label}
          links={flyoutLinks}
          pathname={pathname}
          topPx={flyoutTopPx}
          placement={mdUp ? 'rail' : 'bottom'}
        />
      </div>
    ) : null

  return (
    <>
      {/* Desktop rail */}
      <div
        ref={railRef}
        className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col border-r border-border-subtle bg-bg-surface md:flex"
      >
        {wordmark}
        {railNav}
        {bottomActions}
      </div>
      {mdUp ? flyoutPanel : null}

      {/* Mobile bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border-subtle bg-bg-surface px-1 md:hidden">
        {groups.map((g) => (
          <div key={g.id} className="flex shrink-0 justify-center">
            {g.kind === 'direct' ? (
              <Link
                href={g.href}
                onClick={() => setOpenFlyoutId(null)}
                className={cn(
                  'flex size-12 items-center justify-center rounded-lg text-text-secondary transition-colors',
                  currentGroupId === g.id && 'bg-accent-primary-muted/35 text-accent-primary'
                )}
                title={g.label}
              >
                <g.icon className="size-5" strokeWidth={1.75} aria-hidden />
                <span className="sr-only">{g.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                title={g.label}
                aria-expanded={openFlyoutId === g.id}
                onClick={(e) => toggleFlyout(g, e.currentTarget)}
                className={cn(
                  'flex size-12 items-center justify-center rounded-lg text-text-secondary transition-colors',
                  currentGroupId === g.id && 'text-accent-primary',
                  openFlyoutId === g.id && 'bg-bg-elevated/50'
                )}
              >
                <g.icon className="size-5" strokeWidth={1.75} aria-hidden />
                <span className="sr-only">{g.label}</span>
              </button>
            )}
          </div>
        ))}
        <NotificationBell
          initialUnread={initialUnreadNotifications}
          triggerClassName="size-12 rounded-lg text-text-secondary hover:text-accent-primary"
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              'size-12 rounded-lg text-text-secondary'
            )}
            aria-label="Account menu"
          >
            <Avatar className="size-8 border border-border-subtle">
              <AvatarFallback className="bg-bg-elevated text-xs text-text-primary">
                {initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-56 border-border-subtle bg-bg-elevated text-text-primary"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="truncate font-medium">{profile.full_name || email || 'User'}</span>
                <span className="truncate text-xs text-text-secondary capitalize">
                  {profile.role.replaceAll('_', ' ')}
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
      {!mdUp ? flyoutPanel : null}
    </>
  )
}
