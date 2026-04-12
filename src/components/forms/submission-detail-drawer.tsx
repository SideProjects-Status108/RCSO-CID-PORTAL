'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { Printer } from 'lucide-react'

import {
  approveSubmissionAction,
  getSubmissionDetailAction,
  rejectSubmissionAction,
} from '@/app/(dashboard)/forms/actions'
import type { SubmissionDetail } from '@/lib/forms/queries'
import { submissionStatusForStamp } from '@/lib/forms/submission-status-display'
import { Button, buttonVariants } from '@/components/ui/button'
import { Drawer } from '@/components/app/drawer'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusStamp } from '@/components/app/status-stamp'
import { FormValuesReadonly } from '@/components/forms/form-values-readonly'

type SubmissionDetailDrawerProps = {
  submissionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When opened from approval queue, show approve/reject controls */
  approvalMode: boolean
  canReview: boolean
  onUpdated: () => void
}

export function SubmissionDetailDrawer({
  submissionId,
  open,
  onOpenChange,
  approvalMode,
  canReview,
  onUpdated,
}: SubmissionDetailDrawerProps) {
  const [detail, setDetail] = useState<SubmissionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [approveNote, setApproveNote] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open || !submissionId) return

    const run = async () => {
      setError(null)
      setDetail(null)
      try {
        const d = await getSubmissionDetailAction(submissionId)
        setDetail(d)
        if (!d) setError('Unable to load submission.')
      } catch {
        setError('Unable to load submission.')
      }
    }

    // Defer to avoid synchronous setState in effect body (react-hooks/set-state-in-effect).
    const t = window.setTimeout(() => {
      startTransition(() => {
        void run()
      })
    }, 0)
    return () => window.clearTimeout(t)
  }, [open, submissionId])

  function runApprove() {
    if (!submissionId) return
    setError(null)
    startTransition(async () => {
      try {
        await approveSubmissionAction({
          submissionId,
          reviewNotes: approveNote.trim() || null,
        })
        onOpenChange(false)
        onUpdated()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Approve failed')
      }
    })
  }

  function runReject() {
    if (!submissionId) return
    setError(null)
    startTransition(async () => {
      try {
        await rejectSubmissionAction({
          submissionId,
          reviewNotes: rejectNote,
        })
        onOpenChange(false)
        onUpdated()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Reject failed')
      }
    })
  }

  const stamp = detail
    ? submissionStatusForStamp(detail.submission.status)
    : { label: '', variant: 'neutral' as const }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={detail?.template.name ?? 'Submission'}
    >
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {detail ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp variant={stamp.variant}>{stamp.label}</StatusStamp>
            {detail.template.requires_approval ? (
              <span className="text-xs text-text-secondary">Requires approval</span>
            ) : null}
          </div>

          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-text-secondary">Submitted by</dt>
              <dd className="font-medium text-text-primary">{detail.submitter_name}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Submitted</dt>
              <dd className="font-mono text-text-primary">
                {new Date(detail.submission.created_at).toLocaleString()}
              </dd>
            </div>
            {detail.case_number ? (
              <div>
                <dt className="text-text-secondary">Case</dt>
                <dd className="font-mono text-text-primary">{detail.case_number}</dd>
              </div>
            ) : null}
            {detail.submission.reviewed_at ? (
              <div>
                <dt className="text-text-secondary">Reviewed</dt>
                <dd>
                  {detail.reviewer_name ?? '—'} on{' '}
                  {new Date(detail.submission.reviewed_at).toLocaleString()}
                </dd>
              </div>
            ) : null}
            {detail.submission.review_notes ? (
              <div>
                <dt className="text-text-secondary">Review notes</dt>
                <dd className="whitespace-pre-wrap text-text-primary">
                  {detail.submission.review_notes}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="rounded border border-border-subtle bg-bg-surface p-4">
            <FormValuesReadonly
              fields={detail.template.fields_schema}
              values={detail.submission.form_data}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/forms/submissions/${detail.submission.id}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: 'outline',
                className: 'border-border-subtle inline-flex items-center',
              })}
            >
              <Printer className="mr-2 size-4" />
              Print
            </Link>
          </div>

          {approvalMode && canReview && detail.submission.status === 'submitted' ? (
            <div className="space-y-4 border-t border-border-subtle pt-4">
              <p className="text-sm font-medium text-text-primary">Review decision</p>
              <div className="space-y-2">
                <Label htmlFor="approve-note">Approval note (optional)</Label>
                <Textarea
                  id="approve-note"
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  rows={2}
                  className="border-border-subtle bg-bg-app"
                />
                <Button
                  type="button"
                  disabled={pending}
                  className="border border-accent-primary/30 bg-accent-primary text-bg-app"
                  onClick={() => void runApprove()}
                >
                  Approve
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reject-note">Rejection note (required)</Label>
                <Textarea
                  id="reject-note"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={2}
                  className="border-border-subtle bg-bg-app"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !rejectNote.trim()}
                  className="border-danger/40 text-danger"
                  onClick={() => void runReject()}
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : pending ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : null}
    </Drawer>
  )
}
