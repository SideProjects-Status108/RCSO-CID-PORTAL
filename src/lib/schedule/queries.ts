import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { hasRole, UserRole, type UserRoleValue } from '@/lib/auth/roles'
import type { ScheduleEventRow, ScheduleEventType, ScheduleEventStatus } from '@/types/schedule'

function mapEvent(raw: Record<string, unknown>): ScheduleEventRow | null {
  const et = raw.event_type
  const st = raw.status
  if (typeof raw.id !== 'string' || typeof et !== 'string' || typeof st !== 'string')
    return null
  const types: ScheduleEventType[] = [
    'regular',
    'on_call',
    'vacation',
    'school',
    'in_service',
    'fto_shift',
  ]
  const statuses: ScheduleEventStatus[] = ['draft', 'published']
  if (!types.includes(et as ScheduleEventType)) return null
  if (!statuses.includes(st as ScheduleEventStatus)) return null
  return {
    id: raw.id as string,
    event_type: et as ScheduleEventType,
    title: String(raw.title ?? ''),
    assigned_to: String(raw.assigned_to),
    created_by: String(raw.created_by),
    start_datetime: String(raw.start_datetime),
    end_datetime: String(raw.end_datetime),
    is_all_day: Boolean(raw.is_all_day),
    is_recurring: Boolean(raw.is_recurring),
    recurrence_rule: (raw.recurrence_rule as string | null) ?? null,
    gcal_event_id: (raw.gcal_event_id as string | null) ?? null,
    notes: (raw.notes as string | null) ?? null,
    status: st as ScheduleEventStatus,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  }
}

export async function fetchScheduleEventsInRange(
  viewerRole: UserRoleValue,
  fromIso: string,
  toIso: string
): Promise<ScheduleEventRow[]> {
  const supabase = await createClient()
  const supervision = hasRole(viewerRole, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])

  if (supervision) {
    const { data, error } = await supabase
      .from('schedule_events')
      .select('*')
      .lt('start_datetime', toIso)
      .gt('end_datetime', fromIso)
      .order('start_datetime')
    if (error || !data) return []
    return data
      .map((r) => mapEvent(r as Record<string, unknown>))
      .filter((r): r is ScheduleEventRow => r !== null)
  }

  const uid = (await supabase.auth.getUser()).data.user?.id
  if (!uid) return []

  const { data: own, error: e1 } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('status', 'published')
    .eq('assigned_to', uid)
    .lt('start_datetime', toIso)
    .gt('end_datetime', fromIso)
    .order('start_datetime')

  const { data: oncall, error: e2 } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('status', 'published')
    .eq('event_type', 'on_call')
    .lt('start_datetime', toIso)
    .gt('end_datetime', fromIso)
    .order('start_datetime')

  if (e1 || e2) return []

  const dit = viewerRole === UserRole.dit
  const merged = [...(own ?? []), ...(dit ? [] : oncall ?? [])]
  const byId = new Map<string, Record<string, unknown>>()
  for (const r of merged) byId.set(r.id as string, r as Record<string, unknown>)
  return [...byId.values()]
    .map((r) => mapEvent(r))
    .filter((r): r is ScheduleEventRow => r !== null)
    .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))
}

export async function fetchMyScheduleUpcoming(
  days: number
): Promise<ScheduleEventRow[]> {
  const supabase = await createClient()
  const uid = (await supabase.auth.getUser()).data.user?.id
  if (!uid) return []
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + days)
  const { data, error } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('assigned_to', uid)
    .eq('status', 'published')
    .gte('start_datetime', from.toISOString())
    .lte('start_datetime', to.toISOString())
    .order('start_datetime')
  if (error || !data) return []
  return data
    .map((r) => mapEvent(r as Record<string, unknown>))
    .filter((r): r is ScheduleEventRow => r !== null)
}

export async function fetchCurrentOnCall(): Promise<ScheduleEventRow | null> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('status', 'published')
    .eq('event_type', 'on_call')
    .lte('start_datetime', now)
    .gte('end_datetime', now)
    .order('start_datetime', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return mapEvent(data as Record<string, unknown>)
}

export async function fetchUpcomingOnCall(days: number): Promise<ScheduleEventRow[]> {
  const supabase = await createClient()
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + days)
  const { data, error } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('status', 'published')
    .eq('event_type', 'on_call')
    .gte('start_datetime', now.toISOString())
    .lte('start_datetime', end.toISOString())
    .order('start_datetime')
  if (error || !data) return []
  return data
    .map((r) => mapEvent(r as Record<string, unknown>))
    .filter((r): r is ScheduleEventRow => r !== null)
}

export async function fetchEventById(id: string): Promise<ScheduleEventRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return mapEvent(data as Record<string, unknown>)
}
