import Link from 'next/link'
import { BookOpen, FolderPlus, Map, Scale } from 'lucide-react'

import type { DashboardData } from '@/lib/dashboard/load-dashboard'
import { UserRole } from '@/lib/auth/roles'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EventTypeBadge } from '@/components/app/event-type-badge'
import { DashboardActivityFeed } from '@/components/dashboard/dashboard-activity-feed'
import { DashboardCompanionPhoneLink } from '@/components/dashboard/dashboard-companion-phone-link'

type DashboardHomeProps = {
  data: DashboardData
  /** Absolute URL to companion schedule; only passed for admin / supervision roles. */
  companionPhoneUrl?: string
}

function StatCard({
  href,
  value,
  label,
}: {
  href: string
  value: number | string
  label: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'block rounded-lg border border-border-subtle bg-bg-surface p-5 pl-4',
        'border-l-[3px] border-l-accent-primary transition-colors',
        'hover:border-accent-primary/50 hover:bg-bg-elevated/30'
      )}
    >
      <p className="font-mono text-4xl font-semibold tracking-tight text-accent-primary tabular-nums">
        {value}
      </p>
      <p className="mt-2 font-sans text-sm font-medium text-text-secondary">{label}</p>
    </Link>
  )
}

function QuickActionCard({
  href,
  label,
  icon: Icon,
  disabled,
  disabledReason,
}: {
  href: string
  label: string
  icon: typeof Map
  disabled?: boolean
  disabledReason?: string
}) {
  const inner = (
    <>
      <Icon className="mx-auto size-10 text-accent-primary" strokeWidth={1.5} aria-hidden />
      <span className="mt-3 block text-center text-sm font-medium text-text-primary">{label}</span>
    </>
  )
  if (disabled) {
    return (
      <div
        title={disabledReason}
        className={cn(
          'rounded-lg border border-border-subtle bg-bg-surface p-6 opacity-40',
          'cursor-not-allowed select-none'
        )}
      >
        {inner}
      </div>
    )
  }
  return (
    <Link
      href={href}
      className={cn(
        'rounded-lg border border-border-subtle bg-bg-surface p-6 transition-colors',
        'hover:border-accent-primary hover:bg-bg-elevated'
      )}
    >
      {inner}
    </Link>
  )
}

export function DashboardHome({ data, companionPhoneUrl }: DashboardHomeProps) {
  const {
    role,
    supervisionPlus,
    currentOnCall,
    onCallPerson,
    myTodayEvents,
    openRequestsCount,
    myOpenRequestsCount,
    activeCasesCount,
    pendingFormsCount,
    activeDitsCount,
    upcomingEventsCount,
    upcomingEvents,
    recentNotifications,
  } = data

  const canCreateCase = role !== UserRole.dit

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-text-primary">
          Operations HQ
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          At-a-glance command view: workload, activity, schedule, and shortcuts.
        </p>
      </div>

      {companionPhoneUrl ? <DashboardCompanionPhoneLink url={companionPhoneUrl} /> : null}

      <section aria-label="Key metrics">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard href="/operations/cases" value={activeCasesCount} label="Open cases" />
          <StatCard
            href="/operations/forms"
            value={pendingFormsCount}
            label="Pending forms"
          />
          <StatCard
            href="/training"
            value={activeDitsCount}
            label="Active DIT trainees"
          />
          <StatCard
            href="/operations/schedules"
            value={upcomingEventsCount}
            label="Upcoming events (7 days)"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <section
          className={cn(
            'rounded-lg border border-border-subtle bg-bg-surface p-5',
            'lg:col-span-3'
          )}
          aria-label="Recent activity"
        >
          <h2 className="border-b border-border-subtle pb-3 font-heading text-xs font-medium uppercase tracking-wide text-text-secondary">
            Recent activity
          </h2>
          <DashboardActivityFeed initial={recentNotifications} />
        </section>

        <section
          className={cn(
            'rounded-lg border border-border-subtle bg-bg-surface p-5',
            'lg:col-span-2'
          )}
          aria-label="Upcoming events"
        >
          <h2 className="border-b border-border-subtle pb-3 font-heading text-xs font-medium uppercase tracking-wide text-text-secondary">
            Upcoming events
          </h2>
          <ul className="mt-3 space-y-3">
            {upcomingEvents.length === 0 ? (
              <li className="py-4 text-center text-sm text-text-secondary">
                No published events in the next 7 days.
              </li>
            ) : (
              upcomingEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-1.5 border-b border-border-subtle/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <EventTypeBadge type={e.event_type} />
                    <span className="min-w-0 flex-1 font-medium text-text-primary">{e.title}</span>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {new Date(e.start_datetime).toLocaleString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section aria-label="Quick actions">
        <h2 className="mb-4 font-heading text-xs font-medium uppercase tracking-wide text-text-secondary">
          Quick actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard
            href="/operations/cases"
            label="New case report"
            icon={FolderPlus}
            disabled={!canCreateCase}
            disabledReason="DIT trainees cannot create cases."
          />
          <QuickActionCard href="/operations/forms" label="Submit form" icon={BookOpen} />
          <QuickActionCard href="/tools/map" label="GeoMap" icon={Map} />
          <QuickActionCard href="/tools/tca" label="TCA lookup" icon={Scale} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
          <h2 className="font-heading text-xs font-medium uppercase tracking-wide text-text-secondary">
            On call now
          </h2>
          {currentOnCall && onCallPerson ? (
            <div className="mt-3 space-y-1">
              <p className="text-lg font-semibold text-text-primary">{onCallPerson.full_name}</p>
              <p className="font-mono text-sm text-accent-primary">
                {onCallPerson.badge_number ?? '—'}
              </p>
              <p className="text-sm text-accent-teal">{onCallPerson.phone_cell ?? '—'}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-secondary">No active on-call block right now.</p>
          )}
        </section>

        <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
          <h2 className="font-heading text-xs font-medium uppercase tracking-wide text-text-secondary">
            My schedule today
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {myTodayEvents.length === 0 ? (
              <li className="text-text-secondary">No published events today.</li>
            ) : (
              myTodayEvents.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2">
                  <EventTypeBadge type={e.event_type} />
                  <span className="text-text-primary">{e.title}</span>
                  <span className="font-mono text-xs text-accent-primary">
                    {new Date(e.start_datetime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {supervisionPlus && openRequestsCount > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3">
          <span className="text-sm text-text-secondary">Open unit requests</span>
          <span className="font-mono text-lg text-accent-primary">{openRequestsCount}</span>
          <Link
            href="/operations/requests"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'border-accent-teal/40 text-accent-teal'
            )}
          >
            Open requests
          </Link>
        </div>
      ) : null}

      {!supervisionPlus && role !== UserRole.dit && myOpenRequestsCount > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3">
          <span className="text-sm text-text-secondary">My open requests</span>
          <span className="font-mono text-lg text-accent-primary">{myOpenRequestsCount}</span>
          <Link
            href="/operations/requests"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'border-accent-teal/40 text-accent-teal'
            )}
          >
            Inbox
          </Link>
        </div>
      ) : null}

      {role === UserRole.fto && data.myDitForFto ? (
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
          <h2 className="font-heading text-xs font-medium uppercase tracking-wide text-text-secondary">
            My DIT
          </h2>
          <p className="mt-2 text-lg font-semibold text-text-primary">{data.myDitForFto.ditName}</p>
          <p className="text-sm text-text-secondary">Phase {data.myDitForFto.phase}</p>
          <Link
            href="/training"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'mt-3 border-accent-teal/40 text-accent-teal'
            )}
          >
            Training
          </Link>
        </div>
      ) : null}

      {role === UserRole.dit ? (
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
          <h2 className="font-heading text-xs font-medium uppercase tracking-wide text-text-secondary">
            Training progress
          </h2>
          <p className="mt-2 font-mono text-3xl text-accent-primary">
            {data.ditMilestonePercent != null ? `${data.ditMilestonePercent}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-text-secondary">Milestone completion</p>
          <Link
            href="/training"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'mt-3 border-accent-teal/40 text-accent-teal'
            )}
          >
            View training
          </Link>
        </div>
      ) : null}
    </div>
  )
}
