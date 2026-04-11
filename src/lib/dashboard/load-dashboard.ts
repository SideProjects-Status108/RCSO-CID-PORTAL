import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { fetchCurrentOnCall } from '@/lib/schedule/queries'
import { fetchPersonnelByUserIds } from '@/lib/directory/queries'
import type { ScheduleEventRow } from '@/types/schedule'

async function countOpenRequestsForSupervision(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'acknowledged', 'in_progress'])
  if (error) return 0
  return count ?? 0
}

async function countMyOpenRequests(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .in('status', ['open', 'acknowledged', 'in_progress'])
  if (error) return 0
  return count ?? 0
}

async function fetchRecentForms(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select('id, status, created_at')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })
    .limit(3)
  if (error || !data) return []
  return data as { id: string; status: string; created_at: string }[]
}

async function fetchUnitWeekEvents(): Promise<ScheduleEventRow[]> {
  const supabase = await createClient()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  const { data, error } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('status', 'published')
    .gte('start_datetime', start.toISOString())
    .lte('start_datetime', end.toISOString())
    .order('start_datetime')
    .limit(5)
  if (error || !data) return []
  return data
    .map((r) => {
      const et = r.event_type as ScheduleEventRow['event_type']
      const st = r.status as ScheduleEventRow['status']
      return {
        id: r.id as string,
        event_type: et,
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
        status: st,
        created_at: String(r.created_at),
        updated_at: String(r.updated_at),
      }
    })
    .filter(Boolean) as ScheduleEventRow[]
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

  const unitWeek = supervisionPlus ? await fetchUnitWeekEvents() : []

  const openRequestsCount = supervisionPlus
    ? await countOpenRequestsForSupervision()
    : 0
  const myOpenRequestsCount =
    !supervisionPlus && role !== UserRole.dit
      ? await countMyOpenRequests(uid)
      : 0

  const recentForms = await fetchRecentForms(uid)

  return {
    session,
    role,
    supervisionPlus,
    currentOnCall,
    onCallPerson,
    myTodayEvents,
    unitWeek,
    openRequestsCount,
    myOpenRequestsCount,
    recentForms,
  }
}

export type DashboardData = NonNullable<Awaited<ReturnType<typeof loadDashboardData>>>
