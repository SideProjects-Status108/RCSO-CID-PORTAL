import { Users } from 'lucide-react'

import { fetchDitFilesOverview } from '@/lib/training/dit-overview'

import { DitTile } from './dit-tile'

export async function DitGrid() {
  const rows = await fetchDitFilesOverview()

  const active = rows.filter((r) => r.status === 'active')
  const paused = rows.filter((r) => r.status === 'suspended' || r.status === 'on_hold')

  if (rows.length === 0) {
    return (
      <section className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
        <Users className="mx-auto h-8 w-8 text-text-tertiary" aria-hidden />
        <h2 className="mt-3 text-sm font-semibold text-text-primary">No active DITs</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Onboard a new Detective in Training from the dashboard to see them here.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      {active.length > 0 ? (
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              Active ({active.length})
            </h2>
            <Legend />
          </header>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {active.map((row) => (
              <DitTile key={row.dit_record_id} row={row} />
            ))}
          </div>
        </section>
      ) : null}

      {paused.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary">
            Paused ({paused.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paused.map((row) => (
              <DitTile key={row.dit_record_id} row={row} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-3 text-[11px] text-text-tertiary">
      <LegendDot className="bg-emerald-500" label="On track" />
      <LegendDot className="bg-amber-400" label="Needs attention" />
      <LegendDot className="bg-red-500" label="At risk" />
      <LegendDot className="bg-neutral-500" label="No signal / paused" />
    </ul>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${className}`} />
      {label}
    </li>
  )
}
