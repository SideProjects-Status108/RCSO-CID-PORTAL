import { redirect } from 'next/navigation'

import { PlaceholderSection } from '@/components/ui/placeholder-section'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'

export const dynamic = 'force-dynamic'

export default async function TrainingSettingsPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  return (
    <PlaceholderSection
      title="Training Settings"
      description="Signature inbox, notification preferences, and program configuration. Signature inbox lands in Segment B (Prompt 12 foundation)."
    />
  )
}
