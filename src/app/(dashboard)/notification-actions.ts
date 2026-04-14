'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'

const notificationIdSchema = z.string().uuid()

export async function markNotificationReadAction(id: string) {
  const session = await getSessionUserWithProfile()
  if (!session) return
  const parsed = notificationIdSchema.safeParse(id)
  if (!parsed.success) return
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', parsed.data)
    .eq('user_id', session.user.id)
  revalidatePath('/dashboard')
  revalidatePath('/app/notifications')
}

export async function markAllNotificationsReadAction() {
  const session = await getSessionUserWithProfile()
  if (!session) return
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)
  revalidatePath('/dashboard')
  revalidatePath('/app/notifications')
}

export async function fetchNotificationsPanelDataAction() {
  const session = await getSessionUserWithProfile()
  if (!session) return { notifications: [], unreadCount: 0 }
  const supabase = await createClient()
  const [listRes, countRes] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false),
  ])

  const notifications =
    listRes.data?.map((r) => ({
      id: String(r.id),
      user_id: String(r.user_id),
      type: String(r.type) as import('@/types/notifications').AppNotificationType,
      reference_id: String(r.reference_id),
      reference_type: String(r.reference_type) as import('@/types/notifications').NotificationRow['reference_type'],
      message: String(r.message ?? ''),
      is_read: Boolean(r.is_read),
      created_at: String(r.created_at ?? ''),
    })) ?? []

  return { notifications, unreadCount: countRes.count ?? 0 }
}
