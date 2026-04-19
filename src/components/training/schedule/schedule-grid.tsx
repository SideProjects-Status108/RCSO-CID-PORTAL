import Link from 'next/link'

import { resolveCellColor } from '@/lib/training/scheduling'
import type { ScheduleCell, ScheduleCellStatus, ScheduleRow } from '@/types/training'

type Props = {
  rows: ScheduleRow[]
  /** When true, clicking a cell routes to the DIT's weekly eval tab for that week. */
  linkCells?: boolean
}

const STATUS_LABELS: Record<ScheduleCellStatus, string> = {
  not_started: 'Not started',
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  suspended: 'Suspended',
  absent: 'Absent',
  no_pairing: 'No pairing',
}

/**
 * Cell ring tint communicates the weekly-eval state; the filled chip
 * communicates the FTO. This way the grid reads well at a glance
 * whether you're scanning "who's behind?" or "who's my DIT paired with
 * next week?".
 */
function statusRingClass(status: ScheduleCellStatus): string {
  switch (status) {
    case 'approved':
      return 'ring-2 ring-emerald-500/70'
    case 'submitted':
      return 'ring-2 ring-amber-500/70'
    case 'draft':
      return 'ring-2 ring-sky-500/60'
    case 'absent':
      return 'ring-2 ring-rose-500/60'
    case 'suspended':
      return 'ring-2 ring-slate-500/50'
    case 'no_pairing':
      return 'ring-1 ring-dashed ring-border-subtle'
    case 'not_started':
      return 'ring-1 ring-border-subtle'
  }
}

function cellOpacityClass(status: ScheduleCellStatus): string {
  if (status === 'suspended') return 'opacity-40 saturate-50'
  if (status === 'no_pairing') return 'opacity-60'
  return ''
}

function initialsFrom(name: string | null): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? '—'
  return `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase()
}

function Cell({
  cell,
  ditRecordId,
  linkCells,
}: {
  cell: ScheduleCell
  ditRecordId: string
  linkCells?: boolean
}) {
  const color = resolveCellColor(cell)
  const initials = initialsFrom(cell.fto_name)

  const label = [
    `Week ${cell.week_index} · ${cell.week_start}`,
    cell.fto_name ? `FTO: ${cell.fto_name}` : 'No FTO',
    STATUS_LABELS[cell.status],
  ].join(' · ')

  const content = (
    <div
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums text-white ${statusRingClass(cell.status)} ${cellOpacityClass(cell.status)}`}
      style={{
        backgroundColor: color ?? 'transparent',
        color: color ? '#0b1220' : undefined,
      }}
    >
      {cell.fto_id ? initials : '—'}
    </div>
  )

  if (!linkCells || !cell.session_id) return content
  return (
    <Link
      href={`/training/dit-files/${ditRecordId}?tab=weekly#week-${cell.week_index}`}
      className="inline-block"
    >
      {content}
    </Link>
  )
}

export function ScheduleGrid({ rows, linkCells = true }: Props) {
  const weekCount = rows[0]?.cells.length ?? 10
  const weekHeaders = Array.from({ length: weekCount }, (_, i) => i + 1)

  return (
    <div className="min-w-[780px]">
      <div
        className="grid items-center gap-1 text-xs text-text-secondary"
        style={{
          gridTemplateColumns: `minmax(160px, 220px) repeat(${weekCount}, minmax(44px, 1fr))`,
        }}
      >
        <div className="pb-2 text-xs uppercase tracking-wide text-text-secondary">DIT</div>
        {weekHeaders.map((w) => (
          <div key={`h-${w}`} className="pb-2 text-center tabular-nums">
            W{w}
          </div>
        ))}

        {rows.map((row) => (
          <RowCells key={row.dit_record_id} row={row} linkCells={linkCells} />
        ))}
      </div>

      <Legend />
    </div>
  )
}

function RowCells({ row, linkCells }: { row: ScheduleRow; linkCells: boolean }) {
  return (
    <>
      <div className="flex min-w-0 items-center justify-between gap-2 pr-2">
        <Link
          href={`/training/dit-files/${row.dit_record_id}`}
          className="truncate text-sm font-medium text-text-primary hover:underline"
        >
          {row.dit_name}
        </Link>
        <span className="shrink-0 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
          Ph {row.phase}
        </span>
      </div>
      {row.cells.map((c) => (
        <div key={`${row.dit_record_id}-${c.week_index}`} className="flex justify-center">
          <Cell cell={c} ditRecordId={row.dit_record_id} linkCells={linkCells} />
        </div>
      ))}
    </>
  )
}

function Legend() {
  const items: Array<{ label: string; ring: string }> = [
    { label: 'Approved', ring: 'ring-emerald-500/70' },
    { label: 'Submitted', ring: 'ring-amber-500/70' },
    { label: 'Draft', ring: 'ring-sky-500/60' },
    { label: 'Absent', ring: 'ring-rose-500/60' },
    { label: 'Suspended', ring: 'ring-slate-500/50' },
  ]
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1">
          <span className={`inline-block h-3 w-3 rounded-sm ring-2 ${i.ring}`} />
          {i.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded-sm ring-1 ring-dashed ring-border-subtle" />
        No pairing
      </span>
    </div>
  )
}
