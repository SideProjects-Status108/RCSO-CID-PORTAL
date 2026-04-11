'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import {
  fetchProfileName,
  fetchSupervisionPlusUserIds,
  insertNotifications,
} from '@/lib/notifications/insert-notifications'
import {
  fetchRequestById,
  fetchRequestsList,
  type RequestListFilters,
} from '@/lib/requests/queries'
import { fetchRequestUpdates } from '@/lib/requests/request-updates'
import type { RequestStatus, RequestType, RequestUrgency } from '@/types/requests'

function uniqueIds(ids: (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((x): x is string => Boolean(x)))]
}

export async function fetchRequestUpdatesAction(requestId: string) {
  const session = await getSessionUserWithProfile()
  if (!session) return []
  return fetchRequestUpdates(requestId)
}

export async function listRequestsAction(filters: RequestListFilters) {
  const session = await getSessionUserWithProfile()
  if (!session) return []
  if (
    filters.scope === 'all_open' &&
    !hasRole(session.profile.role, [
      UserRole.admin,
      UserRole.supervision_admin,
      UserRole.supervision,
    ])
  ) {
    return []
  }
  return fetchRequestsList(session.user.id, filters)
}

export async function createRequestAction(input: {
  title: string
  request_type: RequestType
  urgency: RequestUrgency
  description: string | null
  assigned_to: string | null
  address: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (session.profile.role === UserRole.dit) throw new Error('Forbidden')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('requests')
    .insert({
      title: input.title.trim(),
      request_type: input.request_type,
      urgency: input.urgency,
      description: input.description?.trim() || null,
      assigned_to: input.assigned_to,
      address: input.address?.trim() || null,
      status: 'open',
      created_by: session.user.id,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create request')

  const requestId = data.id as string

  await supabase.from('request_updates').insert({
    request_id: requestId,
    updated_by: session.user.id,
    previous_status: null,
    new_status: 'open',
    note: 'Request created',
  })
  const titleShort = input.title.trim().slice(0, 120)

  const notifs: Parameters<typeof insertNotifications>[0] = []

  if (input.assigned_to) {
    notifs.push({
      user_id: input.assigned_to,
      type: 'request_assigned',
      reference_id: requestId,
      reference_type: 'request',
      message: `You have been assigned: ${titleShort}`,
    })
  }

  if (input.urgency === 'urgent') {
    const supIds = await fetchSupervisionPlusUserIds()
    const urgentTargets = uniqueIds([input.assigned_to, ...supIds])
    for (const uid of urgentTargets) {
      notifs.push({
        user_id: uid,
        type: 'request_urgent',
        reference_id: requestId,
        reference_type: 'request',
        message: `URGENT: ${titleShort} requires immediate response`,
      })
    }
  }

  await insertNotifications(notifs)
  revalidatePath('/requests')
  revalidatePath('/dashboard')
  return { id: requestId }
}

export async function updateRequestStatusAction(input: {
  requestId: string
  new_status: RequestStatus
  note: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  const prev = await fetchRequestById(input.requestId)
  if (!prev) throw new Error('Not found')

  const isSupervision = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])
  const isAssignee = prev.assigned_to === session.user.id

  if (!isSupervision && !isAssignee) throw new Error('Forbidden')
  if (!isSupervision && isAssignee && input.new_status === 'closed') {
    throw new Error('Only supervision may close this request')
  }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status: input.new_status,
    updated_at: now,
  }
  if (input.new_status === 'acknowledged' && !prev.acknowledged_at) {
    patch.acknowledged_at = now
  }
  if (input.new_status === 'complete' || input.new_status === 'closed') {
    patch.completed_at = prev.completed_at ?? now
  }

  const { error } = await supabase.from('requests').update(patch).eq('id', input.requestId)
  if (error) throw new Error(error.message)

  await supabase.from('request_updates').insert({
    request_id: input.requestId,
    updated_by: session.user.id,
    previous_status: prev.status,
    new_status: input.new_status,
    note: input.note?.trim() || null,
  })

  const assigneeName =
    (await fetchProfileName(session.user.id)) ?? 'An assignee'

  if (prev.created_by && prev.created_by !== session.user.id) {
    await insertNotifications([
      {
        user_id: prev.created_by,
        type: 'request_updated',
        reference_id: input.requestId,
        reference_type: 'request',
        message: `${assigneeName} updated ${prev.title.slice(0, 80)} to ${input.new_status.replaceAll('_', ' ')}`,
      },
    ])
  }

  revalidatePath('/requests')
  revalidatePath('/dashboard')
}

export async function supervisionUpdateRequestAction(input: {
  requestId: string
  assigned_to: string | null
  status: RequestStatus
  note: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')
  if (
    !hasRole(session.profile.role, [UserRole.admin, UserRole.supervision_admin, UserRole.supervision])
  ) {
    throw new Error('Forbidden')
  }

  const supabase = await createClient()
  const prev = await fetchRequestById(input.requestId)
  if (!prev) throw new Error('Not found')

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    assigned_to: input.assigned_to,
    status: input.status,
    updated_at: now,
  }
  if (input.status === 'acknowledged' && !prev.acknowledged_at) {
    patch.acknowledged_at = now
  }
  if (input.status === 'complete' || input.status === 'closed') {
    patch.completed_at = prev.completed_at ?? now
  }

  const { error } = await supabase.from('requests').update(patch).eq('id', input.requestId)
  if (error) throw new Error(error.message)

  const statusChanged = prev.status !== input.status
  const assignChanged = prev.assigned_to !== input.assigned_to

  if (statusChanged || assignChanged) {
    await supabase.from('request_updates').insert({
      request_id: input.requestId,
      updated_by: session.user.id,
      previous_status: prev.status,
      new_status: input.status,
      note: input.note?.trim() || null,
    })
  }

  const notifs: Parameters<typeof insertNotifications>[0] = []

  if (assignChanged && input.assigned_to) {
    notifs.push({
      user_id: input.assigned_to,
      type: 'request_assigned',
      reference_id: input.requestId,
      reference_type: 'request',
      message: `You have been assigned: ${prev.title.slice(0, 120)}`,
    })
  }

  if (statusChanged && prev.created_by && prev.created_by !== session.user.id) {
    const actor = (await fetchProfileName(session.user.id)) ?? 'Supervision'
    notifs.push({
      user_id: prev.created_by,
      type: 'request_updated',
      reference_id: input.requestId,
      reference_type: 'request',
      message: `${actor} updated ${prev.title.slice(0, 80)} to ${input.status.replaceAll('_', ' ')}`,
    })
  }

  await insertNotifications(notifs)
  revalidatePath('/requests')
  revalidatePath('/dashboard')
}
