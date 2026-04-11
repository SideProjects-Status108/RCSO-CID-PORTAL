import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { RequestUpdateRow } from '@/types/requests'

export async function fetchRequestUpdates(requestId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('request_updates')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data.map(
    (r) =>
      ({
        id: String(r.id),
        request_id: String(r.request_id),
        updated_by: String(r.updated_by),
        previous_status: r.previous_status != null ? String(r.previous_status) : null,
        new_status: r.new_status != null ? String(r.new_status) : null,
        note: r.note != null ? String(r.note) : null,
        created_at: String(r.created_at ?? ''),
      }) satisfies RequestUpdateRow
  )
}
