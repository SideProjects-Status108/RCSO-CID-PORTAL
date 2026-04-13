'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Phone } from 'lucide-react'

import { CompanionCard } from '@/components/companion/companion-card'
import { CompanionEventTypeBadge } from '@/components/companion/event-type-badge'
import { cn } from '@/lib/utils'
import type { ScheduleEventRow } from '@/types/schedule'

type PersonLite = {
  full_name: string
  badge_number: string | null
  phone_cell: string | null
}

export type CompanionScheduleViewProps = {
  events: ScheduleEventRow[]
  subjectName: string | null
  viewAsBlocked: boolean
  currentOnCall: ScheduleEventRow | null
  onCallPerson: PersonLite | null
  upcomingOnCall: ScheduleEventRow[]
  upcomingPeople: Record<string, PersonLite>
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function localDayKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function dayKeyFromIso(iso: string) {
  const d = new Date(iso)
  return localDayKey(d)
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

export function CompanionScheduleView({
  events,
  subjectName,
  viewAsBlocked,
  currentOnCall,
  onCallPerson,
  upcomingOnCall,
  upcomingPeople,
}: CompanionScheduleViewProps) {
  const [tab, setTab] = useState<'my' | 'oncall'>('my')

  const today = useMemo(() => {
    const n = new Date()
    n.setHours(0, 0, 0, 0)
    return n
  }, [])

  const todayKey = localDayKey(today)

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleEventRow[]>()
    for (const e of events) {
      const k = dayKeyFromIso(e.start_datetime)
      const arr = map.get(k) ?? []
      arr.push(e)
      map.set(k, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))
    }
    return map
  }, [events])

  const maxDay = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + 14)
    return localDayKey(d)
  }, [today])

  const futureDayKeys = useMemo(() => {
    const keys = [...grouped.keys()].filter((k) => k > todayKey && k <= maxDay).sort()
    return keys
  }, [grouped, todayKey, maxDay])

  const todayEvents = grouped.get(todayKey) ?? []

  return (
    <div className="space-y-4 pb-4">
      <div className="flex rounded-lg border border-border-subtle bg-bg-surface p-1">
        <button
          type="button"
          onClick={() => setTab('my')}
          className={cn(
            'min-h-10 flex-1 rounded-md font-heading text-sm font-medium tracking-wide transition-colors',
            tab === 'my' ? 'bg-bg-elevated text-accent-gold' : 'text-text-secondary'
          )}
        >
          My schedule
        </button>
        <button
          type="button"
          onClick={() => setTab('oncall')}
          className={cn(
            'min-h-10 flex-1 rounded-md font-heading text-sm font-medium tracking-wide transition-colors',
            tab === 'oncall' ? 'bg-bg-elevated text-accent-gold' : 'text-text-secondary'
          )}
        >
          On call
        </button>
      </div>

      {viewAsBlocked ? (
        <p className="rounded-lg border border-accent-gold/30 bg-bg-surface px-3 py-2 text-xs text-text-secondary">
          You can only open another member&apos;s schedule from the directory if you have
          supervision access. Showing your schedule instead.
        </p>
      ) : null}
      {subjectName && !viewAsBlocked ? (
        <p className="text-xs text-text-secondary">
          Viewing schedule for <span className="font-medium text-text-primary">{subjectName}</span>
        </p>
      ) : null}

      {tab === 'my' ? (
        <>
          <div>
            <p className="font-heading text-xl font-semibold tabular-nums tracking-tight text-accent-gold">
              {longDateHeader(today)}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
              Today
            </p>
          </div>

          {todayEvents.length === 0 ? (
            <CompanionCard className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarDays className="size-10 text-accent-primary" strokeWidth={1.5} aria-hidden />
              <p className="font-heading text-sm font-semibold text-text-primary">No events today</p>
              <p className="font-sans text-xs text-text-secondary">
                You have nothing on the schedule for this date.
              </p>
            </CompanionCard>
          ) : (
            <ul className="space-y-2">
              {todayEvents.map((e) => (
                <li key={e.id}>
                  <CompanionCard className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CompanionEventTypeBadge type={e.event_type} />
                      <span className="font-medium text-text-primary">{e.title}</span>
                    </div>
                    <p className="font-heading text-xs tabular-nums text-accent-gold">{formatEventTime(e)}</p>
                    {e.notes?.trim() ? (
                      <p className="line-clamp-1 text-xs text-text-secondary">{e.notes.trim()}</p>
                    ) : null}
                  </CompanionCard>
                </li>
              ))}
            </ul>
          )}

          {futureDayKeys.length > 0 ? (
            <div className="space-y-4 pt-2">
              {futureDayKeys.map((key) => {
                const dayEvents = grouped.get(key) ?? []
                const [y, m, d] = key.split('-').map(Number)
                const label = new Date(y, (m ?? 1) - 1, d)
                return (
                  <section key={key}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
                      {label.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <ul className="space-y-2">
                      {dayEvents.map((e) => (
                        <li key={e.id}>
                          <CompanionCard className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <CompanionEventTypeBadge type={e.event_type} />
                              <span className="font-medium text-text-primary">{e.title}</span>
                            </div>
                            <p className="font-heading text-xs tabular-nums text-accent-gold">{formatEventTime(e)}</p>
                            {e.notes?.trim() ? (
                              <p className="line-clamp-1 text-xs text-text-secondary">
                                {e.notes.trim()}
                              </p>
                            ) : null}
                          </CompanionCard>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          ) : null}
        </>
      ) : (
        <OnCallBoard
          currentOnCall={currentOnCall}
          onCallPerson={onCallPerson}
          upcomingOnCall={upcomingOnCall}
          upcomingPeople={upcomingPeople}
        />
      )}
    </div>
  )
}

function OnCallBoard({
  currentOnCall,
  onCallPerson,
  upcomingOnCall,
  upcomingPeople,
}: Pick<
  CompanionScheduleViewProps,
  'currentOnCall' | 'onCallPerson' | 'upcomingOnCall' | 'upcomingPeople'
>) {
  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
          On call now
        </p>
        {currentOnCall && onCallPerson ? (
          <CompanionCard className="space-y-3 border-2 border-accent-gold/60">
            <p className="text-lg font-semibold text-text-primary">{onCallPerson.full_name}</p>
            <p className="font-mono text-sm text-text-secondary">
              {onCallPerson.badge_number ?? '—'}
            </p>
            {onCallPerson.phone_cell ? (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${onCallPerson.phone_cell.replace(/\s/g, '')}`}
                  className={cn(
                    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-accent-gold/50 bg-bg-elevated text-accent-gold'
                  )}
                  aria-label="Call on-duty detective"
                >
                  <Phone className="size-5" strokeWidth={1.75} />
                </a>
                <a
                  href={`tel:${onCallPerson.phone_cell.replace(/\s/g, '')}`}
                  className="text-sm text-accent-teal underline"
                >
                  {onCallPerson.phone_cell}
                </a>
              </div>
            ) : (
              <p className="text-xs text-text-secondary">No cell number on file.</p>
            )}
          </CompanionCard>
        ) : currentOnCall ? (
          <CompanionCard className="border-2 border-accent-gold/40">
            <p className="text-sm text-text-secondary">
              On-call is scheduled, but assignee details are not available in the directory.
            </p>
          </CompanionCard>
        ) : (
          <CompanionCard className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarDays className="size-10 text-accent-primary" strokeWidth={1.5} aria-hidden />
            <p className="font-heading text-sm font-semibold text-text-primary">No on-call scheduled</p>
            <p className="font-sans text-xs text-text-secondary">Contact supervision if you need coverage.</p>
          </CompanionCard>
        )}
      </section>

      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
          Upcoming on call
        </p>
        {upcomingOnCall.length === 0 ? (
          <CompanionCard className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarDays className="size-10 text-accent-primary" strokeWidth={1.5} aria-hidden />
            <p className="font-heading text-sm font-semibold text-text-primary">No upcoming on-call</p>
            <p className="font-sans text-xs text-text-secondary">Blocks will appear here when published.</p>
          </CompanionCard>
        ) : (
          <ul className="space-y-2">
            {upcomingOnCall.map((e) => {
              const p = upcomingPeople[e.assigned_to]
              return (
                <li key={e.id}>
                  <CompanionCard className="flex flex-col gap-2">
                    <p className="font-heading text-xs tabular-nums text-accent-gold">
                      {new Date(e.start_datetime).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="font-medium text-text-primary">{p?.full_name ?? 'Unknown'}</p>
                    {p?.phone_cell ? (
                      <a
                        href={`tel:${p.phone_cell.replace(/\s/g, '')}`}
                        className="inline-flex min-h-10 items-center gap-2 text-sm text-accent-teal underline"
                      >
                        <Phone className="size-4 shrink-0 text-accent-gold" strokeWidth={1.75} />
                        {p.phone_cell}
                      </a>
                    ) : (
                      <span className="text-xs text-text-secondary">No cell number</span>
                    )}
                  </CompanionCard>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
