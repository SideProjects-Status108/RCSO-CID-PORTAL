'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import { Modal } from '@/components/app/modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { DeficiencyCompetency } from '@/types/training'

export type DeficiencyFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pairingId: string
  weeklySessionId: string
  ditDisplayName: string
  ftoDisplayName: string
  weekLabel: string
  suggestions: DeficiencyCompetency[]
  onSubmitted?: () => void
}

export function DeficiencyFormModal({
  open,
  onOpenChange,
  pairingId,
  weeklySessionId,
  ditDisplayName,
  ftoDisplayName,
  weekLabel,
  suggestions,
  onSubmitted,
}: DeficiencyFormModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [recoByKey, setRecoByKey] = useState<Record<string, string>>({})
  const [priority, setPriority] = useState<'routine' | 'urgent'>('routine')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!open) return
    const nextReco: Record<string, string> = {}
    const nextSel = new Set<string>()
    for (const s of suggestions) {
      nextReco[s.competency_key] = s.fto_recommendation
      nextSel.add(s.competency_key)
    }
    setRecoByKey(nextReco)
    setSelected(nextSel)
    setPriority('routine')
    setNotes('')
    setMessage(null)
  }, [open, suggestions])

  const toggle = (key: string, on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (on) n.add(key)
      else n.delete(key)
      return n
    })
  }

  const flagged = useMemo(() => {
    return suggestions
      .filter((s) => selected.has(s.competency_key))
      .map((s) => ({
        competency_key: s.competency_key,
        competency_label: s.competency_label,
        score: s.score,
        fto_recommendation: recoByKey[s.competency_key]?.trim() || s.fto_recommendation,
      }))
  }, [suggestions, selected, recoByKey])

  const submit = () => {
    if (flagged.length === 0) {
      setMessage('Select at least one competency to include.')
      return
    }
    start(async () => {
      setMessage(null)
      try {
        const res = await fetch('/api/training/deficiency-forms', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pairing_id: pairingId,
            weekly_session_id: weeklySessionId,
            priority_level: priority,
            competencies_flagged: flagged,
            additional_notes: notes.trim() || null,
            status: 'submitted',
          }),
        })
        const j = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(j.error ?? 'Submit failed')
        setMessage('Form submitted to FTO Coordinator.')
        onSubmitted?.()
        setTimeout(() => onOpenChange(false), 1200)
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Submit failed')
      }
    })
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Generate deficiency form" className="max-w-lg">
      <div className="space-y-4 text-sm">
        <div className="rounded-md border border-border-subtle bg-bg-app px-3 py-2 text-text-secondary">
          <p className="font-medium text-text-primary">
            {ditDisplayName} · {ftoDisplayName}
          </p>
          <p className="text-xs">Week {weekLabel}</p>
        </div>

        {suggestions.length === 0 ? (
          <p className="text-text-secondary">
            No scores of 1, 2, or 5 on this weekly evaluation. Nothing to pre-select for deficiency.
          </p>
        ) : (
          <ul className="max-h-[min(50vh,320px)] space-y-3 overflow-y-auto pr-1">
            {suggestions.map((s) => (
              <li key={s.competency_key} className="rounded-md border border-border-subtle bg-bg-surface p-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`cb-${s.competency_key}`}
                    checked={selected.has(s.competency_key)}
                    onCheckedChange={(v) => toggle(s.competency_key, v === true)}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor={`cb-${s.competency_key}`} className="font-medium text-text-primary">
                      {s.competency_label}{' '}
                      <span className="text-text-secondary">(score {s.score})</span>
                    </Label>
                    <Textarea
                      value={recoByKey[s.competency_key] ?? ''}
                      onChange={(e) =>
                        setRecoByKey((prev) => ({ ...prev, [s.competency_key]: e.target.value }))
                      }
                      className="min-h-[4rem] border-border-subtle bg-bg-elevated text-xs"
                      placeholder="FTO recommendation / context"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => v && setPriority(v as 'routine' | 'urgent')}>
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Additional notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[4rem] border-border-subtle bg-bg-elevated"
          />
        </div>

        {message ? (
          <p className={cn('text-xs', message.includes('submitted') ? 'text-emerald-400' : 'text-danger')}>
            {message}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || suggestions.length === 0} onClick={submit}>
            Submit to coordinator
          </Button>
        </div>
      </div>
    </Modal>
  )
}
