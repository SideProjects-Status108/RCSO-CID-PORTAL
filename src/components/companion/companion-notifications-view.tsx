'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Bell,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
} from 'lucide-react'

import { markNotificationReadAction } from '@/app/(dashboard)/notification-actions'
import { CompanionCard } from '@/components/companion/companion-card'
import { formatRelativeTime } from '@/lib/companion/format-relative'
import { cn } from '@/lib/utils'
import type { AppNotificationType, NotificationRow } from '@/types/notifications'

function iconForType(type: AppNotificationType) {
  switch (type) {
    case 'request_urgent':
      return AlertTriangle
    case 'request_assigned':
    case 'request_updated':
      return ClipboardList
    case 'form_approval_needed':
    case 'form_reviewed':
      return FileText
    case 'schedule_published':
      return Calendar
    case 'evaluation_submitted':
      return GraduationCap
    default:
      return Bell
  }
}

export function CompanionNotificationsView({
  initialNotifications,
}: {
  initialNotifications: NotificationRow[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const onRowTap = (n: NotificationRow) => {
    if (n.is_read) return
    startTransition(async () => {
      await markNotificationReadAction(n.id)
      router.refresh()
    })
  }

  if (initialNotifications.length === 0) {
    return (
      <CompanionCard className="flex flex-col items-center gap-2 py-12 text-center">
        <Bell className="size-10 text-text-disabled" strokeWidth={1.5} aria-hidden />
        <p className="font-heading text-sm font-semibold text-text-primary">No notifications yet.</p>
      </CompanionCard>
    )
  }

  return (
    <ul className="space-y-2 pb-6">
      {initialNotifications.map((n) => {
        const Icon = iconForType(n.type)
        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onRowTap(n)}
              className={cn(
                'w-full rounded-lg border border-border-subtle bg-bg-surface p-3 text-left transition-colors',
                !n.is_read && 'ring-1 ring-accent-primary/30 hover:bg-bg-elevated active:bg-bg-elevated',
                n.is_read && 'opacity-90'
              )}
            >
              <div className="flex gap-3">
                <div className="relative flex shrink-0 pt-0.5">
                  <Icon className="size-5 text-accent-primary" strokeWidth={1.75} aria-hidden />
                  {!n.is_read ? (
                    <span
                      className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-accent-primary"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary">{n.message}</p>
                  <p className="mt-1 text-xs text-text-secondary">{formatRelativeTime(n.created_at)}</p>
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
