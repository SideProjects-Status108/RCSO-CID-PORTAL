'use client'

import { useEffect, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SurveyStatus = {
  status: 'pending' | 'completed' | 'expired'
  completed_count: number
  pending_count: number
  expires_at: string | null
  learning_style_data: Record<string, unknown> | null
}

type SurveyStatusCardProps = {
  ditRecordId: string | null
  initialStatus?: SurveyStatus | null
}

export function SurveyStatusCard({ ditRecordId, initialStatus }: SurveyStatusCardProps) {
  const [status, setStatus] = useState<SurveyStatus | null>(initialStatus ?? null)
  const [loading, setLoading] = useState<boolean>(Boolean(ditRecordId && !initialStatus))
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!ditRecordId || initialStatus) return
    let cancelled = false
    fetch(`/api/training/dit-records/${ditRecordId}/survey-status`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SurveyStatus | null) => {
        if (!cancelled) setStatus(data)
      })
      .catch(() => {
        if (!cancelled) setStatus(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ditRecordId, initialStatus])

  function handleResend() {
    if (!ditRecordId) return
    setResendMessage(null)
    startTransition(async () => {
      const res = await fetch(`/api/training/dit-records/${ditRecordId}/resend-survey`, {
        method: 'POST',
      })
      if (!res.ok) {
        setResendMessage('Resend failed. Try again in a moment.')
        return
      }
      const data = (await res.json()) as { expires_at?: string }
      setStatus((prev) =>
        prev
          ? { ...prev, status: 'pending', expires_at: data.expires_at ?? prev.expires_at }
          : prev
      )
      setResendMessage('Survey re-sent. New link expires in 7 days.')
    })
  }

  const empty = !ditRecordId
  const label = empty
    ? 'No survey yet'
    : loading
      ? 'Loading...'
      : status
        ? statusLabel(status)
        : 'No survey yet'

  return (
    <div className="flex h-full flex-col gap-2 rounded-lg border border-border-subtle bg-bg-app/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Pre-start survey
        </h3>
        <StatusPill status={status?.status ?? 'pending'} dim={empty} />
      </div>
      <p className="text-sm text-text-primary">{label}</p>

      {status?.status === 'completed' && status.learning_style_data ? (
        <div className="rounded border border-border-subtle bg-bg-surface p-2 text-xs text-text-secondary">
          <span className="font-medium text-text-primary">Learning style:</span>{' '}
          {renderLearningStyle(status.learning_style_data)}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Button type="button" size="sm" variant="outline" disabled title="Response tracking lands in Prompt 2-follow-up">
          Track responses
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleResend}
          disabled={empty || pending}
        >
          {pending ? 'Resending...' : 'Resend survey'}
        </Button>
      </div>
      {resendMessage ? <p className="text-xs text-text-secondary">{resendMessage}</p> : null}
    </div>
  )
}

function statusLabel(s: SurveyStatus): string {
  if (s.status === 'completed') {
    const total = s.completed_count + s.pending_count
    if (total > 0) return `Completed (${s.completed_count} of ${total} responded)`
    return 'Completed'
  }
  if (s.status === 'expired') return 'Expired. Resend to issue a new link.'
  if (s.expires_at) {
    const expires = new Date(s.expires_at)
    const days = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    return `Awaiting response (expires in ${days} day${days === 1 ? '' : 's'})`
  }
  return 'Awaiting response'
}

function renderLearningStyle(data: Record<string, unknown>): string {
  const entries = Object.entries(data)
  if (entries.length === 0) return 'No data yet.'
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ')
}

function StatusPill({ status, dim }: { status: SurveyStatus['status']; dim?: boolean }) {
  const cls = {
    pending: 'border-accent-primary/40 bg-accent-primary-muted/25 text-accent-primary',
    completed: 'border-success/40 bg-success/10 text-success',
    expired: 'border-danger/40 bg-danger/10 text-danger',
  }[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        cls,
        dim && 'opacity-60'
      )}
    >
      {status}
    </span>
  )
}
