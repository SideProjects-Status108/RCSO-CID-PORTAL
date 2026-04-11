import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/profile'
import { isUserRole } from '@/lib/auth/roles'

export type SessionUser = {
  id: string
  email: string | undefined
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { id: user.id, email: user.email }
}

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) return null
  if (!isUserRole(data.role)) return null

  return data as Profile
}

export async function getSessionUserWithProfile(): Promise<{
  user: SessionUser
  profile: Profile
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !profile || !isUserRole(profile.role)) return null

  return {
    user: { id: user.id, email: user.email },
    profile: profile as Profile,
  }
}
