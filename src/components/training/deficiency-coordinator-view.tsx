'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { DeficiencyForm } from '@/types/training'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'coordinator_reviewing', label: 'Coordinator reviewing' },
  { value: 'coaching_active', label: 'Coaching active' },
  { value: 'escalated_to_sgt', label: 'Escalated (Sgt)' },
  { value: 'escalated_to_lt', label: 'Escalated (Lt)' },
  { value: 'resolved', label: 'Resolved' },
]

export function DeficiencyCoordinatorView() {
  const [tab, setTab] = useState('')
  const [forms, setForms] = useState<DeficiencyForm[]>([])
  const [pick, setPick] = useState<DeficiencyForm | null>(null)
  const [coordNotes, setCoordNotes] = useState('')
  const [meetingLocal, setMeetingLocal] = useState('')
  const [escNotes, setEscNotes] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [, start] = useTransition()

  const load = useCallback(async () => {
    const qs = tab ? `?status=${encodeURIComponent(tab)}` : ''
    const res = await fetch(`/api/training/deficiency-forms${qs}`, { credentials: 'same-origin' })
    const j = (await res.json()) as { forms?: DeficiencyForm[]; error?: string }
    if (!res.ok) throw new Error(j.error ?? 'Failed to load')
    setForms(j.forms ?? [])
  }, [tab])

  useEffect(() => {
    start(async () => {
      try {
        await load()
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Load failed')
      }
    })
  }, [load])

  useEffect(() => {
    if (!pick) {
      setCoordNotes('')
      return
    }
    setCoordNotes(pick.additional_notes ?? '')
  }, [pick])

  async function patchForm(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/training/deficiency-forms/${id}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const j = (await res.json()) as { error?: string }
    if (!res.ok) throw new Error(j.error ?? 'Update failed')
  }

  async function postAction(formId: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/training/deficiency-forms/${formId}/actions`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const j = (await res.json()) as { error?: string }
    if (!res.ok) throw new Error(j.error ?? 'Action failed')
  }

  const scheduleMeeting = () => {
    if (!pick) return
    start(async () => {
      setMsg(null)
      try {
        const startIso = meetingLocal
          ? new Date(meetingLocal).toISOString()
          : new Date().toISOString()
        const cal = await fetch('/api/calendar/create-event', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Coaching: deficiency ${pick.id.slice(0, 8)}`,
            start: startIso,
            end: new Date(new Date(startIso).getTime() + 45 * 60_000).toISOString(),
            attendees: ['coordinator', 'fto'],
          }),
        })
        const cj = (await cal.json()) as { eventId?: string; error?: string }
        if (!cal.ok) throw new Error(cj.error ?? 'Calendar stub failed')

        await postAction(pick.id, {
          action_level: 'coordinator',
          action_type: 'scheduled_meeting',
          action_notes: coordNotes.trim() || null,
          meeting_date: meetingLocal ? meetingLocal.slice(0, 10) : null,
          calendar_meeting_id: cj.eventId ?? null,
          meeting_attendees: ['Coordinator', 'FTO'],
        })
        await patchForm(pick.id, { status: 'coaching_active', additional_notes: coordNotes.trim() || null })
        setMsg('Meeting logged and status set to coaching active.')
        await load()
        setPick(null)
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Schedule failed')
      }
    })
  }

  const continueCoaching = () => {
    if (!pick) return
    start(async () => {
      setMsg(null)
      try {
        await postAction(pick.id, {
          action_level: 'coordinator',
          action_type: 'coordinator_review',
          action_notes: coordNotes.trim() || 'Continue coaching',
        })
        await patchForm(pick.id, { status: 'coaching_active', additional_notes: coordNotes.trim() || null })
        setMsg('Status updated.')
        await load()
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Update failed')
      }
    })
  }

  const escalateSgt = () => {
    if (!pick) return
    start(async () => {
      setMsg(null)
      try {
        const startIso = meetingLocal
          ? new Date(meetingLocal).toISOString()
          : new Date().toISOString()
        const cal = await fetch('/api/calendar/create-event', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Escalation (Sgt): deficiency ${pick.id.slice(0, 8)}`,
            start: startIso,
            attendees: ['FTO Sgt', 'Coordinator', 'FTO', 'DIT'],
          }),
        })
        const cj = (await cal.json()) as { eventId?: string; error?: string }
        if (!cal.ok) throw new Error(cj.error ?? 'Calendar stub failed')

        const history = `Form ${pick.id}. Prior status: ${pick.status}. ${escNotes}`.trim()
        await postAction(pick.id, {
          action_level: 'coordinator',
          action_type: 'escalate_to_sgt',
          action_notes: history,
          meeting_date: meetingLocal ? meetingLocal.slice(0, 10) : null,
          calendar_meeting_id: cj.eventId ?? null,
          meeting_attendees: ['FTO Sgt', 'Coordinator', 'FTO', 'DIT'],
        })
        await patchForm(pick.id, { status: 'escalated_to_sgt', additional_notes: coordNotes.trim() || null })
        setMsg('Escalated to FTO Sgt (stub calendar event).')
        await load()
        setPick(null)
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Escalation failed')
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
          Deficiency queue
        </h2>
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value || 'all'}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                'rounded-md border px-2 py-1 text-xs font-medium',
                tab === t.value
                  ? 'border-accent-primary bg-accent-primary-muted text-accent-primary'
                  : 'border-border-subtle bg-bg-surface text-text-secondary'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {forms.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setPick(f)}
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors',
                  pick?.id === f.id
                    ? 'border-accent-primary bg-accent-primary-muted'
                    : 'border-border-subtle bg-bg-surface hover:bg-bg-elevated'
                )}
              >
                <span className="font-medium text-text-primary">{f.status.replaceAll('_', ' ')}</span>
                <span className="mt-0.5 block text-xs text-text-secondary">
                  {f.priority_level} · {new Date(f.created_at).toLocaleString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
        {!pick ? (
          <p className="text-sm text-text-secondary">Select a deficiency form.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-text-secondary">Form ID</p>
              <p className="font-mono text-xs text-text-primary">{pick.id}</p>
            </div>
            <ul className="space-y-2">
              {pick.competencies_flagged.map((c) => (
                <li key={c.competency_key} className="rounded-md border border-border-subtle bg-bg-app p-2">
                  <p className="font-medium text-text-primary">{c.competency_label}</p>
                  <p className="text-xs text-text-secondary">Score {c.score}</p>
                  <p className="mt-1 text-xs text-text-primary">{c.fto_recommendation}</p>
                </li>
              ))}
            </ul>
            <div className="space-y-1">
              <Label>Coordinator notes</Label>
              <Textarea
                value={coordNotes}
                onChange={(e) => setCoordNotes(e.target.value)}
                className="min-h-[5rem] border-border-subtle bg-bg-elevated"
              />
            </div>
            <div className="space-y-1">
              <Label>Target meeting (local)</Label>
              <Input
                type="datetime-local"
                value={meetingLocal}
                onChange={(e) => setMeetingLocal(e.target.value)}
                className="border-border-subtle bg-bg-elevated"
              />
            </div>
            <div className="space-y-1">
              <Label>Escalation notes (optional)</Label>
              <Textarea
                value={escNotes}
                onChange={(e) => setEscNotes(e.target.value)}
                className="min-h-[4rem] border-border-subtle bg-bg-elevated"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={scheduleMeeting}>
                Schedule meeting with FTO
              </Button>
              <Button type="button" size="sm" onClick={continueCoaching}>
                Continue coaching
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={escalateSgt}>
                Escalate to FTO Sgt
              </Button>
            </div>
            {msg ? <p className="text-xs text-text-secondary">{msg}</p> : null}
          </div>
        )}
      </div>
    </div>
  )
}
