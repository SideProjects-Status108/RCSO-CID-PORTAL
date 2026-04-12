import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { TnCodeSearchRpcRow } from '@/types/tn-code'

const LOOKUP_MODEL = 'claude-sonnet-4-6'

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

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { question?: string }
  try {
    body = (await request.json()) as { question?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const question = body.question?.trim()
  if (!question) {
    return NextResponse.json({ error: 'question required' }, { status: 400 })
  }

  const { data: rows, error } = await supabase.rpc('tn_code_search_sections', {
    search_query: question,
    result_limit: 8,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const hits = (rows ?? []) as TnCodeSearchRpcRow[]
  const context = hits
    .map(
      (r) =>
        `## ${r.section_number} — ${r.section_title}\n${(r.section_text ?? '').slice(0, 600)}`
    )
    .join('\n\n')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI is not configured' }, { status: 503 })
  }

  const client = new Anthropic({ apiKey })
  const sys =
    'You are a legal reference assistant for Tennessee law enforcement. You have been given a question and relevant Tennessee statute sections. Identify which sections are most relevant to the question and explain what they say in plain language suitable for a law enforcement officer. Always cite the specific section numbers. Do not provide legal advice. Note that the user should verify current statute text.'

  const msg = await client.messages.create({
    model: LOOKUP_MODEL,
    max_tokens: 2000,
    system: sys,
    messages: [
      {
        role: 'user',
        content: `Question: ${question}\n\nRelevant statute sections:\n${context}`,
      },
    ],
  })

  const block = msg.content.find((b) => b.type === 'text')
  const answer = block && block.type === 'text' ? block.text : ''

  const cited = hits.map((r) => r.section_number)

  return NextResponse.json({ answer, cited_sections: cited })
}
