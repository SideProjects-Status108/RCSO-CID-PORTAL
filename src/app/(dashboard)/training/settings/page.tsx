import { redirect } from 'next/navigation'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { SignatureQueue } from '@/components/training/signatures/signature-queue'

export const dynamic = 'force-dynamic'

export default async function TrainingSettingsPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
          Training Settings
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
          Your signature inbox, notification preferences, and program configuration. More settings
          land in Segment E.
        </p>
      </header>

      <SignatureQueue />
    </div>
  )
}
