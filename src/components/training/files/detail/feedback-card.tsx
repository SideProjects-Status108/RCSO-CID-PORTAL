import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { listSurveysForDit } from '@/lib/training/feedback-queries'

import { FeedbackClient } from './feedback-client'

/**
 * Renders the "Rate your FTO" surveys on the DIT's own Overview tab.
 * Only the DIT owner sees the editable form; training writers see
 * aggregates elsewhere. Other viewers get nothing.
 */
export async function FeedbackCard({ ditRecordId }: { ditRecordId: string }) {
  const session = await getSessionUserWithProfile()
  if (!session) return null

  const supabase = await createClient()
  const { data: rec } = await supabase
    .from('dit_records')
    .select('user_id')
    .eq('id', ditRecordId)
    .maybeSingle()
  const isOwner =
    rec != null && String((rec as { user_id: string }).user_id) === session.user.id
  if (!isOwner) return null

  // Gather the list of distinct FTOs the DIT has been paired with
  // (active or historical) so we can render one card per FTO.
  const { data: pairings } = await supabase
    .from('fto_pairings')
    .select('id, fto_id, start_date, end_date')
    .eq('dit_id', session.user.id)
    .order('start_date', { ascending: false })

  const pairingByFto = new Map<
    string,
    { pairing_id: string; start_date: string; end_date: string | null }
  >()
  for (const p of pairings ?? []) {
    const row = p as {
      id: string
      fto_id: string
      start_date: string
      end_date: string | null
    }
    if (!pairingByFto.has(row.fto_id)) {
      pairingByFto.set(row.fto_id, {
        pairing_id: row.id,
        start_date: row.start_date,
        end_date: row.end_date,
      })
    }
  }
  const ftoIds = Array.from(pairingByFto.keys())
  if (ftoIds.length === 0) return null

  const { data: profs } = await supabase
    .from('profiles')
    .select('id, full_name, badge_number')
    .in('id', ftoIds)
  const ftoById = new Map(
    (profs ?? []).map((p) => {
      const r = p as { id: string; full_name: string | null; badge_number: string | null }
      return [String(r.id), r]
    }),
  )

  const surveys = await listSurveysForDit(ditRecordId)

  return (
    <section className="rounded-lg border border-border-subtle bg-bg-surface p-4 md:col-span-2 lg:col-span-3">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Rate your FTOs
          </h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            Private feedback to program leadership. FTOs only ever see anonymized aggregates
            (≥3 responses) — no names or comments.
          </p>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {ftoIds.map((ftoId) => {
          const pairing = pairingByFto.get(ftoId)
          const profile = ftoById.get(ftoId)
          const survey =
            surveys.find(
              (s) => s.fto_id === ftoId && s.pairing_id === (pairing?.pairing_id ?? null),
            ) ??
            surveys.find((s) => s.fto_id === ftoId) ??
            null
          return (
            <FeedbackClient
              key={ftoId}
              ditRecordId={ditRecordId}
              ftoId={ftoId}
              ftoName={profile?.full_name ?? '—'}
              ftoBadge={profile?.badge_number ?? null}
              pairingId={pairing?.pairing_id ?? null}
              initial={survey}
            />
          )
        })}
      </div>
    </section>
  )
}
