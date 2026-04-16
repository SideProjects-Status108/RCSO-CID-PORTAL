'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Check, ChevronDown, ChevronRight, Star } from 'lucide-react'

import { DeficiencyFormModal } from '@/components/training/deficiency-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { CompetencyMaster, WeeklyCompetencyScore, WeeklyTrainingSession } from '@/types/training'

export type WeeklyEvaluationFormProps = {
  dit_record_id: string
  pairing_id: string
  fto_id: string
  week_start_date: string
  week_end_date: string
  dit_display_name?: string
  fto_display_name?: string
  onSubmit?: (session_id: string) => void
}

type ScoreDraft = {
  score: number | null
  explanation: string
  prior: number | null
}

function scoreTone(n: number | null): string {
  if (n == null) return 'border-border-subtle bg-bg-elevated text-text-secondary'
  if (n <= 1) return 'border-danger/60 bg-danger/15 text-danger'
  if (n === 2) return 'border-amber-500/50 bg-amber-500/10 text-amber-200'
  if (n >= 4) return 'border-emerald-600/50 bg-emerald-600/10 text-emerald-200'
  return 'border-border-subtle bg-bg-elevated text-text-primary'
}

function trendFor(prior: number | null, current: number | null): string {
  if (current == null || prior == null) return ''
  if (current > prior) return '↗'
  if (current < prior) return '↘'
  return '→'
}

function groupByCategory(masters: CompetencyMaster[]): Map<string, CompetencyMaster[]> {
  const m = new Map<string, CompetencyMaster[]>()
  for (const row of masters) {
    const k = row.category || 'Other'
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(row)
  }
  return m
}

export function WeeklyEvaluationForm({
  dit_record_id,
  pairing_id,
  fto_id: _ftoId,
  week_start_date,
  week_end_date,
  dit_display_name = 'DIT',
  fto_display_name = 'FTO',
  onSubmit,
}: WeeklyEvaluationFormProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<WeeklyTrainingSession | null>(null)
  const [masters, setMasters] = useState<CompetencyMaster[]>([])
  const [draft, setDraft] = useState<Record<string, ScoreDraft>>({})
  const [openCats, setOpenCats] = useState<Set<string>>(() => new Set())
  const [defOpen, setDefOpen] = useState(false)
  const [, start] = useTransition()
  const firstErrorRef = useRef<HTMLDivElement | null>(null)

  const hydrateDraft = useCallback(
    (m: CompetencyMaster[], scores: WeeklyCompetencyScore[], priors: Record<string, number | null>) => {
      const next: Record<string, ScoreDraft> = {}
      for (const row of m) {
        const hit = scores.find((s) => s.competency_key === row.key)
        next[row.key] = {
          score: hit?.score ?? null,
          explanation: hit?.explanation ?? '',
          prior: priors[row.key] ?? null,
        }
      }
      setDraft(next)
    },
    []
  )

  const loadBundle = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        pairing_id,
        week_start_date,
        dit_record_id,
      })
      let res = await fetch(`/api/training/sessions/by-week?${qs}`, { credentials: 'same-origin' })
      let json = (await res.json()) as {
        error?: string
        session?: WeeklyTrainingSession | null
        masters?: CompetencyMaster[]
        scores?: WeeklyCompetencyScore[]
        priors?: Record<string, number | null>
      }
      if (!res.ok) throw new Error(json.error ?? 'Failed to load session')

      let sess = json.session ?? null
      if (!sess) {
        const cr = await fetch('/api/training/sessions', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pairing_id,
            week_start_date,
            week_end_date,
          }),
        })
        const cj = (await cr.json()) as { error?: string; session?: WeeklyTrainingSession }
        if (!cr.ok) throw new Error(cj.error ?? 'Failed to create weekly session')
        sess = cj.session ?? null
        if (!sess) throw new Error('No session returned')
        res = await fetch(`/api/training/sessions/by-week?${qs}`, { credentials: 'same-origin' })
        json = (await res.json()) as typeof json
        if (!res.ok) throw new Error(json.error ?? 'Failed to reload session')
      }

      const m = json.masters ?? []
      setMasters(m)
      setSession(json.session ?? sess)
      setOpenCats(new Set(groupByCategory(m).keys()))
      hydrateDraft(m, json.scores ?? [], json.priors ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [dit_record_id, pairing_id, week_start_date, week_end_date, hydrateDraft])

  useEffect(() => {
    void loadBundle()
  }, [loadBundle])

  const grouped = useMemo(() => groupByCategory(masters), [masters])

  const summary = useMemo(() => {
    const total = masters.length
    let rated = 0
    for (const k of masters.map((x) => x.key)) {
      if (draft[k]?.score != null) rated += 1
    }
    return { total, rated, notObserved: total - rated }
  }, [masters, draft])

  const notObservedRows = useMemo(
    () => masters.filter((m) => draft[m.key]?.score == null),
    [masters, draft]
  )

  const setScore = (key: string, score: number | null) => {
    setDraft((prev) => {
      const cur = prev[key] ?? { score: null, explanation: '', prior: null }
      return {
        ...prev,
        [key]: {
          ...cur,
          score,
          explanation:
            score != null && (score === 1 || score === 2 || score === 5) ? cur.explanation : '',
        },
      }
    })
  }

  const setExplanation = (key: string, text: string) => {
    setDraft((prev) => {
      const cur = prev[key] ?? { score: null, explanation: '', prior: null }
      return { ...prev, [key]: { ...cur, explanation: text } }
    })
  }

  const buildPayload = () =>
    masters.map((m) => ({
      competency_key: m.key,
      competency_label: m.label,
      category: m.category,
      score: draft[m.key]?.score ?? null,
      explanation: draft[m.key]?.explanation ?? '',
      prior_week_score: draft[m.key]?.prior ?? null,
    }))

  const saveDraft = () => {
    if (!session) return
    start(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/training/sessions/${session.id}/save`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scores: buildPayload() }),
        })
        const j = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(j.error ?? 'Save failed')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed')
      }
    })
  }

  const submitEval = () => {
    if (!session) return
    start(async () => {
      setError(null)
      try {
        const saveRes = await fetch(`/api/training/sessions/${session.id}/save`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scores: buildPayload() }),
        })
        const sj = (await saveRes.json()) as { error?: string }
        if (!saveRes.ok) throw new Error(sj.error ?? 'Save before submit failed')

        for (const m of masters) {
          const s = draft[m.key]?.score
          if (s === 1 || s === 2 || s === 5) {
            const t = (draft[m.key]?.explanation ?? '').trim()
            if (t.length < 12) {
              setError(`Explanation required for: ${m.label}`)
              firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              return
            }
          }
        }

        const res = await fetch(`/api/training/sessions/${session.id}/submit`, {
          method: 'POST',
          credentials: 'same-origin',
        })
        const j = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(j.error ?? 'Submit failed')
        await loadBundle()
        onSubmit?.(session.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Submit failed')
      }
    })
  }

  const locked = session?.status === 'submitted' || session?.status === 'approved'

  const deficiencySuggestions = useMemo(
    () =>
      masters
        .map((m) => {
          const s = draft[m.key]?.score
          if (s !== 1 && s !== 2 && s !== 5) return null
          return {
            competency_key: m.key,
            competency_label: m.label,
            score: s!,
            fto_recommendation: draft[m.key]?.explanation?.trim() || '(see weekly evaluation)',
          }
        })
        .filter(Boolean) as {
        competency_key: string
        competency_label: string
        score: number
        fto_recommendation: string
      }[],
    [masters, draft]
  )

  if (loading) {
    return <p className="text-sm text-text-secondary">Loading weekly evaluation…</p>
  }

  if (error && !session) {
    return <p className="text-sm text-danger">{error}</p>
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p ref={firstErrorRef} className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="text-xs text-text-secondary">
        Week {week_start_date} – {week_end_date} · {dit_display_name} / {fto_display_name}
      </div>

      {[...grouped.entries()].map(([category, rows]) => {
        const open = openCats.has(category)
        return (
          <Card key={category} size="sm">
            <CardHeader className="border-b border-border-subtle pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                onClick={() =>
                  setOpenCats((prev) => {
                    const n = new Set(prev)
                    if (n.has(category)) n.delete(category)
                    else n.add(category)
                    return n
                  })
                }
              >
                <CardTitle className="text-sm font-heading uppercase tracking-wide text-text-primary">
                  {category}
                </CardTitle>
                {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
              </button>
            </CardHeader>
            {open ? (
              <CardContent className="space-y-6 pt-2">
                {rows.map((m) => {
                  const d = draft[m.key] ?? { score: null, explanation: '', prior: null }
                  const needExplain = d.score === 1 || d.score === 2 || d.score === 5
                  const trend = trendFor(d.prior, d.score)
                  return (
                    <div key={m.key} className="space-y-2 border-b border-border-subtle pb-4 last:border-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-text-primary">{m.label}</span>
                        {d.prior != null ? (
                          <span className="text-xs text-text-secondary">Prior: {d.prior}</span>
                        ) : (
                          <span className="text-xs text-text-secondary">First time</span>
                        )}
                        {trend ? <span className="text-sm text-text-primary">{trend}</span> : null}
                        {d.score === 5 ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-400">
                            <Check className="size-4" aria-hidden />
                            <Star className="size-3.5" aria-hidden />
                          </span>
                        ) : null}
                        {d.score != null && d.prior != null && d.score < d.prior ? (
                          <span className="text-danger" aria-hidden>
                            ↘
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`Score for ${m.label}`}>
                        {(['NR', 1, 2, 3, 4, 5] as const).map((opt) => {
                          const val = opt === 'NR' ? null : opt
                          const active = d.score === val
                          return (
                            <button
                              key={String(opt)}
                              type="button"
                              disabled={locked}
                              onClick={() => setScore(m.key, val)}
                              className={cn(
                                'min-h-9 min-w-9 rounded-md border px-2 text-xs font-medium transition-colors',
                                active ? scoreTone(val) : 'border-border-subtle bg-bg-app text-text-secondary',
                                locked && 'opacity-60'
                              )}
                            >
                              {opt === 'NR' ? 'NR' : opt}
                            </button>
                          )
                        })}
                      </div>
                      {needExplain ? (
                        <div className="space-y-1">
                          <Label className={cn(!d.explanation.trim() && 'text-danger')}>
                            Required explanation (2–3 sentences)
                          </Label>
                          <Textarea
                            value={d.explanation}
                            disabled={locked}
                            onChange={(e) => setExplanation(m.key, e.target.value)}
                            className={cn(
                              'min-h-[4.5rem] border-border-subtle bg-bg-elevated',
                              needExplain && !d.explanation.trim() && 'border-danger ring-1 ring-danger/30'
                            )}
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </CardContent>
            ) : null}
          </Card>
        )
      })}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm text-text-primary">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-text-secondary">
          <p>
            Rated {summary.rated}/{summary.total}. Not observed: {summary.notObserved}
          </p>
          {notObservedRows.length > 0 ? (
            <ul className="list-inside list-disc text-xs">
              {notObservedRows.map((m) => (
                <li key={m.key}>{m.label}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs">All competencies observed.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={locked || !session} onClick={saveDraft}>
          Save draft
        </Button>
        <Button type="button" disabled={locked || !session} onClick={submitEval}>
          Submit evaluation
        </Button>
      </div>

      <div className="border-t border-border-subtle pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={!session || locked}
          onClick={() => setDefOpen(true)}
          className="w-full sm:w-auto"
        >
          Generate deficiency form
        </Button>
        <p className="mt-1 text-xs text-text-secondary">
          Opens after you have scores to flag. Submitted evaluations can be referenced from the summary screen as
          well.
        </p>
      </div>

      {session ? (
        <DeficiencyFormModal
          open={defOpen}
          onOpenChange={setDefOpen}
          pairingId={pairing_id}
          weeklySessionId={session.id}
          ditDisplayName={dit_display_name}
          ftoDisplayName={fto_display_name}
          weekLabel={`${week_start_date} – ${week_end_date}`}
          suggestions={deficiencySuggestions}
        />
      ) : null}
    </div>
  )
}
