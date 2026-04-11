'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'

import {
  loadDitDrawerDataAction,
  toggleMilestoneAction,
  updateDitRecordPhaseAction,
  updateDitRecordStatusAction,
} from '@/app/(dashboard)/training/actions'
import type { DitMilestoneRow, DitRecordRow, EvaluationRow } from '@/types/training'
import { UserRole, type UserRoleValue } from '@/lib/auth/roles'
import { AppAvatar } from '@/components/app/app-avatar'
import { Drawer } from '@/components/app/drawer'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'

import { ditStatusStamp, overallRatingStamp, phaseBadge } from './training-stamps'

type FormRow = { id: string; status: string; created_at: string; template_name: string }

type TrainingDitDrawerProps = {
  record: DitRecordRow | null
  nameMap: Record<string, string>
  photoMap: Record<string, string | null>
  badgeMap: Record<string, string | null>
  viewerRole: UserRoleValue
  onClose: () => void
  onRefresh: () => void
}

export function TrainingDitDrawer({
  record,
  nameMap,
  photoMap,
  badgeMap,
  viewerRole,
  onClose,
  onRefresh,
}: TrainingDitDrawerProps) {
  const router = useRouter()
  const [milestones, setMilestones] = useState<DitMilestoneRow[]>([])
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([])
  const [forms, setForms] = useState<FormRow[]>([])
  const [phase, setPhase] = useState(1)
  const [pending, start] = useTransition()

  const canCoord = viewerRole === UserRole.fto_coordinator
  const canToggleMilestone =
    viewerRole === UserRole.fto || viewerRole === UserRole.fto_coordinator
  const isDit = viewerRole === UserRole.dit

  const load = useCallback(() => {
    if (!record) return
    start(async () => {
      const bundle = await loadDitDrawerDataAction(record!.id)
      if (!bundle) return
      setMilestones(bundle.milestones)
      setEvaluations(bundle.evaluations)
      setForms(bundle.forms)
      setPhase(bundle.record!.current_phase)
    })
  }, [record])

  useEffect(() => {
    if (record) load()
  }, [record, load])

  if (!record) return null

  const rec = record
  const uid = rec.user_id
  const byPhase = [1, 2, 3].map((p) => ({
    phase: p,
    items: milestones.filter((m) => m.phase === p),
  }))

  const total = milestones.length
  const done = milestones.filter((m) => m.is_completed).length
  const pct = total ? Math.round((done / total) * 100) : 0

  async function savePhase() {
    start(async () => {
      await updateDitRecordPhaseAction(rec.id, phase)
      onRefresh()
      router.refresh()
    })
  }

  async function setStatus(status: 'active' | 'on_hold' | 'graduated' | 'separated') {
    start(async () => {
      await updateDitRecordStatusAction(rec.id, status)
      onRefresh()
      router.refresh()
      onClose()
    })
  }

  return (
    <Drawer
      open={true}
      title={nameMap[uid] ?? 'DIT record'}
      onOpenChange={(o) => !o && onClose()}
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-start gap-4">
          <AppAvatar name={nameMap[uid] ?? 'DIT'} photoUrl={photoMap[uid]} size="lg" />
          <div className="min-w-0 flex-1">
            <Link
              href={`/directory?userId=${uid}`}
              className="text-lg font-semibold text-accent-teal hover:underline"
            >
              {nameMap[uid] ?? '—'}
            </Link>
            <p className="font-mono text-accent-gold">{badgeMap[uid] ?? '—'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {phaseBadge(rec.current_phase)}
              {ditStatusStamp(rec.status)}
            </div>
            <p className="mt-1 text-text-secondary">Started {rec.start_date}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Label>Milestone progress</Label>
            <span className="font-mono text-xs text-accent-gold">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-2 rounded-full bg-accent-teal transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {canCoord ? (
          <div className="flex flex-wrap items-end gap-2 border-t border-border-subtle pt-3">
            <div className="space-y-1">
              <Label className="text-xs">Phase (coordinator)</Label>
              <Select
                value={String(phase)}
                onValueChange={(v) => v && setPhase(Number(v))}
              >
                <SelectTrigger className="w-32 border-border-subtle bg-bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border-subtle bg-bg-elevated">
                  {[1, 2, 3].map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      Phase {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void savePhase()}>
              Save phase
            </Button>
          </div>
        ) : null}

        {canCoord ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void setStatus('on_hold')}>
              Set on hold
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void setStatus('graduated')}>
              Graduate
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-danger/40 text-danger"
              disabled={pending}
              onClick={() => void setStatus('separated')}
            >
              Separate
            </Button>
          </div>
        ) : null}

        <Tabs defaultValue="milestones">
          <TabsList className="border border-border-subtle bg-bg-surface">
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            <TabsTrigger value="forms">Form submissions</TabsTrigger>
          </TabsList>
          <TabsContent value="milestones" className="mt-3 space-y-4">
            {byPhase.map(({ phase: p, items }) => (
              <div key={p}>
                <p className="mb-2 text-xs font-semibold uppercase text-accent-gold">Phase {p}</p>
                <ul className="space-y-2">
                  {items.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-col gap-1 rounded border border-border-subtle px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary">{m.milestone_name}</p>
                        {m.description ? (
                          <p className="text-xs text-text-secondary">{m.description}</p>
                        ) : null}
                        {m.completed_at ? (
                          <p className="text-xs font-mono text-text-secondary">
                            Done {new Date(m.completed_at).toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                      {canToggleMilestone && !isDit ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-text-secondary">Complete</span>
                          <Switch
                            checked={m.is_completed}
                            disabled={pending}
                            onCheckedChange={(checked) => {
                              start(async () => {
                                await toggleMilestoneAction(m.id, checked)
                                load()
                                onRefresh()
                                router.refresh()
                              })
                            }}
                          />
                        </div>
                      ) : (
                        <span className="shrink-0 text-xs text-text-secondary">
                          {m.is_completed ? 'Completed' : 'Pending'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="evaluations" className="mt-3 space-y-2">
            {evaluations.length === 0 ? (
              <p className="text-text-secondary">No evaluations.</p>
            ) : (
              evaluations.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-border-subtle px-3 py-2"
                >
                  <div>
                    <p className="text-text-primary">
                      {e.evaluation_date} · {e.evaluation_type.replaceAll('_', ' ')}
                    </p>
                    <p className="text-xs text-text-secondary">{e.status}</p>
                  </div>
                  {overallRatingStamp(e.overall_rating)}
                </div>
              ))
            )}
          </TabsContent>
          <TabsContent value="forms" className="mt-3 space-y-2">
            {forms.length === 0 ? (
              <p className="text-text-secondary">No submissions linked to this DIT.</p>
            ) : (
              forms.map((f) => (
                <Link
                  key={f.id}
                  href={`/forms?openSubmission=${f.id}`}
                  className="block rounded border border-border-subtle px-3 py-2 text-accent-teal hover:bg-bg-surface"
                >
                  {f.template_name} · {f.status} · {new Date(f.created_at).toLocaleDateString()}
                </Link>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Drawer>
  )
}
