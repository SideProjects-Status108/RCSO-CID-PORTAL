import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { RequestRow } from '@/types/requests'
import { mapRequest } from '@/lib/requests/queries'

export async function fetchActiveCallOuts(userId: string): Promise<RequestRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('request_type', 'call_out')
    .eq('urgency', 'urgent')
    .in('status', ['open', 'in_progress', 'acknowledged'])
    .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data.map((r) => mapRequest(r as Record<string, unknown>))
}

export async function fetchActiveCallOutCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('request_type', 'call_out')
    .eq('urgency', 'urgent')
    .in('status', ['open', 'in_progress', 'acknowledged'])
    .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)

  if (error) return 0
  return count ?? 0
}

export async function fetchRecentCallOuts(userId: string, limit = 5): Promise<RequestRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('request_type', 'call_out')
    .eq('created_by', userId)
    .in('status', ['complete', 'closed'])
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map((r) => mapRequest(r as Record<string, unknown>))
}
