import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { TnCodeSearchRpcRow } from '@/types/tn-code'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  if (!q) {
    return NextResponse.json({ results: [] as TnCodeSearchRpcRow[] })
  }

  const limitParam = url.searchParams.get('limit')
  const rawLimit = limitParam != null ? Number.parseInt(limitParam, 10) : NaN
  const resultLimit = Number.isFinite(rawLimit)
    ? Math.min(100, Math.max(1, rawLimit))
    : 50

  const { data, error } = await supabase.rpc('tn_code_search_sections', {
    search_query: q,
    result_limit: resultLimit,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ results: (data ?? []) as TnCodeSearchRpcRow[] })
}
