'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchSupervisionPlusUserIds, insertNotifications } from '@/lib/notifications/insert-notifications'
import type { RequestUrgency } from '@/types/requests'

const generalSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(4000),
  urgency: z.enum(['routine', 'urgent', 'emergency']),
})

function uniqueIds(ids: (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((x): x is string => Boolean(x)))]
}

/** Companion “general request” — stored as an `information` request. */
export async function createGeneralCompanionRequestAction(input: unknown) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const parsed = generalSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
    throw new Error(Object.values(msg).flat().join('; ') || 'Invalid input')
  }

  const { subject, description, urgency } = parsed.data
  const urgencyDb: RequestUrgency =
    urgency === 'routine' ? 'routine' : urgency === 'urgent' ? 'priority' : 'urgent'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('requests')
    .insert({
      title: subject,
      request_type: 'information',
      urgency: urgencyDb,
      description,
      address: null,
      status: 'open',
      created_by: session.user.id,
      assigned_to: null,
      metadata: {},
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

  const notifs: Parameters<typeof insertNotifications>[0] = []
  if (urgencyDb === 'urgent') {
    const supIds = await fetchSupervisionPlusUserIds()
    for (const uid of uniqueIds([...supIds])) {
      notifs.push({
        user_id: uid,
        type: 'request_urgent',
        reference_id: requestId,
        reference_type: 'request',
        message: `URGENT: ${subject.slice(0, 120)}`,
      })
    }
  }
  await insertNotifications(notifs)

  revalidatePath('/app/forms')
  revalidatePath('/operations/requests')
  revalidatePath('/requests')
  revalidatePath('/dashboard')
  return { id: requestId }
}
