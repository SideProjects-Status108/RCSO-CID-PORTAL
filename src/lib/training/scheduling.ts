import type {
  DitRecordStatus,
  FtoPairingRow,
  ScheduleCell,
  ScheduleCellStatus,
  ScheduleRow,
  WeeklyTrainingSession,
} from '@/types/training'

/**
 * Scheduling helpers for the 10-week grid (Prompt 8).
 *
 * Pure + deterministic: given a DIT's pairings + weekly sessions + the
 * DIT's current status, produce a 10-week ScheduleRow. The grid view
 * composes these rows for every visible DIT.
 *
 * Week math: the program starts on `program_start_date` (a Monday by
 * convention) and runs for `weekCount` consecutive Mon-Sun windows.
 * Weeks that overlap a DIT's `suspended`/`graduated`/`separated` window
 * are marked accordingly so the UI can desaturate them.
 */

export const DEFAULT_PROGRAM_WEEKS = 10

/**
 * Compute the 1-indexed program week (1..N) for a given weekly session
 * relative to the DIT's program_start_date. Returns null when the session
 * window falls entirely before the program start or beyond the nominal
 * weekCount horizon. Week boundaries are treated as half-open overlap to
 * tolerate slightly-shifted sessions (holiday weeks etc).
 */
export function programWeekIndex(params: {
  programStartDate: string
  sessionStartDate: string
  sessionEndDate: string
  weekCount?: number
}): number | null {
  const weekCount = params.weekCount ?? DEFAULT_PROGRAM_WEEKS
  const start = new Date(`${params.programStartDate}T00:00:00Z`)
  for (let i = 0; i < weekCount; i++) {
    const wStart = new Date(start)
    wStart.setUTCDate(wStart.getUTCDate() + i * 7)
    const wEnd = new Date(wStart)
    wEnd.setUTCDate(wEnd.getUTCDate() + 6)
    const wStartIso = wStart.toISOString().slice(0, 10)
    const wEndIso = wEnd.toISOString().slice(0, 10)
    if (
      params.sessionStartDate <= wEndIso &&
      wStartIso <= params.sessionEndDate
    ) {
      return i + 1
    }
  }
  return null
}

export type BuildScheduleParams = {
  weekCount?: number
  programStartDate: string // ISO yyyy-mm-dd, Monday
  ditRecord: {
    id: string
    user_id: string
    full_name: string
    phase: number
    status: DitRecordStatus
    /** When the DIT was suspended (inclusive start). */
    suspended_at?: string | null
    /** When the DIT came back to active / graduated / separated. */
    reactivated_at?: string | null
  }
  pairings: FtoPairingRow[]
  weeklySessions: WeeklyTrainingSession[]
  /** Map of fto user id -> { full_name, fto_color } for cell chip labels. */
  ftoDirectory: Map<string, { full_name: string; fto_color: string | null }>
}

function toDate(iso: string): Date {
  // Interpret yyyy-mm-dd as UTC midnight so week math doesn't drift
  // across DST boundaries. All callers pass yyyy-mm-dd.
  return new Date(`${iso}T00:00:00Z`)
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setUTCDate(out.getUTCDate() + days)
  return out
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string | null): boolean {
  // Half-open treated as closed on both ends; pairings have inclusive dates.
  const end = bEnd ?? '9999-12-31'
  return aStart <= end && bStart <= aEnd
}

/**
 * Determine which FTO pairing (if any) was active during a given
 * inclusive week window. If multiple overlap (rare; typically during a
 * handoff) the most recently-started one wins.
 */
function pairingForWeek(
  weekStart: string,
  weekEnd: string,
  pairings: FtoPairingRow[],
): FtoPairingRow | null {
  const overlapping = pairings.filter((p) =>
    rangesOverlap(weekStart, weekEnd, p.start_date, p.end_date),
  )
  if (overlapping.length === 0) return null
  overlapping.sort((a, b) => (a.start_date < b.start_date ? 1 : -1))
  return overlapping[0] ?? null
}

/**
 * Find the weekly session whose window overlaps the target week. We
 * match on any overlap rather than strict equality so slightly-shifted
 * sessions (e.g. holiday weeks) still surface.
 */
function sessionForWeek(
  weekStart: string,
  weekEnd: string,
  sessions: WeeklyTrainingSession[],
): WeeklyTrainingSession | null {
  const overlapping = sessions.filter((s) =>
    rangesOverlap(weekStart, weekEnd, s.week_start_date, s.week_end_date),
  )
  if (overlapping.length === 0) return null
  overlapping.sort((a, b) => (a.week_start_date < b.week_start_date ? 1 : -1))
  return overlapping[0] ?? null
}

function sessionStatus(
  session: WeeklyTrainingSession | null,
): ScheduleCellStatus | null {
  if (!session) return null
  if (session.dit_absent_flag) return 'absent'
  if (session.status === 'approved') return 'approved'
  if (session.status === 'submitted') return 'submitted'
  return 'draft'
}

/**
 * Build one DIT's 10-week row.
 *
 * Precedence when deciding cell status:
 *   1. DIT was suspended during this week → 'suspended' (desaturated in UI).
 *   2. A weekly session exists → absent / draft / submitted / approved.
 *   3. A pairing covers this week but no session yet → 'not_started'.
 *   4. Otherwise → 'no_pairing'.
 */
export function buildScheduleRow(params: BuildScheduleParams): ScheduleRow {
  const weekCount = params.weekCount ?? DEFAULT_PROGRAM_WEEKS
  const start = toDate(params.programStartDate)

  const cells: ScheduleCell[] = []
  for (let i = 0; i < weekCount; i++) {
    const weekStartDate = addDays(start, i * 7)
    const weekEndDate = addDays(weekStartDate, 6)
    const weekStart = toIsoDate(weekStartDate)
    const weekEnd = toIsoDate(weekEndDate)

    const suspendedDuringWeek =
      params.ditRecord.status === 'suspended' &&
      params.ditRecord.suspended_at != null &&
      rangesOverlap(
        weekStart,
        weekEnd,
        params.ditRecord.suspended_at.slice(0, 10),
        params.ditRecord.reactivated_at?.slice(0, 10) ?? null,
      )

    const pairing = pairingForWeek(weekStart, weekEnd, params.pairings)
    const session = sessionForWeek(weekStart, weekEnd, params.weeklySessions)

    let status: ScheduleCellStatus
    if (suspendedDuringWeek) {
      status = 'suspended'
    } else {
      const fromSession = sessionStatus(session)
      if (fromSession) {
        status = fromSession
      } else if (pairing) {
        status = 'not_started'
      } else {
        status = 'no_pairing'
      }
    }

    const ftoInfo = pairing ? params.ftoDirectory.get(pairing.fto_id) ?? null : null

    cells.push({
      week_index: i + 1,
      week_start: weekStart,
      week_end: weekEnd,
      status,
      fto_id: pairing?.fto_id ?? null,
      fto_color: ftoInfo?.fto_color ?? null,
      fto_name: ftoInfo?.full_name ?? null,
      session_id: session?.id ?? null,
    })
  }

  return {
    dit_record_id: params.ditRecord.id,
    dit_user_id: params.ditRecord.user_id,
    dit_name: params.ditRecord.full_name,
    phase: params.ditRecord.phase,
    start_date: params.programStartDate,
    cells,
  }
}

/**
 * Stable client-side hash → hex color for FTOs that haven't been given
 * an explicit `profiles.fto_color` yet. Deterministic on user id.
 */
export function hashFtoColor(ftoId: string): string {
  let hash = 0
  for (let i = 0; i < ftoId.length; i++) {
    hash = (hash << 5) - hash + ftoId.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return hslToHex(hue, 68, 52)
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100
  const lN = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sN * Math.min(lN, 1 - lN)
  const f = (n: number) =>
    lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

/**
 * Resolve the color chip for a cell: explicit FTO color wins, otherwise
 * a deterministic hash. Returns null when the cell has no FTO.
 */
export function resolveCellColor(cell: ScheduleCell): string | null {
  if (!cell.fto_id) return null
  return cell.fto_color ?? hashFtoColor(cell.fto_id)
}
