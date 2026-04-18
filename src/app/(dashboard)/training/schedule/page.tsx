import { redirect } from 'next/navigation'

import { PlaceholderSection } from '@/components/ui/placeholder-section'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'

export const dynamic = 'force-dynamic'

export default async function TrainingSchedulePage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  return (
    <PlaceholderSection
      title="Training Schedule"
      description="10-week FTO rotation grid. Built in Segment D (Prompt 8)."
    />
  )
}
