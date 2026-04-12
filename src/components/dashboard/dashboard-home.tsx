import Link from 'next/link'
import {
  BookOpen,
  Bell,
  Calendar,
  Folder,
  GraduationCap,
  Users,
} from 'lucide-react'

import type { DashboardData } from '@/lib/dashboard/load-dashboard'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EventTypeBadge } from '@/components/app/event-type-badge'
import { StatusStamp } from '@/components/app/status-stamp'
import { submissionStatusForStamp } from '@/lib/forms/submission-status-display'

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
        <section className="rounded-lg border-2 border-accent-primary/50 bg-bg-surface p-4 lg:col-span-2">
          <div className="border-t-2 border-accent-primary pt-1">
            <h2 className="text-xs font-semibold tracking-wide text-accent-primary uppercase">
              On call right now
            </h2>
          </div>
          {currentOnCall && onCallPerson ? (
            <div className="mt-3 space-y-1">
              <p className="text-2xl font-semibold text-text-primary">
                {onCallPerson.full_name}
              </p>
              <p className="font-mono text-lg text-accent-primary">
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
            <div className="border-t-2 border-accent-primary pt-1">
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
          <div className="border-t-2 border-accent-primary pt-1">
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

        {supervisionPlus ? (
          <section className="rounded-lg border border-border-subtle bg-bg-surface p-4 lg:col-span-2">
            <div className="border-t-2 border-accent-primary pt-1">
              <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
                Open requests
              </h2>
            </div>
            <p className="mt-3 font-mono text-3xl text-accent-primary">
              {data.openRequestsCount}
            </p>
            <Link
              href="/operations/requests"
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
            <div className="border-t-2 border-accent-primary pt-1">
              <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
                My open requests
              </h2>
            </div>
            <p className="mt-3 font-mono text-3xl text-accent-primary">
              {data.myOpenRequestsCount}
            </p>
            <Link
              href="/operations/requests"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'mt-2 border-accent-teal/40 text-accent-teal'
              )}
            >
              Requests inbox
            </Link>
          </section>
        ) : null}

        {role !== UserRole.dit ? (
          <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <div className="border-t-2 border-accent-primary pt-1">
              <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
                Active cases
              </h2>
            </div>
            <p className="mt-3 font-mono text-3xl text-accent-primary">
              {data.activeCasesCount}
            </p>
            <Link
              href="/operations/cases"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'mt-2 border-accent-teal/40 text-accent-teal'
              )}
            >
              Open operations
            </Link>
          </section>
        ) : null}

        {hasRole(role, [
          UserRole.admin,
          UserRole.supervision_admin,
          UserRole.supervision,
          UserRole.fto_coordinator,
        ]) ? (
          <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <div className="border-t-2 border-accent-primary pt-1">
              <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
                Active DITs
              </h2>
            </div>
            <p className="mt-3 font-mono text-3xl text-accent-primary">{data.activeDitsCount}</p>
            <Link
              href="/training"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'mt-2 border-accent-teal/40 text-accent-teal'
              )}
            >
              Training
            </Link>
          </section>
        ) : null}

        {role === UserRole.fto ? (
          <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <div className="border-t-2 border-accent-primary pt-1">
              <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
                My DIT
              </h2>
            </div>
            {data.myDitForFto ? (
              <>
                <p className="mt-3 text-lg font-semibold text-text-primary">{data.myDitForFto.ditName}</p>
                <p className="mt-1 text-sm text-text-secondary">Phase {data.myDitForFto.phase}</p>
                <Link
                  href="/training"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'mt-2 border-accent-teal/40 text-accent-teal'
                  )}
                >
                  Open training
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-text-secondary">No active DIT pairing.</p>
            )}
          </section>
        ) : null}

        {role === UserRole.dit ? (
          <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <div className="border-t-2 border-accent-primary pt-1">
              <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
                My progress
              </h2>
            </div>
            <p className="mt-3 font-mono text-3xl text-accent-primary">
              {data.ditMilestonePercent != null ? `${data.ditMilestonePercent}%` : '—'}
            </p>
            <p className="mt-1 text-xs text-text-secondary">Milestone completion</p>
            <Link
              href="/training"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'mt-2 border-accent-teal/40 text-accent-teal'
              )}
            >
              View training
            </Link>
          </section>
        ) : null}

        {supervisionPlus ? (
          <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <div className="border-t-2 border-accent-primary pt-1">
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
          <div className="border-t-2 border-accent-primary pt-1">
            <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
              Recent forms
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {data.recentForms.length === 0 ? (
              <li className="text-text-secondary">No submissions yet.</li>
            ) : (
              data.recentForms.map((f) => {
                const st = submissionStatusForStamp(
                  f.status as 'draft' | 'submitted' | 'approved' | 'rejected'
                )
                return (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle/60 py-1.5 last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-text-primary">
                      {f.template_name ?? 'Form'}
                    </span>
                    <StatusStamp variant={st.variant}>{st.label}</StatusStamp>
                    <span className="font-mono text-xs text-text-secondary">
                      {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </li>
                )
              })
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-border-subtle bg-bg-surface p-4 lg:col-span-3">
          <div className="border-t-2 border-accent-primary pt-1">
            <h2 className="text-xs font-semibold tracking-wide text-text-primary uppercase">
              Quick links
            </h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <QuickLink href="/operations/schedules" label="Schedule" icon={Calendar} />
            <QuickLink href="/operations/cases" label="Operations" icon={Folder} />
            <QuickLink href="/personnel" label="Directory" icon={Users} />
            <QuickLink href="/operations/requests" label="Requests" icon={Bell} />
            <QuickLink href="/tools/tca" label="TN Code" icon={BookOpen} />
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
