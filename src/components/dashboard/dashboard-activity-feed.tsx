'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  AlertTriangle,
  Bell,
  Calendar,
  ClipboardList,
  ClipboardPen,
  FileCheck,
  FileWarning,
  type LucideIcon,
} from 'lucide-react'

import type { AppNotificationType, NotificationRow } from '@/types/notifications'
import { cn } from '@/lib/utils'

function relativeTimeShort(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (sec < 45) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 48) return `${hr}h ago`
  const days = Math.round(hr / 24)
  return `${days}d ago`
}

function iconForNotificationType(type: AppNotificationType): LucideIcon {
  switch (type) {
    case 'request_assigned':
      return ClipboardList
    case 'request_urgent':
      return AlertTriangle
    case 'request_updated':
      return Bell
    case 'form_approval_needed':
      return FileWarning
    case 'form_reviewed':
      return FileCheck
    case 'schedule_published':
      return Calendar
    case 'evaluation_submitted':
      return ClipboardPen
    default:
      return Bell
  }
}

type DashboardActivityFeedProps = {
  initial: NotificationRow[]
}

export function DashboardActivityFeed({ initial }: DashboardActivityFeedProps) {
  const router = useRouter()

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const id = window.setInterval(tick, 45_000)
    return () => window.clearInterval(id)
  }, [router])

  return (
    <ul className="flex max-h-[min(52vh,28rem)] flex-col gap-0 overflow-y-auto pr-1">
      {initial.length === 0 ? (
        <li className="py-6 text-center text-sm text-text-secondary">No activity yet.</li>
      ) : (
        initial.map((n) => {
          const Icon = iconForNotificationType(n.type)
          return (
            <li
              key={n.id}
              className="flex gap-3 border-b border-border-subtle/70 py-3 last:border-0"
            >
              <span
                className={cn(
                  'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md',
                  'bg-accent-primary-muted/35 text-accent-primary'
                )}
                aria-hidden
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-text-primary">{n.message}</p>
                <p className="mt-1 font-mono text-[11px] text-text-secondary">
                  {relativeTimeShort(n.created_at)}
                </p>
              </div>
            </li>
          )
        })
      )}
    </ul>
  )
}
