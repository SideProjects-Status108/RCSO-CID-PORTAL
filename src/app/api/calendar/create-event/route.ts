import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Placeholder for Google Calendar event creation (Prompt 4).
 * Returns a synthetic ID so deficiency workflow can persist audit rows.
 * Replace with real Calendar API when tokens + event insert are wired.
 */
type PostBody = {
  title?: string
  start?: string
  end?: string
  attendees?: string[]
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const eventId = `stub-${crypto.randomUUID()}`
  return NextResponse.json({
    eventId,
    message: 'Calendar integration not configured; stub event id returned.',
    received: {
      title: body.title,
      start: body.start ?? null,
      end: body.end ?? null,
      attendees: body.attendees ?? [],
    },
  })
}
