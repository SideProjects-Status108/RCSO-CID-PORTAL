import 'server-only'

import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { UserRole } from '@/lib/auth/roles'

export async function requireStrictAdmin() {
  const session = await getSessionUserWithProfile()
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (session.profile.role !== UserRole.admin) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true as const, session }
}
