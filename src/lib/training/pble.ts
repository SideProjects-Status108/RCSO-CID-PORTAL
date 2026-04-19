import type {
  Pble,
  PbleRubricCriterion,
  PbleRubricScore,
  PbleStatus,
} from '@/types/training'

/**
 * Pure helpers for PBLE rubric math + status-transition rules.
 *
 * We keep transitions strict because the database CHECK constraint only
 * enforces that the value is a valid PbleStatus, not that it's a
 * lawful successor of the current state. The API layer calls
 * canTransition() before writing.
 */

/**
 * Status machine:
 *   assigned → in_progress | submitted (DIT) | failed (staff)
 *   in_progress → submitted (DIT) | assigned (staff reset)
 *   submitted → scored (staff)
 *   scored → passed | failed (staff)
 * A PBLE in passed|failed is terminal.
 */
const NEXT_STATES: Record<PbleStatus, PbleStatus[]> = {
  assigned: ['in_progress', 'submitted', 'failed'],
  in_progress: ['submitted', 'assigned'],
  submitted: ['scored'],
  scored: ['passed', 'failed'],
  passed: [],
  failed: [],
}

export function canTransition(from: PbleStatus, to: PbleStatus): boolean {
  if (from === to) return true
  return NEXT_STATES[from]?.includes(to) ?? false
}

export type PbleRubricSummary = {
  max_total: number
  awarded_total: number
  percent: number
  scored_count: number
  missing_criteria: string[] // criterion keys without a score
}

/**
 * Roll up rubric_scores against the PBLE's rubric criteria. Scores that
 * exceed max_score are clamped so a renderer can show the clamped %;
 * the raw value is preserved on PbleRubricScore for auditability.
 */
export function summarizeRubric(
  rubric: PbleRubricCriterion[],
  scores: PbleRubricScore[],
): PbleRubricSummary {
  const byKey = new Map(scores.map((s) => [s.criterion_key, s] as const))
  let awarded = 0
  let max = 0
  let scoredCount = 0
  const missing: string[] = []
  for (const crit of rubric) {
    max += crit.max_score
    const s = byKey.get(crit.key)
    if (!s) {
      missing.push(crit.key)
      continue
    }
    scoredCount += 1
    awarded += Math.min(crit.max_score, Math.max(0, s.score))
  }
  return {
    max_total: max,
    awarded_total: awarded,
    percent: max === 0 ? 0 : Math.round((awarded / max) * 100),
    scored_count: scoredCount,
    missing_criteria: missing,
  }
}

/**
 * Validates the shape of a score list before we hit the DB: every
 * entry's criterion_key must exist in the rubric, and score must be
 * 0..max_score for its criterion. Returns null on success, else a
 * human-readable error.
 */
export function validateScores(
  rubric: PbleRubricCriterion[],
  scores: PbleRubricScore[],
): string | null {
  const ruMap = new Map(rubric.map((r) => [r.key, r] as const))
  for (const s of scores) {
    const crit = ruMap.get(s.criterion_key)
    if (!crit) return `Unknown criterion key: ${s.criterion_key}`
    if (!Number.isFinite(s.score) || s.score < 0) return `Score for ${s.criterion_key} must be ≥ 0`
    if (s.score > crit.max_score) {
      return `Score for ${s.criterion_key} must be ≤ ${crit.max_score}`
    }
  }
  return null
}

export function isTerminal(pble: Pble): boolean {
  return pble.status === 'passed' || pble.status === 'failed'
}
