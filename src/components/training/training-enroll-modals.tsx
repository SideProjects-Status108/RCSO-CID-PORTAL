'use client'

import { useState, useTransition } from 'react'

import { createPairingOnlyAction, enrollDitAction } from '@/app/(dashboard)/training/actions'
import type { PersonnelDirectoryRow } from '@/types/personnel'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/app/modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type EnrollDitModalProps = {
  open: boolean
  onOpenChange: (o: boolean) => void
  ditOptions: PersonnelDirectoryRow[]
  ftoOptions: PersonnelDirectoryRow[]
  onDone: () => void
}

export function EnrollDitModal({ open, onOpenChange, ditOptions, ftoOptions, onDone }: EnrollDitModalProps) {
  const [ditId, setDitId] = useState<string>('')
  const [ftoId, setFtoId] = useState<string>('')
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [phase, setPhase] = useState('1')
  const [notes, setNotes] = useState('')
  const [pending, startTr] = useTransition()

  function reset() {
    setDitId('')
    setFtoId('')
    setStart(new Date().toISOString().slice(0, 10))
    setPhase('1')
    setNotes('')
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
      title="Enroll DIT"
      className="max-w-md"
    >
      <div className="space-y-3 text-sm">
        <div className="space-y-1">
          <Label>DIT</Label>
          <Select value={ditId || undefined} onValueChange={(v) => setDitId(v ?? '')}>
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue placeholder="Select DIT" />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              {ditOptions.map((p) =>
                p.user_id ? (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name}
                  </SelectItem>
                ) : null
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Assigned FTO</Label>
          <Select value={ftoId || undefined} onValueChange={(v) => setFtoId(v ?? '')}>
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue placeholder="Select FTO" />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              {ftoOptions.map((p) =>
                p.user_id ? (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name}
                  </SelectItem>
                ) : null
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Start date</Label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <Label>Initial phase</Label>
          <Select value={phase} onValueChange={(v) => v && setPhase(v)}>
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              {['1', '2', '3'].map((p) => (
                <SelectItem key={p} value={p}>
                  Phase {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="border-border-subtle bg-bg-surface"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="border border-accent-primary/30 bg-accent-primary text-bg-app"
            disabled={pending || !ditId || !ftoId}
            onClick={() => {
              startTr(async () => {
                await enrollDitAction({
                  ditUserId: ditId,
                  ftoUserId: ftoId,
                  startDate: start,
                  initialPhase: Number(phase),
                  notes: notes.trim() || null,
                })
                reset()
                onOpenChange(false)
                onDone()
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

type NewPairingModalProps = {
  open: boolean
  onOpenChange: (o: boolean) => void
  ditOptions: PersonnelDirectoryRow[]
  ftoOptions: PersonnelDirectoryRow[]
  onDone: () => void
}

export function NewPairingModal({ open, onOpenChange, ditOptions, ftoOptions, onDone }: NewPairingModalProps) {
  const [ditId, setDitId] = useState<string>('')
  const [ftoId, setFtoId] = useState<string>('')
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [phase, setPhase] = useState('1')
  const [notes, setNotes] = useState('')
  const [pending, startTr] = useTransition()

  function reset() {
    setDitId('')
    setFtoId('')
    setStart(new Date().toISOString().slice(0, 10))
    setPhase('1')
    setNotes('')
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
      title="New FTO pairing"
      className="max-w-md"
    >
      <p className="mb-3 text-xs text-text-secondary">
        DIT must already have a training record. Use Enroll DIT if this is their first enrollment.
      </p>
      <div className="space-y-3 text-sm">
        <div className="space-y-1">
          <Label>DIT</Label>
          <Select value={ditId || undefined} onValueChange={(v) => setDitId(v ?? '')}>
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue placeholder="Select DIT" />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              {ditOptions.map((p) =>
                p.user_id ? (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name}
                  </SelectItem>
                ) : null
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>FTO</Label>
          <Select value={ftoId || undefined} onValueChange={(v) => setFtoId(v ?? '')}>
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue placeholder="Select FTO" />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              {ftoOptions.map((p) =>
                p.user_id ? (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name}
                  </SelectItem>
                ) : null
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Start date</Label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <Label>Phase</Label>
          <Select value={phase} onValueChange={(v) => v && setPhase(v)}>
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              {['1', '2', '3'].map((p) => (
                <SelectItem key={p} value={p}>
                  Phase {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="border-border-subtle bg-bg-surface"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="border border-accent-primary/30 bg-accent-primary text-bg-app"
            disabled={pending || !ditId || !ftoId}
            onClick={() => {
              startTr(async () => {
                await createPairingOnlyAction({
                  ditUserId: ditId,
                  ftoUserId: ftoId,
                  startDate: start,
                  phase: Number(phase),
                  notes: notes.trim() || null,
                })
                reset()
                onOpenChange(false)
                onDone()
              })
            }}
          >
            Create pairing
          </Button>
        </div>
      </div>
    </Modal>
  )
}
