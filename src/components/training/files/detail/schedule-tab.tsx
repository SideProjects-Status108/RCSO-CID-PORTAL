import { ScheduleGrid } from '@/components/training/schedule/schedule-grid'
import { fetchDitRecordById } from '@/lib/training/queries'
import { buildScheduleRowsForDits } from '@/lib/training/schedule-data'
import { fetchProgramConfig } from '@/lib/training/program-config'

/**
 * Per-DIT schedule tab: one-row grid for this DIT. Reuses the shared
 * schedule renderer so we don't diverge from the global /training/schedule
 * view.
 */
export async function ScheduleTab({ ditRecordId }: { ditRecordId: string }) {
  const record = await fetchDitRecordById(ditRecordId)
  if (!record) return null

  const cfg = await fetchProgramConfig()
  const rows = await buildScheduleRowsForDits([record], {
    weekCount: cfg.program_week_count,
  })

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        10-week rotation for this DIT. Tap a cell to jump to that week's evaluation.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-bg-surface p-4">
        <ScheduleGrid rows={rows} linkCells />
      </div>
    </div>
  )
}
