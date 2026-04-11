'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole, type UserRoleValue } from '@/lib/auth/roles'
import type { ScheduleEventType, ScheduleEventStatus } from '@/types/schedule'

function assertCanEditSchedule(
  viewerRole: UserRoleValue,
  eventType: ScheduleEventType
) {
  const supervision = hasRole(viewerRole, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])
  if (supervision) return
  const ftc = viewerRole === UserRole.fto_coordinator
  if (ftc && (eventType === 'fto_shift' || eventType === 'school')) return
  throw new Error('Forbidden')
}

function recurrenceToRrule(
  mode: 'none' | 'daily' | 'weekly' | 'custom',
  custom?: string | null
): string | null {
  if (mode === 'none') return null
  if (mode === 'daily') return 'FREQ=DAILY'
  if (mode === 'weekly') return 'FREQ=WEEKLY'
  if (mode === 'custom' && custom?.trim()) return custom.trim()
  return null
}

export type ScheduleEventInput = {
  id?: string
  title: string
  event_type: ScheduleEventType
  assigned_to: string
  start_datetime: string
  end_datetime: string
  is_all_day: boolean
  status: ScheduleEventStatus
  notes?: string | null
  recurrence: 'none' | 'daily' | 'weekly' | 'custom'
  recurrence_custom?: string | null
}

export async function saveScheduleEventAction(input: ScheduleEventInput) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  assertCanEditSchedule(session.profile.role, input.event_type)

  const supabase = await createClient()
  const recurrence_rule = recurrenceToRrule(
    input.recurrence,
    input.recurrence_custom
  )
  const is_recurring = Boolean(recurrence_rule)

  const row = {
    title: input.title,
    event_type: input.event_type,
    assigned_to: input.assigned_to,
    created_by: session.user.id,
    start_datetime: input.start_datetime,
    end_datetime: input.end_datetime,
    is_all_day: input.is_all_day,
    is_recurring,
    recurrence_rule,
    notes: input.notes ?? null,
    status: input.status,
  }

  if (input.id) {
    const { error } = await supabase
      .from('schedule_events')
      .update(row)
      .eq('id', input.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('schedule_events').insert(row)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/schedule')
  revalidatePath('/dashboard')
}

export async function deleteScheduleEventAction(id: string) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  const supabase = await createClient()
  const { data: existing, error: fe } = await supabase
    .from('schedule_events')
    .select('event_type')
    .eq('id', id)
    .maybeSingle()
  if (fe || !existing?.event_type) throw new Error('Not found')
  assertCanEditSchedule(
    session.profile.role,
    existing.event_type as ScheduleEventType
  )
  const { error } = await supabase.from('schedule_events').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/schedule')
  revalidatePath('/dashboard')
}
