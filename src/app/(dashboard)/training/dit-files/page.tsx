import { redirect } from 'next/navigation'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { DitGrid } from '@/components/training/files/dit-grid'
import { TrainingSupervisorWidget } from '@/components/training/files/training-supervisor-widget'

export const dynamic = 'force-dynamic'

export default async function TrainingDitFilesPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
          DIT Files
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
          Status-at-a-glance grid of every active Detective in Training. Click a tile to open the
          DIT file.
        </p>
      </header>

      <TrainingSupervisorWidget />

      <DitGrid />
    </div>
  )
}
