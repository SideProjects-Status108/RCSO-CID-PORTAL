import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { hasRole, UserRole, type UserRoleValue } from '@/lib/auth/roles'
import type {
  ScheduleEventRow,
  ScheduleEventStatus,
  ScheduleEventType,
} from '@/types/schedule'

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

/**
 * Published events assigned to `subjectUserId` from local midnight `from` through
 * `from + dayCount` (exclusive of extra day boundary at end-of-day).
 * Non-supervision may only query their own uid (RLS otherwise returns nothing).
 */
export async function fetchCompanionPersonalScheduleWindow(
  viewerRole: UserRoleValue,
  viewerId: string,
  subjectUserId: string,
  dayCount: number
): Promise<ScheduleEventRow[]> {
  const supervision = hasRole(viewerRole, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])
  if (subjectUserId !== viewerId && !supervision) return []

  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + dayCount)
  to.setHours(23, 59, 59, 999)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('status', 'published')
    .eq('assigned_to', subjectUserId)
    .gte('start_datetime', from.toISOString())
    .lte('start_datetime', to.toISOString())
    .order('start_datetime', { ascending: true })

  if (error || !data) return []
  return data
    .map((r) => mapEvent(r as Record<string, unknown>))
    .filter((r): r is ScheduleEventRow => r !== null)
}
