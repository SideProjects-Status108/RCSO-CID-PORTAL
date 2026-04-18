import { redirect } from 'next/navigation'

import { PlaceholderSection } from '@/components/ui/placeholder-section'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'

export const dynamic = 'force-dynamic'

export default async function TrainingResourcesPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  return (
    <PlaceholderSection
      title="Training Resources"
      description="Required reading, reference materials, forms, and external agency links. Built in Segment D (Prompt 9)."
    />
  )
}
