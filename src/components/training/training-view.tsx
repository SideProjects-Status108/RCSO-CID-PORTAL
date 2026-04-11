'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'

import {
  approveEvaluationAction,
  loadPairingDrawerDataAction,
} from '@/app/(dashboard)/training/actions'
import type { DitRecordRow, EvaluationRow, FtoPairingRow } from '@/types/training'
import type { PersonnelDirectoryRow } from '@/types/personnel'
import { UserRole, type UserRoleValue } from '@/lib/auth/roles'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrainingDitDrawer } from './training-dit-drawer'
import { EnrollDitModal, NewPairingModal } from './training-enroll-modals'
import { TrainingEvaluationModal } from './training-evaluation-modal'
import { TrainingPairingDrawer } from './training-pairing-drawer'
import { ditStatusStamp, overallRatingStamp, phaseBadge } from './training-stamps'

type TrainingViewProps = {
  viewerRole: UserRoleValue
  trainingFullRead: boolean
  supervisionPlus: boolean
  initialPairings: FtoPairingRow[]
  initialDitRecords: DitRecordRow[]
  initialEvaluations: EvaluationRow[]
  nameMap: Record<string, string>
  photoMap: Record<string, string | null>
  badgeMap: Record<string, string | null>
  ditPersonnelOptions: PersonnelDirectoryRow[]
  ftoPersonnelOptions: PersonnelDirectoryRow[]
  initialOpenPairingId: string | null
  initialOpenDitRecordId: string | null
  initialOpenEvaluationId: string | null
  milestoneProgressByDitRecordId: Record<string, { total: number; completed: number }>
}

export function TrainingView({
  viewerRole,
  trainingFullRead,
  supervisionPlus,
  initialPairings,
  initialDitRecords,
  initialEvaluations,
  nameMap,
  photoMap,
  badgeMap,
  ditPersonnelOptions,
  ftoPersonnelOptions,
  initialOpenPairingId,
  initialOpenDitRecordId,
  initialOpenEvaluationId,
  milestoneProgressByDitRecordId,
}: TrainingViewProps) {
  const router = useRouter()
  const [tab, setTab] = useState('pairings')
  const [pairings, setPairings] = useState(initialPairings)
  const [ditRecords, setDitRecords] = useState(initialDitRecords)
  const [evaluations, setEvaluations] = useState(initialEvaluations)
  const [pairingPick, setPairingPick] = useState<FtoPairingRow | null>(null)
  const [ditPick, setDitPick] = useState<DitRecordRow | null>(null)
  const [pairingEvals, setPairingEvals] = useState<EvaluationRow[]>([])
  const [phaseEvents, setPhaseEvents] = useState<
    import('@/types/training').PairingPhaseEventRow[]
  >([])
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [newPairOpen, setNewPairOpen] = useState(false)
  const [evalOpen, setEvalOpen] = useState(false)
  const [evalPairingId, setEvalPairingId] = useState<string | null>(null)
  const [evalEditId, setEvalEditId] = useState<string | null>(null)
  const [, startPair] = useTransition()
  const [, startAppr] = useTransition()

  useEffect(() => {
    setPairings(initialPairings)
  }, [initialPairings])
  useEffect(() => {
    setDitRecords(initialDitRecords)
  }, [initialDitRecords])
  useEffect(() => {
    setEvaluations(initialEvaluations)
  }, [initialEvaluations])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const ditRecordIdForPairing = useCallback(
    (ditUserId: string) => ditRecords.find((d) => d.user_id === ditUserId)?.id ?? null,
    [ditRecords]
  )

  useEffect(() => {
    if (!pairingPick) {
      setPairingEvals([])
      setPhaseEvents([])
      return
    }
    startPair(async () => {
      const b = await loadPairingDrawerDataAction(pairingPick.id)
      if (b) {
        setPairingEvals(b.evaluations)
        setPhaseEvents(b.phaseEvents)
      }
    })
  }, [pairingPick])

  useEffect(() => {
    if (initialOpenPairingId) {
      const p = pairings.find((x) => x.id === initialOpenPairingId)
      if (p) setPairingPick(p)
      router.replace('/training', { scroll: false })
    }
  }, [initialOpenPairingId, pairings, router])

  useEffect(() => {
    if (initialOpenDitRecordId) {
      const d = ditRecords.find((x) => x.id === initialOpenDitRecordId)
      if (d) setDitPick(d)
      router.replace('/training', { scroll: false })
    }
  }, [initialOpenDitRecordId, ditRecords, router])

  useEffect(() => {
    if (initialOpenEvaluationId) {
      setTab('evaluations')
      router.replace('/training', { scroll: false })
    }
  }, [initialOpenEvaluationId, router])

  const canEnroll = viewerRole === UserRole.fto_coordinator
  const canNewPairing = supervisionPlus || viewerRole === UserRole.fto_coordinator
  const canApproveEval = trainingFullRead

  const pairingLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pairings) {
      m.set(
        p.id,
        `${nameMap[p.fto_id] ?? 'FTO'} → ${nameMap[p.dit_id] ?? 'DIT'}`
      )
    }
    return m
  }, [pairings, nameMap])

  const noTrainingAccess =
    !trainingFullRead &&
    viewerRole !== UserRole.fto &&
    viewerRole !== UserRole.dit

  if (noTrainingAccess) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-text-primary">Training</h1>
        <p className="text-sm text-text-secondary">
          Training tools are available to FTOs, DITs, FTO coordinators, and supervision.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Training</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            FTO pairings, DIT milestones, evaluations, and phase tracking.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canNewPairing ? (
            <Button
              type="button"
              variant="outline"
              className="border-accent-teal/40 text-accent-teal"
              onClick={() => setNewPairOpen(true)}
            >
              New pairing
            </Button>
          ) : null}
          {canEnroll ? (
            <Button
              type="button"
              className="border border-accent-gold/30 bg-accent-gold text-bg-app"
              onClick={() => setEnrollOpen(true)}
            >
              Enroll DIT
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="border border-border-subtle bg-bg-surface">
          <TabsTrigger value="pairings">FTO pairings</TabsTrigger>
          <TabsTrigger value="dit">DIT records</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
        </TabsList>

        <TabsContent value="pairings" className="mt-4">
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
                  <th className="px-3 py-2">FTO</th>
                  <th className="px-3 py-2">DIT</th>
                  <th className="px-3 py-2">Phase</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {pairings.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-b border-border-subtle/80 hover:bg-bg-elevated/30"
                    onClick={() => setPairingPick(p)}
                  >
                    <td className="px-3 py-2 text-text-primary">{nameMap[p.fto_id] ?? '—'}</td>
                    <td className="px-3 py-2 text-text-primary">{nameMap[p.dit_id] ?? '—'}</td>
                    <td className="px-3 py-2">{phaseBadge(p.phase)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text-secondary">{p.start_date}</td>
                    <td className="px-3 py-2">
                      {p.is_active ? (
                        <span className="text-accent-teal">Active</span>
                      ) : (
                        <span className="text-text-disabled">Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pairings.length === 0 ? (
              <p className="px-3 py-6 text-center text-text-secondary">No pairings.</p>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="dit" className="mt-4">
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
                  <th className="px-3 py-2">DIT</th>
                  <th className="px-3 py-2">Phase</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Milestones</th>
                </tr>
              </thead>
              <tbody>
                {ditRecords.map((d) => {
                  const prog = milestoneProgressByDitRecordId[d.id]
                  const pct = prog?.total ? Math.round(((prog?.completed ?? 0) / prog.total) * 100) : 0
                  return (
                    <tr
                      key={d.id}
                      className="cursor-pointer border-b border-border-subtle/80 hover:bg-bg-elevated/30"
                      onClick={() => setDitPick(d)}
                    >
                      <td className="px-3 py-2 text-text-primary">{nameMap[d.user_id] ?? '—'}</td>
                      <td className="px-3 py-2">{phaseBadge(d.current_phase)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-text-secondary">{d.start_date}</td>
                      <td className="px-3 py-2">{ditStatusStamp(d.status)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg-elevated">
                            <div
                              className="h-1.5 rounded-full bg-accent-teal"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-accent-gold">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {ditRecords.length === 0 ? (
              <p className="px-3 py-6 text-center text-text-secondary">No DIT records.</p>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="evaluations" className="mt-4">
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-elevated text-text-secondary">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Pairing</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {evaluations.map((e) => (
                  <tr key={e.id} className="border-b border-border-subtle/80">
                    <td className="px-3 py-2 font-mono text-xs text-text-secondary">{e.evaluation_date}</td>
                    <td className="px-3 py-2 text-text-primary">
                      {pairingLabel.get(e.pairing_id) ?? e.pairing_id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2 capitalize">{e.evaluation_type.replaceAll('_', ' ')}</td>
                    <td className="px-3 py-2">{overallRatingStamp(e.overall_rating)}</td>
                    <td className="px-3 py-2 text-xs uppercase text-text-secondary">{e.status}</td>
                    <td className="px-3 py-2 text-right">
                      {canApproveEval && e.status === 'submitted' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-accent-teal/40 text-accent-teal"
                          onClick={() => {
                            startAppr(async () => {
                              await approveEvaluationAction(e.id)
                              refresh()
                            })
                          }}
                        >
                          Approve
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {evaluations.length === 0 ? (
              <p className="px-3 py-6 text-center text-text-secondary">No evaluations.</p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      {pairingPick ? (
        <TrainingPairingDrawer
          pairing={pairingPick}
          evaluations={pairingEvals}
          phaseEvents={phaseEvents}
          nameMap={nameMap}
          photoMap={photoMap}
          badgeMap={badgeMap}
          viewerRole={viewerRole}
          ditRecordIdForDit={ditRecordIdForPairing(pairingPick.dit_id)}
          onClose={() => setPairingPick(null)}
          onRefresh={refresh}
          onAddEvaluation={() => {
            setEvalPairingId(pairingPick.id)
            setEvalEditId(null)
            setEvalOpen(true)
          }}
          onOpenDitRecord={(id) => {
            setPairingPick(null)
            const d = ditRecords.find((r) => r.id === id)
            if (d) setDitPick(d)
          }}
        />
      ) : null}

      {ditPick ? (
        <TrainingDitDrawer
          record={ditPick}
          nameMap={nameMap}
          photoMap={photoMap}
          badgeMap={badgeMap}
          viewerRole={viewerRole}
          onClose={() => setDitPick(null)}
          onRefresh={refresh}
        />
      ) : null}

      <EnrollDitModal
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        ditOptions={ditPersonnelOptions}
        ftoOptions={ftoPersonnelOptions}
        onDone={refresh}
      />
      <NewPairingModal
        open={newPairOpen}
        onOpenChange={setNewPairOpen}
        ditOptions={ditPersonnelOptions}
        ftoOptions={ftoPersonnelOptions}
        onDone={refresh}
      />
      <TrainingEvaluationModal
        key={`${evalOpen}-${evalEditId ?? 'new'}-${evalPairingId ?? ''}`}
        open={evalOpen}
        onOpenChange={setEvalOpen}
        pairingId={evalPairingId}
        editId={evalEditId}
        viewerRole={viewerRole}
        onSaved={refresh}
      />
    </div>
  )
}
