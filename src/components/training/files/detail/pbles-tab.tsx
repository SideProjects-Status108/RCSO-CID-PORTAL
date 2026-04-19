import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import { listPblesForDit, listTemplates } from '@/lib/training/pble-queries'
import { fetchDitRecordById } from '@/lib/training/queries'

import { PblesClient } from './pbles-client'

/**
 * Server tab for PBLEs on a DIT file. Training writers can assign new
 * PBLEs and score submissions; the DIT themselves can mark
 * in_progress / submit and upload artifacts. Other viewers are
 * read-only.
 */
export async function PblesTab({ ditRecordId }: { ditRecordId: string }) {
  const session = await getSessionUserWithProfile()
  if (!session) return null

  const [record, pbles, templates] = await Promise.all([
    fetchDitRecordById(ditRecordId),
    listPblesForDit(ditRecordId),
    listTemplates(),
  ])
  if (!record) return null

  const writer = isTrainingWriter(session.profile)
  const isOwnerDit = record.user_id === session.user.id

  return (
    <PblesClient
      ditRecordId={ditRecordId}
      currentPhase={record.current_phase}
      pbles={pbles}
      templates={templates}
      canAssign={writer}
      canScore={writer}
      isOwnerDit={isOwnerDit}
      currentUserId={session.user.id}
    />
  )
}
