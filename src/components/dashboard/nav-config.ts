import {
  Bell,
  BookOpen,
  Calendar,
  FileText,
  Folder,
  GraduationCap,
  Home,
  Map,
  Settings,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Phase 0: unread requests badge (real count wired in a later phase). */
  showRequestsBadge?: boolean
  /** When true, only users with the admin role see this item. */
  adminOnly?: boolean
}

export const dashboardNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Operations', href: '/operations', icon: Folder },
  { label: 'Forms & Documents', href: '/forms', icon: FileText },
  { label: 'Schedule', href: '/schedule', icon: Calendar },
  { label: 'Field Map', href: '/map', icon: Map },
  {
    label: 'Requests',
    href: '/requests',
    icon: Bell,
    showRequestsBadge: true,
  },
  { label: 'Training', href: '/training', icon: GraduationCap },
  { label: 'Directory', href: '/directory', icon: Users },
  { label: 'TN Code', href: '/tn-code', icon: BookOpen },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
]

export const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/operations': 'Operations',
  '/operations/case-types': 'Case types',
  '/forms': 'Forms & Documents',
  '/schedule': 'Schedule',
  '/map': 'Field Map',
  '/requests': 'Requests',
  '/training': 'Training',
  '/directory': 'Directory',
  '/tn-code': 'TN Code',
  '/settings': 'Settings',
}
