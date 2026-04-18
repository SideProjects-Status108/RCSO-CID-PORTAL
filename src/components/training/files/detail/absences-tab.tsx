import { canManageOnboarding } from '@/lib/training/access'
import { canDocumentAbsence, fetchAbsencesForDitRecord } from '@/lib/training/absences'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'

import { AbsencesClient } from './absences-client'

export async function AbsencesTab({ ditRecordId }: { ditRecordId: string }) {
  const session = await getSessionUserWithProfile()
  if (!session) return null

  const [absences, canDocument] = await Promise.all([
    fetchAbsencesForDitRecord(ditRecordId),
    canDocumentAbsence(session.profile, ditRecordId),
  ])
  const canClose = canManageOnboarding(session.profile)

  return (
    <AbsencesClient
      ditRecordId={ditRecordId}
      absences={absences}
      canDocument={canDocument}
      canClose={canClose}
    />
  )
}
