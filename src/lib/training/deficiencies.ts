/**
 * Segment C helpers for the Deficiency form — specifically the tiered
 * extension calculator and the idempotent applier that extends a DIT's
 * expected_graduation_date when the LT signs the route.
 *
 * Business rules (locked by the department):
 *   - Default extension for a DIT's FIRST remedial: 14 days.
 *   - Default extension for the 2nd through Nth remedials: 7 days.
 *   - LT or Capt may override at sign-time within 0..60 inclusive (also
 *     enforced by the deficiency_forms_extension_days_chk CHECK constraint).
 *   - Exactly one extension applies per deficiency form. The applier checks
 *     extension_applied_at IS NULL before mutating so replaying the LT
 *     signature doesn't double-extend the graduation date.
 *
 * This file is pure logic + a thin Supabase write. Authorization for the
 * override (LT or Capt only) is the responsibility of the signature-chain
 * endpoint that invokes it.
 */

import { createClient } from '@/lib/supabase/server'
import type { DeficiencyForm } from '@/types/training'

export const EXTENSION_FIRST_REMEDIAL_DAYS = 14
export const EXTENSION_SUBSEQUENT_DAYS = 7
export const EXTENSION_MAX_DAYS = 60
export const EXTENSION_MIN_DAYS = 0

/**
 * Default tier for this DIT's next remedial based on how many deficiency
 * forms they already have. The applier reads this at draft-create time so
 * the form inherits 14 (first) or 7 (subsequent).
 */
export function defaultExtensionDays(priorRemedialCount: number): number {
  return priorRemedialCount === 0 ? EXTENSION_FIRST_REMEDIAL_DAYS : EXTENSION_SUBSEQUENT_DAYS
}

export function clampOverrideDays(days: number): number {
  if (!Number.isFinite(days)) return EXTENSION_MIN_DAYS
  return Math.max(EXTENSION_MIN_DAYS, Math.min(EXTENSION_MAX_DAYS, Math.trunc(days)))
}

/**
 * Count prior deficiency forms for a DIT, excluding the form currently
 * being drafted (caller may pass its id to exclude). Used to pick the
 * tiered default.
 */
export async function countPriorRemedials(
  ditRecordId: string,
  excludeFormId?: string
): Promise<number> {
  // Two-step resolution: DIT record -> user_id -> all pairings for that
  // user -> count deficiency_forms keyed by pairing_id. PostgREST nested
  // inner-join filters are fiddly across three levels; two simple queries
  // are easier to reason about and cheaper.
  const supabase = await createClient()

  const { data: dit } = await supabase
    .from('dit_records')
    .select('user_id')
    .eq('id', ditRecordId)
    .maybeSingle()
  if (!dit) return 0

  const { data: pairings } = await supabase
    .from('fto_pairings')
    .select('id')
    .eq('dit_id', (dit as { user_id: string }).user_id)

  const pairingIds = (pairings ?? []).map((p) => (p as { id: string }).id)
  if (pairingIds.length === 0) return 0

  let countQuery = supabase
    .from('deficiency_forms')
    .select('id', { count: 'exact', head: true })
    .in('pairing_id', pairingIds)
  if (excludeFormId) countQuery = countQuery.neq('id', excludeFormId)

  const { count } = await countQuery
  return count ?? 0
}

/**
 * Apply a signed deficiency's extension to dit_records.expected_graduation_date.
 * Idempotent — if extension_applied_at is already set, returns the existing
 * form unchanged.
 *
 * Must be called AFTER the LT signature advances the route; the caller is
 * responsible for verifying the route is complete.
 */
export async function applyExtensionToGraduationDate(params: {
  form: Pick<DeficiencyForm, 'id' | 'pairing_id' | 'extension_days' | 'extension_applied_at'>
}): Promise<{ applied: boolean; newGraduationDate: string | null }> {
  const { form } = params
  if (form.extension_applied_at) {
    return { applied: false, newGraduationDate: null }
  }
  if (form.extension_days === 0) {
    // Still stamp extension_applied_at so we don't retry on next load.
    await markExtensionApplied(form.id)
    return { applied: true, newGraduationDate: null }
  }

  const supabase = await createClient()

  // Resolve the DIT record from the pairing.
  const { data: pairing } = await supabase
    .from('fto_pairings')
    .select('dit_id')
    .eq('id', form.pairing_id)
    .maybeSingle()
  if (!pairing) return { applied: false, newGraduationDate: null }

  const { data: record } = await supabase
    .from('dit_records')
    .select('id, expected_graduation_date')
    .eq('user_id', (pairing as { dit_id: string }).dit_id)
    .maybeSingle()
  if (!record) return { applied: false, newGraduationDate: null }

  const rec = record as { id: string; expected_graduation_date: string | null }
  const base = rec.expected_graduation_date
    ? new Date(rec.expected_graduation_date + 'T00:00:00Z')
    : new Date()
  const next = new Date(base)
  next.setUTCDate(next.getUTCDate() + form.extension_days)
  const nextIso = next.toISOString().slice(0, 10)

  const { error: updErr } = await supabase
    .from('dit_records')
    .update({ expected_graduation_date: nextIso })
    .eq('id', rec.id)
  if (updErr) throw new Error(`Failed to extend graduation date: ${updErr.message}`)

  await markExtensionApplied(form.id)
  return { applied: true, newGraduationDate: nextIso }
}

async function markExtensionApplied(formId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('deficiency_forms')
    .update({ extension_applied_at: new Date().toISOString() })
    .eq('id', formId)
    .is('extension_applied_at', null)
  if (error) throw new Error(`Failed to mark extension_applied_at: ${error.message}`)
}
