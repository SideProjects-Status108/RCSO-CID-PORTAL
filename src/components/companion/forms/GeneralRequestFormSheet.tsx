'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { BottomSheet } from '@/components/companion/bottom-sheet'
import { createGeneralCompanionRequestAction } from '@/app/(companion)/app/forms/actions'
import { cn } from '@/lib/utils'

const schema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  urgency: z.enum(['routine', 'urgent', 'emergency']),
  description: z.string().trim().min(1, 'Description is required').max(4000),
})

type Values = z.infer<typeof schema>

const inputClass =
  'min-h-12 w-full rounded-md border border-border-subtle bg-bg-app px-3 text-base text-text-primary'

export function GeneralRequestFormSheet({
  open,
  onClose,
  onSubmitted,
  onError,
}: {
  open: boolean
  onClose: () => void
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
      subject: '',
      urgency: 'routine',
      description: '',
    },
  })

  const submit = handleSubmit(
    (values) => {
      start(async () => {
        try {
          await createGeneralCompanionRequestAction({
            subject: values.subject,
            urgency: values.urgency,
            description: values.description,
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
      title="General Request"
      panelClassName="max-h-[min(90dvh,640px)]"
      footer={
        <button
          type="button"
          disabled={pending}
          onClick={() => submit()}
          className="min-h-12 w-full rounded-md border border-accent-primary/30 bg-accent-primary text-base font-semibold text-bg-app hover:bg-accent-primary-hover disabled:opacity-50"
        >
          Submit
        </button>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="text-xs font-medium text-text-secondary">Subject</label>
          <input className={cn('mt-1', inputClass, errors.subject && 'border-danger')} {...register('subject')} />
          {errors.subject ? (
            <p className="mt-1 text-xs text-danger">{errors.subject.message}</p>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Urgency</label>
          <select className={cn('mt-1', inputClass, errors.urgency && 'border-danger')} {...register('urgency')}>
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Description</label>
          <textarea
            rows={5}
            className={cn(
              'mt-1 min-h-[7rem] w-full resize-y rounded-md border border-border-subtle bg-bg-app px-3 py-2 text-base',
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
