import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { NotificationRow } from '@/types/notifications'

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) return 0
  return count ?? 0
}

export async function fetchNotificationsForUser(
  userId: string,
  limit = 30
): Promise<NotificationRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map((r) => ({
    id: String(r.id),
    user_id: String(r.user_id),
    type: r.type as NotificationRow['type'],
    reference_id: String(r.reference_id),
    reference_type: r.reference_type as NotificationRow['reference_type'],
    message: String(r.message ?? ''),
    is_read: Boolean(r.is_read),
    created_at: String(r.created_at ?? ''),
  }))
}
