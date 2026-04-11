'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import {
  advancePairingPhaseAction,
  closePairingAction,
} from '@/app/(dashboard)/training/actions'
import type { EvaluationRow, FtoPairingRow, PairingPhaseEventRow } from '@/types/training'
import { UserRole, type UserRoleValue } from '@/lib/auth/roles'
import { AppAvatar } from '@/components/app/app-avatar'
import { Drawer } from '@/components/app/drawer'
import { StatusStamp } from '@/components/app/status-stamp'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatRelativeTime } from '@/lib/format-relative'

import { overallRatingStamp, phaseBadge } from './training-stamps'

type TrainingPairingDrawerProps = {
  pairing: FtoPairingRow | null
  evaluations: EvaluationRow[]
  phaseEvents: PairingPhaseEventRow[]
  nameMap: Record<string, string>
  photoMap: Record<string, string | null>
  badgeMap: Record<string, string | null>
  viewerRole: UserRoleValue
  ditRecordIdForDit: string | null
  onClose: () => void
  onRefresh: () => void
  onAddEvaluation: () => void
  onOpenDitRecord: (ditRecordId: string) => void
}

export function TrainingPairingDrawer({
  pairing,
  evaluations,
  phaseEvents,
  nameMap,
  photoMap,
  badgeMap,
  viewerRole,
  ditRecordIdForDit,
  onClose,
  onRefresh,
  onAddEvaluation,
  onOpenDitRecord,
}: TrainingPairingDrawerProps) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const canCoord = viewerRole === UserRole.fto_coordinator
  const canAddEval =
    viewerRole === UserRole.fto || viewerRole === UserRole.fto_coordinator

  if (!pairing) return null

  return (
    <Drawer
      open={true}
      title={nameMap[pairing.dit_id] ?? 'Pairing'}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <div className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border-subtle bg-bg-surface p-3">
            <p className="text-xs font-semibold uppercase text-text-secondary">FTO</p>
            <div className="mt-2 flex items-center gap-3">
              <AppAvatar
                name={nameMap[pairing.fto_id] ?? 'FTO'}
                photoUrl={photoMap[pairing.fto_id]}
                size="lg"
              />
              <div>
                <Link
                  href={`/directory?userId=${pairing.fto_id}`}
                  className="font-medium text-accent-teal hover:underline"
                >
                  {nameMap[pairing.fto_id] ?? '—'}
                </Link>
                <p className="font-mono text-xs text-accent-gold">{badgeMap[pairing.fto_id] ?? '—'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-surface p-3">
            <p className="text-xs font-semibold uppercase text-text-secondary">DIT</p>
            <div className="mt-2 flex items-center gap-3">
              <AppAvatar
                name={nameMap[pairing.dit_id] ?? 'DIT'}
                photoUrl={photoMap[pairing.dit_id]}
                size="lg"
              />
              <div>
                <Link
                  href={`/directory?userId=${pairing.dit_id}`}
                  className="font-medium text-accent-teal hover:underline"
                >
                  {nameMap[pairing.dit_id] ?? '—'}
                </Link>
                <p className="font-mono text-xs text-accent-gold">{badgeMap[pairing.dit_id] ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {phaseBadge(pairing.phase)}
          <StatusStamp variant={pairing.is_active ? 'teal' : 'muted'}>
            {pairing.is_active ? 'Active' : 'Closed'}
          </StatusStamp>
        </div>
        <p className="text-text-secondary">
          Start: {pairing.start_date}
          {pairing.end_date ? ` · End: ${pairing.end_date}` : ''}
        </p>
        {pairing.notes ? (
          <div>
            <p className="text-xs font-semibold uppercase text-accent-gold">Pairing notes</p>
            <p className="mt-1 whitespace-pre-wrap text-text-primary">{pairing.notes}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-3">
          {canAddEval && pairing.is_active ? (
            <Button
              type="button"
              size="sm"
              className="border border-accent-teal/40 bg-bg-surface text-accent-teal"
              onClick={onAddEvaluation}
            >
              Add evaluation
            </Button>
          ) : null}
          {canCoord && pairing.is_active ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  start(async () => {
                    await advancePairingPhaseAction(pairing.id)
                    onRefresh()
                    router.refresh()
                  })
                }}
              >
                Advance phase
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-danger/40 text-danger"
                disabled={pending}
                onClick={() => {
                  start(async () => {
                    await closePairingAction(pairing.id, new Date().toISOString().slice(0, 10))
                    onRefresh()
                    router.refresh()
                    onClose()
                  })
                }}
              >
                Close pairing
              </Button>
            </>
          ) : null}
        </div>

        <Tabs defaultValue="evaluations">
          <TabsList className="border border-border-subtle bg-bg-surface">
            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            <TabsTrigger value="progress">DIT progress</TabsTrigger>
            <TabsTrigger value="history">Phase history</TabsTrigger>
          </TabsList>
          <TabsContent value="evaluations" className="mt-3 space-y-2">
            {evaluations.length === 0 ? (
              <p className="text-text-secondary">No evaluations yet.</p>
            ) : (
              <ul className="space-y-2">
                {evaluations.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-border-subtle px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {e.evaluation_date} · {e.evaluation_type.replaceAll('_', ' ')}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {nameMap[e.submitted_by] ?? 'FTO'} · {e.status}
                      </p>
                    </div>
                    {overallRatingStamp(e.overall_rating)}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="progress" className="mt-3">
            {ditRecordIdForDit ? (
              <Button
                type="button"
                variant="outline"
                className="border-accent-teal/40 text-accent-teal"
                onClick={() => onOpenDitRecord(ditRecordIdForDit)}
              >
                Open milestone checklist
              </Button>
            ) : (
              <p className="text-text-secondary">No DIT record linked.</p>
            )}
          </TabsContent>
          <TabsContent value="history" className="mt-3 space-y-2">
            {phaseEvents.length === 0 ? (
              <p className="text-text-secondary">No phase changes logged.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {phaseEvents.map((ev) => (
                  <li key={ev.id} className="border-l-2 border-accent-gold/40 pl-2">
                    <span className="font-mono text-text-secondary">
                      {formatRelativeTime(ev.created_at)}
                    </span>{' '}
                    — Phase {ev.from_phase} → {ev.to_phase} ({nameMap[ev.changed_by] ?? 'User'})
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Drawer>
  )
}
