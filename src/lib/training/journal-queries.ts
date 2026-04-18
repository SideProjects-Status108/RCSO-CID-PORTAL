/**
 * Supabase I/O for DIT Journal + FTO Contact-Time Report + missed-day nudges.
 * Pure I/O; day-streak logic + nudge decisioning live in lib/training/journal.ts.
 */

import { createClient } from '@/lib/supabase/server'
import type {
  DitAbsenceRecord,
  DitJournalEntry,
  DitJournalReview,
  DitMissedDayNudge,
  FtoCtrEntry,
  MissedDayNudgeKind,
} from '@/types/training'

function toStr(x: unknown): string {
  return x == null ? '' : String(x)
}

function mapJournalEntry(r: Record<string, unknown>): DitJournalEntry {
  return {
    id: toStr(r.id),
    dit_record_id: toStr(r.dit_record_id),
    entry_date: toStr(r.entry_date),
    body: toStr(r.body),
    created_by: toStr(r.created_by),
    created_at: toStr(r.created_at),
    updated_at: toStr(r.updated_at),
  }
}

function mapJournalReview(r: Record<string, unknown>): DitJournalReview {
  return {
    id: toStr(r.id),
    entry_id: toStr(r.entry_id),
    reviewer_id: toStr(r.reviewer_id),
    notes: r.notes != null ? String(r.notes) : null,
    created_at: toStr(r.created_at),
  }
}

function mapCtr(r: Record<string, unknown>): FtoCtrEntry {
  return {
    id: toStr(r.id),
    dit_record_id: toStr(r.dit_record_id),
    pairing_id: r.pairing_id != null ? String(r.pairing_id) : null,
    fto_id: toStr(r.fto_id),
    entry_date: toStr(r.entry_date),
    contact_hours: r.contact_hours != null ? Number(r.contact_hours) : null,
    body: toStr(r.body),
    created_at: toStr(r.created_at),
    updated_at: toStr(r.updated_at),
  }
}

function mapNudge(r: Record<string, unknown>): DitMissedDayNudge {
  return {
    id: toStr(r.id),
    dit_record_id: toStr(r.dit_record_id),
    nudge_date: toStr(r.nudge_date),
    nudge_kind: r.nudge_kind as MissedDayNudgeKind,
    created_at: toStr(r.created_at),
  }
}

/* --------------------------- Journal ---------------------------------- */

export async function listJournalEntries(
  ditRecordId: string,
  opts: { since?: string; limit?: number } = {}
): Promise<DitJournalEntry[]> {
  const supabase = await createClient()
  let q = supabase
    .from('dit_journal_entries')
    .select('*')
    .eq('dit_record_id', ditRecordId)
    .order('entry_date', { ascending: false })
    .limit(opts.limit ?? 60)
  if (opts.since) q = q.gte('entry_date', opts.since)
  const { data } = await q
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapJournalEntry)
}

export async function upsertJournalEntry(input: {
  ditRecordId: string
  entryDate: string
  body: string
  createdBy: string
}): Promise<DitJournalEntry> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dit_journal_entries')
    .upsert(
      {
        dit_record_id: input.ditRecordId,
        entry_date: input.entryDate,
        body: input.body,
        created_by: input.createdBy,
      },
      { onConflict: 'dit_record_id,entry_date' }
    )
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to write journal entry')
  return mapJournalEntry(data as Record<string, unknown>)
}

export async function deleteJournalEntry(
  entryId: string,
  requesterId: string
): Promise<void> {
  const supabase = await createClient()
  // RLS enforces ownership, but we narrow for clarity + safer error msgs.
  const { error } = await supabase
    .from('dit_journal_entries')
    .delete()
    .eq('id', entryId)
    .eq('created_by', requesterId)
  if (error) throw new Error(error.message)
}

export async function addJournalReview(input: {
  entryId: string
  reviewerId: string
  notes: string | null
}): Promise<DitJournalReview> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dit_journal_reviews')
    .insert({
      entry_id: input.entryId,
      reviewer_id: input.reviewerId,
      notes: input.notes,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to add review')
  return mapJournalReview(data as Record<string, unknown>)
}

export async function listJournalReviews(entryIds: string[]): Promise<DitJournalReview[]> {
  if (entryIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('dit_journal_reviews')
    .select('*')
    .in('entry_id', entryIds)
    .order('created_at', { ascending: true })
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapJournalReview)
}

/* --------------------------- CTR -------------------------------------- */

export async function listCtrEntries(
  ditRecordId: string,
  opts: { since?: string; limit?: number } = {}
): Promise<FtoCtrEntry[]> {
  const supabase = await createClient()
  let q = supabase
    .from('fto_ctr_entries')
    .select('*')
    .eq('dit_record_id', ditRecordId)
    .order('entry_date', { ascending: false })
    .limit(opts.limit ?? 60)
  if (opts.since) q = q.gte('entry_date', opts.since)
  const { data } = await q
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapCtr)
}

export async function createCtrEntry(input: {
  ditRecordId: string
  pairingId: string | null
  ftoId: string
  entryDate: string
  contactHours: number | null
  body: string
}): Promise<FtoCtrEntry> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fto_ctr_entries')
    .insert({
      dit_record_id: input.ditRecordId,
      pairing_id: input.pairingId,
      fto_id: input.ftoId,
      entry_date: input.entryDate,
      contact_hours: input.contactHours,
      body: input.body,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to write CTR')
  return mapCtr(data as Record<string, unknown>)
}

/* --------------------------- Nudges ----------------------------------- */

export async function listNudgesForDit(
  ditRecordId: string,
  opts: { since?: string } = {}
): Promise<DitMissedDayNudge[]> {
  const supabase = await createClient()
  let q = supabase
    .from('dit_missed_day_nudges')
    .select('*')
    .eq('dit_record_id', ditRecordId)
    .order('nudge_date', { ascending: false })
  if (opts.since) q = q.gte('nudge_date', opts.since)
  const { data } = await q
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapNudge)
}

export async function recordNudgeOnce(input: {
  ditRecordId: string
  nudgeDate: string
  nudgeKind: MissedDayNudgeKind
}): Promise<{ created: boolean; nudge: DitMissedDayNudge | null }> {
  const supabase = await createClient()
  // Rely on the unique (dit_record_id, nudge_date, nudge_kind) index from
  // the C.01 migration. ON CONFLICT DO NOTHING -> upsert with ignoreDuplicates.
  const { data, error } = await supabase
    .from('dit_missed_day_nudges')
    .upsert(
      {
        dit_record_id: input.ditRecordId,
        nudge_date: input.nudgeDate,
        nudge_kind: input.nudgeKind,
      },
      { onConflict: 'dit_record_id,nudge_date,nudge_kind', ignoreDuplicates: true }
    )
    .select('*')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return {
    created: !!data,
    nudge: data ? mapNudge(data as Record<string, unknown>) : null,
  }
}

/* --------------------------- Bundle fetch ----------------------------- */

/**
 * Bundle everything needed to decide nudges for a DIT today — journal
 * entries within the window, acknowledged absences, and the current
 * dit_records.status.
 */
export async function fetchMissedDayInputs(
  ditRecordId: string,
  windowDays = 14
): Promise<{
  entries: Pick<DitJournalEntry, 'entry_date'>[]
  absences: Pick<DitAbsenceRecord, 'start_date' | 'end_date' | 'status'>[]
  status: string
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const sinceDate = new Date()
  sinceDate.setUTCDate(sinceDate.getUTCDate() - windowDays)
  const since = sinceDate.toISOString().slice(0, 10)

  const [{ data: entries }, { data: absences }, { data: rec }] = await Promise.all([
    supabase
      .from('dit_journal_entries')
      .select('entry_date')
      .eq('dit_record_id', ditRecordId)
      .gte('entry_date', since)
      .lte('entry_date', today),
    supabase
      .from('dit_absence_records')
      .select('start_date, end_date, status')
      .eq('dit_record_id', ditRecordId)
      .gte('end_date', since),
    supabase.from('dit_records').select('status').eq('id', ditRecordId).maybeSingle(),
  ])

  return {
    entries: (entries ?? []) as Array<Pick<DitJournalEntry, 'entry_date'>>,
    absences: (absences ?? []) as Array<
      Pick<DitAbsenceRecord, 'start_date' | 'end_date' | 'status'>
    >,
    status: (rec as { status?: string } | null)?.status ?? 'active',
  }
}
