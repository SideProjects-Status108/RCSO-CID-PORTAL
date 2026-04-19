'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type FtoRow = {
  id: string
  full_name: string
  badge_number: string | null
  role: string
  is_active: boolean
  fto_color: string | null
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function FtoRosterTable({
  ftos,
  canEdit,
}: {
  ftos: FtoRow[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(ftos.map((f) => [f.id, f.fto_color ?? ''])),
  )
  const [savingId, setSavingId] = useState<string | null>(null)

  async function save(id: string) {
    setErr(null)
    const raw = draft[id] ?? ''
    const color = raw.trim() === '' ? null : raw.trim()
    if (color != null && !HEX_RE.test(color)) {
      setErr('Color must be a 7-char hex like #2563eb')
      return
    }
    setSavingId(id)
    const res = await fetch(`/api/training/fto-roster/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fto_color: color }),
    })
    setSavingId(null)
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string }
      setErr(error ?? `Save failed (${res.status})`)
      return
    }
    startTransition(() => router.refresh())
  }

  if (ftos.length === 0) {
    return (
      <p className="rounded-md border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-text-secondary">
        No FTO or FTO Coordinator profiles.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle bg-bg-surface">
      {err ? (
        <div className="border-b border-border-subtle px-4 py-2 text-xs text-red-400">{err}</div>
      ) : null}
      <table className="min-w-full divide-y divide-border-subtle text-sm">
        <thead className="bg-bg-elevated text-xs uppercase tracking-wide text-text-secondary">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">FTO</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Role</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Badge</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Active</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Schedule color</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {ftos.map((f) => {
            const current = draft[f.id] ?? ''
            const valid = current === '' || HEX_RE.test(current)
            return (
              <tr key={f.id}>
                <td className="px-3 py-2 text-text-primary">{f.full_name}</td>
                <td className="px-3 py-2 text-text-secondary">{formatRole(f.role)}</td>
                <td className="px-3 py-2 text-text-secondary">{f.badge_number ?? '—'}</td>
                <td className="px-3 py-2">
                  {f.is_active ? (
                    <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-neutral-500/15 px-2 py-0.5 text-xs font-medium text-neutral-300 ring-1 ring-inset ring-neutral-500/30">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-5 w-5 rounded border border-border-subtle"
                      style={{
                        backgroundColor: HEX_RE.test(current) ? current : '#2d2d33',
                      }}
                    />
                    <input
                      type="color"
                      value={HEX_RE.test(current) ? current : '#2563eb'}
                      disabled={!canEdit || savingId === f.id}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [f.id]: e.target.value }))
                      }
                      className="h-7 w-10 cursor-pointer rounded border border-border-subtle bg-bg-elevated disabled:opacity-60"
                    />
                    <input
                      type="text"
                      value={current}
                      placeholder="#2563eb"
                      disabled={!canEdit || savingId === f.id}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [f.id]: e.target.value }))
                      }
                      className="w-24 rounded border border-border-subtle bg-bg-elevated px-2 py-1 text-xs text-text-primary placeholder:text-text-secondary focus:border-accent-primary focus:outline-none disabled:opacity-60"
                    />
                    {canEdit ? (
                      <button
                        type="button"
                        disabled={savingId === f.id || !valid}
                        onClick={() => save(f.id)}
                        className="rounded border border-border-subtle bg-bg-elevated px-2 py-1 text-xs font-medium text-text-primary hover:bg-bg-surface disabled:opacity-60"
                      >
                        {savingId === f.id ? 'Saving…' : 'Save'}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function formatRole(role: string): string {
  switch (role) {
    case 'fto':
      return 'FTO'
    case 'fto_coordinator':
      return 'FTO Coordinator'
    default:
      return role
  }
}
