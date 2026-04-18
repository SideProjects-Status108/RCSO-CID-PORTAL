'use client'

import { useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  DitJournalEntry,
  DitJournalReview,
  DitMissedDayNudge,
  DitRecordStatus,
  FtoCtrEntry,
} from '@/types/training'

type Props = {
  ditRecordId: string
  status: DitRecordStatus
  entries: DitJournalEntry[]
  reviews: DitJournalReview[]
  ctr: FtoCtrEntry[]
  nudges: DitMissedDayNudge[]
  streak: number
  nudgeDit: boolean
  nudgeFto: boolean
  canWriteJournal: boolean
  canWriteCtr: boolean
  canReview: boolean
  currentUserId: string
}

const today = () => new Date().toISOString().slice(0, 10)

export function JournalClient(props: Props) {
  const {
    ditRecordId,
    status,
    entries,
    reviews,
    ctr,
    streak,
    nudgeDit,
    nudgeFto,
    canWriteJournal,
    canWriteCtr,
    canReview,
  } = props

  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [entryDate, setEntryDate] = useState(today())
  const [entryBody, setEntryBody] = useState('')

  const [ctrDate, setCtrDate] = useState(today())
  const [ctrHours, setCtrHours] = useState<string>('')
  const [ctrBody, setCtrBody] = useState('')

  const reviewsByEntry = useMemo(() => {
    const m = new Map<string, DitJournalReview[]>()
    for (const r of reviews) {
      const arr = m.get(r.entry_id) ?? []
      arr.push(r)
      m.set(r.entry_id, arr)
    }
    return m
  }, [reviews])

  const saveJournal = () => {
    start(async () => {
      setError(null)
      try {
        const res = await fetch('/api/training/journal-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dit_record_id: ditRecordId,
            entry_date: entryDate,
            body: entryBody,
          }),
        })
        const j = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(j.error ?? 'Failed to save journal entry')
        setEntryBody('')
        window.location.reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save')
      }
    })
  }

  const saveCtr = () => {
    start(async () => {
      setError(null)
      try {
        const hours = ctrHours.trim().length > 0 ? Number(ctrHours) : null
        const res = await fetch('/api/training/ctr-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dit_record_id: ditRecordId,
            entry_date: ctrDate,
            contact_hours: hours,
            body: ctrBody,
          }),
        })
        const j = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(j.error ?? 'Failed to save CTR entry')
        setCtrBody('')
        setCtrHours('')
        window.location.reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save')
      }
    })
  }

  const addReview = (entryId: string, notes: string) => {
    start(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/training/journal-entries/${entryId}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        })
        const j = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(j.error ?? 'Failed to add review')
        window.location.reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add review')
      }
    })
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {status === 'suspended' ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          DIT is suspended — missed-day nudges are paused and the streak counter is 0.
        </div>
      ) : nudgeFto ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <strong>{streak} consecutive missed journal days.</strong> FTO notification has been
          queued.
        </div>
      ) : nudgeDit ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <strong>{streak} consecutive missed journal days.</strong> Write today&apos;s entry below.
        </div>
      ) : null}

      {canWriteJournal ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-text-primary">New / update journal entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
              <div className="space-y-1">
                <Label htmlFor="jdate">Date</Label>
                <Input
                  id="jdate"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="jbody">Reflection</Label>
                <Textarea
                  id="jbody"
                  rows={4}
                  value={entryBody}
                  onChange={(e) => setEntryBody(e.target.value)}
                  placeholder="What did you work on, learn, and need to work on tomorrow?"
                />
              </div>
            </div>
            <Button type="button" disabled={pending || entryBody.trim().length === 0} onClick={saveJournal}>
              {pending ? 'Saving…' : 'Save journal entry'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {canWriteCtr ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-text-primary">FTO Contact-Time Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="cdate">Date</Label>
                <Input
                  id="cdate"
                  type="date"
                  value={ctrDate}
                  onChange={(e) => setCtrDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="chours">Contact hours</Label>
                <Input
                  id="chours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={ctrHours}
                  onChange={(e) => setCtrHours(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cbody">What was covered</Label>
              <Textarea
                id="cbody"
                rows={3}
                value={ctrBody}
                onChange={(e) => setCtrBody(e.target.value)}
              />
            </div>
            <Button type="button" disabled={pending || ctrBody.trim().length === 0} onClick={saveCtr}>
              {pending ? 'Saving…' : 'Log CTR entry'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-primary">Journal entries</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-text-secondary">No entries yet.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => {
              const entryReviews = reviewsByEntry.get(e.id) ?? []
              return (
                <li key={e.id}>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle className="text-sm text-text-primary">
                        {e.entry_date}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="whitespace-pre-wrap text-text-primary">{e.body}</p>
                      {entryReviews.length > 0 ? (
                        <ul className="space-y-1 border-l-2 border-border-subtle pl-3 text-xs text-text-secondary">
                          {entryReviews.map((r) => (
                            <li key={r.id}>
                              <span className="font-medium text-text-primary">Review:</span>{' '}
                              {r.notes ?? '(no notes)'}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {canReview ? <ReviewForm onSubmit={(notes) => addReview(e.id, notes)} /> : null}
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-primary">Contact-Time Report entries</h2>
        {ctr.length === 0 ? (
          <p className="text-sm text-text-secondary">No CTR entries yet.</p>
        ) : (
          <ul className="space-y-2">
            {ctr.map((c) => (
              <li key={c.id}>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="text-sm text-text-primary">
                      {c.entry_date}
                      {c.contact_hours != null ? (
                        <span className="ml-2 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
                          {c.contact_hours}h
                        </span>
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-text-primary">{c.body}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ReviewForm({ onSubmit }: { onSubmit: (notes: string) => void }) {
  const [notes, setNotes] = useState('')
  return (
    <div className="flex items-end gap-2 border-t border-border-subtle pt-2">
      <div className="flex-1 space-y-1">
        <Label className="text-xs" htmlFor={`r-${Math.random().toString(36).slice(2)}`}>
          Review note
        </Label>
        <Input
          placeholder="Optional"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={() => onSubmit(notes)}>
        Save review
      </Button>
    </div>
  )
}
