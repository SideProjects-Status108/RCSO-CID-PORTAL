import { fetchVarkForDitRecord } from '@/lib/training/vark'
import { trainingFullRead } from '@/lib/training/access'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'

const STYLE_LABELS: Record<'v' | 'a' | 'r' | 'k', string> = {
  v: 'Visual',
  a: 'Auditory',
  r: 'Reading/Writing',
  k: 'Kinesthetic',
}

/**
 * Coordinator-only VARK results card for the DIT Overview tab.
 * Renders nothing when:
 *   - the viewer is not a training reader, or
 *   - no survey row exists yet.
 */
export async function VarkResultsCard({ ditRecordId }: { ditRecordId: string }) {
  const session = await getSessionUserWithProfile()
  if (!session) return null
  if (!trainingFullRead(session.profile.role)) return null

  const survey = await fetchVarkForDitRecord(ditRecordId)
  if (!survey) return null

  if (survey.status !== 'completed' || !survey.scores) {
    return (
      <section className="rounded-lg border border-border-subtle bg-bg-card p-4 md:col-span-2 lg:col-span-3">
        <header className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Learning-style survey
          </h3>
          <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-tertiary">
            {survey.status === 'expired' ? 'Expired' : 'Pending'}
          </span>
        </header>
        <p className="mt-2 text-xs text-text-secondary">
          {survey.status === 'expired'
            ? 'The VARK survey link expired before the DIT submitted. Resend from the onboarding panel.'
            : 'Waiting on the DIT to submit their pre-start VARK survey.'}
        </p>
      </section>
    )
  }

  const totals = (['v', 'a', 'r', 'k'] as const).map((k) => ({
    key: k,
    score: survey.scores![k],
  }))
  const max = Math.max(...totals.map((t) => t.score), 1)

  return (
    <section className="rounded-lg border border-border-subtle bg-bg-card p-4 md:col-span-2 lg:col-span-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Learning-style survey
        </h3>
        <div className="text-[11px] text-text-tertiary">
          Completed {survey.completedAt?.slice(0, 10) ?? ''} · Dominant:{' '}
          <span className="font-semibold text-text-primary">
            {survey.dominant.map((k) => STYLE_LABELS[k]).join(' + ')}
          </span>
        </div>
      </header>

      <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {totals.map((t) => {
          const pct = (t.score / max) * 100
          const dominant = survey.dominant.includes(t.key)
          return (
            <li key={t.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={dominant ? 'font-semibold text-text-primary' : 'text-text-secondary'}>
                  {STYLE_LABELS[t.key]}
                </span>
                <span className="font-mono text-text-tertiary">{t.score}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                <div
                  className={`h-full rounded-full ${dominant ? 'bg-accent-primary' : 'bg-accent-primary/40'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      {survey.narrative ? (
        <div className="mt-3 rounded border border-border-subtle bg-bg-subtle/40 p-3 text-xs text-text-secondary">
          <p className="font-medium text-text-primary">DIT note:</p>
          <p className="mt-1 whitespace-pre-wrap">{survey.narrative}</p>
        </div>
      ) : null}
    </section>
  )
}
