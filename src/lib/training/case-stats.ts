import type { CallOutLog, CaseAssignment, CaseRole, CaseStatus } from '@/types/training'

/**
 * Case + call-out stats used by the DIT detail "Cases & Call-Outs" tab
 * and the DIT overview sidebar.
 *
 * Pure — accepts already-fetched rows so it can run either server-side
 * (for SSR) or client-side (for optimistic updates).
 */

export type CaseStats = {
  total: number
  by_status: Record<CaseStatus, number>
  by_role: Record<CaseRole, number>
  open_lead: number
  /** 30d rolling window, based on assigned_at. */
  recent_30d: number
  /** Case assignments the DIT is currently the lead on, newest first. */
  current_lead_cases: CaseAssignment[]
}

export type CallOutStats = {
  total: number
  off_duty_count: number
  comp_time_eligible_count: number
  total_minutes: number
  /** 30d rolling window, based on responded_at. */
  recent_30d_count: number
  recent_30d_minutes: number
}

const ROLE_KEYS: CaseRole[] = ['lead', 'assist', 'observer']
const STATUS_KEYS: CaseStatus[] = ['open', 'closed', 'inactive']

function blankRoleCounts(): Record<CaseRole, number> {
  return ROLE_KEYS.reduce(
    (acc, k) => {
      acc[k] = 0
      return acc
    },
    {} as Record<CaseRole, number>,
  )
}

function blankStatusCounts(): Record<CaseStatus, number> {
  return STATUS_KEYS.reduce(
    (acc, k) => {
      acc[k] = 0
      return acc
    },
    {} as Record<CaseStatus, number>,
  )
}

function msAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000
}

export function computeCaseStats(cases: CaseAssignment[]): CaseStats {
  const by_status = blankStatusCounts()
  const by_role = blankRoleCounts()
  let open_lead = 0
  let recent_30d = 0
  const recentMs = msAgo(30)

  for (const c of cases) {
    by_status[c.status] += 1
    by_role[c.dit_role] += 1
    if (c.status === 'open' && c.dit_role === 'lead') open_lead += 1
    if (new Date(c.assigned_at).getTime() >= recentMs) recent_30d += 1
  }

  const current_lead_cases = cases
    .filter((c) => c.status === 'open' && c.dit_role === 'lead')
    .sort((a, b) => (a.assigned_at < b.assigned_at ? 1 : -1))

  return {
    total: cases.length,
    by_status,
    by_role,
    open_lead,
    recent_30d,
    current_lead_cases,
  }
}

export function computeCallOutStats(logs: CallOutLog[]): CallOutStats {
  let off_duty_count = 0
  let comp_time_eligible_count = 0
  let total_minutes = 0
  let recent_30d_count = 0
  let recent_30d_minutes = 0
  const recentMs = msAgo(30)

  for (const l of logs) {
    if (l.off_duty) off_duty_count += 1
    if (l.comp_time_eligible) comp_time_eligible_count += 1
    total_minutes += l.duration_minutes
    if (new Date(l.responded_at).getTime() >= recentMs) {
      recent_30d_count += 1
      recent_30d_minutes += l.duration_minutes
    }
  }

  return {
    total: logs.length,
    off_duty_count,
    comp_time_eligible_count,
    total_minutes,
    recent_30d_count,
    recent_30d_minutes,
  }
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`
}
