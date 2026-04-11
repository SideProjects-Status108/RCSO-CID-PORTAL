'use client'

import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'
import { isUserRole, type UserRoleValue } from '@/lib/auth/roles'
import type { Profile } from '@/types/profile'

export type CurrentUserState = {
  user: User | null
  profile: Profile | null
  role: UserRoleValue | null
  loading: boolean
  refresh: () => Promise<void>
}

export function useCurrentUser(): CurrentUserState {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser()
    setUser(nextUser)
    if (!nextUser) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', nextUser.id)
      .maybeSingle()
    if (data && isUserRole(data.role)) {
      setProfile(data as Profile)
    } else {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      await refresh()
      setLoading(false)
    })()
  }, [refresh])

  const role = profile?.role && isUserRole(profile.role) ? profile.role : null

  return {
    user,
    profile,
    role,
    loading,
    refresh,
  }
}
