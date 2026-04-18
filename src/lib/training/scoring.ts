/**
 * Pure scoring / trajectory helpers for the DIT file Overview tab.
 * Keep this file free of Supabase and React imports — unit-testable.
 */

export type TrendDirection = 'up' | 'down' | 'flat' | 'unknown'

export type WeeklyScoreSummary = {
  week_start_date: string
  avg_score: number
  sample_count: number
}

/** Trend from previous -> current. `flat` when identical; `unknown` when we lack data. */
export function trendArrow(
  current: number | null,
  prior: number | null
): TrendDirection {
  if (current == null || prior == null) return 'unknown'
  const diff = current - prior
  if (Math.abs(diff) < 0.05) return 'flat'
  return diff > 0 ? 'up' : 'down'
}

/**
 * Trajectory descriptor for the Overview header badge.
 *
 * - "ahead": mean >= 4.0 over the last 3 submitted weeks
 * - "on_track": mean 3.0 – 3.99
 * - "needs_support": mean 2.0 – 2.99
 * - "at_risk": mean < 2.0
 * - "insufficient_data": <2 submitted weeks
 */
export type Trajectory = 'ahead' | 'on_track' | 'needs_support' | 'at_risk' | 'insufficient_data'

export function computeTrajectory(
  summaries: WeeklyScoreSummary[]
): { trajectory: Trajectory; meanScore: number | null } {
  if (summaries.length < 2) {
    return { trajectory: 'insufficient_data', meanScore: null }
  }
  const recent = summaries.slice(0, 3)
  const total = recent.reduce((sum, w) => sum + w.avg_score * w.sample_count, 0)
  const count = recent.reduce((sum, w) => sum + w.sample_count, 0)
  if (count === 0) return { trajectory: 'insufficient_data', meanScore: null }
  const meanScore = total / count
  if (meanScore >= 4) return { trajectory: 'ahead', meanScore }
  if (meanScore >= 3) return { trajectory: 'on_track', meanScore }
  if (meanScore >= 2) return { trajectory: 'needs_support', meanScore }
  return { trajectory: 'at_risk', meanScore }
}

/**
 * Returns true when the DIT is projected to meet the expected graduation
 * date based on simple heuristics — used only for the Overview badge, not
 * for any gating decisions.
 */
export function isOnTrackForGraduation(params: {
  trajectory: Trajectory
  expected_graduation_date: string | null
  open_deficiencies: number
  status: 'active' | 'suspended' | 'on_hold' | 'graduated' | 'separated'
}): boolean {
  if (params.status !== 'active') return false
  if (!params.expected_graduation_date) return false
  if (params.open_deficiencies > 0) return false
  return params.trajectory === 'ahead' || params.trajectory === 'on_track'
}

export const TRAJECTORY_LABELS: Record<Trajectory, string> = {
  ahead: 'Ahead of pace',
  on_track: 'On track',
  needs_support: 'Needs support',
  at_risk: 'At risk',
  insufficient_data: 'Not enough data',
}
