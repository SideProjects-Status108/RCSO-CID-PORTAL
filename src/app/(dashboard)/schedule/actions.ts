'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole, type UserRoleValue } from '@/lib/auth/roles'
import type { ScheduleEventType, ScheduleEventStatus } from '@/types/schedule'
import { notifySchedulePublished } from '@/lib/notifications/insert-notifications'
import {
  createGCalEvent,
  deleteGCalEvent,
  shouldSyncScheduleEvent,
  updateGCalEvent,
} from '@/lib/gcal'
import { fetchEventById } from '@/lib/schedule/queries'

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

async function syncScheduleEventToGoogle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  prior?: { gcal_event_id: string | null; assigned_to: string } | null
) {
  const full = await fetchEventById(eventId)
  if (!full) return

  if (
    prior &&
    prior.assigned_to !== full.assigned_to &&
    prior.gcal_event_id
  ) {
    await deleteGCalEvent(prior.assigned_to, prior.gcal_event_id)
  }

  if (!shouldSyncScheduleEvent(full)) {
    if (full.gcal_event_id) {
      await deleteGCalEvent(full.assigned_to, full.gcal_event_id)
      await supabase.from('schedule_events').update({ gcal_event_id: null }).eq('id', eventId)
    }
    return
  }

  if (full.gcal_event_id) {
    const gid = await updateGCalEvent(full.assigned_to, full, full.gcal_event_id)
    if (gid && gid !== full.gcal_event_id) {
      await supabase.from('schedule_events').update({ gcal_event_id: gid }).eq('id', eventId)
    }
  } else {
    const gid = await createGCalEvent(full.assigned_to, full)
    if (gid) {
      await supabase.from('schedule_events').update({ gcal_event_id: gid }).eq('id', eventId)
    }
  }
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

  let priorStatus: string | null | undefined
  let priorGcal: { gcal_event_id: string | null; assigned_to: string } | null = null
  if (input.id) {
    const { data: existing } = await supabase
      .from('schedule_events')
      .select('status, gcal_event_id, assigned_to')
      .eq('id', input.id)
      .maybeSingle()
    priorStatus = existing?.status as string | undefined
    priorGcal = existing
      ? {
          gcal_event_id: (existing.gcal_event_id as string | null) ?? null,
          assigned_to: String(existing.assigned_to),
        }
      : null
    const { error } = await supabase
      .from('schedule_events')
      .update(row)
      .eq('id', input.id)
    if (error) throw new Error(error.message)
    await syncScheduleEventToGoogle(supabase, input.id, priorGcal)
  } else {
    priorStatus = undefined
    const { data: inserted, error } = await supabase
      .from('schedule_events')
      .insert(row)
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    if (
      input.status === 'published' &&
      inserted?.id &&
      priorStatus !== 'published'
    ) {
      await notifySchedulePublished({
        eventId: String(inserted.id),
        assignedTo: input.assigned_to,
        title: input.title,
        startIso: input.start_datetime,
      })
    }
    if (inserted?.id) {
      await syncScheduleEventToGoogle(supabase, String(inserted.id), null)
    }
  }

  const becamePublished =
    Boolean(input.id) &&
    input.status === 'published' &&
    priorStatus !== 'published'
  if (becamePublished && input.id) {
    await notifySchedulePublished({
      eventId: input.id,
      assignedTo: input.assigned_to,
      title: input.title,
      startIso: input.start_datetime,
    })
  }

  revalidatePath('/operations/schedules')
  revalidatePath('/schedule')
  revalidatePath('/dashboard')
}

export async function deleteScheduleEventAction(id: string) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  const supabase = await createClient()
  const { data: existing, error: fe } = await supabase
    .from('schedule_events')
    .select('event_type, gcal_event_id, assigned_to')
    .eq('id', id)
    .maybeSingle()
  if (fe || !existing?.event_type) throw new Error('Not found')
  assertCanEditSchedule(
    session.profile.role,
    existing.event_type as ScheduleEventType
  )
  const gid = (existing.gcal_event_id as string | null) ?? null
  const assignee = String(existing.assigned_to)
  if (gid) {
    await deleteGCalEvent(assignee, gid)
  }
  const { error } = await supabase.from('schedule_events').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/operations/schedules')
  revalidatePath('/schedule')
  revalidatePath('/dashboard')
}
