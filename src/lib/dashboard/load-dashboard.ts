import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import {
  countUpcomingPublishedEventsStartingWithinDays,
  fetchCurrentOnCall,
  fetchUpcomingPublishedEventsStartingWithinDays,
} from '@/lib/schedule/queries'
import { fetchPersonnelByUserIds } from '@/lib/directory/queries'
import {
  countActiveCasesForUser,
  countActiveCasesSupervision,
} from '@/lib/operations/queries'
import { countMyAssignedOpenRequests } from '@/lib/requests/queries'
import {
  countActiveDitRecords,
  fetchActivePairingForFto,
  fetchDitProgressForUser,
} from '@/lib/training/queries'
import { countSubmittedPendingForms } from '@/lib/forms/queries'
import { fetchNotificationsForUser } from '@/lib/notifications/queries'
import type { ScheduleEventRow } from '@/types/schedule'
import type { NotificationRow } from '@/types/notifications'

async function countOpenRequestsForSupervision(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'acknowledged', 'in_progress'])
  if (error) return 0
  return count ?? 0
}

async function fetchRecentForms(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      `
      id,
      status,
      created_at,
      form_templates ( name )
    `
    )
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })
    .limit(3)
  if (error || !data) return []
  return data.map((row) => {
    const ft = row.form_templates as { name?: string } | null
    return {
      id: String(row.id),
      status: String(row.status ?? ''),
      created_at: String(row.created_at ?? ''),
      template_name: ft?.name ?? null,
    }
  })
}

export async function loadDashboardData() {
  const session = await getSessionUserWithProfile()
  if (!session) return null

  const role = session.profile.role
  const uid = session.user.id

  const supervisionPlus = hasRole(role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])

  const currentOnCall = await fetchCurrentOnCall()
  const onCallPerson = currentOnCall
    ? (await fetchPersonnelByUserIds([currentOnCall.assigned_to]))[0]
    : null

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setHours(23, 59, 59, 999)

  const supabase = await createClient()
  const { data: myToday } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('assigned_to', uid)
    .eq('status', 'published')
    .gte('start_datetime', todayStart.toISOString())
    .lte('start_datetime', todayEnd.toISOString())
    .order('start_datetime')

  const myTodayEvents =
    myToday?.map((r) => ({
      id: r.id as string,
      event_type: r.event_type as ScheduleEventRow['event_type'],
      title: String(r.title ?? ''),
      assigned_to: String(r.assigned_to),
      created_by: String(r.created_by),
      start_datetime: String(r.start_datetime),
      end_datetime: String(r.end_datetime),
      is_all_day: Boolean(r.is_all_day),
      is_recurring: Boolean(r.is_recurring),
      recurrence_rule: (r.recurrence_rule as string | null) ?? null,
      gcal_event_id: (r.gcal_event_id as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
      status: r.status as ScheduleEventRow['status'],
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    })) ?? []

  const pendingFormsCount = await countSubmittedPendingForms()
  const upcomingEventsCount = await countUpcomingPublishedEventsStartingWithinDays(
    role,
    uid,
    7
  )
  const upcomingEvents = await fetchUpcomingPublishedEventsStartingWithinDays(
    role,
    uid,
    7,
    5
  )
  const recentNotifications: NotificationRow[] = await fetchNotificationsForUser(uid, 10)

  const openRequestsCount = supervisionPlus
    ? await countOpenRequestsForSupervision()
    : 0
  const myOpenRequestsCount =
    !supervisionPlus && role !== UserRole.dit
      ? await countMyAssignedOpenRequests(uid)
      : 0

  const activeCasesCount =
    role === UserRole.dit
      ? 0
      : supervisionPlus
        ? await countActiveCasesSupervision()
        : await countActiveCasesForUser(uid)

  const recentForms = await fetchRecentForms(uid)

  const activeDitsCount = await countActiveDitRecords()

  let myDitForFto: { ditName: string; phase: number } | null = null
  if (role === UserRole.fto) {
    const pairing = await fetchActivePairingForFto(uid)
    if (pairing) {
      const [ditPerson] = await fetchPersonnelByUserIds([pairing.dit_id])
      myDitForFto = {
        ditName: ditPerson?.full_name ?? 'DIT',
        phase: pairing.phase,
      }
    }
  }

  let ditMilestonePercent: number | null = null
  if (role === UserRole.dit) {
    const prog = await fetchDitProgressForUser(uid)
    if (prog && prog.total > 0) {
      ditMilestonePercent = Math.round((prog.completed / prog.total) * 100)
    }
  }

  return {
    session,
    role,
    supervisionPlus,
    currentOnCall,
    onCallPerson,
    myTodayEvents,
    pendingFormsCount,
    upcomingEventsCount,
    upcomingEvents,
    recentNotifications,
    openRequestsCount,
    myOpenRequestsCount,
    activeCasesCount,
    recentForms,
    activeDitsCount,
    myDitForFto,
    ditMilestonePercent,
  }
}

export type DashboardData = NonNullable<Awaited<ReturnType<typeof loadDashboardData>>>
