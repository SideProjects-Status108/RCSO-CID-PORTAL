import { redirect } from 'next/navigation'

import { CompanionScheduleView } from '@/components/companion/companion-schedule-view'
import { fetchCompanionPersonalScheduleWindow } from '@/lib/companion/schedule-queries'
import { fetchPersonnelByUserIds } from '@/lib/directory/queries'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { fetchCurrentOnCall, fetchUpcomingOnCall } from '@/lib/schedule/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function firstParam(
  sp: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const v = sp[key]
  if (Array.isArray(v)) return v[0]
  return v
}

export default async function CompanionSchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login?next=/app/schedule')

  const sp = await searchParams
  const viewAsRaw = firstParam(sp, 'viewAs')?.trim()
  const supervision = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])
  const viewAsBlocked = Boolean(
    viewAsRaw && viewAsRaw !== session.user.id && !supervision
  )
  const subjectId =
    viewAsRaw && !viewAsBlocked && viewAsRaw !== session.user.id
      ? viewAsRaw
      : session.user.id

  const events = await fetchCompanionPersonalScheduleWindow(
    session.profile.role,
    session.user.id,
    subjectId,
    15
  )

  let subjectName: string | null = null
  if (subjectId !== session.user.id) {
    const [p] = await fetchPersonnelByUserIds([subjectId])
    subjectName = p?.full_name ?? null
  }

  const currentOnCall = await fetchCurrentOnCall()
  let onCallPerson: {
    full_name: string
    badge_number: string | null
    phone_cell: string | null
  } | null = null
  if (currentOnCall) {
    const [p] = await fetchPersonnelByUserIds([currentOnCall.assigned_to])
    if (p) {
      onCallPerson = {
        full_name: p.full_name,
        badge_number: p.badge_number,
        phone_cell: p.phone_cell,
      }
    }
  }

  const upcomingOnCall = await fetchUpcomingOnCall(7)
  const assigneeIds = [...new Set(upcomingOnCall.map((e) => e.assigned_to))]
  const people = assigneeIds.length ? await fetchPersonnelByUserIds(assigneeIds) : []
  const upcomingPeople: Record<
    string,
    { full_name: string; badge_number: string | null; phone_cell: string | null }
  > = {}
  for (const p of people) {
    if (p.user_id) {
      upcomingPeople[p.user_id] = {
        full_name: p.full_name,
        badge_number: p.badge_number,
        phone_cell: p.phone_cell,
      }
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-semibold uppercase tracking-wide text-text-primary">
        Schedule
      </h1>
      <CompanionScheduleView
        events={events}
        subjectName={subjectName}
        viewAsBlocked={viewAsBlocked}
        currentOnCall={currentOnCall}
        onCallPerson={onCallPerson}
        upcomingOnCall={upcomingOnCall}
        upcomingPeople={upcomingPeople}
      />
    </div>
  )
}
