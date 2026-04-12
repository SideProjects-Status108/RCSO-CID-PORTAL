import { createHash } from 'node:crypto'

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

const MODEL = 'claude-haiku-4-5-20251001'

function hashText(s: string) {
  return createHash('sha256').update(s).digest('hex')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { sectionId?: string; regenerate?: boolean }
  try {
    body = (await request.json()) as { sectionId?: string; regenerate?: boolean }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sectionId = body.sectionId?.trim()
  if (!sectionId) {
    return NextResponse.json({ error: 'sectionId required' }, { status: 400 })
  }

  const { data: section, error: se } = await supabase
    .from('tn_sections')
    .select('id, section_number, section_title, section_text')
    .eq('id', sectionId)
    .maybeSingle()

  if (se || !section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  }

  const text = String(section.section_text ?? '')
  const promptHash = hashText(text)

  if (!body.regenerate) {
    const { data: cached } = await supabase
      .from('tn_ai_cache')
      .select('ai_response, model_used, prompt_hash')
      .eq('section_id', sectionId)
      .eq('cache_type', 'summary')
      .maybeSingle()

    if (cached && cached.prompt_hash === promptHash) {
      return NextResponse.json({
        summary: cached.ai_response,
        cached: true,
        model: cached.model_used,
      })
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI is not configured' }, { status: 503 })
  }

  const client = new Anthropic({ apiKey })
  const sys =
    'You are a legal reference assistant for law enforcement. Summarize the following Tennessee statute section in plain, clear language that a law enforcement officer would understand. Focus on what the law says, what it means practically, and any key elements or definitions. Be concise (3-5 paragraphs maximum). Do not provide legal advice or legal opinions.'

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: sys,
    messages: [
      {
        role: 'user',
        content: `Statute ${section.section_number} — ${section.section_title}\n\n${text}`,
      },
    ],
  })

  const block = msg.content.find((b) => b.type === 'text')
  const answer = block && block.type === 'text' ? block.text : ''

  const admin = createServiceRoleClient()
  if (admin) {
    const { error: ce } = await admin.from('tn_ai_cache').upsert(
      {
        section_id: sectionId,
        cache_type: 'summary',
        prompt_hash: promptHash,
        ai_response: answer,
        model_used: MODEL,
      },
      { onConflict: 'section_id,cache_type' }
    )
    if (ce) console.error('[tn-code summary] cache upsert', ce.message)
  }

  return NextResponse.json({ summary: answer, cached: false, model: MODEL })
}
