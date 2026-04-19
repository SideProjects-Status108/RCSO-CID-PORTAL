import { redirect } from 'next/navigation'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import { UserRole, hasRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import { aggregateSurveysForFto } from '@/lib/training/feedback'
import {
  listAllSubmittedSurveys,
  listSurveysForFto,
} from '@/lib/training/feedback-queries'
import { FTO_FEEDBACK_RUBRIC } from '@/types/training'

const SELF_AGGREGATE_MIN_RESPONSES = 3

export const dynamic = 'force-dynamic'

export default async function FeedbackPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const writer = isTrainingWriter(session.profile)
  const fto = hasRole(session.profile.role, [UserRole.fto])
  if (!writer && !fto) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-lg font-semibold text-text-primary">FTO Feedback</h1>
        <p className="mt-2 text-sm text-text-secondary">
          You do not have permission to view feedback aggregates.
        </p>
      </div>
    )
  }

  if (writer) {
    const rows = await listAllSubmittedSurveys()
    const byFto = new Map<string, typeof rows>()
    for (const r of rows) {
      const arr = byFto.get(r.fto_id) ?? []
      arr.push(r)
      byFto.set(r.fto_id, arr)
    }
    const ids = Array.from(byFto.keys())
    const supabase = await createClient()
    const { data: profs } =
      ids.length === 0
        ? { data: [] as Array<{ id: string; full_name: string | null }> }
        : await supabase.from('profiles').select('id, full_name').in('id', ids)
    const nameById = new Map<string, string | null>()
    for (const p of profs ?? []) {
      const r = p as { id: string; full_name: string | null }
      nameById.set(String(r.id), r.full_name)
    }
    const aggregates = Array.from(byFto.entries())
      .map(([fto_id, surveys]) =>
        aggregateSurveysForFto({
          fto_id,
          fto_name: nameById.get(fto_id) ?? null,
          surveys,
        }),
      )
      .sort((a, b) => (a.fto_name ?? '').localeCompare(b.fto_name ?? ''))

    return (
      <div className="px-6 py-6">
        <h1 className="text-lg font-semibold text-text-primary">FTO Feedback</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Aggregated DIT-submitted feedback. Raw comments are viewable by drilling into a specific
          survey from the DIT detail page (coming shortly).
        </p>

        {aggregates.length === 0 ? (
          <p className="mt-6 text-sm text-text-secondary">No submitted feedback yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border-subtle bg-bg-surface">
            <table className="min-w-full divide-y divide-border-subtle text-sm">
              <thead className="bg-bg-elevated text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">FTO</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Responses</th>
                  {FTO_FEEDBACK_RUBRIC.map((r) => (
                    <th key={r.key} scope="col" className="px-3 py-2 text-right font-medium">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {aggregates.map((agg) => (
                  <tr key={agg.fto_id}>
                    <td className="px-3 py-2 text-text-primary">{agg.fto_name ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-text-primary">
                      {agg.response_count}
                    </td>
                    {FTO_FEEDBACK_RUBRIC.map((r) => {
                      const m = agg.means[r.key]
                      return (
                        <td key={r.key} className="px-3 py-2 text-right text-text-primary">
                          {m != null ? m.toFixed(2) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // FTO self-view, anonymized + gated on min N.
  const surveys = await listSurveysForFto(session.user.id)
  const agg = aggregateSurveysForFto({
    fto_id: session.user.id,
    fto_name: session.profile.full_name,
    surveys,
  })
  const belowFloor = agg.response_count < SELF_AGGREGATE_MIN_RESPONSES

  return (
    <div className="px-6 py-6">
      <h1 className="text-lg font-semibold text-text-primary">My Feedback</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Anonymized aggregate of DIT feedback you&apos;ve received. Means appear only after at least{' '}
        {SELF_AGGREGATE_MIN_RESPONSES} responses to protect anonymity.
      </p>

      <div className="mt-4 rounded-lg border border-border-subtle bg-bg-surface p-4">
        <div className="text-sm text-text-secondary">
          Total responses: <span className="text-text-primary">{agg.response_count}</span>
        </div>

        {belowFloor ? (
          <p className="mt-3 text-sm text-text-secondary">
            Not enough responses yet to display means.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-border-subtle text-sm">
              <thead className="bg-bg-elevated text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Rubric</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Mean (1–5)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {FTO_FEEDBACK_RUBRIC.map((r) => {
                  const m = agg.means[r.key]
                  return (
                    <tr key={r.key}>
                      <td className="px-3 py-2 text-text-primary">{r.label}</td>
                      <td className="px-3 py-2 text-right text-text-primary">
                        {m != null ? m.toFixed(2) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
