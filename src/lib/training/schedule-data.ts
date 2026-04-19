import { createClient } from '@/lib/supabase/server'
import { buildScheduleRow, DEFAULT_PROGRAM_WEEKS } from '@/lib/training/scheduling'
import type {
  DitRecordRow,
  FtoPairingRow,
  ScheduleRow,
  WeeklyTrainingSession,
} from '@/types/training'

/**
 * Assembles ScheduleRow[] for a caller-provided set of DIT records.
 *
 * Runs five parallel reads (pairings, weekly sessions, DIT profiles,
 * FTO profiles, absence records for suspension windows) then builds
 * each row through buildScheduleRow(). Single pass over the result
 * set — safe to render for the whole cohort.
 */
export async function buildScheduleRowsForDits(
  ditRecords: DitRecordRow[],
  opts?: { weekCount?: number },
): Promise<ScheduleRow[]> {
  if (ditRecords.length === 0) return []
  const supabase = await createClient()
  const weekCount = opts?.weekCount ?? DEFAULT_PROGRAM_WEEKS

  const ditUserIds = ditRecords.map((r) => r.user_id)
  const recordIds = ditRecords.map((r) => r.id)

  const [
    { data: pairings },
    { data: sessions },
    { data: ditProfiles },
    { data: suspensionRows },
  ] = await Promise.all([
    supabase
      .from('fto_pairings')
      .select('*')
      .in('dit_id', ditUserIds),
    supabase
      .from('weekly_training_sessions')
      .select('*, fto_pairings!inner(dit_id)')
      .in('fto_pairings.dit_id', ditUserIds),
    supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', ditUserIds),
    // Suspension windows: we check dit_absence_records where kind='suspension'
    // (or a fallback on dit_records.status without dates if the record
    // has no absence row). Kept simple: we only read what we need for
    // the grid's desaturation treatment.
    supabase
      .from('dit_absence_records')
      .select('dit_record_id, start_date, end_date, kind')
      .in('dit_record_id', recordIds),
  ])

  // FTO directory: pull every distinct fto_id from the pairings set.
  const ftoIds = Array.from(
    new Set(((pairings ?? []) as Array<{ fto_id: string }>).map((p) => p.fto_id)),
  )
  const ftoDirectory = new Map<string, { full_name: string; fto_color: string | null }>()
  if (ftoIds.length > 0) {
    const { data: ftoProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, fto_color')
      .in('id', ftoIds)
    for (const row of (ftoProfiles ?? []) as Array<{
      id: string
      full_name: string | null
      fto_color: string | null
    }>) {
      ftoDirectory.set(row.id, {
        full_name: row.full_name ?? '—',
        fto_color: row.fto_color ?? null,
      })
    }
  }

  const ditProfileMap = new Map<string, string>()
  for (const p of (ditProfiles ?? []) as Array<{ id: string; full_name: string | null }>) {
    ditProfileMap.set(p.id, p.full_name ?? '—')
  }

  // Bucket pairings + sessions by DIT user id so each row builder only
  // sees its own data.
  const pairingsByDit = new Map<string, FtoPairingRow[]>()
  for (const p of (pairings ?? []) as FtoPairingRow[]) {
    const arr = pairingsByDit.get(p.dit_id) ?? []
    arr.push(p)
    pairingsByDit.set(p.dit_id, arr)
  }

  const sessionsByDit = new Map<string, WeeklyTrainingSession[]>()
  type SessionWithJoin = WeeklyTrainingSession & { fto_pairings: { dit_id: string } }
  for (const s of (sessions ?? []) as SessionWithJoin[]) {
    const ditId = s.fto_pairings.dit_id
    const arr = sessionsByDit.get(ditId) ?? []
    arr.push(s)
    sessionsByDit.set(ditId, arr)
  }

  // Suspension window: use the most recent suspension absence record per
  // DIT (if any) to pass suspended_at/reactivated_at. We don't need a
  // stricter "did the DIT's status equal suspended during this week"
  // check because buildScheduleRow only applies the band when the DIT's
  // CURRENT status is 'suspended'.
  type AbsenceRow = {
    dit_record_id: string
    start_date: string
    end_date: string | null
    kind: string
  }
  const suspensionByRecord = new Map<string, { start: string; end: string | null }>()
  for (const row of (suspensionRows ?? []) as AbsenceRow[]) {
    if (row.kind !== 'suspension') continue
    const prev = suspensionByRecord.get(row.dit_record_id)
    if (!prev || prev.start < row.start_date) {
      suspensionByRecord.set(row.dit_record_id, {
        start: row.start_date,
        end: row.end_date,
      })
    }
  }

  const rows: ScheduleRow[] = []
  for (const record of ditRecords) {
    const suspension = suspensionByRecord.get(record.id)
    rows.push(
      buildScheduleRow({
        weekCount,
        programStartDate: record.start_date,
        ditRecord: {
          id: record.id,
          user_id: record.user_id,
          full_name: ditProfileMap.get(record.user_id) ?? '—',
          phase: record.current_phase,
          status: record.status,
          suspended_at: suspension?.start ?? null,
          reactivated_at: suspension?.end ?? null,
        },
        pairings: pairingsByDit.get(record.user_id) ?? [],
        weeklySessions: sessionsByDit.get(record.user_id) ?? [],
        ftoDirectory,
      }),
    )
  }

  return rows
}
