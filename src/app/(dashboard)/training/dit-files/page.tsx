import { redirect } from 'next/navigation'

import { PlaceholderSection } from '@/components/ui/placeholder-section'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { TrainingSupervisorWidget } from '@/components/training/files/training-supervisor-widget'

export const dynamic = 'force-dynamic'

export default async function TrainingDitFilesPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  return (
    <div className="space-y-4">
      <TrainingSupervisorWidget />

      <PlaceholderSection
        title="DIT Files"
        description="Active DITs, tile grid with status color-coding, and deep links to per-DIT dashboards. Built in Segment B (Prompts 3-4)."
      />
    </div>
  )
}
