'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import type { TrainingProgramConfig } from '@/lib/training/program-config'

type FieldKey =
  | 'program_week_count'
  | 'extension_days_first'
  | 'extension_days_subsequent'
  | 'quiz_amber_threshold'
  | 'quiz_red_threshold'
  | 'journal_nudge_days'
  | 'journal_flag_fto_days'
  | 'survey_expiry_days'

const FIELDS: Array<{
  key: FieldKey
  label: string
  help: string
  min: number
  max: number
}> = [
  {
    key: 'program_week_count',
    label: 'Program length (weeks)',
    help: 'Length of the schedule grid and default week count for weekly evaluations.',
    min: 4,
    max: 26,
  },
  {
    key: 'extension_days_first',
    label: 'Extension — 1st deficiency',
    help: 'Days added to the program end when a DIT incurs their first auto-deficiency.',
    min: 0,
    max: 60,
  },
  {
    key: 'extension_days_subsequent',
    label: 'Extension — subsequent deficiencies',
    help: 'Days added for each deficiency after the first.',
    min: 0,
    max: 60,
  },
  {
    key: 'quiz_amber_threshold',
    label: 'Quiz amber threshold (%)',
    help: 'Scores below this value flag amber on the dashboard.',
    min: 0,
    max: 100,
  },
  {
    key: 'quiz_red_threshold',
    label: 'Quiz red threshold (%)',
    help: 'Scores below this value flag red and trigger review.',
    min: 0,
    max: 100,
  },
  {
    key: 'journal_nudge_days',
    label: 'Journal nudge (days)',
    help: 'Days of DIT-only silence before a gentle reminder is sent.',
    min: 1,
    max: 14,
  },
  {
    key: 'journal_flag_fto_days',
    label: 'Journal flag FTO (days)',
    help: 'Days of silence before the paired FTO is flagged for follow-up.',
    min: 1,
    max: 14,
  },
  {
    key: 'survey_expiry_days',
    label: 'VARK survey expiry (days)',
    help: 'Days a VARK invite remains valid before the DIT must request a new one.',
    min: 1,
    max: 90,
  },
]

export function ProgramConfigForm({
  initial,
  canEdit,
}: {
  initial: TrainingProgramConfig
  canEdit: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [values, setValues] = useState<Record<FieldKey, number>>(() => ({
    program_week_count: initial.program_week_count,
    extension_days_first: initial.extension_days_first,
    extension_days_subsequent: initial.extension_days_subsequent,
    quiz_amber_threshold: initial.quiz_amber_threshold,
    quiz_red_threshold: initial.quiz_red_threshold,
    journal_nudge_days: initial.journal_nudge_days,
    journal_flag_fto_days: initial.journal_flag_fto_days,
    survey_expiry_days: initial.survey_expiry_days,
  }))

  async function save() {
    setErr(null)
    setOk(null)
    const res = await fetch('/api/training/program-config', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string }
      setErr(error ?? `Save failed (${res.status})`)
      return
    }
    setOk('Saved')
    startTransition(() => router.refresh())
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="block font-medium text-text-primary">{f.label}</span>
            <span className="mt-0.5 block text-xs text-text-secondary">{f.help}</span>
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={1}
              disabled={!canEdit || pending}
              value={values[f.key]}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [f.key]: Math.max(f.min, Math.min(f.max, Number(e.target.value) || 0)),
                }))
              }
              className="mt-1.5 w-32 rounded border border-border-subtle bg-bg-elevated px-2 py-1 text-sm text-text-primary focus:border-accent-primary focus:outline-none disabled:opacity-60"
            />
          </label>
        ))}
      </div>

      {canEdit ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="default" onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
          {ok ? <span className="text-xs text-emerald-400">{ok}</span> : null}
          {err ? <span className="text-xs text-red-400">{err}</span> : null}
        </div>
      ) : (
        <p className="mt-3 text-xs italic text-text-secondary">
          Read-only. Training writers can edit program configuration.
        </p>
      )}
    </div>
  )
}
