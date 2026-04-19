import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { computeActivityProgress } from '@/lib/training/activity-progress'
import { isTrainingWriter } from '@/lib/training/access'
import {
  fetchActivityExposuresForDit,
  fetchActivityTemplates,
  fetchDitRecordById,
} from '@/lib/training/queries'
import { UserRole, hasRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'

import { ActivityClient } from './activity-client'

/**
 * Server tab for Prompt 6 (Activity). Pulls the DIT's current phase +
 * the template universe + all exposures, computes the phase-scoped
 * progress summary, and hands it to the client. Role-gating for
 * "Log exposure" is decided here and passed as a boolean so the client
 * doesn't need to know the role model.
 *
 * Allowed-to-log set:
 *   - training writers (fto_coordinator + supervision+)
 *   - an FTO who is currently paired active with this DIT
 */
export async function ActivityTab({ ditRecordId }: { ditRecordId: string }) {
  const session = await getSessionUserWithProfile()
  if (!session) return null

  const [record, templates, exposures] = await Promise.all([
    fetchDitRecordById(ditRecordId),
    fetchActivityTemplates(),
    fetchActivityExposuresForDit(ditRecordId),
  ])
  if (!record) return null

  const summary = computeActivityProgress({
    phase: record.current_phase,
    templates,
    exposures,
  })

  let canLog = isTrainingWriter(session.profile)
  if (!canLog && hasRole(session.profile.role, [UserRole.fto])) {
    const supabase = await createClient()
    const { data: pairing } = await supabase
      .from('fto_pairings')
      .select('id')
      .eq('dit_id', record.user_id)
      .eq('fto_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle()
    canLog = Boolean(pairing)
  }

  return (
    <ActivityClient
      ditRecordId={ditRecordId}
      phase={record.current_phase}
      summary={summary}
      canLog={canLog}
      currentUserId={session.user.id}
    />
  )
}
