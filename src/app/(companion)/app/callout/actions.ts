'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { fetchSupervisionPlusUserIds, insertNotifications } from '@/lib/notifications/insert-notifications'

const callOutSchema = z.object({
  address: z.string().trim().min(3, 'Address is required').max(500),
  caseNumber: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
})

function uniqueIds(ids: (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((x): x is string => Boolean(x)))]
}

export async function createCallOutAction(input: unknown) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const parsed = callOutSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
    throw new Error(Object.values(msg).flat().join('; ') || 'Invalid input')
  }

  const { address, caseNumber, notes } = parsed.data
  const title = caseNumber ? `Call-out · ${caseNumber}` : 'Call-out'
  const metadata = {
    address,
    case_number: caseNumber?.trim() ? caseNumber.trim() : null,
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('requests')
    .insert({
      title,
      request_type: 'call_out',
      urgency: 'urgent',
      description: notes?.trim() ? notes.trim() : null,
      address: address.trim(),
      status: 'open',
      created_by: session.user.id,
      assigned_to: null,
      metadata,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create call-out')

  const requestId = data.id as string

  await supabase.from('request_updates').insert({
    request_id: requestId,
    updated_by: session.user.id,
    previous_status: null,
    new_status: 'open',
    note: 'Call-out created',
  })

  const titleShort = title.slice(0, 120)
  const notifs: Parameters<typeof insertNotifications>[0] = []
  const supIds = await fetchSupervisionPlusUserIds()
  const urgentTargets = uniqueIds([...supIds])
  for (const uid of urgentTargets) {
    notifs.push({
      user_id: uid,
      type: 'request_urgent',
      reference_id: requestId,
      reference_type: 'request',
      message: `URGENT call-out: ${titleShort}`,
    })
  }
  await insertNotifications(notifs)

  revalidatePath('/app/callout')
  revalidatePath('/operations/requests')
  revalidatePath('/requests')
  revalidatePath('/dashboard')
  return { id: requestId }
}
