import { NextResponse } from 'next/server'

import { submitPublicSurvey } from '@/lib/training/vark'

export const dynamic = 'force-dynamic'

type Body = {
  answers?: Record<string, string>
  narrative?: string | null
}

/**
 * POST /api/survey/[token]
 *
 * Public submission endpoint for the VARK pre-start survey. Token validates
 * the submission; all writes go through the service-role helper.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.answers || typeof body.answers !== 'object') {
    return NextResponse.json({ error: 'answers object required' }, { status: 400 })
  }
  for (const [qid, oid] of Object.entries(body.answers)) {
    if (typeof qid !== 'string' || typeof oid !== 'string') {
      return NextResponse.json(
        { error: 'answers must be a map of question_id -> option_id' },
        { status: 400 }
      )
    }
  }

  const result = await submitPublicSurvey({
    token,
    answers: body.answers,
    narrative: body.narrative ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
  }
  return NextResponse.json({
    ok: true,
    scores: result.scores,
    dominant: result.dominant,
  })
}
