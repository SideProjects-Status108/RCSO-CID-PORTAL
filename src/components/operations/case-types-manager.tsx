'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { upsertCaseTypeAction } from '@/lib/operations/actions'
import type { CaseTypeRow } from '@/types/operations'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/app/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

export function CaseTypesManager({ initialTypes }: { initialTypes: CaseTypeRow[] }) {
  const router = useRouter()
  const [modal, setModal] = useState<CaseTypeRow | 'new' | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/operations" className="text-sm text-accent-teal hover:underline">
            ← Operations
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-text-primary">Case types</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Prefixes validate new case numbers. Deactivate types you no longer assign.
          </p>
        </div>
        <Button
          type="button"
          className="border border-accent-gold/30 bg-accent-gold text-bg-app"
          onClick={() => setModal('new')}
        >
          Add type
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Prefix</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {initialTypes.map((r) => (
              <tr key={r.id} className="border-b border-border-subtle">
                <td className="px-3 py-2 font-medium text-text-primary">{r.name}</td>
                <td className="px-3 py-2 font-mono text-accent-gold">{r.prefix}</td>
                <td className="px-3 py-2">{r.is_active ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setModal(r)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CaseTypeModal
        key={modal === null ? 'closed' : modal === 'new' ? 'new' : modal.id}
        open={modal !== null}
        onOpenChange={(o) => !o && setModal(null)}
        editing={modal === 'new' ? null : modal}
        onSaved={() => {
          setModal(null)
          router.refresh()
        }}
      />
    </div>
  )
}

function CaseTypeModal({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: CaseTypeRow | null
  onSaved: () => void
}) {
  const [name, setName] = useState(() => editing?.name ?? '')
  const [prefix, setPrefix] = useState(() => editing?.prefix ?? '')
  const [description, setDescription] = useState(() => editing?.description ?? '')
  const [isActive, setIsActive] = useState(() => editing?.is_active ?? true)
  const [pending, start] = useTransition()

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Edit case type' : 'New case type'}
      className="max-w-md"
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-border-subtle bg-bg-surface"
          />
        </div>
        <div className="space-y-1">
          <Label>Prefix</Label>
          <Input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="border-border-subtle bg-bg-surface font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="border-border-subtle bg-bg-surface"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <span className="text-sm text-text-secondary">Active</span>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            className="border border-accent-gold/30 bg-accent-gold text-bg-app"
            onClick={() => {
              start(async () => {
                await upsertCaseTypeAction({
                  id: editing?.id,
                  name,
                  prefix,
                  description: description.trim() || null,
                  is_active: isActive,
                })
                onSaved()
              })
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}
