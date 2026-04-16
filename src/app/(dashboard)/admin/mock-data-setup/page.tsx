import { redirect } from 'next/navigation'

import { MockDataSetupClient } from '@/app/(dashboard)/admin/mock-data-setup/mock-data-setup-client'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { UserRole } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

export default async function MockDataSetupPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login?next=/admin/mock-data-setup')
  if (session.profile.role !== UserRole.admin) {
    redirect('/unauthorized')
  }

  return (
    <div className="p-6">
      <MockDataSetupClient />
    </div>
  )
}
