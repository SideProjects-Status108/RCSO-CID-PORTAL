import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { UserRole, hasRole } from '@/lib/auth/roles'
import { isTrainingWriter } from '@/lib/training/access'
import { listCallOuts, listCases } from '@/lib/training/case-queries'
import { fetchDitRecordById } from '@/lib/training/queries'
import { createClient } from '@/lib/supabase/server'

import { CasesClient } from './cases-client'

/**
 * Server tab for Prompt 7 (Cases & Call-Outs). Visibility is enforced
 * by RLS; canWrite is computed here so the client doesn't need the role
 * model.
 *
 * Writers (training writers + any currently-paired active FTO) can add
 * cases + call-outs; only training writers can close cases from the
 * detail row action (matches the common coordinator workflow).
 */
export async function CasesTab({ ditRecordId }: { ditRecordId: string }) {
  const session = await getSessionUserWithProfile()
  if (!session) return null

  const [record, cases, callOuts] = await Promise.all([
    fetchDitRecordById(ditRecordId),
    listCases(ditRecordId),
    listCallOuts(ditRecordId),
  ])
  if (!record) return null

  const writer = isTrainingWriter(session.profile)
  let canWrite = writer
  if (!canWrite && hasRole(session.profile.role, [UserRole.fto])) {
    const supabase = await createClient()
    const { data: pairing } = await supabase
      .from('fto_pairings')
      .select('id')
      .eq('dit_id', record.user_id)
      .eq('fto_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle()
    canWrite = Boolean(pairing)
  }

  return (
    <CasesClient
      ditRecordId={ditRecordId}
      cases={cases}
      callOuts={callOuts}
      canWrite={canWrite}
      canCloseCases={writer}
    />
  )
}
