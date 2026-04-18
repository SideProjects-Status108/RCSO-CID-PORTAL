/**
 * Segment C helpers for the DIT Journal + FTO Contact-Time Report.
 *
 * Missed-day rules (locked with the department):
 *   - 2 consecutive missed write-days  -> in-app nudge on the DIT's own dashboard
 *   - 3+ consecutive missed write-days -> in-app notification to the paired FTO
 *   - Suspended status bypasses both counters entirely. On return to 'active',
 *     the streak resets.
 *   - Absences (any kind) suppress the counter for their calendar-day span.
 *
 * "Write-day" = any weekday Mon-Fri (inclusive) on which the DIT was
 * expected to be on duty. Weekends/holidays are NOT counted as missed days
 * even if no journal entry exists. (Holiday list is not in scope for this
 * segment; we just use Mon-Fri as a reasonable approximation until HR
 * lands a holiday calendar in Segment E.)
 */

import type { DitAbsenceRecord, DitJournalEntry, DitRecordStatus } from '@/types/training'

export const NUDGE_DIT_CONSECUTIVE_DAYS = 2
export const NUDGE_FTO_CONSECUTIVE_DAYS = 3

/** Parse a YYYY-MM-DD string into a UTC Date at midnight. */
function parseDate(iso: string): Date {
  return new Date(iso + 'T00:00:00Z')
}

/** Format a Date as YYYY-MM-DD (UTC). */
function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function isWeekend(d: Date): boolean {
  const dow = d.getUTCDay()
  return dow === 0 || dow === 6
}

function dateInRange(target: Date, start: Date, end: Date | null): boolean {
  const e = end ?? start
  return target.getTime() >= start.getTime() && target.getTime() <= e.getTime()
}

/**
 * Build a set of ISO dates that are "suppressed" — weekends, or any day
 * covered by an absence record. These don't count as missed-days.
 */
function buildSuppressedSet(
  absences: Array<Pick<DitAbsenceRecord, 'start_date' | 'end_date' | 'status'>>,
  window: { start: Date; end: Date }
): Set<string> {
  const out = new Set<string>()
  for (
    let cursor = new Date(window.start);
    cursor.getTime() <= window.end.getTime();
    cursor = addDays(cursor, 1)
  ) {
    if (isWeekend(cursor)) out.add(toIso(cursor))
  }
  for (const a of absences) {
    if (a.status === 'draft') continue
    const start = parseDate(a.start_date)
    const end = a.end_date ? parseDate(a.end_date) : start
    for (
      let cursor = new Date(start);
      cursor.getTime() <= end.getTime();
      cursor = addDays(cursor, 1)
    ) {
      out.add(toIso(cursor))
    }
  }
  return out
}

/**
 * Compute the DIT's consecutive-missed-day streak leading up to (but not
 * including) `today`. Returns 0 if the status is suspended, or if the most
 * recent non-suppressed day has a journal entry.
 *
 * `today` defaults to the current UTC date.
 */
export function computeMissedStreak(params: {
  today?: Date
  status: DitRecordStatus
  entries: Array<Pick<DitJournalEntry, 'entry_date'>>
  absences: Array<Pick<DitAbsenceRecord, 'start_date' | 'end_date' | 'status'>>
  /** Don't count days earlier than this (avoid counting the whole program). */
  windowDays?: number
}): number {
  const today = params.today ?? new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
  if (params.status === 'suspended') return 0

  const windowDays = params.windowDays ?? 14
  const windowStart = addDays(today, -windowDays)
  const suppressed = buildSuppressedSet(params.absences, { start: windowStart, end: today })

  const entryDates = new Set(params.entries.map((e) => e.entry_date))

  let streak = 0
  // Walk backwards from yesterday. Skip suppressed days. If a non-suppressed
  // day has no entry, increment; if it has an entry, break. We don't include
  // `today` because the DIT may still write it.
  for (let offset = 1; offset <= windowDays; offset += 1) {
    const cursor = addDays(today, -offset)
    const iso = toIso(cursor)
    if (suppressed.has(iso)) continue
    if (entryDates.has(iso)) break
    streak += 1
  }
  return streak
}

/**
 * Derive which nudge(s) should fire for a DIT today. The caller is
 * responsible for de-duping against dit_missed_day_nudges before actually
 * delivering the nudge.
 */
export type NudgeDecision = {
  nudgeDit: boolean
  nudgeFto: boolean
  streak: number
}

export function decideNudges(
  streak: number,
  status: DitRecordStatus
): NudgeDecision {
  if (status === 'suspended') {
    return { nudgeDit: false, nudgeFto: false, streak: 0 }
  }
  return {
    nudgeDit: streak >= NUDGE_DIT_CONSECUTIVE_DAYS,
    nudgeFto: streak >= NUDGE_FTO_CONSECUTIVE_DAYS,
    streak,
  }
}
