import { redirect } from 'next/navigation'

import { TrainingView } from '@/components/training/training-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole, type UserRoleValue } from '@/lib/auth/roles'
import { fetchPersonnelByUserIds, fetchPersonnelDirectory } from '@/lib/directory/queries'
import {
  countMilestoneProgress,
  fetchDitRecordsList,
  fetchEvaluationsList,
  fetchFtoPairingsList,
  type DitRecordsListMode,
  type PairingsListScope,
} from '@/lib/training/queries'

export const dynamic = 'force-dynamic'

function trainingFullRead(role: UserRoleValue) {
  return hasRole(role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
    UserRole.fto_coordinator,
  ])
}

function supervisionPlus(role: UserRoleValue) {
  return hasRole(role, [UserRole.admin, UserRole.supervision_admin, UserRole.supervision])
}

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{
    pairing?: string
    dit?: string
    evaluation?: string
  }>
}) {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const sp = await searchParams
  const role = session.profile.role
  const uid = session.user.id
  const tRead = trainingFullRead(role)

  const pairingsScope: PairingsListScope =
    tRead ? 'all' : role === UserRole.dit ? 'dit' : role === UserRole.fto ? 'fto' : 'all'
  const ditListMode: DitRecordsListMode =
    tRead ? 'all' : role === UserRole.dit ? 'dit_own' : role === UserRole.fto ? 'fto_scope' : 'all'

  const [pairings, ditRecords, evaluations] = await Promise.all([
    fetchFtoPairingsList(uid, pairingsScope),
    fetchDitRecordsList(uid, ditListMode),
    fetchEvaluationsList(uid, tRead),
  ])

  const progressByRecordId: Record<string, { total: number; completed: number }> = {}
  for (const d of ditRecords) {
    progressByRecordId[d.id] = await countMilestoneProgress(d.id)
  }

  const userIds = new Set<string>()
  for (const p of pairings) {
    userIds.add(p.fto_id)
    userIds.add(p.dit_id)
  }
  for (const d of ditRecords) userIds.add(d.user_id)
  for (const e of evaluations) {
    userIds.add(e.submitted_by)
    if (e.approved_by) userIds.add(e.approved_by)
  }

  const personnel = await fetchPersonnelByUserIds([...userIds])
  const nameMap: Record<string, string> = {}
  const photoMap: Record<string, string | null> = {}
  const badgeMap: Record<string, string | null> = {}
  for (const p of personnel) {
    if (p.user_id) {
      nameMap[p.user_id] = p.full_name
      photoMap[p.user_id] = p.photo_url
      badgeMap[p.user_id] = p.badge_number
    }
  }

  const isAdminScope = hasRole(role, [UserRole.admin, UserRole.supervision_admin])
  const [ditDirectory, ftoDirectory] = await Promise.all([
    fetchPersonnelDirectory(role, isAdminScope, {
      search: '',
      status: 'active',
      systemRole: UserRole.dit,
    }),
    fetchPersonnelDirectory(role, isAdminScope, {
      search: '',
      status: 'active',
      systemRole: UserRole.fto,
    }),
  ])

  return (
    <TrainingView
      viewerRole={role}
      trainingFullRead={tRead}
      supervisionPlus={supervisionPlus(role)}
      initialPairings={pairings}
      initialDitRecords={ditRecords}
      initialEvaluations={evaluations}
      nameMap={nameMap}
      photoMap={photoMap}
      badgeMap={badgeMap}
      ditPersonnelOptions={ditDirectory.filter((r) => r.user_id)}
      ftoPersonnelOptions={ftoDirectory.filter((r) => r.user_id)}
      initialOpenPairingId={sp.pairing ?? null}
      initialOpenDitRecordId={sp.dit ?? null}
      initialOpenEvaluationId={sp.evaluation ?? null}
      milestoneProgressByDitRecordId={progressByRecordId}
    />
  )
}

