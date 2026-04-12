import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { RequestRow, RequestStatus, RequestType, RequestUrgency } from '@/types/requests'

export function mapRequest(r: Record<string, unknown>): RequestRow {
  const metaRaw = r.metadata
  let metadata: Record<string, unknown> | null = null
  if (metaRaw != null && typeof metaRaw === 'object' && !Array.isArray(metaRaw)) {
    metadata = metaRaw as Record<string, unknown>
  }
  return {
    id: String(r.id),
    request_type: r.request_type as RequestRow['request_type'],
    title: String(r.title ?? ''),
    description: r.description != null ? String(r.description) : null,
    urgency: r.urgency as RequestUrgency,
    status: r.status as RequestRow['status'],
    created_by: String(r.created_by),
    assigned_to: r.assigned_to != null ? String(r.assigned_to) : null,
    address: r.address != null ? String(r.address) : null,
    latitude: r.latitude != null ? String(r.latitude) : null,
    longitude: r.longitude != null ? String(r.longitude) : null,
    metadata,
    created_at: String(r.created_at ?? ''),
    acknowledged_at: r.acknowledged_at != null ? String(r.acknowledged_at) : null,
    completed_at: r.completed_at != null ? String(r.completed_at) : null,
    updated_at: String(r.updated_at ?? ''),
  }
}

export async function fetchRequestById(id: string): Promise<RequestRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('requests').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return mapRequest(data as Record<string, unknown>)
}

export type RequestListFilters = {
  scope: 'assigned' | 'created' | 'all_open'
  urgency?: RequestUrgency | 'all'
  request_type?: RequestType | 'all'
  status?: RequestStatus | 'all'
  assigned_to?: string | 'all'
}

export async function fetchRequestsList(
  userId: string,
  filters: RequestListFilters
): Promise<RequestRow[]> {
  const supabase = await createClient()
  let q = supabase.from('requests').select('*').order('created_at', { ascending: false })

  if (filters.scope === 'assigned') {
    q = q.eq('assigned_to', userId).neq('status', 'closed')
  } else if (filters.scope === 'created') {
    q = q.eq('created_by', userId)
  } else {
    q = q.neq('status', 'closed')
  }

  if (filters.urgency && filters.urgency !== 'all') {
    q = q.eq('urgency', filters.urgency)
  }
  if (filters.request_type && filters.request_type !== 'all') {
    q = q.eq('request_type', filters.request_type)
  }
  if (filters.status && filters.status !== 'all') {
    q = q.eq('status', filters.status)
  }
  if (filters.assigned_to && filters.assigned_to !== 'all') {
    q = q.eq('assigned_to', filters.assigned_to)
  }

  const { data, error } = await q
  if (error || !data) return []
  return data.map((r) => mapRequest(r as Record<string, unknown>))
}

/** Assigned inbox: non-closed requests in an active workflow status. */
export async function countMyAssignedOpenRequests(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .in('status', ['open', 'acknowledged', 'in_progress'])
  if (error) return 0
  return count ?? 0
}
