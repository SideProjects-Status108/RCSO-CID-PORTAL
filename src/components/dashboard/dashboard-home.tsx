import Link from 'next/link'
import {
  BookOpen,
  Bell,
  Calendar,
  GraduationCap,
  Users,
} from 'lucide-react'

import type { DashboardData } from '@/lib/dashboard/load-dashboard'
import { UserRole } from '@/lib/auth/roles'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EventTypeBadge } from '@/components/app/event-type-badge'
import { StatusStamp } from '@/components/app/status-stamp'

type DashboardHomeProps = {
  data: DashboardData
}

export function DashboardHome({ data }: DashboardHomeProps) {
  const { role, supervisionPlus, currentOnCall, onCallPerson, myTodayEvents, unitWeek } =
    data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Operational snapshot for CID: on-call, your schedule, and shortcuts.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border-2 border-accent-gold/50 bg-bg-surface p-4 lg:col-span-2">
          <div className="border-t-2 border-accent-gold pt-1">
            <h2 className="text-xs font-semibold tracking-wide text-accent-gold uppercase">
              On call right now
            </h2>
          </div>
          {currentOnCall && onCallPerson ? (
            <div className="mt-3 space-y-1">
              <p className="text-2xl font-semibold text-text-primary">
                {onCallPerson.full_name}
              </p>
              <p className="font-mono text-lg text-accent-gold">
                {onCallPerson.badge_number ?? '—'}
              </p>
              <p className="text-xl text-accent-teal">
                {onCallPerson.phone_cell ?? '—'}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-secondary">
              No active on-call assignment in the schedule.
            </p>
          )}
        </section>

        {role === UserRole.dit ? (
          <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <div className="border-t-2 border-accent-gold pt-1">
              <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
                My training progress
              </h2>
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              Training milestones and evaluations will appear here after the Training
              module is enabled.
            </p>
          </section>
        ) : null}

        <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
          <div className="border-t-2 border-accent-gold pt-1">
            <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
              My schedule today
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {myTodayEvents.length === 0 ? (
              <li className="text-text-secondary">No published events today.</li>
            ) : (
              myTodayEvents.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2">
                  <EventTypeBadge type={e.event_type} />
                  <span className="text-text-primary">{e.title}</span>
                  <span className="font-mono text-xs text-accent-gold">
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

        {supervisionPlus ? (
          <section className="rounded-lg border border-border-subtle bg-bg-surface p-4 lg:col-span-2">
            <div className="border-t-2 border-accent-gold pt-1">
              <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
                Open requests
              </h2>
            </div>
            <p className="mt-3 font-mono text-3xl text-accent-gold">
              {data.openRequestsCount}
            </p>
            <Link
              href="/requests"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'mt-2 border-accent-teal/40 text-accent-teal'
              )}
            >
              Go to requests
            </Link>
          </section>
        ) : role !== UserRole.dit ? (
          <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <div className="border-t-2 border-accent-gold pt-1">
              <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
                My open requests
              </h2>
            </div>
            <p className="mt-3 font-mono text-3xl text-accent-gold">
              {data.myOpenRequestsCount}
            </p>
            <Link
              href="/requests"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'mt-2 border-accent-teal/40 text-accent-teal'
              )}
            >
              Requests inbox
            </Link>
          </section>
        ) : null}

        {supervisionPlus ? (
          <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <div className="border-t-2 border-accent-gold pt-1">
              <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
                Upcoming this week (unit)
              </h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {unitWeek.length === 0 ? (
                <li className="text-text-secondary">No published events this week.</li>
              ) : (
                unitWeek.map((e) => (
                  <li key={e.id} className="flex flex-col gap-0.5 border-b border-border-subtle pb-2 last:border-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <EventTypeBadge type={e.event_type} />
                      <span className="font-medium text-text-primary">{e.title}</span>
                    </div>
                    <span className="text-xs text-text-secondary">
                      {new Date(e.start_datetime).toLocaleString()}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
        ) : null}

        <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
          <div className="border-t-2 border-accent-gold pt-1">
            <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
              Recent forms
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {data.recentForms.length === 0 ? (
              <li className="text-text-secondary">No submissions yet.</li>
            ) : (
              data.recentForms.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-accent-gold">{f.id.slice(0, 8)}</span>
                  <StatusStamp variant="teal">{f.status}</StatusStamp>
                  <span className="text-xs text-text-secondary">
                    {new Date(f.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-border-subtle bg-bg-surface p-4 lg:col-span-3">
          <div className="border-t-2 border-accent-gold pt-1">
            <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
              Quick links
            </h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <QuickLink href="/schedule" label="Schedule" icon={Calendar} />
            <QuickLink href="/directory" label="Directory" icon={Users} />
            <QuickLink href="/requests" label="Requests" icon={Bell} />
            <QuickLink href="/tn-code" label="TN Code" icon={BookOpen} />
            <QuickLink href="/training" label="Training" icon={GraduationCap} />
          </div>
        </section>
      </div>
    </div>
  )
}

function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: typeof Calendar
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: 'outline', size: 'default' }),
        'border-border-subtle bg-bg-elevated text-text-primary hover:border-accent-teal/40 hover:text-accent-teal'
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
      {label}
    </Link>
  )
}
