'use client'

import { Plus } from 'lucide-react'

import type { ScheduleEventRow, ScheduleEventType } from '@/types/schedule'
import { EventTypeBadge } from '@/components/app/event-type-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function localDayKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function dayKeyFromIso(iso: string) {
  return localDayKey(new Date(iso))
}

function formatEventTime(e: ScheduleEventRow): string {
  if (e.is_all_day) return 'All day'
  const s = new Date(e.start_datetime)
  const t = new Date(e.end_datetime)
  const opt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
  return `${s.toLocaleTimeString(undefined, opt)} – ${t.toLocaleTimeString(undefined, opt)}`
}

function longDateHeader(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ScheduleDayDetailDialog({
  open,
  onOpenChange,
  day,
  events,
  canAdd,
  onNewEvent,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  day: Date | null
  events: ScheduleEventRow[]
  canAdd: boolean
  onNewEvent: (d: Date) => void
}) {
  if (!day) return null
  const key = localDayKey(day)
  const dayEvents = events
    .filter((e) => dayKeyFromIso(e.start_datetime) === key)
    .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'flex max-h-[min(92dvh,720px)] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none border-border-subtle bg-bg-elevated p-0 text-text-primary sm:max-w-lg sm:rounded-xl'
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border-subtle px-4 py-3 pr-12 sm:px-5">
          <DialogTitle className="font-heading text-xl font-semibold tracking-wide text-text-primary">
            {longDateHeader(day)}
          </DialogTitle>
          <p className="mt-1 font-sans text-xs text-text-secondary">
            {dayEvents.length} event{dayEvents.length === 1 ? '' : 's'}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {dayEvents.length === 0 ? (
            <p className="py-8 text-center font-sans text-sm text-text-secondary">No events scheduled</p>
          ) : (
            <ul className="space-y-3">
              {dayEvents.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <EventTypeBadge type={e.event_type as ScheduleEventType} />
                    <span className="font-medium text-text-primary">{e.title}</span>
                  </div>
                  <p className="mt-1 font-heading text-xs tabular-nums text-accent-primary">
                    {formatEventTime(e)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canAdd ? (
          <div className="shrink-0 border-t border-border-subtle px-4 py-3 sm:px-5">
            <Button
              type="button"
              className="w-full border border-accent-primary/30 bg-accent-primary text-bg-app hover:bg-accent-primary-hover"
              onClick={() => {
                onNewEvent(day)
                onOpenChange(false)
              }}
            >
              <Plus className="size-4" strokeWidth={1.75} />
              New event
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
