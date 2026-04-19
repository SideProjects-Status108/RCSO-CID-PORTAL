import { redirect } from 'next/navigation'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScheduleGrid } from '@/components/training/schedule/schedule-grid'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import { UserRole, hasRole } from '@/lib/auth/roles'
import { fetchDitRecordsList, type DitRecordsListMode } from '@/lib/training/queries'
import { buildScheduleRowsForDits } from '@/lib/training/schedule-data'

export const dynamic = 'force-dynamic'

/**
 * Training → Schedule (Prompt 8). 10-week FTO rotation grid.
 *
 * Scope resolution:
 *   - Training writers (coordinator + supervision+) see every DIT.
 *   - FTOs see only DITs they're actively paired with.
 *   - DITs see their own single row.
 */
export default async function TrainingSchedulePage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const writer = isTrainingWriter(session.profile)
  const isFto = hasRole(session.profile.role, [UserRole.fto])

  const mode: DitRecordsListMode = writer ? 'all' : isFto ? 'fto_scope' : 'dit_own'

  const ditRecords = await fetchDitRecordsList(session.user.id, mode)
  const activeRecords = ditRecords.filter(
    (r) => r.status === 'active' || r.status === 'on_hold' || r.status === 'suspended',
  )

  const rows = await buildScheduleRowsForDits(activeRecords)

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
          Training Schedule
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
          10-week FTO rotation grid. Each cell shows the FTO the DIT was paired with that week and
          the weekly evaluation state. Suspended weeks render desaturated.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Cohort</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No DITs in your scope. Writers see every DIT; FTOs see only their paired DITs.
            </p>
          ) : (
            <ScheduleGrid rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
