import { ArrowDown, ArrowRight, ArrowUp, Minus } from 'lucide-react'

import type { DitDetailPayload } from '@/lib/training/dit-detail'
import {
  computeTrajectory,
  isOnTrackForGraduation,
  TRAJECTORY_LABELS,
  trendArrow,
  type TrendDirection,
} from '@/lib/training/scoring'

import { VarkResultsCard } from './vark-results-card'

function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <ArrowUp className="h-4 w-4 text-emerald-400" aria-label="Up" />
  if (direction === 'down') return <ArrowDown className="h-4 w-4 text-red-400" aria-label="Down" />
  if (direction === 'flat') return <Minus className="h-4 w-4 text-text-secondary" aria-label="Flat" />
  return <ArrowRight className="h-4 w-4 text-text-secondary" aria-label="Unknown" />
}

export function DitOverviewTab({ payload }: { payload: DitDetailPayload }) {
  const { weekSummaries, milestoneProgress, openDeficiencies, recentUnobserved, record } = payload

  const { trajectory, meanScore } = computeTrajectory(weekSummaries)
  const onTrack = isOnTrackForGraduation({
    trajectory,
    expected_graduation_date: record.expected_graduation_date,
    open_deficiencies: openDeficiencies,
    status: record.status,
  })

  const trend = trendArrow(
    weekSummaries[0]?.avg_score ?? null,
    weekSummaries[1]?.avg_score ?? null
  )

  const milestonePct =
    milestoneProgress.total > 0
      ? Math.round((milestoneProgress.completed / milestoneProgress.total) * 100)
      : 0

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <VarkResultsCard ditRecordId={record.id} />

      <Card title="Trajectory">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold text-text-primary">
            {meanScore != null ? meanScore.toFixed(2) : '—'}
          </span>
          <TrendIcon direction={trend} />
        </div>
        <p className="mt-1 text-xs text-text-secondary">{TRAJECTORY_LABELS[trajectory]}</p>
        <p className="mt-0.5 text-[11px] text-text-secondary">
          Rolling mean of the last {Math.min(3, weekSummaries.length)} submitted weeks
        </p>
      </Card>

      <Card title="On track for graduation">
        <span className={`text-lg font-semibold ${onTrack ? 'text-emerald-400' : 'text-amber-300'}`}>
          {onTrack ? 'Yes' : 'Not yet'}
        </span>
        <p className="mt-1 text-xs text-text-secondary">
          {record.expected_graduation_date
            ? `Expected: ${record.expected_graduation_date}`
            : 'No expected date set'}
        </p>
      </Card>

      <Card title="Milestones">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold text-text-primary">
            {milestoneProgress.completed}
          </span>
          <span className="text-sm text-text-secondary">/ {milestoneProgress.total || '—'}</span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated"
          role="progressbar"
          aria-valuenow={milestonePct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-accent-primary transition-all"
            style={{ width: `${milestonePct}%` }}
          />
        </div>
      </Card>

      <Card title="Open deficiencies">
        <span
          className={`text-2xl font-semibold ${openDeficiencies > 0 ? 'text-amber-300' : 'text-text-primary'}`}
        >
          {openDeficiencies}
        </span>
        <p className="mt-1 text-xs text-text-secondary">
          Escalations still awaiting resolution
        </p>
      </Card>

      <Card title="Recent unobserved">
        <span
          className={`text-2xl font-semibold ${recentUnobserved >= 4 ? 'text-amber-300' : 'text-text-primary'}`}
        >
          {recentUnobserved}
        </span>
        <p className="mt-1 text-xs text-text-secondary">
          Competencies not yet seen in the last 2 weeks
        </p>
      </Card>

      <Card title="Score history" className="md:col-span-2 lg:col-span-3">
        {weekSummaries.length === 0 ? (
          <p className="text-xs text-text-secondary">
            No submitted weekly evaluations yet.
          </p>
        ) : (
          <ol className="divide-y divide-border-subtle text-sm">
            {weekSummaries.map((w) => (
              <li key={w.week_start_date} className="flex items-center justify-between py-2">
                <span className="text-text-secondary">Week of {w.week_start_date}</span>
                <span className="font-semibold text-text-primary">
                  {w.sample_count > 0 ? w.avg_score.toFixed(2) : '—'}
                  <span className="ml-2 text-[11px] font-normal text-text-secondary">
                    {w.sample_count} competenc{w.sample_count === 1 ? 'y' : 'ies'}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}

function Card({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-lg border border-border-subtle bg-bg-surface p-4 ${className ?? ''}`}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}
