import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { hasRole, UserRole } from '@/lib/auth/roles'

const OPENAI_URL = 'https://api.openai.com/v1/embeddings'
const MODEL = 'text-embedding-3-small'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = profile?.role as string | undefined
  if (!hasRole(role, [UserRole.admin])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { titleNumber?: number }
  try {
    body = (await request.json()) as { titleNumber?: number }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const titleNumber = body.titleNumber
  if (titleNumber == null || !Number.isFinite(titleNumber)) {
    return NextResponse.json({ error: 'titleNumber required' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
  }

  const { data: titleRow, error: te } = await admin
    .from('tn_titles')
    .select('id')
    .eq('title_number', titleNumber)
    .maybeSingle()
  if (te || !titleRow?.id) {
    return NextResponse.json({ error: 'Title not found' }, { status: 404 })
  }

  const { data: sections, error: se } = await admin
    .from('tn_sections')
    .select('id, section_text')
    .eq('title_id', titleRow.id)

  if (se) {
    return NextResponse.json({ error: se.message }, { status: 500 })
  }

  const rows = sections ?? []
  if (rows.length === 0) {
    return NextResponse.json({ updated: 0, message: 'No sections for title' })
  }

  const BATCH = 64
  let updated = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const inputs = chunk.map((r) =>
      String(r.section_text ?? '').slice(0, 8000)
    )
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, input: inputs }),
    })
    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ error: t }, { status: 502 })
    }
    const json = (await res.json()) as {
      data?: { embedding: number[]; index: number }[]
    }
    const emb = json.data ?? []
    emb.sort((a, b) => a.index - b.index)
    for (let j = 0; j < emb.length; j++) {
      const row = chunk[j]!
      const vec = emb[j]?.embedding
      if (!vec) continue
      const { error: up } = await admin
        .from('tn_sections')
        .update({ embedding: vec as unknown as string })
        .eq('id', row.id as string)
      if (!up) updated += 1
    }
  }

  return NextResponse.json({ updated, total: rows.length })
}
