'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  FTO_FEEDBACK_RUBRIC,
  type FtoFeedbackRatings,
  type FtoFeedbackRubricKey,
  type FtoFeedbackSurvey,
} from '@/types/training'

function Stars({
  value,
  onChange,
  disabled,
}: {
  value: number | null
  onChange: (n: number) => void
  disabled: boolean
}) {
  return (
    <div className="inline-flex items-center gap-0.5" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value != null && n <= value
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`h-7 w-7 rounded text-sm transition ${
              active
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {active ? '★' : '☆'}
          </button>
        )
      })}
    </div>
  )
}

export function FeedbackClient({
  ditRecordId,
  ftoId,
  ftoName,
  ftoBadge,
  pairingId,
  initial,
}: {
  ditRecordId: string
  ftoId: string
  ftoName: string
  ftoBadge: string | null
  pairingId: string | null
  initial: FtoFeedbackSurvey | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [ratings, setRatings] = useState<FtoFeedbackRatings>(initial?.ratings ?? {})
  const [comments, setComments] = useState<string>(initial?.comments ?? '')

  const locked = initial != null && initial.status !== 'draft'
  const complete = useMemo(
    () =>
      FTO_FEEDBACK_RUBRIC.every((r) => {
        const v = ratings[r.key]
        return typeof v === 'number' && v >= 1 && v <= 5
      }),
    [ratings],
  )

  async function save() {
    setErr(null)
    const body = {
      dit_record_id: ditRecordId,
      fto_id: ftoId,
      pairing_id: pairingId,
      ratings,
      comments: comments.trim() ? comments : null,
    }
    const res = initial
      ? await fetch(`/api/training/fto-feedback/${initial.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ratings, comments: body.comments }),
        })
      : await fetch('/api/training/fto-feedback', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string }
      setErr(error ?? `Save failed (${res.status})`)
      return null
    }
    const json = (await res.json()) as { survey: FtoFeedbackSurvey }
    startTransition(() => router.refresh())
    return json.survey
  }

  async function submit() {
    setErr(null)
    const saved = await save()
    if (!saved) return
    const res = await fetch(`/api/training/fto-feedback/${saved.id}/submit`, {
      method: 'POST',
    })
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string }
      setErr(error ?? `Submit failed (${res.status})`)
      return
    }
    startTransition(() => router.refresh())
  }

  const statusLabel =
    initial?.status === 'submitted'
      ? 'Submitted'
      : initial?.status === 'acknowledged'
        ? 'Acknowledged'
        : initial?.status === 'voided'
          ? 'Voided'
          : 'Draft'
  const statusTone =
    initial?.status === 'submitted'
      ? 'text-sky-300'
      : initial?.status === 'acknowledged'
        ? 'text-emerald-300'
        : initial?.status === 'voided'
          ? 'text-neutral-400'
          : 'text-amber-300'

  return (
    <div className="rounded-md border border-border-subtle bg-bg-elevated p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-text-primary">{ftoName}</div>
          {ftoBadge ? (
            <div className="text-[11px] text-text-secondary">Badge #{ftoBadge}</div>
          ) : null}
        </div>
        <div className={`text-[11px] font-medium ${statusTone}`}>{statusLabel}</div>
      </div>

      <div className="space-y-2">
        {FTO_FEEDBACK_RUBRIC.map((r) => (
          <div key={r.key} className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-text-primary">{r.label}</div>
              <div className="text-[11px] text-text-secondary">{r.description}</div>
            </div>
            <Stars
              value={ratings[r.key] ?? null}
              disabled={locked}
              onChange={(n) =>
                setRatings((prev) => ({ ...prev, [r.key as FtoFeedbackRubricKey]: n }))
              }
            />
          </div>
        ))}
      </div>

      <textarea
        className="mt-2 w-full rounded border border-border-subtle bg-bg-surface px-2 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:border-accent-primary focus:outline-none disabled:opacity-60"
        placeholder="Comments (optional, writers-only; never shown to FTO)"
        rows={3}
        value={comments}
        disabled={locked}
        onChange={(e) => setComments(e.target.value)}
      />

      {!locked ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save draft'}
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={submit}
            disabled={pending || !complete}
            title={complete ? '' : 'Rate every item 1–5 to submit'}
          >
            {pending ? 'Working…' : 'Submit'}
          </Button>
          {err ? <span className="text-xs text-red-400">{err}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
