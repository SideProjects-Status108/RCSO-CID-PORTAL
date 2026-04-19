import Link from 'next/link'

import {
  fetchWeeklySessionsForDitRecord,
  fetchSessionScoreAverages,
} from '@/lib/training/queries'

const STATUS_TONE: Record<'draft' | 'submitted' | 'approved', string> = {
  draft: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30',
  submitted: 'bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30',
  approved: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30',
}

const STATUS_LABEL: Record<'draft' | 'submitted' | 'approved', string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
}

export async function WeeklyTab({ ditRecordId }: { ditRecordId: string }) {
  const sessions = await fetchWeeklySessionsForDitRecord(ditRecordId)
  const averages = await fetchSessionScoreAverages(sessions.map((s) => s.id))

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Weekly Evaluations
        </h2>
        <p className="text-sm text-text-secondary">
          Every weekly evaluation for this DIT, across all FTO pairings. Click a week to open the
          evaluation.
        </p>
      </header>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-6 text-sm text-text-secondary">
          No weekly evaluations yet. They&apos;ll appear here once an FTO starts a weekly session.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
          <table className="min-w-full divide-y divide-border-subtle text-sm">
            <thead className="bg-bg-elevated text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Week
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  FTO
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Avg score
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Competencies
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Submitted
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-text-primary">
              {sessions.map((s) => {
                const avg = averages.get(s.id)
                const absentBanner = s.dit_absent_flag
                return (
                  <tr key={s.id} className="hover:bg-bg-elevated/50">
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="font-medium tabular-nums">{s.week_start_date}</div>
                      <div className="text-xs text-text-secondary tabular-nums">
                        to {s.week_end_date}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{s.fto_name ?? '—'}</td>
                    <td className="px-3 py-2">
                      {absentBanner ? (
                        <span className="inline-flex items-center rounded-md bg-neutral-500/15 px-2 py-0.5 text-xs font-medium text-neutral-300 ring-1 ring-inset ring-neutral-500/30">
                          DIT absent
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_TONE[s.status]}`}
                        >
                          {STATUS_LABEL[s.status]}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {avg ? avg.avg.toFixed(2) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                      {avg ? avg.count : 0}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-text-secondary tabular-nums">
                      {s.submitted_at ? s.submitted_at.slice(0, 10) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/training/dit-files/${ditRecordId}/weekly/${s.id}` as never}
                        className="text-xs font-medium text-accent-primary hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
