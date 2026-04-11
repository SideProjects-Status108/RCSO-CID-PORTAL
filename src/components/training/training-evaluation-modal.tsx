'use client'

import { useEffect, useState, useTransition } from 'react'

import {
  loadEvaluationAction,
  saveEvaluationAction,
} from '@/app/(dashboard)/training/actions'
import type { EvaluationType, OverallRating } from '@/types/training'
import {
  EVALUATION_SCORE_KEYS,
  EVALUATION_SCORE_LABELS,
  type EvaluationScoreKey,
} from '@/types/training'
import { UserRole, type UserRoleValue } from '@/lib/auth/roles'
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
import { cn } from '@/lib/utils'

const EVAL_TYPES: EvaluationType[] = ['daily', 'weekly', 'phase_end', 'special']
const RATINGS: OverallRating[] = [
  'excellent',
  'satisfactory',
  'needs_improvement',
  'unsatisfactory',
]

type TrainingEvaluationModalProps = {
  open: boolean
  onOpenChange: (o: boolean) => void
  pairingId: string | null
  editId: string | null
  viewerRole: UserRoleValue
  onSaved: () => void
}

function canPrivateNotes(role: UserRoleValue) {
  return (
    role === UserRole.admin ||
    role === UserRole.supervision_admin ||
    role === UserRole.supervision ||
    role === UserRole.fto_coordinator
  )
}

export function TrainingEvaluationModal({
  open,
  onOpenChange,
  pairingId,
  editId,
  viewerRole,
  onSaved,
}: TrainingEvaluationModalProps) {
  const [evalType, setEvalType] = useState<EvaluationType>('weekly')
  const [evalDate, setEvalDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [scores, setScores] = useState<Partial<Record<EvaluationScoreKey, number>>>({})
  const [overall, setOverall] = useState<OverallRating>('satisfactory')
  const [notes, setNotes] = useState('')
  const [privateNotes, setPrivateNotes] = useState('')
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!open || !editId) return
    start(async () => {
      const row = await loadEvaluationAction(editId)
      if (!row) return
      setEvalType(row.evaluation_type)
      setEvalDate(row.evaluation_date.slice(0, 10))
      setScores(row.scores)
      setOverall(row.overall_rating)
      setNotes(row.notes ?? '')
      setPrivateNotes(row.private_notes ?? '')
    })
  }, [open, editId])

  async function save(submit: boolean) {
    if (!pairingId) return
    start(async () => {
      try {
        await saveEvaluationAction({
          id: editId,
          pairingId,
          evaluationType: evalType,
          evaluationDate: evalDate,
          scores,
          overallRating: overall,
          notes: notes.trim() || null,
          privateNotes: canPrivateNotes(viewerRole) ? privateNotes : null,
          submit,
        })
        onSaved()
        onOpenChange(false)
      } catch {
        // toast later
      }
    })
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editId ? 'Edit evaluation' : 'New evaluation'}
      className="max-w-lg"
    >
      <div className="max-h-[min(85vh,640px)] space-y-4 overflow-y-auto pr-1 text-sm">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={evalType} onValueChange={(v) => v && setEvalType(v as EvaluationType)}>
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              {EVAL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Date</Label>
          <input
            type="date"
            value={evalDate}
            onChange={(e) => setEvalDate(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-text-primary"
          />
        </div>
        <div className="space-y-3 border-t border-border-subtle pt-3">
          <p className="text-xs font-semibold uppercase text-accent-gold">Criteria (1–5)</p>
          {EVALUATION_SCORE_KEYS.map((key) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-text-secondary">{EVALUATION_SCORE_LABELS[key]}</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label
                    key={n}
                    className={cn(
                      'flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs',
                      scores[key] === n
                        ? 'border-accent-teal bg-accent-teal/15 text-accent-teal'
                        : 'border-border-subtle text-text-secondary'
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={scores[key] === n}
                      onChange={() => setScores((s) => ({ ...s, [key]: n }))}
                    />
                    {n}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <Label>Overall rating</Label>
          <Select value={overall} onValueChange={(v) => v && setOverall(v as OverallRating)}>
            <SelectTrigger className="border-border-subtle bg-bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-subtle bg-bg-elevated">
              {RATINGS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Notes (visible to DIT where applicable)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="border-border-subtle bg-bg-surface"
          />
        </div>
        {canPrivateNotes(viewerRole) ? (
          <div className="space-y-1 rounded border border-danger/40 bg-danger/5 p-3">
            <Label className="text-danger">
              Private notes — COORDINATOR EYES ONLY
            </Label>
            <p className="text-[11px] text-text-secondary">
              Not visible to FTO field trainers or DITs. Supervision and FTO Coordinator only.
            </p>
            <Textarea
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              rows={3}
              className="border-border-subtle bg-bg-surface"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => void save(false)}>
            Save draft
          </Button>
          <Button
            type="button"
            className="border border-accent-gold/30 bg-accent-gold text-bg-app"
            disabled={pending}
            onClick={() => void save(true)}
          >
            Submit for review
          </Button>
        </div>
      </div>
    </Modal>
  )
}
