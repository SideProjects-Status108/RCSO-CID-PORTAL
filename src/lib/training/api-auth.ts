import 'server-only'

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole, type UserRoleValue } from '@/lib/auth/roles'

export function isTrainingStaff(role: UserRoleValue) {
  return hasRole(role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
    UserRole.fto_coordinator,
  ])
}

export async function assertFtoOwnsPairing(userId: string, pairingId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('fto_pairings')
    .select('id')
    .eq('id', pairingId)
    .eq('fto_id', userId)
    .maybeSingle()
  return Boolean(data)
}

export async function assertUserOnPairing(userId: string, pairingId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('fto_pairings')
    .select('id')
    .eq('id', pairingId)
    .or(`fto_id.eq.${userId},dit_id.eq.${userId}`)
    .maybeSingle()
  return Boolean(data)
}

export async function requireTrainingSessionEditor(
  userId: string,
  role: UserRoleValue,
  pairingId: string
): Promise<boolean> {
  if (isTrainingStaff(role)) return true
  return assertFtoOwnsPairing(userId, pairingId)
}

export async function requireCoordinator(role: UserRoleValue): Promise<boolean> {
  return hasRole(role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
    UserRole.fto_coordinator,
  ])
}

export type SessionWithProfile = NonNullable<Awaited<ReturnType<typeof getSessionUserWithProfile>>>

export async function requireJsonSession(): Promise<
  { ok: true; session: SessionWithProfile } | { ok: false; response: NextResponse }
> {
  const session = await getSessionUserWithProfile()
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { ok: true, session }
}
