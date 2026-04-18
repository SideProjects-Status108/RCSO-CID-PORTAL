import Link from 'next/link'
import { AlertTriangle, CalendarClock, CircleDashed, Pause, Phone, User2 } from 'lucide-react'

import type { DitFilesOverviewRow, DitTileHealth } from '@/lib/training/dit-overview'

const HEALTH_STYLES: Record<
  DitTileHealth,
  { dot: string; ring: string; label: string; chip: string }
> = {
  green: {
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/20',
    label: 'On track',
    chip: 'bg-emerald-500/10 text-emerald-400',
  },
  amber: {
    dot: 'bg-amber-400',
    ring: 'ring-amber-400/20',
    label: 'Needs attention',
    chip: 'bg-amber-400/10 text-amber-300',
  },
  red: {
    dot: 'bg-red-500',
    ring: 'ring-red-500/30',
    label: 'At risk',
    chip: 'bg-red-500/10 text-red-400',
  },
  gray: {
    dot: 'bg-neutral-500',
    ring: 'ring-neutral-500/20',
    label: 'No signal',
    chip: 'bg-neutral-500/10 text-neutral-300',
  },
}

export function DitTile({ row }: { row: DitFilesOverviewRow }) {
  const style = HEALTH_STYLES[row.health]
  const suspended = row.status === 'suspended'
  const onHold = row.status === 'on_hold'
  const paused = suspended || onHold

  return (
    <Link
      href={`/training/dit-files/${row.dit_record_id}`}
      className={`group relative flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4 ring-1 ring-inset ${style.ring} transition hover:border-border-subtle hover:bg-bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${paused ? 'opacity-80' : ''}`}
    >
      {/* Status ribbon for paused states */}
      {paused ? (
        <span
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-neutral-800/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-200"
          aria-label={suspended ? 'Suspended' : 'On hold'}
        >
          <Pause className="h-3 w-3" />
          {suspended ? 'Suspended' : 'On hold'}
        </span>
      ) : null}

      <div className="flex items-start gap-3">
        <span
          className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
          aria-label={style.label}
          title={style.label}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-semibold text-text-primary">{row.dit_name}</span>
            {row.badge_number ? (
              <span className="text-xs text-text-secondary">#{row.badge_number}</span>
            ) : null}
          </div>
          <div className="mt-0.5 text-xs text-text-secondary">
            Phase {row.current_phase} · Week {row.weeks_in_program}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <ScoreCell avgScore={row.avg_score} />
        <div>
          <dt className="text-text-secondary">Unobserved</dt>
          <dd className="font-medium text-text-primary">
            {row.unobserved_recent > 0 ? (
              <span className="inline-flex items-center gap-1">
                <CircleDashed className="h-3 w-3 text-amber-400" />
                {row.unobserved_recent}
              </span>
            ) : (
              <span className="text-text-secondary">0</span>
            )}
          </dd>
        </div>
        {row.open_deficiencies > 0 ? (
          <div className="col-span-2">
            <dt className="text-text-secondary">Deficiency</dt>
            <dd className="inline-flex items-center gap-1 font-medium text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              {row.open_deficiencies} open
            </dd>
          </div>
        ) : null}
        {row.expected_graduation_date ? (
          <div className="col-span-2">
            <dt className="text-text-secondary">Expected grad</dt>
            <dd className="inline-flex items-center gap-1 font-medium text-text-secondary">
              <CalendarClock className="h-3 w-3" />
              {row.expected_graduation_date}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-auto border-t border-border-subtle pt-3">
        <div className="flex items-center gap-2 text-xs">
          <User2 className="h-3.5 w-3.5 text-text-secondary" />
          <span className="truncate font-medium text-text-secondary">
            {row.fto_name ?? <span className="italic">No active FTO</span>}
          </span>
          {row.fto_phone_cell ? (
            <span
              className="ml-auto inline-flex items-center gap-1 text-text-secondary"
              title={row.fto_phone_cell}
            >
              <Phone className="h-3 w-3" />
              {row.fto_phone_cell}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

function ScoreCell({ avgScore }: { avgScore: number | null }) {
  return (
    <div>
      <dt className="text-text-secondary">Avg score</dt>
      <dd className="font-medium text-text-primary">
        {avgScore == null ? (
          <span className="text-text-secondary">—</span>
        ) : (
          avgScore.toFixed(2)
        )}
      </dd>
    </div>
  )
}
