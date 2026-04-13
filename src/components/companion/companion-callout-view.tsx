'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { BottomSheet } from '@/components/companion/bottom-sheet'
import { CompanionCard } from '@/components/companion/companion-card'
import { CompanionFlash } from '@/components/companion/companion-flash'
import { StatusStamp } from '@/components/app/status-stamp'
import { createCallOutAction } from '@/app/(companion)/app/callout/actions'
import { callOutAddress, callOutCaseNumber } from '@/lib/companion/callout-utils'
import { formatRelativeTime } from '@/lib/companion/format-relative'
import type { RequestRow } from '@/types/requests'
import { hapticSuccess } from '@/lib/haptic'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  address: z.string().trim().min(3, 'Address is required').max(500),
  caseNumber: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
})

type FormValues = z.infer<typeof formSchema>

function mapUrl(address: string) {
  return `/app/map?address=${encodeURIComponent(address.trim())}`
}

function requestStatusLabel(status: RequestRow['status']): string {
  switch (status) {
    case 'open':
      return 'Open'
    case 'acknowledged':
      return 'Acknowledged'
    case 'in_progress':
      return 'In progress'
    case 'complete':
    case 'closed':
      return 'Resolved'
    default:
      return status
  }
}

function requestStatusVariant(
  status: RequestRow['status']
): 'neutral' | 'teal' | 'gold' | 'muted' {
  if (status === 'in_progress') return 'teal'
  if (status === 'open' || status === 'acknowledged') return 'gold'
  return 'muted'
}

export function CompanionCalloutView({
  initialActive,
  initialRecent,
}: {
  initialActive: RequestRow[]
  initialRecent: RequestRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [recentOpen, setRecentOpen] = useState(false)
  const [postSuccess, setPostSuccess] = useState<{ address: string } | null>(null)
  const [flash, setFlash] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { address: '', caseNumber: '', notes: '' },
  })

  const onSubmit = handleSubmit((values) => {
    setFlash(null)
    startTransition(async () => {
      try {
        await createCallOutAction({
          address: values.address,
          caseNumber: values.caseNumber?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
        })
        hapticSuccess()
        setPostSuccess({ address: values.address.trim() })
        setFlash({ tone: 'success', text: 'Call-out created.' })
        reset({ address: '', caseNumber: '', notes: '' })
        router.refresh()
      } catch (e) {
        setFlash({
          tone: 'error',
          text: e instanceof Error ? e.message : 'Could not create call-out',
        })
      }
    })
  })

  const activeSorted = useMemo(
    () => [...initialActive].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [initialActive]
  )

  return (
    <div className="pb-4">
      <h1 className="font-heading text-lg font-semibold uppercase tracking-wide text-text-primary">
        Call-Out
      </h1>

      <CompanionFlash
        message={flash?.text ?? null}
        tone={flash?.tone ?? 'success'}
        onDismiss={() => setFlash(null)}
      />

      <section className="mt-2 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Quick entry
        </h2>
        <form className="space-y-3" onSubmit={onSubmit} noValidate>
          <div>
            <label className="font-sans text-xs font-medium text-text-secondary" htmlFor="co-address">
              Address
            </label>
            <input
              id="co-address"
              className={cn(
                'mt-1 min-h-12 w-full rounded-md border border-border-subtle bg-bg-app px-3 text-base text-text-primary placeholder:text-text-disabled',
                errors.address && 'border-danger'
              )}
              placeholder="Street address or intersection"
              autoComplete="street-address"
              {...register('address')}
            />
            {errors.address ? (
              <p className="mt-1 text-xs text-danger">{errors.address.message}</p>
            ) : null}
          </div>
          <div>
            <label className="font-sans text-xs font-medium text-text-secondary" htmlFor="co-case">
              Case number (optional)
            </label>
            <input
              id="co-case"
              className="mt-1 min-h-12 w-full rounded-md border border-border-subtle bg-bg-app px-3 text-base text-text-primary placeholder:text-text-disabled"
              {...register('caseNumber')}
            />
            {errors.caseNumber ? (
              <p className="mt-1 text-xs text-danger">{errors.caseNumber.message}</p>
            ) : null}
          </div>
          <div>
            <label className="font-sans text-xs font-medium text-text-secondary" htmlFor="co-notes">
              Notes (optional)
            </label>
            <textarea
              id="co-notes"
              rows={3}
              className="mt-1 min-h-[5.5rem] w-full resize-y rounded-md border border-border-subtle bg-bg-app px-3 py-2 text-base text-text-primary placeholder:text-text-disabled"
              {...register('notes')}
            />
            {errors.notes ? (
              <p className="mt-1 text-xs text-danger">{errors.notes.message}</p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="min-h-12 w-full rounded-md border border-accent-primary/30 bg-accent-primary text-base font-semibold text-bg-app hover:bg-accent-primary-hover disabled:opacity-60"
          >
            Create Call-Out
          </button>
        </form>
      </section>

      <BottomSheet
        open={Boolean(postSuccess)}
        onClose={() => setPostSuccess(null)}
        title="Call-out saved"
        footer={
          <div className="flex flex-col gap-2">
            <Link
              href={postSuccess ? mapUrl(postSuccess.address) : '#'}
              className="flex min-h-12 items-center justify-center rounded-md border border-accent-primary/30 bg-accent-primary text-center text-base font-semibold text-bg-app hover:bg-accent-primary-hover"
            >
              Open in Map
            </Link>
            <button
              type="button"
              className="min-h-12 rounded-md border border-border-subtle bg-bg-elevated text-base font-medium text-text-primary"
              onClick={() => setPostSuccess(null)}
            >
              Done
            </button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          Your call-out is live on the board. You can open the location in the map or continue
          entering another address.
        </p>
      </BottomSheet>

      <section className="mt-8 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Active call-outs
        </h2>
        {activeSorted.length === 0 ? (
          <CompanionCard className="flex flex-col items-center gap-2 py-8 text-center">
            <Bell className="size-10 text-accent-primary" strokeWidth={1.5} aria-hidden />
            <p className="font-heading text-sm font-semibold text-text-primary">No active call-outs</p>
            <p className="font-sans text-xs text-text-secondary">
              When you or your team post an urgent call-out, it will show here.
            </p>
          </CompanionCard>
        ) : (
          <ul className="space-y-3">
            {activeSorted.map((r) => {
              const addr = callOutAddress(r)
              const cn = callOutCaseNumber(r)
              return (
                <li key={r.id}>
                  <CompanionCard className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary">{addr || '—'}</p>
                      <StatusStamp variant={requestStatusVariant(r.status)}>
                        {requestStatusLabel(r.status)}
                      </StatusStamp>
                    </div>
                    {cn ? (
                      <p className="text-xs text-text-secondary">Case {cn}</p>
                    ) : null}
                    <p className="text-xs text-text-disabled">
                      {formatRelativeTime(r.created_at)}
                    </p>
                    {addr ? (
                      <Link
                        href={mapUrl(addr)}
                        className="inline-flex min-h-10 items-center justify-center rounded-md border border-border-subtle px-3 text-sm font-medium text-text-primary"
                      >
                        Open in Map
                      </Link>
                    ) : null}
                  </CompanionCard>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <button
          type="button"
          className="flex w-full items-center justify-between border-b border-border-subtle py-2 text-left text-sm font-semibold text-text-primary"
          onClick={() => setRecentOpen((o) => !o)}
          aria-expanded={recentOpen}
        >
          <span>Recent (5)</span>
          <span className="text-text-secondary">{recentOpen ? '−' : '+'}</span>
        </button>
        {recentOpen ? (
          <ul className="mt-3 space-y-3">
            {initialRecent.length === 0 ? (
              <CompanionCard className="flex flex-col items-center gap-2 py-6 text-center">
                <Bell className="size-8 text-text-disabled" strokeWidth={1.5} aria-hidden />
                <p className="font-heading text-sm font-semibold text-text-primary">No recent call-outs</p>
                <p className="font-sans text-xs text-text-secondary">Resolved entries appear here after you create one.</p>
              </CompanionCard>
            ) : (
              initialRecent.map((r) => {
                const addr = callOutAddress(r)
                const caseNum = callOutCaseNumber(r)
                return (
                  <li key={r.id}>
                    <CompanionCard className="space-y-2 opacity-80">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-text-primary">{addr || '—'}</p>
                        <StatusStamp variant="muted">Resolved</StatusStamp>
                      </div>
                      {caseNum ? (
                        <p className="text-xs text-text-secondary">Case {caseNum}</p>
                      ) : null}
                      <p className="text-xs text-text-disabled">
                        {formatRelativeTime(r.updated_at)}
                      </p>
                      {addr ? (
                        <Link
                          href={mapUrl(addr)}
                          className="inline-flex min-h-10 items-center justify-center rounded-md border border-border-subtle px-3 text-sm font-medium text-text-primary"
                        >
                          Open in Map
                        </Link>
                      ) : null}
                    </CompanionCard>
                  </li>
                )
              })
            )}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
