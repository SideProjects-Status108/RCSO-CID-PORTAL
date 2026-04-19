'use client'

import { useMemo, useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { summarizeRubric } from '@/lib/training/pble'
import {
  PBLE_SCENARIO_LABELS,
  type Pble,
  type PbleArtifact,
  type PbleRubricScore,
  type PbleStatus,
  type PbleTemplate,
} from '@/types/training'

type ArtifactWithUrl = PbleArtifact & { signed_url: string | null }

type Props = {
  ditRecordId: string
  currentPhase: number
  pbles: Pble[]
  templates: PbleTemplate[]
  canAssign: boolean
  canScore: boolean
  isOwnerDit: boolean
  currentUserId: string
}

const STATUS_LABELS: Record<PbleStatus, string> = {
  assigned: 'Assigned',
  in_progress: 'In progress',
  submitted: 'Submitted',
  scored: 'Scored',
  passed: 'Passed',
  failed: 'Failed',
}

const STATUS_TONES: Record<PbleStatus, string> = {
  assigned: 'bg-slate-500/15 text-slate-300',
  in_progress: 'bg-sky-500/15 text-sky-300',
  submitted: 'bg-amber-500/15 text-amber-300',
  scored: 'bg-indigo-500/15 text-indigo-300',
  passed: 'bg-emerald-500/15 text-emerald-300',
  failed: 'bg-rose-500/15 text-rose-300',
}

export function PblesClient(props: Props) {
  const { ditRecordId, currentPhase, templates, canAssign, canScore, isOwnerDit } = props
  const [pbles, setPbles] = useState(props.pbles)
  const [showAssign, setShowAssign] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [phase, setPhase] = useState(currentPhase)
  const [titleOverride, setTitleOverride] = useState('')
  const [dueAt, setDueAt] = useState('')

  const template = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  )

  const assign = () => {
    if (!template) {
      setError('Pick a template')
      return
    }
    start(async () => {
      setError(null)
      try {
        const res = await fetch('/api/training/pbles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dit_record_id: ditRecordId,
            template_id: template.id,
            phase,
            scenario_kind: template.scenario_kind,
            title: titleOverride.trim() || undefined,
            due_at: dueAt || undefined,
          }),
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? 'Assign failed')
        }
        const body = (await res.json()) as { pble: Pble }
        setPbles((prev) => [body.pble, ...prev])
        setShowAssign(false)
        setTitleOverride('')
        setDueAt('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Assign failed')
      }
    })
  }

  const applyUpdate = (next: Pble) => {
    setPbles((prev) => prev.map((p) => (p.id === next.id ? next : p)))
  }

  return (
    <div className="space-y-5">
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {canAssign ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            {pbles.length} assigned · {pbles.filter((p) => p.status === 'passed').length} passed
          </p>
          <Button size="sm" variant="default" onClick={() => setShowAssign((v) => !v)}>
            {showAssign ? 'Cancel' : 'Assign PBLE'}
          </Button>
        </div>
      ) : null}

      {showAssign && canAssign ? (
        <Card>
          <CardHeader>
            <CardTitle>Assign PBLE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="tpl">Template</Label>
                <select
                  id="tpl"
                  className="mt-1 h-9 w-full rounded-md border border-border-subtle bg-bg-surface px-2 text-sm"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {PBLE_SCENARIO_LABELS[t.scenario_kind]} · {t.title} (recommended phase {t.recommended_phase})
                    </option>
                  ))}
                </select>
                {template?.description ? (
                  <p className="mt-1 text-xs text-text-secondary">{template.description}</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="phase">Phase</Label>
                <select
                  id="phase"
                  className="mt-1 h-9 w-full rounded-md border border-border-subtle bg-bg-surface px-2 text-sm"
                  value={phase}
                  onChange={(e) => setPhase(Number(e.target.value))}
                >
                  <option value={1}>Phase 1</option>
                  <option value={2}>Phase 2</option>
                  <option value={3}>Phase 3</option>
                </select>
              </div>
              <div>
                <Label htmlFor="due">Due at</Label>
                <Input id="due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="title-over">Title (override optional)</Label>
                <Input
                  id="title-over"
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  placeholder={template?.title ?? ''}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={assign} disabled={pending} variant="default">
                {pending ? 'Assigning…' : 'Assign'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {pbles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-secondary">
            No PBLEs assigned yet.
          </CardContent>
        </Card>
      ) : (
        pbles.map((p) => (
          <PbleCard
            key={p.id}
            pble={p}
            canScore={canScore}
            isOwnerDit={isOwnerDit}
            onUpdate={applyUpdate}
          />
        ))
      )}
    </div>
  )
}

function PbleCard({
  pble,
  canScore,
  isOwnerDit,
  onUpdate,
}: {
  pble: Pble
  canScore: boolean
  isOwnerDit: boolean
  onUpdate: (p: Pble) => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [scores, setScores] = useState<PbleRubricScore[]>(pble.rubric_scores)
  const [overallNotes, setOverallNotes] = useState(pble.overall_notes ?? '')
  const [scoreMode, setScoreMode] = useState(false)

  // Artifacts are lazy-loaded on first expand to avoid fetching for
  // every PBLE on the tab.
  const [artifactsOpen, setArtifactsOpen] = useState(false)
  const [artifacts, setArtifacts] = useState<ArtifactWithUrl[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [artifactTitle, setArtifactTitle] = useState('')

  const summary = summarizeRubric(pble.rubric, scores)

  const loadArtifacts = async () => {
    try {
      const res = await fetch(`/api/training/pbles/${pble.id}/artifacts`)
      const body = (await res.json()) as { artifacts: ArtifactWithUrl[] }
      setArtifacts(body.artifacts)
    } catch {
      setArtifacts([])
    }
  }

  const toggleArtifacts = () => {
    const next = !artifactsOpen
    setArtifactsOpen(next)
    if (next && artifacts === null) void loadArtifacts()
  }

  const uploadArtifact = () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Pick a file to upload')
      return
    }
    start(async () => {
      setError(null)
      try {
        const form = new FormData()
        form.append('file', file)
        if (artifactTitle.trim()) form.append('title', artifactTitle.trim())
        const res = await fetch(`/api/training/pbles/${pble.id}/artifacts`, {
          method: 'POST',
          body: form,
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? 'Upload failed')
        }
        const body = (await res.json()) as { artifact: ArtifactWithUrl }
        setArtifacts((prev) => (prev ? [body.artifact, ...prev] : [body.artifact]))
        setArtifactTitle('')
        if (fileRef.current) fileRef.current.value = ''
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
      }
    })
  }

  const patch = (body: Record<string, unknown>) => {
    start(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/training/pbles/${pble.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? 'Update failed')
        }
        const r = (await res.json()) as { pble: Pble }
        onUpdate(r.pble)
        if ('rubric_scores' in body) setScores(r.pble.rubric_scores)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Update failed')
      }
    })
  }

  const setScore = (key: string, score: number) => {
    setScores((prev) => {
      const next = prev.filter((s) => s.criterion_key !== key)
      next.push({ criterion_key: key, score, notes: prev.find((s) => s.criterion_key === key)?.notes ?? null })
      return next
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{pble.title}</CardTitle>
            <p className="mt-0.5 text-xs text-text-secondary">
              {PBLE_SCENARIO_LABELS[pble.scenario_kind]} · Phase {pble.phase} · Assigned {pble.assigned_at.slice(0, 10)}
              {pble.due_at ? ` · Due ${pble.due_at.slice(0, 10)}` : ''}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_TONES[pble.status]}`}
          >
            {STATUS_LABELS[pble.status]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-text-secondary">Rubric</p>
            <p className="text-sm font-semibold tabular-nums text-text-primary">
              {summary.awarded_total}/{summary.max_total} ({summary.percent}%)
            </p>
          </div>
          {summary.missing_criteria.length > 0 ? (
            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
              {summary.missing_criteria.length} unscored
            </span>
          ) : null}
        </div>

        {isOwnerDit ? (
          <div className="flex flex-wrap gap-2">
            {pble.status === 'assigned' ? (
              <Button size="sm" variant="outline" onClick={() => patch({ status: 'in_progress' })} disabled={pending}>
                Start
              </Button>
            ) : null}
            {(pble.status === 'assigned' || pble.status === 'in_progress') ? (
              <Button size="sm" variant="default" onClick={() => patch({ status: 'submitted' })} disabled={pending}>
                Submit for scoring
              </Button>
            ) : null}
          </div>
        ) : null}

        {canScore ? (
          <div className="space-y-3 rounded-md border border-border-subtle bg-bg-elevated p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-primary">Score rubric</p>
              <Button size="sm" variant="ghost" onClick={() => setScoreMode((v) => !v)}>
                {scoreMode ? 'Collapse' : 'Expand'}
              </Button>
            </div>
            {scoreMode ? (
              <>
                <ul className="space-y-2">
                  {pble.rubric.map((crit) => {
                    const current = scores.find((s) => s.criterion_key === crit.key)
                    return (
                      <li key={crit.key} className="flex items-center gap-3">
                        <span className="flex-1 text-sm text-text-primary">{crit.label}</span>
                        <select
                          className="h-8 rounded-md border border-border-subtle bg-bg-surface px-2 text-sm"
                          value={current?.score ?? ''}
                          onChange={(e) => setScore(crit.key, Number(e.target.value))}
                        >
                          <option value="" disabled>—</option>
                          {Array.from({ length: crit.max_score + 1 }, (_, i) => (
                            <option key={i} value={i}>
                              {i}/{crit.max_score}
                            </option>
                          ))}
                        </select>
                      </li>
                    )
                  })}
                </ul>
                <Textarea
                  value={overallNotes}
                  onChange={(e) => setOverallNotes(e.target.value)}
                  placeholder="Overall notes"
                  rows={3}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={pending}
                    onClick={() =>
                      patch({
                        rubric_scores: scores,
                        overall_notes: overallNotes,
                        status: pble.status === 'scored' || pble.status === 'submitted' ? 'scored' : undefined,
                      })
                    }
                  >
                    Save scores
                  </Button>
                  {pble.status === 'submitted' ? (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => patch({ status: 'scored' })}>
                      Mark scored
                    </Button>
                  ) : null}
                  {pble.status === 'scored' ? (
                    <>
                      <Button size="sm" variant="default" disabled={pending} onClick={() => patch({ status: 'passed' })}>
                        Pass
                      </Button>
                      <Button size="sm" variant="destructive" disabled={pending} onClick={() => patch({ status: 'failed' })}>
                        Fail
                      </Button>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-md border border-border-subtle bg-bg-surface p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">Artifacts</p>
            <Button size="sm" variant="ghost" onClick={toggleArtifacts}>
              {artifactsOpen ? 'Hide' : 'Show'}
            </Button>
          </div>
          {artifactsOpen ? (
            <div className="mt-3 space-y-3">
              {isOwnerDit || canScore ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <Input ref={fileRef} type="file" />
                  <Input value={artifactTitle} onChange={(e) => setArtifactTitle(e.target.value)} placeholder="Title (optional)" />
                  <Button size="sm" variant="default" disabled={pending} onClick={uploadArtifact}>
                    Upload
                  </Button>
                </div>
              ) : null}
              {artifacts === null ? (
                <p className="text-xs text-text-secondary">Loading…</p>
              ) : artifacts.length === 0 ? (
                <p className="text-xs text-text-secondary">No artifacts yet.</p>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {artifacts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-text-primary">{a.title}</p>
                        <p className="text-xs text-text-secondary">{a.mime_type} · {Math.round(a.byte_size / 1024)} KB</p>
                      </div>
                      {a.signed_url ? (
                        <a
                          href={a.signed_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center rounded-md border border-border-subtle bg-bg-surface px-3 text-xs font-medium text-text-primary hover:bg-bg-elevated"
                        >
                          Download
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
