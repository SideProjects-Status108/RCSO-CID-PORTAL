import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  Crosshair,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react'

export type NavFlyoutChild = {
  label: string
  href: string
  adminOnly?: boolean
  showRequestsBadge?: boolean
}

export type NavRailGroup =
  | {
      id: string
      kind: 'direct'
      label: string
      href: string
      icon: LucideIcon
      adminOnly?: boolean
    }
  | {
      id: string
      kind: 'flyout'
      label: string
      icon: LucideIcon
      children: NavFlyoutChild[]
    }

const operationsChildren: NavFlyoutChild[] = [
  { label: 'Case Management', href: '/operations/cases' },
  { label: 'Forms & Docs', href: '/operations/forms' },
  { label: 'Schedules', href: '/operations/schedules' },
  { label: 'Requests', href: '/operations/requests', showRequestsBadge: true },
  { label: 'Case types', href: '/operations/case-types', adminOnly: true },
]

const trainingChildren: NavFlyoutChild[] = [
  { label: 'Onboarding', href: '/training/onboarding' },
  { label: 'FTO Schedule', href: '/training/fto-schedule' },
  { label: 'DIT Records', href: '/training/dit-records' },
  { label: 'DIT Evaluations', href: '/training/dit-evaluations' },
]

const investigativeChildren: NavFlyoutChild[] = [
  { label: 'GeoMap', href: '/tools/map' },
  { label: 'TCA Reference', href: '/tools/tca' },
  { label: 'Field Notes', href: '/tools/field-notes' },
]

/** Canonical nav groups for the icon rail (order = display order). */
export const navRailGroups: NavRailGroup[] = [
  { id: 'dashboard', kind: 'direct', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    id: 'operations',
    kind: 'flyout',
    label: 'Operations',
    icon: Briefcase,
    children: operationsChildren,
  },
  {
    id: 'training',
    kind: 'flyout',
    label: 'Training',
    icon: GraduationCap,
    children: trainingChildren,
  },
  {
    id: 'investigative',
    kind: 'flyout',
    label: 'Investigative Tools',
    icon: Crosshair,
    children: investigativeChildren,
  },
  { id: 'personnel', kind: 'direct', label: 'Personnel', href: '/personnel', icon: Users },
  { id: 'settings', kind: 'direct', label: 'Settings', href: '/settings', icon: Settings },
]

export function navRailGroupsVisible(showCaseTypesNav: boolean): NavRailGroup[] {
  return navRailGroups
    .map((group) => {
      if (group.kind !== 'flyout') return group
      const children = group.children.filter((c) => !c.adminOnly || showCaseTypesNav)
      if (children.length === 0) return null
      return { ...group, children }
    })
    .filter((g): g is NavRailGroup => g != null)
}

/** Longest-prefix wins for nested routes. */
export const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/operations/cases': 'Case Management',
  '/operations/forms': 'Forms & Documents',
  '/operations/schedules': 'Schedule',
  '/operations/requests': 'Requests',
  '/operations/case-types': 'Case types',
  '/operations': 'Operations',
  '/forms': 'Forms & Documents',
  '/schedule': 'Schedule',
  '/requests': 'Requests',
  '/training/onboarding': 'Onboarding',
  '/training/fto-schedule': 'FTO Schedule',
  '/training/dit-records': 'DIT Records',
  '/training/dit-evaluations': 'DIT Evaluations',
  '/training': 'Training',
  '/tools/map': 'GeoMap',
  '/tools/tca': 'TCA Reference',
  '/tools/field-notes': 'Field Notes',
  '/map': 'Field Map',
  '/personnel': 'Personnel',
  '/directory': 'Personnel',
  '/tn-code': 'TCA Reference',
  '/settings': 'Settings',
}

export function routeTitleForPath(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname]!
  const sorted = Object.entries(routeTitles).sort((a, b) => b[0].length - a[0].length)
  for (const [prefix, title] of sorted) {
    if (prefix === '/') continue
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return title
  }
  return pathname.startsWith('/dashboard') ? 'Dashboard' : 'CID PORTAL'
}

export function groupContainsPathname(group: NavRailGroup, pathname: string): boolean {
  if (group.kind === 'direct') {
    if (group.id === 'personnel' && pathname.startsWith('/directory')) return true
    return pathname === group.href || pathname.startsWith(`${group.href}/`)
  }
  const childMatch = group.children.some(
    (c) => pathname === c.href || pathname.startsWith(`${c.href}/`)
  )
  if (childMatch) return true
  // Legacy URLs still used by deep links / bookmarks
  if (group.id === 'operations') {
    return (
      pathname.startsWith('/forms') ||
      pathname.startsWith('/schedule') ||
      pathname.startsWith('/requests')
    )
  }
  if (group.id === 'investigative') {
    return (
      pathname.startsWith('/map') ||
      pathname.startsWith('/tn-code') ||
      pathname.startsWith('/tools/')
    )
  }
  if (group.id === 'training') {
    return pathname === '/training' || pathname.startsWith('/training?')
  }
  return false
}

export function getActiveNavGroupId(pathname: string, groups: NavRailGroup[]): string | null {
  for (const g of groups) {
    if (groupContainsPathname(g, pathname)) return g.id
  }
  return null
}
