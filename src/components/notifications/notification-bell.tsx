'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  Bell,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  Loader2,
  Megaphone,
} from 'lucide-react'

import {
  fetchNotificationsPanelDataAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/(dashboard)/notification-actions'
import type { NotificationRow } from '@/types/notifications'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/format-relative'

function iconFor(type: NotificationRow['type']) {
  switch (type) {
    case 'request_assigned':
    case 'request_urgent':
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
      return Megaphone
  }
}

function hrefFor(n: NotificationRow): string {
  if (n.reference_type === 'request')
    return `/operations/requests?open=${n.reference_id}`
  if (n.reference_type === 'form_submission')
    return `/operations/forms?openSubmission=${n.reference_id}`
  if (n.reference_type === 'evaluation')
    return `/training/dit-evaluations?evaluation=${n.reference_id}`
  return `/operations/schedules?open=${n.reference_id}`
}

export function NotificationBell({
  initialUnread,
  triggerClassName,
}: {
  initialUnread: number
  triggerClassName?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(initialUnread)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [pending, startTransition] = useTransition()

  const load = useCallback(() => {
    startTransition(async () => {
      const data = await fetchNotificationsPanelDataAction()
      setItems(data.notifications)
      setUnread(data.unreadCount)
    })
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function onClickItem(n: NotificationRow) {
    if (!n.is_read) {
      await markNotificationReadAction(n.id)
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      )
      setUnread((c) => Math.max(0, c - 1))
    }
    setOpen(false)
    router.push(hrefFor(n))
    router.refresh()
  }

  async function markAll() {
    await markAllNotificationsReadAction()
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })))
    setUnread(0)
    router.refresh()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'relative text-text-secondary hover:text-accent-primary',
          triggerClassName
        )}
        aria-label="Notifications"
      >
        <Bell className="size-5" strokeWidth={1.75} />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-primary px-1 font-mono text-[10px] font-semibold text-bg-app">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(100vw-2rem,380px)] border-border-subtle bg-bg-elevated p-0 text-text-primary shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-accent-teal"
              onClick={() => void markAll()}
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="max-h-[min(70vh,420px)] overflow-y-auto">
          {pending && items.length === 0 ? (
            <div className="flex justify-center py-8 text-text-secondary">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-text-secondary">
              No new notifications
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {items.map((n) => {
                const Icon = iconFor(n.type)
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg-surface',
                        !n.is_read && 'bg-accent-primary/5'
                      )}
                      onClick={() => void onClickItem(n)}
                    >
                      {!n.is_read ? (
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-accent-primary"
                          aria-hidden
                        />
                      ) : (
                        <span className="w-2 shrink-0" aria-hidden />
                      )}
                      <Icon className="mt-0.5 size-4 shrink-0 text-accent-teal" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-text-primary">{n.message}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-text-secondary">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-border-subtle px-3 py-2">
          <Link
            href="/operations/requests"
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: 'w-full text-accent-teal',
            })}
            onClick={() => setOpen(false)}
          >
            Open requests inbox
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
