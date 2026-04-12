'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { BottomSheet } from '@/components/companion/bottom-sheet'
import { submitFormAction } from '@/app/(dashboard)/forms/actions'
import type { PersonnelDirectoryRow } from '@/types/personnel'
import { cn } from '@/lib/utils'

const AREAS = [
  'Judgment',
  'Communication',
  'Officer Safety',
  'Report Writing',
  'Policy Knowledge',
  'Professionalism',
] as const

const schema = z.object({
  dit_name: z.string().trim().min(1, 'Trainee name is required').max(200),
  observation_date: z.string().min(1, 'Date is required'),
  narrative: z.string().trim().min(1, 'Narrative is required').max(12000),
})

type Values = z.infer<typeof schema>

const inputClass =
  'min-h-12 w-full rounded-md border border-border-subtle bg-bg-app px-3 text-base text-text-primary'

function DotRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-text-primary">{label}</span>
      <div className="flex gap-1" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={cn(
              'size-10 rounded-full border text-sm font-semibold',
              value === n
                ? 'border-accent-primary bg-accent-primary text-bg-app'
                : 'border-border-subtle bg-bg-elevated text-text-secondary'
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DITObservationFormSheet({
  open,
  onClose,
  templateId,
  ftoName,
  ditPersonnel,
  onSubmitted,
  onError,
}: {
  open: boolean
  onClose: () => void
  templateId: string | null
  ftoName: string
  ditPersonnel: Pick<PersonnelDirectoryRow, 'id' | 'full_name'>[]
  onSubmitted: () => void
  onError: (message: string) => void
}) {
  const [pending, start] = useTransition()
  const [ratings, setRatings] = useState<Record<(typeof AREAS)[number], number>>(() => {
    const o = {} as Record<(typeof AREAS)[number], number>
    for (const a of AREAS) o[a] = 3
    return o
  })
  const [recommendAdvance, setRecommendAdvance] = useState(true)
  const [traineeMode, setTraineeMode] = useState<'pick' | 'type'>(() =>
    ditPersonnel.length ? 'pick' : 'type'
  )

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      dit_name: '',
      observation_date: new Date().toISOString().slice(0, 10),
      narrative: '',
    },
  })

  const submit = handleSubmit(
    (values) => {
      if (!templateId) {
        onError('Form template is not available.')
        return
      }
      const ratingLines = AREAS.map((a) => `${a}: ${ratings[a]}`).join('; ')
      const tasks_observed = `Performance ratings (1–5): ${ratingLines}\nRecommend advancement: ${recommendAdvance ? 'Yes' : 'No'}`
      const overall_rating = recommendAdvance ? 'Excellent' : 'Satisfactory'
      start(async () => {
        try {
          await submitFormAction({
            templateId,
            caseId: null,
            formData: {
              dit_name: values.dit_name.trim(),
              fto_name: ftoName,
              observation_date: values.observation_date,
              shift_start: '0900',
              shift_end: '1700',
              tasks_observed,
              performance_notes: values.narrative.trim(),
              areas_for_improvement: '',
              overall_rating,
            },
          })
          reset()
          setRecommendAdvance(true)
          for (const a of AREAS) setRatings((r) => ({ ...r, [a]: 3 }))
          onClose()
          onSubmitted()
        } catch (e) {
          onError(e instanceof Error ? e.message : 'Submit failed')
        }
      })
    },
    (errs) => {
      const first = Object.keys(errs)[0] as keyof Values | undefined
      if (first) setFocus(first)
    }
  )

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="DIT Daily Observation"
      panelClassName="max-h-[min(90dvh,720px)]"
      footer={
        <button
          type="button"
          disabled={pending || !templateId}
          onClick={() => submit()}
          className="min-h-12 w-full rounded-md border border-accent-primary/30 bg-accent-primary text-base font-semibold text-bg-app hover:bg-accent-primary-hover disabled:opacity-50"
        >
          Submit
        </button>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">Trainee</label>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                className={cn(traineeMode === 'pick' && 'font-semibold text-accent-primary')}
                onClick={() => setTraineeMode('pick')}
              >
                Directory
              </button>
              <button
                type="button"
                className={cn(traineeMode === 'type' && 'font-semibold text-accent-primary')}
                onClick={() => setTraineeMode('type')}
              >
                Type name
              </button>
            </div>
          </div>
          {traineeMode === 'pick' ? (
            <select
              key="dit-pick"
              className={cn('mt-1', inputClass, errors.dit_name && 'border-danger')}
              {...register('dit_name')}
            >
              <option value="">Select trainee…</option>
              {ditPersonnel.map((p) => (
                <option key={p.id} value={p.full_name}>
                  {p.full_name}
                </option>
              ))}
            </select>
          ) : (
            <input
              key="dit-type"
              className={cn('mt-1', inputClass, errors.dit_name && 'border-danger')}
              placeholder="Trainee name"
              {...register('dit_name')}
            />
          )}
          {errors.dit_name ? (
            <p className="mt-1 text-xs text-danger">{errors.dit_name.message}</p>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Observation date</label>
          <input
            type="date"
            className={cn('mt-1', inputClass, errors.observation_date && 'border-danger')}
            {...register('observation_date')}
          />
        </div>
        <div className="rounded-md border border-border-subtle p-2">
          <p className="mb-2 text-xs font-semibold uppercase text-text-secondary">
            Performance (1–5)
          </p>
          <div className="divide-y divide-border-subtle">
            {AREAS.map((a) => (
              <DotRow
                key={a}
                label={a}
                value={ratings[a]}
                onChange={(n) => setRatings((r) => ({ ...r, [a]: n }))}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Narrative</label>
          <textarea
            rows={5}
            className={cn(
              'mt-1 min-h-[7rem] w-full resize-y rounded-md border border-border-subtle bg-bg-app px-3 py-2 text-base',
              errors.narrative && 'border-danger'
            )}
            {...register('narrative')}
          />
          {errors.narrative ? (
            <p className="mt-1 text-xs text-danger">{errors.narrative.message}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between rounded-md border border-border-subtle px-3 py-2">
          <span className="text-sm text-text-primary">Recommend advancement?</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={cn(
                'min-h-10 min-w-[4.5rem] rounded-md border px-3 text-sm font-medium',
                recommendAdvance
                  ? 'border-accent-primary bg-accent-primary text-bg-app'
                  : 'border-border-subtle'
              )}
              onClick={() => setRecommendAdvance(true)}
            >
              Yes
            </button>
            <button
              type="button"
              className={cn(
                'min-h-10 min-w-[4.5rem] rounded-md border px-3 text-sm font-medium',
                !recommendAdvance
                  ? 'border-accent-primary bg-accent-primary text-bg-app'
                  : 'border-border-subtle'
              )}
              onClick={() => setRecommendAdvance(false)}
            >
              No
            </button>
          </div>
        </div>
      </form>
    </BottomSheet>
  )
}
