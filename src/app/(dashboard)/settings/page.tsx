import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { SettingsClient } from '@/components/settings/settings-client'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import { fetchTnIngestionStatus } from '@/lib/tn-code/queries'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const { data: gcalRow } = await supabase
    .from('user_gcal_tokens')
    .select('gcal_email, connected_at, updated_at')
    .eq('user_id', session.user.id)
    .maybeSingle()

  const gcal =
    gcalRow && typeof gcalRow.connected_at === 'string'
      ? {
          gcal_email: gcalRow.gcal_email as string | null,
          connected_at: gcalRow.connected_at,
          updated_at: typeof gcalRow.updated_at === 'string' ? gcalRow.updated_at : null,
        }
      : null

  const isAdmin = hasRole(session.profile.role, [UserRole.admin])
  const tnRows = isAdmin ? await fetchTnIngestionStatus() : []

  return (
    <div className="space-y-2">
      <div className="border-b border-border-subtle px-4 pb-4 pt-4 md:px-6">
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Profile, calendar sync, security, and {isAdmin ? 'administration tools.' : 'account preferences.'}
        </p>
      </div>
      <Suspense
        fallback={<p className="p-6 text-sm text-text-secondary">Loading settings…</p>}
      >
        <SettingsClient
          profile={session.profile}
          email={session.user.email}
          gcal={gcal}
          isAdmin={isAdmin}
          tnRows={tnRows}
        />
      </Suspense>
    </div>
  )
}
