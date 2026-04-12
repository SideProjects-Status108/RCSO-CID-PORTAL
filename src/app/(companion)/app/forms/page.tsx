import { redirect } from 'next/navigation'

import { CompanionFormsView } from '@/components/companion/companion-forms-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { fetchPersonnelDirectory } from '@/lib/directory/queries'
import { fetchCompanionFormSubmissions } from '@/lib/companion/forms-queries'
import { fetchPublishedTemplateByName } from '@/lib/forms/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CompanionFormsPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login?next=/app/forms')

  const adminScope = hasRole(session.profile.role, [UserRole.admin, UserRole.supervision_admin])
  const showDitTile = hasRole(session.profile.role, [UserRole.fto, UserRole.fto_coordinator])

  const [
    detectiveActivityTpl,
    ditObservationTpl,
    caseIntakeTpl,
    detectives,
    ditTrainees,
    submissions,
  ] = await Promise.all([
    fetchPublishedTemplateByName('Detective Activity Report'),
    fetchPublishedTemplateByName('DIT Daily Observation Report'),
    fetchPublishedTemplateByName('Case Assignment / Intake Form'),
    fetchPersonnelDirectory(session.profile.role, adminScope, {
      status: 'active',
      systemRole: UserRole.detective,
    }),
    fetchPersonnelDirectory(session.profile.role, adminScope, {
      status: 'active',
      systemRole: UserRole.dit,
    }),
    fetchCompanionFormSubmissions(session.user.id, 20),
  ])

  const userDisplayName =
    session.profile.full_name?.trim() || session.user.email || 'Unknown'

  return (
    <CompanionFormsView
      userDisplayName={userDisplayName}
      showDitTile={showDitTile}
      templateIds={{
        detectiveActivity: detectiveActivityTpl?.id ?? null,
        ditObservation: ditObservationTpl?.id ?? null,
        caseIntake: caseIntakeTpl?.id ?? null,
      }}
      detectives={detectives.map((d) => ({ id: d.id, full_name: d.full_name }))}
      ditTrainees={ditTrainees.map((d) => ({ id: d.id, full_name: d.full_name }))}
      initialSubmissions={submissions}
    />
  )
}
