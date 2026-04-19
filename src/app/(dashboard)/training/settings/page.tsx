import { redirect } from 'next/navigation'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { UserRole, hasRole } from '@/lib/auth/roles'
import { SignatureQueue } from '@/components/training/signatures/signature-queue'
import { isTrainingWriter } from '@/lib/training/access'
import { fetchProgramConfig } from '@/lib/training/program-config'
import { createClient } from '@/lib/supabase/server'
import { TrainingSupervisorWidget } from '@/components/training/files/training-supervisor-widget'
import { ProgramConfigForm } from '@/components/training/settings/program-config-form'
import { FtoRosterTable } from '@/components/training/settings/fto-roster-table'

export const dynamic = 'force-dynamic'

export default async function TrainingSettingsPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const canEdit = isTrainingWriter(session.profile)
  const config = await fetchProgramConfig()

  const supabase = await createClient()
  const { data: ftoData } = await supabase
    .from('profiles')
    .select('id, full_name, badge_number, role, is_active, fto_color')
    .in('role', [UserRole.fto, UserRole.fto_coordinator])
    .order('full_name', { ascending: true })
  const ftos = (ftoData ?? []) as Array<{
    id: string
    full_name: string
    badge_number: string | null
    role: string
    is_active: boolean
    fto_color: string | null
  }>

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
          Training Settings
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
          Signature inbox, program configuration, Training Supervisor assignment, and FTO roster.
        </p>
      </header>

      <SignatureQueue
        currentUserName={session.profile.full_name}
        currentUserBadge={session.profile.badge_number}
        canOverrideDeficiency={
          session.profile.is_training_supervisor === true ||
          hasRole(session.profile.role, [UserRole.admin, UserRole.supervision_admin])
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Supervisor seat
        </h2>
        <TrainingSupervisorWidget />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Program configuration
        </h2>
        <ProgramConfigForm initial={config} canEdit={canEdit} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          FTO roster
        </h2>
        <FtoRosterTable ftos={ftos} canEdit={canEdit} />
      </section>
    </div>
  )
}
