'use client'

import { useMemo, useCallback } from 'react'

import { ActivityLogger } from '@/components/training/activity-logger'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type DitDashboardScore = {
  score: number | null
  explanation: string | null
  prior_week_score: number | null
}

export type DitDashboardPayload = {
  weekLabel: string
  anchor_week_start: string
  anchor_week_end: string
  pairingId: string
  ftoName: string
  ditName: string
  session: {
    id: string
    status: 'draft' | 'submitted' | 'approved'
    week_start_date: string
    week_end_date: string
  } | null
  ratedCount: number
  totalCompetencies: number
  notObservedCount: number
  masters: { key: string; label: string; category: string; sort_order: number; description: string | null }[]
  scoresByKey: Record<string, DitDashboardScore>
  unobserved: {
    id: string
    competency_key: string
    competency_label: string
    created_at: string
    days_since: number | null
  }[]
  weekActivities: { id: string; exposure_date: string; role: string; fto_name: string }[]
  trend: { week_start_date: string; scores: Record<string, number | null> }[]
  trendKeys: { key: string; label: string }[]
  coaching: {
    formId: string
    status: string
    competencies: string
    coordinatorName: string
    meetingWhen: string | null
    plan: string | null
  }[]
  excellence: { competency_label: string; explanation: string; created_at: string }[]
  dit_record_id: string | null
  default_fto_id: string
  fto_options: { id: string; name: string }[]
}

function scoreTone(score: number | null): string {
  if (score == null) return 'border-border-subtle bg-bg-elevated text-text-secondary'
  if (score <= 2) return 'border-red-500/40 bg-red-950/30 text-red-100'
  if (score === 3) return 'border-amber-500/40 bg-amber-950/25 text-amber-100'
  return 'border-emerald-500/40 bg-emerald-950/25 text-emerald-100'
}

function TrendArrow({ cur, prev }: { cur: number | null; prev: number | null }) {
  if (cur == null || prev == null) return <span className="text-text-disabled">—</span>
  if (cur > prev) return <span aria-label="improved">↑</span>
  if (cur < prev) return <span aria-label="declined">↓</span>
  return <span aria-label="unchanged">→</span>
}

export function DitDashboardView({ data }: { data: DitDashboardPayload }) {
  const exportBlob = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dit-training-${data.session?.week_start_date ?? 'snapshot'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [data])

  const mailtoShare = useMemo(() => {
    const subject = encodeURIComponent(`Weekly training snapshot — ${data.weekLabel}`)
    const body = encodeURIComponent(
      `DIT: ${data.ditName}\nFTO: ${data.ftoName}\nWeek: ${data.weekLabel}\nRated: ${data.ratedCount}/${data.totalCompetencies}\nNot observed: ${data.notObservedCount}\n`
    )
    return `mailto:?subject=${subject}&body=${body}`
  }, [data])

  const sessionStatusBadge =
    data.session?.status === 'approved'
      ? 'Approved'
      : data.session?.status === 'submitted'
        ? 'Submitted'
        : data.session?.status === 'draft'
          ? 'Draft'
          : 'No session'

  return (
    <div className="dit-dashboard-print space-y-8 print:bg-white print:text-black">
      <div className="flex flex-col gap-4 print:hidden md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">DIT weekly progress</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Snapshot for <span className="font-medium text-text-primary">{data.weekLabel}</span> with{' '}
            <span className="font-medium text-text-primary">{data.ftoName}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            Print
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportBlob}>
            Download JSON
          </Button>
          <a
            href={mailtoShare}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
          >
            Share with FTO
          </a>
        </div>
      </div>

      <section className="rounded-xl border border-border-subtle bg-bg-surface p-4 print:border print:border-neutral-300">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">This week</p>
            <p className="text-lg font-semibold text-text-primary">{data.ditName}</p>
            <p className="text-sm text-text-secondary">
              FTO: <span className="text-text-primary">{data.ftoName}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs font-medium uppercase tracking-wide text-text-secondary">
              {sessionStatusBadge}
            </span>
            <p className="mt-2 font-mono text-xs text-text-secondary">
              Rated {data.ratedCount}/{data.totalCompetencies} · Not observed: {data.notObservedCount}
            </p>
          </div>
        </div>
      </section>

      {data.coaching.length > 0 ? (
        <section className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 print:border-amber-700">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-amber-100">
            Coaching / deficiency status
          </h2>
          <ul className="mt-3 space-y-3 text-sm">
            {data.coaching.map((c) => (
              <li key={c.formId} className="rounded-lg border border-amber-500/20 bg-bg-app/80 p-3">
                <p className="font-medium text-text-primary">{c.competencies}</p>
                <p className="text-xs text-text-secondary">
                  Coordinator: {c.coordinatorName} · Status: {c.status.replaceAll('_', ' ')}
                </p>
                {c.meetingWhen ? (
                  <p className="mt-1 text-xs text-text-primary">Meeting: {c.meetingWhen}</p>
                ) : null}
                {c.plan ? <p className="mt-2 text-xs text-text-primary">{c.plan}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
          Competencies
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.masters.map((m) => {
            const row = data.scoresByKey[m.key] ?? {
              score: null,
              explanation: null,
              prior_week_score: null,
            }
            const needsExpl = row.score === 1 || row.score === 2 || row.score === 5
            return (
              <details
                key={m.key}
                className={cn('rounded-lg border p-3 text-sm', scoreTone(row.score))}
              >
                <summary className="cursor-pointer list-none font-medium text-text-primary [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    <span>{m.label}</span>
                    <span className="flex items-center gap-2 font-mono text-xs">
                      <TrendArrow cur={row.score} prev={row.prior_week_score} />
                      <span>{row.score ?? '—'}</span>
                    </span>
                  </span>
                </summary>
                <p className="mt-2 text-xs text-text-secondary">{m.category}</p>
                {needsExpl ? (
                  <div className="mt-2 space-y-1 text-xs">
                    {(row.score === 1 || row.score === 2) && (
                      <p>
                        <span className="font-medium">Development (1–2):</span>{' '}
                        {row.explanation?.trim() || '—'}
                      </p>
                    )}
                    {row.score === 5 && (
                      <p>
                        <span className="font-medium">Excellence (5):</span> {row.explanation?.trim() || '—'}
                      </p>
                    )}
                  </div>
                ) : null}
                <div className="mt-3 border-t border-white/10 pt-2 text-xs text-text-secondary">
                  <p className="font-medium text-text-primary/90">Related activities (this week)</p>
                  <p className="mt-1">
                    {data.weekActivities.length
                      ? 'Activities are not keyed to individual competencies in the system; review this week’s log below for context.'
                      : 'No activities logged for this week yet.'}
                  </p>
                </div>
              </details>
            )
          })}
        </div>
      </section>

      {data.trend.length > 0 && data.trendKeys.length > 0 ? (
        <section>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
            Four-week score trend (selected competencies)
          </h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full min-w-[28rem] text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
                  <th className="px-2 py-2">Week starting</th>
                  {data.trendKeys.map((k) => (
                    <th key={k.key} className="px-2 py-2">
                      {k.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.trend.map((w) => (
                  <tr key={w.week_start_date} className="border-b border-border-subtle/60">
                    <td className="px-2 py-2 font-mono text-text-secondary">{w.week_start_date}</td>
                    {data.trendKeys.map((k) => (
                      <td key={k.key} className="px-2 py-2 font-mono">
                        {w.scores[k.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
          Not observed
        </h2>
        {data.unobserved.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">No unobserved rows for this snapshot.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {data.unobserved.map((u) => (
              <li
                key={u.id || u.competency_key}
                className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-text-primary">{u.competency_label}</p>
                  <p className="text-xs text-text-secondary">
                    Days since marked: {u.days_since != null ? u.days_since : '—'} · FTO: {data.ftoName}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data.dit_record_id ? (
          <div className="mt-4 print:hidden">
            <p className="mb-2 text-xs text-text-secondary">Log an exposure for this week (counts toward DIT activity log).</p>
            <ActivityLogger
              dit_record_id={data.dit_record_id}
              week_start_date={data.anchor_week_start}
              week_end_date={data.anchor_week_end}
              default_fto_id={data.default_fto_id}
              fto_options={data.fto_options}
            />
          </div>
        ) : null}
      </section>

      {data.weekActivities.length > 0 ? (
        <section>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
            This week’s activities
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-text-secondary">
            {data.weekActivities.map((a) => (
              <li key={a.id}>
                {a.exposure_date} · {a.role} · FTO {a.fto_name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.excellence.length > 0 ? (
        <section>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
            Excellence highlights
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {data.excellence.map((e, i) => (
              <li key={`${e.competency_label}-${i}`} className="rounded-md border border-emerald-500/20 bg-emerald-950/15 p-2">
                <p className="font-medium text-text-primary">{e.competency_label}</p>
                <p className="text-xs text-text-secondary">{new Date(e.created_at).toLocaleString()}</p>
                <p className="mt-1 text-xs text-text-primary">{e.explanation}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
