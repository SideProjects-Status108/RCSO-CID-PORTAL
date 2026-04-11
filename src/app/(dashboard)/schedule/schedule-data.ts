import 'server-only'

import {
  fetchPersonnelAssignable,
  fetchPersonnelByUserIds,
} from '@/lib/directory/queries'
import {
  fetchCurrentOnCall,
  fetchMyScheduleUpcoming,
  fetchScheduleEventsInRange,
  fetchUpcomingOnCall,
} from '@/lib/schedule/queries'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'

export async function loadSchedulePageData(userIdFilter?: string | null) {
  const session = await getSessionUserWithProfile()
  if (!session) return null

  const from = new Date()
  from.setMonth(from.getMonth() - 1)
  const to = new Date()
  to.setMonth(to.getMonth() + 4)
  const fromIso = from.toISOString()
  const toIso = to.toISOString()

  let events = await fetchScheduleEventsInRange(
    session.profile.role,
    fromIso,
    toIso
  )
  if (userIdFilter) {
    events = events.filter((e) => e.assigned_to === userIdFilter)
  }

  const assignable = await fetchPersonnelAssignable()
  const currentOnCall = await fetchCurrentOnCall()
  const upcomingOnCall = await fetchUpcomingOnCall(7)
  const myUpcoming = await fetchMyScheduleUpcoming(14)

  const onCallUserIds = [
    currentOnCall?.assigned_to,
    ...upcomingOnCall.map((e) => e.assigned_to),
  ].filter((v): v is string => Boolean(v))
  const onCallPeople = await fetchPersonnelByUserIds([...new Set(onCallUserIds)])
  const personnelByUserId = Object.fromEntries(
    onCallPeople
      .filter((p) => p.user_id)
      .map((p) => [p.user_id as string, p])
  )

  const canManageSchedule = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])
  const ftcOnly = session.profile.role === UserRole.fto_coordinator

  return {
    session,
    events,
    assignable,
    currentOnCall,
    upcomingOnCall,
    myUpcoming,
    canManageSchedule,
    ftcOnly,
    userIdFilter: userIdFilter ?? null,
    personnelByUserId,
  }
}
