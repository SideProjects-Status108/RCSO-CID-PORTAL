import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { encryptToken } from '@/lib/gcal/crypto'
import { exchangeCodeForTokens, getOAuth2Client } from '@/lib/gcal'

export async function GET(request: Request) {
  const reqUrl = new URL(request.url)
  const code = reqUrl.searchParams.get('code')
  const state = reqUrl.searchParams.get('state')
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? reqUrl.origin

  const cookieStore = await cookies()
  const expected = cookieStore.get('gcal_oauth_state')?.value
  cookieStore.delete('gcal_oauth_state')

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL('/settings?gcal=error', site))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', site))
  }

  const tokens = await exchangeCodeForTokens(code)
  if (
    !tokens ||
    !tokens.access_token ||
    !tokens.refresh_token ||
    !tokens.expiry_date
  ) {
    return NextResponse.redirect(new URL('/settings?gcal=error', site))
  }

  const client = getOAuth2Client()
  if (!client) {
    return NextResponse.redirect(new URL('/settings?gcal=error', site))
  }
  client.setCredentials(tokens)
  const oauth2 = await import('googleapis').then((m) => m.google.oauth2({ version: 'v2', auth: client }))
  let email: string | null = null
  try {
    const ui = await oauth2.userinfo.get()
    email = ui.data.email ?? null
  } catch {
    /* optional */
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.redirect(new URL('/settings?gcal=error', site))
  }

  const encAccess = encryptToken(tokens.access_token)
  const encRefresh = encryptToken(tokens.refresh_token)

  const { error } = await admin.from('user_gcal_tokens').upsert(
    {
      user_id: user.id,
      access_token_encrypted: encAccess,
      refresh_token_encrypted: encRefresh,
      token_expiry: new Date(tokens.expiry_date).toISOString(),
      gcal_email: email,
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    console.error('[gcal] token store failed', error.message)
    return NextResponse.redirect(new URL('/settings?gcal=error', site))
  }

  return NextResponse.redirect(new URL('/settings?gcal=connected', site))
}
