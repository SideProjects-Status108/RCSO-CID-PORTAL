'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { BottomSheet } from '@/components/companion/bottom-sheet'
import { submitFormAction } from '@/app/(dashboard)/forms/actions'
import type { PersonnelDirectoryRow } from '@/types/personnel'
import { cn } from '@/lib/utils'

const CASE_TYPES = ['Felony', 'Misdemeanor', 'Death Investigation', 'Property', 'Other'] as const

const schema = z.object({
  case_number: z.string().trim().min(1, 'Case number is required').max(80),
  complainant_name: z.string().trim().max(200).optional(),
  case_type: z.enum(CASE_TYPES),
  incident_date: z.string().min(1, 'Incident date is required'),
  location: z.string().trim().max(500).optional(),
  initial_notes: z.string().trim().min(1, 'Summary is required').max(12000),
  assigned_personnel_id: z.string().min(1, 'Assign a detective'),
})

type Values = z.infer<typeof schema>

const inputClass =
  'min-h-12 w-full rounded-md border border-border-subtle bg-bg-app px-3 text-base text-text-primary'

export function CaseIntakeFormSheet({
  open,
  onClose,
  templateId,
  detectives,
  onSubmitted,
  onError,
}: {
  open: boolean
  onClose: () => void
  templateId: string | null
  detectives: Pick<PersonnelDirectoryRow, 'id' | 'full_name'>[]
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
      complainant_name: '',
      case_type: 'Other',
      incident_date: new Date().toISOString().slice(0, 10),
      location: '',
      initial_notes: '',
      assigned_personnel_id: '',
    },
  })

  const submit = handleSubmit(
    (values) => {
      if (!templateId) {
        onError('Form template is not available.')
        return
      }
      const det = detectives.find((d) => d.id === values.assigned_personnel_id)
      if (!det) {
        onError('Invalid assignee.')
        return
      }
      const noteParts: string[] = []
      if (values.location?.trim()) {
        noteParts.push(`Location: ${values.location.trim()}`)
      }
      noteParts.push(values.initial_notes.trim())
      const initial_notes = noteParts.join('\n\n')

      start(async () => {
        try {
          await submitFormAction({
            templateId,
            caseId: null,
            formData: {
              case_number: values.case_number.trim(),
              case_type: values.case_type,
              date_assigned: values.incident_date,
              assigned_to: det.full_name,
              referring_agency: values.complainant_name?.trim() || '',
              initial_notes,
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
      title="Case Assignment / Intake"
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
          <label className="text-xs font-medium text-text-secondary">Case number</label>
          <input className={cn('mt-1', inputClass, errors.case_number && 'border-danger')} {...register('case_number')} />
          {errors.case_number ? (
            <p className="mt-1 text-xs text-danger">{errors.case_number.message}</p>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Complainant name</label>
          <input className="mt-1 min-h-12 w-full rounded-md border border-border-subtle bg-bg-app px-3 text-base" {...register('complainant_name')} />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Incident type</label>
          <select className={cn('mt-1', inputClass)} {...register('case_type')}>
            {CASE_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Incident date</label>
          <input
            type="date"
            className={cn('mt-1', inputClass, errors.incident_date && 'border-danger')}
            {...register('incident_date')}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Location</label>
          <input className="mt-1 min-h-12 w-full rounded-md border border-border-subtle bg-bg-app px-3 text-base" {...register('location')} />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Brief summary</label>
          <textarea
            rows={4}
            className={cn(
              'mt-1 min-h-[6rem] w-full resize-y rounded-md border border-border-subtle bg-bg-app px-3 py-2 text-base',
              errors.initial_notes && 'border-danger'
            )}
            {...register('initial_notes')}
          />
          {errors.initial_notes ? (
            <p className="mt-1 text-xs text-danger">{errors.initial_notes.message}</p>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Assigned to (detective)</label>
          <select
            className={cn('mt-1', inputClass, errors.assigned_personnel_id && 'border-danger')}
            {...register('assigned_personnel_id')}
          >
            <option value="">Select detective…</option>
            {detectives.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
          {errors.assigned_personnel_id ? (
            <p className="mt-1 text-xs text-danger">{errors.assigned_personnel_id.message}</p>
          ) : null}
        </div>
      </form>
    </BottomSheet>
  )
}
