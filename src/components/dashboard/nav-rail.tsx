'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import { Menu, X } from 'lucide-react'

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
  const strictAdmin = profile.role === UserRole.admin
  const groups = useMemo(
    () => navRailGroupsVisible(showCaseTypesNav, strictAdmin),
    [showCaseTypesNav, strictAdmin]
  )
  const currentGroupId = getActiveNavGroupId(pathname, groups)

  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null)
  const [flyoutTopPx, setFlyoutTopPx] = useState(64)
  const [mdUp, setMdUp] = useState(true)
  const [mobileFullNavOpen, setMobileFullNavOpen] = useState(false)
  const closeMobileNav = useCallback(() => {
    setMobileFullNavOpen(false)
    setOpenFlyoutId(null)
  }, [])
  const railRef = useRef<HTMLDivElement>(null)
  const iconRefs = useRef<Map<string, HTMLButtonElement | HTMLAnchorElement>>(new Map())
  const flyoutOpenDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flyoutCloseDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearFlyoutOpenDelay = () => {
    if (flyoutOpenDelayRef.current != null) {
      clearTimeout(flyoutOpenDelayRef.current)
      flyoutOpenDelayRef.current = null
    }
  }

  const clearFlyoutCloseDelay = () => {
    if (flyoutCloseDelayRef.current != null) {
      clearTimeout(flyoutCloseDelayRef.current)
      flyoutCloseDelayRef.current = null
    }
  }

  const scheduleFlyoutClose = () => {
    clearFlyoutCloseDelay()
    flyoutCloseDelayRef.current = setTimeout(() => {
      setOpenFlyoutId(null)
      flyoutCloseDelayRef.current = null
    }, 200)
  }

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setMdUp(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    return () => {
      if (flyoutOpenDelayRef.current != null) {
        clearTimeout(flyoutOpenDelayRef.current)
        flyoutOpenDelayRef.current = null
      }
      if (flyoutCloseDelayRef.current != null) {
        clearTimeout(flyoutCloseDelayRef.current)
        flyoutCloseDelayRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mobileFullNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileFullNavOpen])

  useEffect(() => {
    if (!mobileFullNavOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileNav()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileFullNavOpen, closeMobileNav])

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
    clearFlyoutOpenDelay()
    clearFlyoutCloseDelay()
    const r = el.getBoundingClientRect()
    setFlyoutTopPx(r.top)
    setOpenFlyoutId((prev) => (prev === group.id ? null : group.id))
  }

  const onDesktopFlyoutRailPointerEnter = (
    group: NavRailGroup & { kind: 'flyout' },
    el: HTMLButtonElement
  ) => {
    if (!mdUp) return
    clearFlyoutCloseDelay()
    clearFlyoutOpenDelay()
    const r = el.getBoundingClientRect()
    setFlyoutTopPx(r.top)
    flyoutOpenDelayRef.current = setTimeout(() => {
      setOpenFlyoutId(group.id)
      flyoutOpenDelayRef.current = null
    }, 110)
  }

  const onDesktopFlyoutRailPointerLeave = () => {
    if (!mdUp) return
    clearFlyoutOpenDelay()
    scheduleFlyoutClose()
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
        onPointerEnter={(e) => onDesktopFlyoutRailPointerEnter(group, e.currentTarget)}
        onPointerLeave={onDesktopFlyoutRailPointerLeave}
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
          onPointerEnter={
            mdUp
              ? () => {
                  clearFlyoutOpenDelay()
                  clearFlyoutCloseDelay()
                }
              : undefined
          }
          onPointerLeave={mdUp ? scheduleFlyoutClose : undefined}
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

      <button
        type="button"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'fixed left-3 top-3 z-50 flex size-11 shrink-0 rounded-lg border border-border-subtle bg-bg-surface/95 text-text-primary shadow-sm backdrop-blur-sm md:hidden'
        )}
        aria-label="Open navigation menu"
        onClick={() => setMobileFullNavOpen(true)}
      >
        <Menu className="size-6" strokeWidth={1.75} />
      </button>

      {mobileFullNavOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={closeMobileNav}
          />
          <div
            className="absolute inset-4 flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-4">
              <span className="font-heading text-sm font-semibold tracking-wide text-text-primary">
                Menu
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label="Close menu"
                onClick={closeMobileNav}
              >
                <X className="size-6" strokeWidth={1.75} />
              </Button>
            </div>
            <nav
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4"
              aria-label="Primary mobile"
            >
              <div className="space-y-6">
                {groups.map((g) => (
                  <div key={g.id}>
                    <p className="mb-2 font-heading text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
                      {g.label}
                    </p>
                    {g.kind === 'direct' ? (
                      <Link
                        href={g.href}
                        onClick={closeMobileNav}
                        className={cn(
                          'flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated',
                          currentGroupId === g.id && 'bg-accent-primary-muted/25 text-accent-primary'
                        )}
                      >
                        {g.label}
                      </Link>
                    ) : (
                      <ul className="space-y-1">
                        {g.children.map((c) => (
                          <li key={c.href}>
                            <Link
                              href={c.href}
                              onClick={closeMobileNav}
                              className={cn(
                                'flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated',
                                (pathname === c.href || pathname.startsWith(`${c.href}/`)) &&
                                  'bg-accent-primary-muted/20 text-accent-primary'
                              )}
                            >
                              <span>{c.label}</span>
                              {c.showRequestsBadge && requestsInboxCount > 0 ? (
                                <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold text-white">
                                  {requestsInboxCount}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </nav>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
              <NotificationBell
                initialUnread={initialUnreadNotifications}
                triggerClassName="size-11 rounded-lg border border-border-subtle text-text-secondary hover:text-accent-primary"
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon' }),
                    'size-11 rounded-lg border border-border-subtle text-text-secondary'
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
                      <span className="truncate font-medium">
                        {profile.full_name || email || 'User'}
                      </span>
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
          </div>
        </div>
      ) : null}
    </>
  )
}
