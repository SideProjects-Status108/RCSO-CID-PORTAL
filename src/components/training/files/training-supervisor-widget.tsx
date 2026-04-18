import { ShieldCheck } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { UserRole } from '@/lib/auth/roles'

import { TrainingSupervisorReassignButton } from './training-supervisor-reassign'

export type EligibleSupervisor = {
  id: string
  full_name: string
  role: string
  badge_number: string | null
}

/**
 * Header widget shown on /training/dit-files. Displays the current Training
 * Supervisor (or "Vacant") and exposes a reassign affordance to callers with
 * sufficient authority.
 */
export async function TrainingSupervisorWidget() {
  const session = await getSessionUserWithProfile()
  if (!session) return null

  const supabase = await createClient()

  const { data: currentRow } = await supabase
    .from('profiles')
    .select('id, full_name, role, badge_number')
    .eq('is_training_supervisor', true)
    .maybeSingle()

  const current = currentRow
    ? (currentRow as {
        id: string
        full_name: string
        role: string
        badge_number: string | null
      })
    : null

  const actor = session.profile
  const mayReassign =
    actor.role === UserRole.admin ||
    actor.role === UserRole.supervision_admin ||
    actor.role === UserRole.fto_coordinator ||
    actor.is_training_supervisor === true

  // Eligible pool: any active supervision / supervision_admin / fto_coordinator.
  let eligible: EligibleSupervisor[] = []
  if (mayReassign) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, badge_number')
      .in('role', [UserRole.supervision, UserRole.supervision_admin, UserRole.fto_coordinator])
      .eq('is_active', true)
      .order('full_name', { ascending: true })
    eligible = (data ?? []) as EligibleSupervisor[]
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-subtle text-text-secondary"
          aria-hidden
        >
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Training Supervisor
          </div>
          <div className="truncate text-sm font-medium text-text-primary">
            {current ? (
              <>
                {current.full_name}
                {current.badge_number ? (
                  <span className="ml-2 text-text-tertiary">#{current.badge_number}</span>
                ) : null}
              </>
            ) : (
              <span className="italic text-text-tertiary">Vacant — Supervision Admin signs in the interim</span>
            )}
          </div>
        </div>
      </div>
      {mayReassign ? (
        <TrainingSupervisorReassignButton
          currentId={current?.id ?? null}
          eligible={eligible}
        />
      ) : null}
    </div>
  )
}
