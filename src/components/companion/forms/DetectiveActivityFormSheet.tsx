'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { BottomSheet } from '@/components/companion/bottom-sheet'
import { submitFormAction } from '@/app/(dashboard)/forms/actions'
import { cn } from '@/lib/utils'

const activityUi = [
  'surveillance',
  'interview',
  'evidence',
  'court',
  'admin',
  'other',
] as const

const activityToTemplate: Record<(typeof activityUi)[number], string> = {
  surveillance: 'Surveillance',
  interview: 'Interview',
  evidence: 'Report Writing',
  court: 'Court',
  admin: 'Other',
  other: 'Other',
}

const schema = z.object({
  case_number: z.string().trim().min(1, 'Case number is required').max(80),
  activity_type: z.enum(activityUi),
  activity_date: z.string().min(1, 'Date is required'),
  hours_worked: z
    .number({ error: 'Enter hours' })
    .min(0.5, 'Enter hours')
    .max(999),
  description: z.string().trim().min(1, 'Notes are required').max(8000),
})

type Values = z.infer<typeof schema>

const inputClass =
  'min-h-12 w-full rounded-md border border-border-subtle bg-bg-app px-3 text-base text-text-primary'

export function DetectiveActivityFormSheet({
  open,
  onClose,
  templateId,
  detectiveName,
  onSubmitted,
  onError,
}: {
  open: boolean
  onClose: () => void
  templateId: string | null
  detectiveName: string
  onSubmitted: () => void
  onError: (message: string) => void
}) {
  const [pending, start] = useTransition()
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      case_number: '',
      activity_type: 'other',
      activity_date: new Date().toISOString().slice(0, 10),
      hours_worked: 1,
      description: '',
    },
  })

  const submit = handleSubmit(
    (values) => {
      if (!templateId) {
        onError('Form template is not available.')
        return
      }
      const activityType = activityToTemplate[values.activity_type]
      let description = values.description.trim()
      if (values.activity_type === 'admin') {
        description = `[Administrative]\n${description}`
      }
      start(async () => {
        try {
          await submitFormAction({
            templateId,
            caseId: null,
            formData: {
              case_number: values.case_number.trim(),
              activity_date: values.activity_date,
              activity_type: activityType,
              description,
              hours_worked: values.hours_worked,
              detective_name: detectiveName,
              supervisor_name: '',
            },
          })
          reset()
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
      title="Detective Activity Report"
      panelClassName="max-h-[min(90dvh,680px)]"
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
          <label className="text-xs font-medium text-text-secondary">Case number</label>
          <input className={cn('mt-1', inputClass, errors.case_number && 'border-danger')} {...register('case_number')} />
          {errors.case_number ? (
            <p className="mt-1 text-xs text-danger">{errors.case_number.message}</p>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Activity type</label>
          <select
            className={cn('mt-1', inputClass, errors.activity_type && 'border-danger')}
            {...register('activity_type')}
          >
            <option value="surveillance">Surveillance</option>
            <option value="interview">Interview</option>
            <option value="evidence">Evidence</option>
            <option value="court">Court</option>
            <option value="admin">Admin</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Date</label>
          <input
            type="date"
            className={cn('mt-1', inputClass, errors.activity_date && 'border-danger')}
            {...register('activity_date')}
          />
          {errors.activity_date ? (
            <p className="mt-1 text-xs text-danger">{errors.activity_date.message}</p>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Hours</label>
          <input
            type="number"
            step={0.5}
            min={0.5}
            className={cn('mt-1', inputClass, errors.hours_worked && 'border-danger')}
            {...register('hours_worked', { valueAsNumber: true })}
          />
          {errors.hours_worked ? (
            <p className="mt-1 text-xs text-danger">{errors.hours_worked.message}</p>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Notes</label>
          <textarea
            rows={4}
            className={cn(
              'mt-1 min-h-[6rem] w-full resize-y rounded-md border border-border-subtle bg-bg-app px-3 py-2 text-base text-text-primary',
              errors.description && 'border-danger'
            )}
            {...register('description')}
          />
          {errors.description ? (
            <p className="mt-1 text-xs text-danger">{errors.description.message}</p>
          ) : null}
        </div>
      </form>
    </BottomSheet>
  )
}
