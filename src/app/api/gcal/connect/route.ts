import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { buildGoogleCalendarAuthUrl } from '@/lib/gcal'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const state = crypto.randomUUID()
  const url = buildGoogleCalendarAuthUrl({ state })
  if (!url) {
    return NextResponse.json({ error: 'Google Calendar is not configured' }, { status: 503 })
  }

  const cookieStore = await cookies()
  cookieStore.set('gcal_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
    secure: process.env.NODE_ENV === 'production',
  })

  return NextResponse.redirect(url)
}
