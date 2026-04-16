'use client'

import { useEffect, useState, useTransition } from 'react'

import { Modal } from '@/components/app/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { ActivityTemplate } from '@/types/training'

export type ActivityLoggerProps = {
  dit_record_id: string
  week_start_date: string
  week_end_date: string
  default_fto_id: string
  fto_options?: { id: string; name: string }[]
  onActivityLogged?: () => void
}

export function ActivityLogger({
  dit_record_id,
  week_start_date,
  week_end_date,
  default_fto_id,
  fto_options,
  onActivityLogged,
}: ActivityLoggerProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [templateId, setTemplateId] = useState('')
  const [exposureDate, setExposureDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [ftoId, setFtoId] = useState(default_fto_id)
  const [caseNum, setCaseNum] = useState('')
  const [role, setRole] = useState<'observer' | 'assistant' | 'lead'>('observer')
  const [duration, setDuration] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    if (!open) return
    void (async () => {
      const res = await fetch('/api/training/activity-templates', { credentials: 'same-origin' })
      const j = (await res.json()) as { templates?: ActivityTemplate[] }
      if (res.ok && j.templates) {
        setTemplates(j.templates)
        if (j.templates[0] && !templateId) setTemplateId(j.templates[0].id)
      }
    })()
  }, [open, templateId])

  useEffect(() => {
    setFtoId(default_fto_id)
  }, [default_fto_id])

  const submit = () => {
    if (!templateId) {
      setError('Select an activity type.')
      return
    }
    start(async () => {
      setError(null)
      setFeedback(null)
      try {
        const res = await fetch('/api/training/activities', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dit_record_id,
            activity_template_id: templateId,
            fto_id: ftoId,
            exposure_date: exposureDate,
            case_complaint_number: caseNum.trim() || null,
            role,
            duration_minutes: duration.trim() ? Number(duration) : null,
            fto_notes: notes.trim() || null,
          }),
        })
        const j = (await res.json()) as {
          error?: string
          exposure?: { id: string }
          progress?: { required: number; completed: number } | null
        }
        if (!res.ok) throw new Error(j.error ?? 'Log failed')

        const tpl = templates.find((t) => t.id === templateId)
        const label = tpl?.activity_name ?? 'Activity'
        const prog = j.progress
        const required = prog?.required ?? tpl?.required_exposures_phase_1 ?? 0
        const done = prog?.completed ?? 0
        setFeedback(`${label}: now ${done} of ${required} exposures`.trim())
        onActivityLogged?.()
        setOpen(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Log failed')
      }
    })
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        + Log activity
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Log activity" className="max-w-md">
        <div className="space-y-3 text-sm">
          <p className="text-xs text-text-secondary">
            Week {week_start_date} – {week_end_date}
          </p>
          <div className="space-y-1">
            <Label>Activity type</Label>
            <Select value={templateId} onValueChange={(v) => v && setTemplateId(v)}>
              <SelectTrigger className="border-border-subtle bg-bg-surface">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.activity_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={exposureDate}
              onChange={(e) => setExposureDate(e.target.value)}
              className="border-border-subtle bg-bg-elevated"
            />
          </div>
          {fto_options && fto_options.length > 0 ? (
            <div className="space-y-1">
              <Label>FTO</Label>
              <Select value={ftoId} onValueChange={(v) => v && setFtoId(v)}>
                <SelectTrigger className="border-border-subtle bg-bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fto_options.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label>Case / complaint #</Label>
            <Input
              value={caseNum}
              onChange={(e) => setCaseNum(e.target.value)}
              className="border-border-subtle bg-bg-elevated"
            />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <div className="flex flex-wrap gap-2">
              {(['observer', 'assistant', 'lead'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs capitalize',
                    role === r
                      ? 'border-accent-primary bg-accent-primary-muted text-accent-primary'
                      : 'border-border-subtle bg-bg-app text-text-secondary'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Duration (minutes)</Label>
            <Input
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="border-border-subtle bg-bg-elevated"
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[4rem] border-border-subtle bg-bg-elevated"
            />
          </div>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          {feedback ? <p className="text-xs text-emerald-400">{feedback}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submit}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
