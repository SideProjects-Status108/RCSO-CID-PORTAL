import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { sectionId?: string }
  try {
    body = (await request.json()) as { sectionId?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sectionId = body.sectionId?.trim()
  if (!sectionId) {
    return NextResponse.json({ error: 'sectionId required' }, { status: 400 })
  }

  const { data: sec, error: secErr } = await supabase
    .from('tn_sections')
    .select('id')
    .eq('id', sectionId)
    .maybeSingle()

  if (secErr || !sec) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
  }

  const { error } = await admin.from('tn_recents').insert({
    user_id: user.id,
    section_id: sectionId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
  }

  const { error } = await admin.from('tn_recents').delete().eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
