'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, FileSignature, RefreshCw } from 'lucide-react'

import type { DocSignatureType, DocumentSignatureRow } from '@/types/training'
import { SignaturePad, type SignaturePadHandle } from './signature-pad'

const DOC_TYPE_LABELS: Record<DocSignatureType, string> = {
  weekly_eval: 'Weekly Evaluation',
  deficiency: 'Deficiency Form',
  equipment_checkoff: 'Equipment Check-Off',
  completion_cert: 'Completion Certificate',
  fto_feedback: 'FTO Feedback',
  absence_record: 'Absence Record',
}

type QueueResponse = { rows: DocumentSignatureRow[] }

export function SignatureQueue() {
  const [rows, setRows] = useState<DocumentSignatureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [empty, setEmpty] = useState(true)
  const padRef = useRef<SignaturePadHandle | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/training/signatures/queue', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load signature queue')
      const data = (await res.json()) as QueueResponse
      setRows(data.rows ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signature queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSign = async (row: DocumentSignatureRow) => {
    if (!padRef.current) return
    const image = padRef.current.getDataUrl()
    if (!image) {
      setError('Please sign before submitting.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/training/signatures/${row.id}/sign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ signature_image: image }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
      }
      if (!res.ok) throw new Error(body.error ?? `Signature failed (${res.status})`)
      padRef.current.clear()
      setActiveId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <FileSignature className="h-4 w-4" />
          My signature inbox
          {!loading ? (
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[11px] text-text-secondary">
              {rows.length}
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
          disabled={loading}
          aria-label="Refresh queue"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-md border border-border-subtle bg-bg-surface px-3 py-4 text-xs text-text-secondary">
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-bg-surface px-3 py-4 text-xs text-text-secondary">
          Nothing waiting on your signature.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const isActive = activeId === row.id
            return (
              <li
                key={row.id}
                className="rounded-md border border-border-subtle bg-bg-surface p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                      {DOC_TYPE_LABELS[row.doc_type] ?? row.doc_type}
                      <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary">
                        Step {row.current_step + 1}/{row.routing_order.length}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary">
                      <Clock className="h-3 w-3" />
                      Waiting since {new Date(row.updated_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveId(isActive ? null : row.id)}
                    className="rounded bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    {isActive ? 'Cancel' : 'Sign'}
                  </button>
                </div>

                {isActive ? (
                  <div className="mt-3 space-y-2 border-t border-border-subtle pt-3">
                    <SignaturePad
                      ref={padRef}
                      onChange={(isEmpty) => setEmpty(isEmpty)}
                      disabled={submitting}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={empty || submitting}
                        onClick={() => void handleSign(row)}
                        className="rounded bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Submit signature'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
