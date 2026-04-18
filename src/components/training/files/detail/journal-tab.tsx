import { UserRole, hasRole } from '@/lib/auth/roles'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import {
  fetchMissedDayInputs,
  listCtrEntries,
  listJournalEntries,
  listJournalReviews,
  listNudgesForDit,
} from '@/lib/training/journal-queries'
import { computeMissedStreak, decideNudges } from '@/lib/training/journal'
import { fetchDitRecordById } from '@/lib/training/queries'
import type { DitRecordStatus } from '@/types/training'

import { JournalClient } from './journal-client'

export async function JournalTab({ ditRecordId }: { ditRecordId: string }) {
  const session = await getSessionUserWithProfile()
  if (!session) return null

  const [record, entries, ctr, nudges, inputs] = await Promise.all([
    fetchDitRecordById(ditRecordId),
    listJournalEntries(ditRecordId, { limit: 30 }),
    listCtrEntries(ditRecordId, { limit: 30 }),
    listNudgesForDit(ditRecordId),
    fetchMissedDayInputs(ditRecordId),
  ])
  const reviews = await listJournalReviews(entries.map((e) => e.id))

  const status = ((record?.status as DitRecordStatus) ?? 'active') as DitRecordStatus
  const streak = computeMissedStreak({
    status,
    entries: inputs.entries,
    absences: inputs.absences,
  })
  const decision = decideNudges(streak, status)

  const writer = isTrainingWriter(session.profile)
  const isFtoOrDetective = hasRole(session.profile.role, [UserRole.fto, UserRole.detective])
  const isSelf = record?.user_id === session.user.id

  return (
    <JournalClient
      ditRecordId={ditRecordId}
      status={status}
      entries={entries}
      reviews={reviews}
      ctr={ctr}
      nudges={nudges}
      streak={streak}
      nudgeDit={decision.nudgeDit}
      nudgeFto={decision.nudgeFto}
      canWriteJournal={isSelf || writer}
      canWriteCtr={writer || isFtoOrDetective}
      canReview={writer || isFtoOrDetective}
      currentUserId={session.user.id}
    />
  )
}