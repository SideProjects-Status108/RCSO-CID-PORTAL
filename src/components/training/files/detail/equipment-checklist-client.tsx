'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import type {
  EquipmentCheckoff,
  EquipmentCheckoffItem,
} from '@/types/training'
import { EQUIPMENT_CHECKOFF_DEFAULT_ITEMS } from '@/types/training'

function defaultItems(): EquipmentCheckoffItem[] {
  return EQUIPMENT_CHECKOFF_DEFAULT_ITEMS.map((i) => ({
    key: i.key,
    label: i.label,
    checked: false,
    serial: null,
    note: null,
  }))
}

export function EquipmentChecklistClient({
  ditRecordId,
  initial,
  canWrite,
}: {
  ditRecordId: string
  initial: EquipmentCheckoff | null
  canWrite: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [items, setItems] = useState<EquipmentCheckoffItem[]>(
    initial?.items?.length ? initial.items : defaultItems(),
  )
  const [notes, setNotes] = useState<string>(initial?.notes ?? '')

  const locked = !canWrite || (initial != null && initial.status !== 'draft')

  function updateItem(idx: number, patch: Partial<EquipmentCheckoffItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  async function saveDraft() {
    setErr(null)
    const res = await fetch('/api/training/equipment-checkoff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        dit_record_id: ditRecordId,
        items,
        notes: notes.trim() ? notes : null,
      }),
    })
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string }
      setErr(error ?? `Save failed (${res.status})`)
      return
    }
    startTransition(() => router.refresh())
  }

  async function issueRoute() {
    setErr(null)
    const res = await fetch('/api/training/equipment-checkoff/issue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        dit_record_id: ditRecordId,
        items,
        notes: notes.trim() ? notes : null,
      }),
    })
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string }
      setErr(error ?? `Issue failed (${res.status})`)
      return
    }
    startTransition(() => router.refresh())
  }

  const checkedCount = items.filter((i) => i.checked).length

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border-subtle">
        <table className="min-w-full divide-y divide-border-subtle text-sm">
          <thead className="bg-bg-elevated text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th scope="col" className="w-10 px-3 py-2 text-left font-medium">
                <span className="sr-only">Checked</span>
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Item</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Serial / ID</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {items.map((it, idx) => (
              <tr key={it.key}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={it.checked}
                    disabled={locked}
                    onChange={(e) => updateItem(idx, { checked: e.target.checked })}
                    className="h-4 w-4 rounded border-border-subtle bg-bg-elevated text-accent-primary"
                  />
                </td>
                <td className="px-3 py-2 text-text-primary">{it.label}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={it.serial ?? ''}
                    disabled={locked}
                    onChange={(e) => updateItem(idx, { serial: e.target.value || null })}
                    className="w-full rounded border border-border-subtle bg-bg-elevated px-2 py-1 text-xs text-text-primary placeholder:text-text-secondary focus:border-accent-primary focus:outline-none disabled:opacity-60"
                    placeholder="—"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={it.note ?? ''}
                    disabled={locked}
                    onChange={(e) => updateItem(idx, { note: e.target.value || null })}
                    className="w-full rounded border border-border-subtle bg-bg-elevated px-2 py-1 text-xs text-text-primary placeholder:text-text-secondary focus:border-accent-primary focus:outline-none disabled:opacity-60"
                    placeholder="—"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <textarea
          value={notes}
          disabled={locked}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent-primary focus:outline-none disabled:opacity-60"
        />
        <div className="flex flex-col items-end justify-end gap-1 text-right">
          <span className="text-[11px] text-text-secondary">
            {checkedCount}/{items.length} checked
          </span>
        </div>
      </div>

      {canWrite ? (
        <div className="flex flex-wrap items-center gap-2">
          {(!initial || initial.status === 'draft') ? (
            <>
              <Button size="sm" variant="outline" onClick={saveDraft} disabled={pending}>
                {pending ? 'Saving…' : 'Save draft'}
              </Button>
              <Button size="sm" variant="default" onClick={issueRoute} disabled={pending}>
                {pending ? 'Working…' : 'Issue + open signatures'}
              </Button>
            </>
          ) : initial.status === 'voided' ? (
            <Button size="sm" variant="default" onClick={issueRoute} disabled={pending}>
              {pending ? 'Working…' : 'Re-issue'}
            </Button>
          ) : null}
          {err ? <span className="text-xs text-red-400">{err}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
