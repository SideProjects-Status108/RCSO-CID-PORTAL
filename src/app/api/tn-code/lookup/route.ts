import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

function normalizeCode(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, '')
  if (/^\d{1,2}-\d{1,4}-\d{1,4}$/.test(t)) return t
  return null
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const raw = url.searchParams.get('code') ?? ''
  const code = normalizeCode(raw)
  if (!code) {
    return NextResponse.json({ section: null })
  }

  const { data, error } = await supabase
    .from('tn_sections')
    .select('id')
    .eq('section_number', code)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ section: data })
}
