'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

import type { VarkQuestion } from '@/lib/training/vark'

type Props = {
  token: string
  questions: VarkQuestion[]
  ditName: string | null
}

type SubmitResponse = {
  ok?: boolean
  error?: string
  scores?: { v: number; a: number; r: number; k: number }
  dominant?: Array<'v' | 'a' | 'r' | 'k'>
}

const STYLE_LABELS = {
  v: 'Visual',
  a: 'Auditory',
  r: 'Reading/Writing',
  k: 'Kinesthetic',
} as const

export function SurveyForm({ token, questions, ditName }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [narrative, setNarrative] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    scores: { v: number; a: number; r: number; k: number }
    dominant: Array<'v' | 'a' | 'r' | 'k'>
  } | null>(null)

  const allAnswered = useMemo(
    () => questions.every((q) => Boolean(answers[q.id])),
    [answers, questions]
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!allAnswered || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/survey/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers, narrative: narrative.trim() || null }),
      })
      const body = (await res.json().catch(() => ({}))) as SubmitResponse
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Submission failed (${res.status})`)
      }
      setResult({
        scores: body.scores ?? { v: 0, a: 0, r: 0, k: 0 },
        dominant: body.dominant ?? [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    const totals = [
      { key: 'v' as const, score: result.scores.v },
      { key: 'a' as const, score: result.scores.a },
      { key: 'r' as const, score: result.scores.r },
      { key: 'k' as const, score: result.scores.k },
    ]
    const max = Math.max(...totals.map((t) => t.score), 1)
    return (
      <section className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Thanks{ditName ? `, ${ditName}` : ''}!
          </h2>
        </div>
        <p className="text-sm text-text-secondary">
          Your FTO Coordinator will review these results before your training begins. Here&apos;s a
          quick snapshot of how you lean:
        </p>
        <ul className="space-y-2">
          {totals.map((t) => {
            const pct = (t.score / max) * 100
            const dominant = result.dominant.includes(t.key)
            return (
              <li key={t.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={dominant ? 'font-semibold text-text-primary' : 'text-text-secondary'}>
                    {STYLE_LABELS[t.key]}
                  </span>
                  <span className="font-mono text-text-secondary">{t.score}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                  <div
                    className={`h-full rounded-full ${dominant ? 'bg-accent-primary' : 'bg-accent-primary/50'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-border-subtle bg-bg-surface p-6"
    >
      {ditName ? (
        <p className="text-sm text-text-secondary">
          Completing this survey as <strong>{ditName}</strong>. If that&apos;s not you, close this
          page and contact your FTO Coordinator.
        </p>
      ) : null}

      <ol className="space-y-6">
        {questions.map((q, idx) => (
          <li key={q.id} className="space-y-3">
            <div className="font-medium text-text-primary">
              <span className="mr-1 text-text-secondary">{idx + 1}.</span>
              {q.prompt}
            </div>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const checked = answers[q.id] === opt.id
                return (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                      checked
                        ? 'border-accent-primary bg-accent-primary/5'
                        : 'border-border-subtle hover:bg-bg-elevated'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.id}
                      checked={checked}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-text-primary">{opt.label}</span>
                  </label>
                )
              })}
            </div>
          </li>
        ))}
      </ol>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-primary">
          Anything else your FTO should know? <span className="text-text-secondary">(optional)</span>
        </span>
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full rounded border border-border-subtle bg-bg-elevated px-3 py-2 text-sm text-text-primary"
          placeholder="Background, prior assignments, learning preferences, etc."
        />
      </label>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          {Object.keys(answers).length}/{questions.length} answered
        </span>
        <button
          type="submit"
          disabled={!allAnswered || submitting}
          className="rounded bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit survey'}
        </button>
      </div>
    </form>
  )
}
