'use client'

import { useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ActivityProgressSummary } from '@/lib/training/activity-progress'
import type { ActivityExposure } from '@/types/training'

type Props = {
  ditRecordId: string
  phase: number
  summary: ActivityProgressSummary
  canLog: boolean
  currentUserId: string
}

const today = () => new Date().toISOString().slice(0, 10)

function CompletionChip({ percent }: { percent: number }) {
  const tone =
    percent >= 100 ? 'bg-emerald-500/15 text-emerald-300' :
    percent >= 66 ? 'bg-amber-500/15 text-amber-300' :
    'bg-rose-500/15 text-rose-300'
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>
      {percent}%
    </span>
  )
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent))
  const tone =
    clamped >= 100 ? 'bg-emerald-500' :
    clamped >= 66 ? 'bg-amber-500' :
    'bg-rose-500'
  return (
    <div className="h-1.5 w-full rounded-full bg-bg-elevated">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

export function ActivityClient(props: Props) {
  const { ditRecordId, phase, summary, canLog } = props
  const [rows, setRows] = useState(summary.rows)
  const [complete, setComplete] = useState(summary.complete_count)
  const [totalActual, setTotalActual] = useState(summary.total_actual)

  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const [tpl, setTpl] = useState(summary.rows[0]?.template.id ?? '')
  const [exposureDate, setExposureDate] = useState(today())
  const [caseNumber, setCaseNumber] = useState('')
  const [role, setRole] = useState<'observer' | 'assistant' | 'lead'>('observer')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [notes, setNotes] = useState('')

  const totalRequired = summary.total_required
  const totalPercent = useMemo(
    () => (totalRequired === 0 ? 100 : Math.min(100, Math.round((totalActual / totalRequired) * 100))),
    [totalActual, totalRequired],
  )

  const submit = () => {
    if (!tpl) {
      setError('Pick an activity template')
      return
    }
    start(async () => {
      setError(null)
      try {
        const res = await fetch('/api/training/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dit_record_id: ditRecordId,
            activity_template_id: tpl,
            fto_id: props.currentUserId,
            exposure_date: exposureDate,
            case_complaint_number: caseNumber.trim() || null,
            role,
            duration_minutes: durationMinutes.trim() ? Number(durationMinutes) : null,
            fto_notes: notes.trim() || null,
          }),
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? 'Log failed')
        }
        const body = (await res.json()) as { exposure: ActivityExposure }
        setRows((prev) => {
          const next = prev.map((r) => {
            if (r.template.id !== tpl) return r
            const actual = r.actual + 1
            const required = r.required
            return {
              ...r,
              actual,
              remaining: Math.max(0, required - actual),
              percent: required === 0 ? 100 : Math.min(100, Math.round((actual / required) * 100)),
              recent_exposures: [body.exposure, ...r.recent_exposures].slice(0, 5),
            }
          })
          const newComplete = next.filter((r) => r.actual >= r.required).length
          setComplete(newComplete)
          setTotalActual((t) => t + 1)
          return next
        })
        setOpen(false)
        setCaseNumber('')
        setDurationMinutes('')
        setNotes('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Log failed')
      }
    })
  }

  const byCategory = useMemo(() => {
    const m = new Map<string, typeof rows>()
    for (const r of rows) {
      const arr = m.get(r.template.category) ?? []
      arr.push(r)
      m.set(r.template.category, arr)
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [rows])

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Activity — Phase {phase}</CardTitle>
            <p className="mt-1 text-sm text-text-secondary">
              {complete} of {rows.length} activities complete · {totalActual}/{totalRequired} exposures
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CompletionChip percent={totalPercent} />
            {canLog ? (
              <Button onClick={() => setOpen((v) => !v)} variant="default" size="sm">
                {open ? 'Cancel' : 'Log exposure'}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ProgressBar percent={totalPercent} />
        </CardContent>
      </Card>

      {open && canLog ? (
        <Card>
          <CardHeader>
            <CardTitle>Log exposure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="act-tpl">Activity</Label>
                <select
                  id="act-tpl"
                  className="mt-1 h-9 w-full rounded-md border border-border-subtle bg-bg-surface px-2 text-sm"
                  value={tpl}
                  onChange={(e) => setTpl(e.target.value)}
                >
                  {rows.map((r) => (
                    <option key={r.template.id} value={r.template.id}>
                      {r.template.activity_name} · {r.actual}/{r.required}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="act-date">Exposure date</Label>
                <Input id="act-date" type="date" value={exposureDate} onChange={(e) => setExposureDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="act-case">Case / complaint #</Label>
                <Input id="act-case" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} placeholder="optional" />
              </div>
              <div>
                <Label htmlFor="act-role">DIT role</Label>
                <select
                  id="act-role"
                  className="mt-1 h-9 w-full rounded-md border border-border-subtle bg-bg-surface px-2 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as typeof role)}
                >
                  <option value="observer">Observer</option>
                  <option value="assistant">Assistant</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
              <div>
                <Label htmlFor="act-dur">Duration (min)</Label>
                <Input
                  id="act-dur"
                  type="number"
                  min={0}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="optional"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="act-notes">FTO notes</Label>
              <Textarea id="act-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <div className="flex justify-end">
              <Button onClick={submit} disabled={pending} variant="default">
                {pending ? 'Saving…' : 'Save exposure'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {byCategory.map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-text-secondary">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((row) => (
              <div key={row.template.id} className="rounded-lg border border-border-subtle bg-bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{row.template.activity_name}</p>
                    {row.template.description ? (
                      <p className="mt-0.5 text-xs text-text-secondary">{row.template.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs tabular-nums text-text-secondary">
                      {row.actual}/{row.required}
                    </span>
                    <CompletionChip percent={row.percent} />
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar percent={row.percent} />
                </div>
                {row.recent_exposures.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                    {row.recent_exposures.map((e) => (
                      <li key={e.id} className="flex items-center gap-2">
                        <span className="tabular-nums">{e.exposure_date}</span>
                        <span>·</span>
                        <span className="capitalize">{e.role}</span>
                        {e.case_complaint_number ? (
                          <>
                            <span>·</span>
                            <span className="font-mono">{e.case_complaint_number}</span>
                          </>
                        ) : null}
                        {e.duration_minutes ? (
                          <>
                            <span>·</span>
                            <span>{e.duration_minutes}m</span>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
