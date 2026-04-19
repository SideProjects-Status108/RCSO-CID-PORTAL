'use client'

import { useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { computeCallOutStats, computeCaseStats, formatMinutes } from '@/lib/training/case-stats'
import type { CallOutLog, CaseAssignment, CaseRole, CaseStatus } from '@/types/training'

type Props = {
  ditRecordId: string
  cases: CaseAssignment[]
  callOuts: CallOutLog[]
  canWrite: boolean
  canCloseCases: boolean
}

function nowLocalInputValue(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function StatusPill({ status }: { status: CaseStatus }) {
  const tone =
    status === 'open' ? 'bg-emerald-500/15 text-emerald-300' :
    status === 'closed' ? 'bg-slate-500/15 text-slate-300' :
    'bg-amber-500/15 text-amber-300'
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {status}
    </span>
  )
}

function RolePill({ role }: { role: CaseRole }) {
  const tone =
    role === 'lead' ? 'bg-blue-500/15 text-blue-300' :
    role === 'assist' ? 'bg-indigo-500/15 text-indigo-300' :
    'bg-slate-500/15 text-slate-300'
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {role}
    </span>
  )
}

export function CasesClient(props: Props) {
  const { ditRecordId, canWrite, canCloseCases } = props

  const [cases, setCases] = useState(props.cases)
  const [callOuts, setCallOuts] = useState(props.callOuts)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'add_case' | 'add_call_out' | null>(null)

  const [caseTitle, setCaseTitle] = useState('')
  const [caseNumber, setCaseNumber] = useState('')
  const [complaintNumber, setComplaintNumber] = useState('')
  const [caseRole, setCaseRole] = useState<CaseRole>('assist')
  const [caseNotes, setCaseNotes] = useState('')

  const [coRespondedAt, setCoRespondedAt] = useState(nowLocalInputValue())
  const [coDuration, setCoDuration] = useState('')
  const [coIncidentType, setCoIncidentType] = useState('')
  const [coCaseNumber, setCoCaseNumber] = useState('')
  const [coOffDuty, setCoOffDuty] = useState(true)
  const [coCompTime, setCoCompTime] = useState(false)
  const [coNotes, setCoNotes] = useState('')

  const caseStats = useMemo(() => computeCaseStats(cases), [cases])
  const callOutStats = useMemo(() => computeCallOutStats(callOuts), [callOuts])

  const submitCase = () => {
    if (!caseTitle.trim()) {
      setError('Case title is required')
      return
    }
    start(async () => {
      setError(null)
      try {
        const res = await fetch('/api/training/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dit_record_id: ditRecordId,
            title: caseTitle,
            case_number: caseNumber || undefined,
            complaint_number: complaintNumber || undefined,
            dit_role: caseRole,
            notes: caseNotes || undefined,
          }),
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? 'Create failed')
        }
        const body = (await res.json()) as { case: CaseAssignment }
        setCases((prev) => [body.case, ...prev])
        setCaseTitle('')
        setCaseNumber('')
        setComplaintNumber('')
        setCaseNotes('')
        setView(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Create failed')
      }
    })
  }

  const submitCallOut = () => {
    const duration = Number(coDuration)
    if (!Number.isFinite(duration) || duration < 0) {
      setError('Duration must be a non-negative number')
      return
    }
    if (!coRespondedAt) {
      setError('Responded-at timestamp is required')
      return
    }
    start(async () => {
      setError(null)
      try {
        const res = await fetch('/api/training/call-outs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dit_record_id: ditRecordId,
            responded_at: new Date(coRespondedAt).toISOString(),
            duration_minutes: duration,
            incident_type: coIncidentType || undefined,
            case_number: coCaseNumber || undefined,
            off_duty: coOffDuty,
            comp_time_eligible: coCompTime,
            notes: coNotes || undefined,
          }),
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? 'Create failed')
        }
        const body = (await res.json()) as { call_out: CallOutLog }
        setCallOuts((prev) => [body.call_out, ...prev])
        setCoDuration('')
        setCoIncidentType('')
        setCoCaseNumber('')
        setCoNotes('')
        setView(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Create failed')
      }
    })
  }

  const closeCase = (id: string) => {
    start(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/training/cases/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'closed' }),
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? 'Close failed')
        }
        const body = (await res.json()) as { case: CaseAssignment }
        setCases((prev) => prev.map((c) => (c.id === id ? body.case : c)))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Close failed')
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 text-center">
              <Stat label="Total" value={caseStats.total} />
              <Stat label="Open" value={caseStats.by_status.open} />
              <Stat label="Lead" value={caseStats.by_role.lead} />
              <Stat label="Last 30d" value={caseStats.recent_30d} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Call-outs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 text-center">
              <Stat label="Total" value={callOutStats.total} />
              <Stat label="Off-duty" value={callOutStats.off_duty_count} />
              <Stat label="Comp-time" value={callOutStats.comp_time_eligible_count} />
              <Stat label="Total time" value={formatMinutes(callOutStats.total_minutes)} />
            </div>
            <p className="mt-3 text-xs text-text-secondary">
              Last 30d · {callOutStats.recent_30d_count} responses · {formatMinutes(callOutStats.recent_30d_minutes)}
            </p>
          </CardContent>
        </Card>
      </div>

      {canWrite ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setView((v) => (v === 'add_case' ? null : 'add_case'))}
          >
            {view === 'add_case' ? 'Cancel' : 'Add case'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setView((v) => (v === 'add_call_out' ? null : 'add_call_out'))}
          >
            {view === 'add_call_out' ? 'Cancel' : 'Log call-out'}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {view === 'add_case' ? (
        <Card>
          <CardHeader>
            <CardTitle>New case</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="case-title">Title</Label>
                <Input id="case-title" value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="case-num">Case #</Label>
                <Input id="case-num" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="comp-num">Complaint #</Label>
                <Input id="comp-num" value={complaintNumber} onChange={(e) => setComplaintNumber(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="case-role">DIT role</Label>
                <select
                  id="case-role"
                  className="mt-1 h-9 w-full rounded-md border border-border-subtle bg-bg-surface px-2 text-sm"
                  value={caseRole}
                  onChange={(e) => setCaseRole(e.target.value as CaseRole)}
                >
                  <option value="observer">Observer</option>
                  <option value="assist">Assist</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="case-notes">Notes</Label>
              <Textarea id="case-notes" value={caseNotes} onChange={(e) => setCaseNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end">
              <Button onClick={submitCase} disabled={pending} variant="primary">
                {pending ? 'Saving…' : 'Save case'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {view === 'add_call_out' ? (
        <Card>
          <CardHeader>
            <CardTitle>Log call-out</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="co-at">Responded at</Label>
                <Input
                  id="co-at"
                  type="datetime-local"
                  value={coRespondedAt}
                  onChange={(e) => setCoRespondedAt(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="co-dur">Duration (min)</Label>
                <Input
                  id="co-dur"
                  type="number"
                  min={0}
                  max={1440}
                  value={coDuration}
                  onChange={(e) => setCoDuration(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="co-type">Incident type</Label>
                <Input id="co-type" value={coIncidentType} onChange={(e) => setCoIncidentType(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="co-case">Case #</Label>
                <Input id="co-case" value={coCaseNumber} onChange={(e) => setCoCaseNumber(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={coOffDuty} onChange={(e) => setCoOffDuty(e.target.checked)} />
                Off-duty response
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={coCompTime}
                  onChange={(e) => setCoCompTime(e.target.checked)}
                />
                Comp-time eligible
              </label>
            </div>
            <div>
              <Label htmlFor="co-notes">Notes</Label>
              <Textarea id="co-notes" value={coNotes} onChange={(e) => setCoNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end">
              <Button onClick={submitCallOut} disabled={pending} variant="primary">
                {pending ? 'Saving…' : 'Save call-out'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Case assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
            <p className="text-sm text-text-secondary">No cases yet.</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {cases.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-text-primary">{c.title}</span>
                      <RolePill role={c.dit_role} />
                      <StatusPill status={c.status} />
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                      Assigned {c.assigned_at.slice(0, 10)}
                      {c.case_number ? ` · Case ${c.case_number}` : ''}
                      {c.complaint_number ? ` · Complaint ${c.complaint_number}` : ''}
                      {c.closed_at ? ` · Closed ${c.closed_at.slice(0, 10)}` : ''}
                    </p>
                    {c.notes ? (
                      <p className="mt-1 text-xs text-text-secondary">{c.notes}</p>
                    ) : null}
                  </div>
                  {canCloseCases && c.status === 'open' ? (
                    <Button size="sm" variant="ghost" onClick={() => closeCase(c.id)} disabled={pending}>
                      Close
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call-out log</CardTitle>
        </CardHeader>
        <CardContent>
          {callOuts.length === 0 ? (
            <p className="text-sm text-text-secondary">No call-outs logged yet.</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {callOuts.map((l) => (
                <li key={l.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-text-primary">
                    <span className="tabular-nums">{new Date(l.responded_at).toLocaleString()}</span>
                    <span className="text-text-secondary">·</span>
                    <span>{formatMinutes(l.duration_minutes)}</span>
                    {l.incident_type ? (
                      <>
                        <span className="text-text-secondary">·</span>
                        <span>{l.incident_type}</span>
                      </>
                    ) : null}
                    {l.case_number ? (
                      <>
                        <span className="text-text-secondary">·</span>
                        <span className="font-mono">{l.case_number}</span>
                      </>
                    ) : null}
                    {l.off_duty ? (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">Off-duty</span>
                    ) : null}
                    {l.comp_time_eligible ? (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-300">Comp-time</span>
                    ) : null}
                  </div>
                  {l.notes ? <p className="mt-1 text-xs text-text-secondary">{l.notes}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums text-text-primary">{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  )
}
