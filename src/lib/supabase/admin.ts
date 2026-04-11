import 'server-only'

import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client (bypasses RLS). Use only on the server for controlled
 * side effects such as inserting notifications. Requires SUPABASE_SERVICE_ROLE_KEY.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
