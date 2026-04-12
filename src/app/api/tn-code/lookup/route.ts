import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

import { createServiceRoleClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { TnCodeSearchRpcRow } from '@/types/tn-code'

const LOOKUP_MODEL = 'claude-sonnet-4-6'
const CACHE_MS = 7 * 24 * 60 * 60 * 1000

function normalizeCode(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, '')
  if (/^\d{1,2}-\d{1,4}-\d{1,4}$/.test(t)) return t
  return null
}

function ndjsonLine(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(obj)}\n`)
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
  const cited = hits.map((r) => r.section_number)

  const context = hits
    .map(
      (r) =>
        `## ${r.section_number} — ${r.section_title}\n${(r.section_text ?? '').slice(0, 600)}`
    )
    .join('\n\n')

  const admin = createServiceRoleClient()
  const now = Date.now()

  if (admin) {
    const { data: cached } = await admin
      .from('tn_ai_lookup_cache')
      .select('answer, cited_sections, updated_at')
      .eq('query_text', question)
      .maybeSingle()

    if (cached?.answer) {
      const ts = new Date(cached.updated_at as string).getTime()
      if (now - ts < CACHE_MS) {
        const cachedCited = Array.isArray(cached.cited_sections)
          ? (cached.cited_sections as string[])
          : cited
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                ndjsonLine({ type: 'meta', cited_sections: cachedCited })
              )
              controller.enqueue(ndjsonLine({ type: 'token', text: cached.answer }))
              controller.enqueue(ndjsonLine({ type: 'end', cached: true }))
              controller.close()
            },
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/x-ndjson; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          }
        )
      }
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI is not configured' }, { status: 503 })
  }

  const client = new Anthropic({ apiKey })
  const sys =
    'You are a legal reference assistant for Tennessee law enforcement. You have been given a question and relevant Tennessee statute sections. Identify which sections are most relevant to the question and explain what they say in plain language suitable for a law enforcement officer. Always cite the specific section numbers. Do not provide legal advice. Note that the user should verify current statute text.'

  const stream = new ReadableStream({
    async start(controller) {
      let full = ''
      try {
        controller.enqueue(ndjsonLine({ type: 'meta', cited_sections: cited }))

        const ms = client.messages.stream({
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

        ms.on('text', (delta) => {
          full += delta
          controller.enqueue(ndjsonLine({ type: 'token', text: delta }))
        })

        await ms.finalText()

        controller.enqueue(ndjsonLine({ type: 'end', cached: false }))

        if (admin && full.trim()) {
          const { error: upErr } = await admin.from('tn_ai_lookup_cache').upsert(
            {
              query_text: question,
              answer: full,
              cited_sections: cited,
              model_used: LOOKUP_MODEL,
            },
            { onConflict: 'query_text' }
          )
          if (upErr) console.error('[tn-code lookup] cache upsert', upErr.message)
        }
      } catch (e) {
        controller.enqueue(
          ndjsonLine({
            type: 'error',
            message: e instanceof Error ? e.message : 'Stream failed',
          })
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
