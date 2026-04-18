'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarPlus,
  CheckCircle2,
  CircleDot,
  FileSignature,
  Lock,
  X,
} from 'lucide-react'

import {
  ABSENCE_KINDS,
  ABSENCE_KIND_LABELS,
  type AbsenceKind,
  type DitAbsenceRecord,
} from '@/types/training'
import { SignaturePad, type SignaturePadHandle } from '@/components/training/signatures/signature-pad'

const STATUS_STYLES: Record<
  DitAbsenceRecord['status'],
  { label: string; className: string; Icon: typeof CircleDot }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-neutral-500/10 text-neutral-300 border-neutral-500/30',
    Icon: CircleDot,
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
    Icon: FileSignature,
  },
  acknowledged: {
    label: 'Acknowledged',
    className: 'bg-accent-primary/10 text-accent-primary border-accent-primary/20',
    Icon: CheckCircle2,
  },
  closed: {
    label: 'Closed',
    className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    Icon: Lock,
  },
}

export function AbsencesClient({
  ditRecordId,
  absences,
  canDocument,
  canClose,
}: {
  ditRecordId: string
  absences: DitAbsenceRecord[]
  canDocument: boolean
  canClose: boolean
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => router.refresh()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          {canDocument
            ? 'Document a DIT absence (illness, OJI, bereavement, personal, or sick). Submissions route through the FTO, FTO Coordinator, and Training Supervisor for acknowledgment.'
            : 'Closed absences are visible to the DIT. In-progress records are visible to the FTO and training staff only.'}
        </p>
        {canDocument ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 rounded bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Document absence
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      {absences.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-bg-card px-3 py-6 text-center text-xs text-text-tertiary">
          No absences on record.
        </div>
      ) : (
        <ul className="space-y-2">
          {absences.map((a) => (
            <AbsenceRow
              key={a.id}
              absence={a}
              canClose={canClose && a.status !== 'closed'}
              onClosed={refresh}
              onError={setError}
            />
          ))}
        </ul>
      )}

      {modalOpen ? (
        <DocumentAbsenceModal
          ditRecordId={ditRecordId}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false)
            setError(null)
            refresh()
          }}
          onError={setError}
        />
      ) : null}
    </div>
  )
}

function AbsenceRow({
  absence,
  canClose,
  onClosed,
  onError,
}: {
  absence: DitAbsenceRecord
  canClose: boolean
  onClosed: () => void
  onError: (msg: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const meta = STATUS_STYLES[absence.status]
  const Icon = meta.Icon

  const handleClose = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/training/absences/${absence.id}/close`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        })
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) throw new Error(body.error ?? `Close failed (${res.status})`)
        onClosed()
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to close absence')
      }
    })
  }

  return (
    <li className="rounded-md border border-border-subtle bg-bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            {ABSENCE_KIND_LABELS[absence.kind]}
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${meta.className}`}
            >
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-text-tertiary">
            {absence.start_date}
            {absence.end_date ? ` → ${absence.end_date}` : ' → open'}
          </div>
          {absence.description ? (
            <p className="mt-1 text-xs text-text-secondary">{absence.description}</p>
          ) : null}
        </div>
        {canClose ? (
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-bg-subtle hover:text-text-primary disabled:opacity-50"
          >
            <Lock className="h-3 w-3" />
            {pending ? 'Closing…' : 'Close absence'}
          </button>
        ) : null}
      </div>
    </li>
  )
}

function DocumentAbsenceModal({
  ditRecordId,
  onClose,
  onCreated,
  onError,
}: {
  ditRecordId: string
  onClose: () => void
  onCreated: () => void
  onError: (msg: string) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [kind, setKind] = useState<AbsenceKind>('illness')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [empty, setEmpty] = useState(true)
  const padRef = useRef<SignaturePadHandle | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const signatureImage = padRef.current?.getDataUrl() ?? null
      const res = await fetch('/api/training/absences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          dit_record_id: ditRecordId,
          start_date: startDate,
          end_date: endDate || null,
          kind,
          description: description.trim() || null,
          signature_image: signatureImage,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(body.error ?? `Create failed (${res.status})`)
      onCreated()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to document absence')
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Document absence"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-lg border border-border-subtle bg-bg-card p-5 shadow-xl"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Document absence</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-tertiary hover:bg-bg-subtle"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Kind">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as AbsenceKind)}
              className="w-full rounded border border-border-subtle bg-bg-subtle px-2 py-1.5 text-sm text-text-primary"
            >
              {ABSENCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {ABSENCE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border border-border-subtle bg-bg-subtle px-2 py-1.5 text-sm text-text-primary"
            />
          </Field>
          <Field label="End date (optional)">
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded border border-border-subtle bg-bg-subtle px-2 py-1.5 text-sm text-text-primary"
            />
          </Field>
        </div>

        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded border border-border-subtle bg-bg-subtle px-2 py-1.5 text-sm text-text-primary"
            placeholder="Brief context for the coordinator (e.g., flu, OJI scene details, dates)."
          />
        </Field>

        <div>
          <SignaturePad ref={padRef} onChange={setEmpty} label="Your signature (optional)" />
          <p className="mt-1 text-[11px] text-text-tertiary">
            Sign to pre-complete the FTO step. If you leave this blank, the record will still
            route through the chain and you can sign later from your inbox.
          </p>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border-subtle pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-subtle"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : empty ? 'Submit (no signature)' : 'Submit absence'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  )
}
