import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, type UserRoleValue } from '@/lib/auth/roles'

type RoleGuardProps = {
  allow: UserRoleValue[]
  children: ReactNode
}

/** Server Component: redirects to /login or /unauthorized when access is denied. */
export async function RoleGuard({ allow, children }: RoleGuardProps) {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')
  if (!hasRole(session.profile.role, allow)) redirect('/unauthorized')
  return <>{children}</>
}

type PageProps = Record<string, unknown>

/**
 * App Router helper: returns an async page component wrapped with {@link RoleGuard}.
 */
export function withRoleGuard<P extends PageProps>(
  Page: (props: P) => Promise<ReactNode> | ReactNode,
  allow: UserRoleValue[]
) {
  return async function GuardedPage(props: P) {
    return (
      <RoleGuard allow={allow}>
        <Page {...props} />
      </RoleGuard>
    )
  }
}
