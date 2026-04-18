/**
 * Shared helpers for the Weekly Training Evaluation form + write paths.
 *
 * Scoring rules (from the RCSO FTO binder):
 *   - Each of the 20 competencies gets a 1..5 integer OR is marked "not
 *     observed" (score is null, explanation is optional).
 *   - Scores of 1, 2, or 5 require an explanation of <= 300 chars.
 *     (1/2 = deficiency explanation; 5 = excellence justification.)
 *   - A submitted eval is "low-score" if any competency scored <= 2. Those
 *     trigger the deficiency draft prefill downstream.
 *
 * None of this touches Supabase; it's pure validation + classification so
 * both the client form and the server save/submit endpoints can share one
 * source of truth.
 */

export const EXPLANATION_REQUIRED_SCORES = new Set<number>([1, 2, 5])
export const EXPLANATION_MAX_LEN = 300
export const LOW_SCORE_THRESHOLD = 2

export type ScoredCompetency = {
  competency_key: string
  score: number | null
  explanation: string | null
}

export type CompetencyValidationError =
  | {
      competency_key: string
      kind: 'explanation_required'
    }
  | {
      competency_key: string
      kind: 'explanation_too_long'
      max: number
      actual: number
    }
  | {
      competency_key: string
      kind: 'invalid_score'
    }

/** True when the scored competency triggers a deficiency flag. */
export function isLowScore(score: number | null | undefined): boolean {
  return typeof score === 'number' && score <= LOW_SCORE_THRESHOLD
}

/**
 * Validate a single competency row. Returns an array of errors; empty means
 * the row is acceptable.
 */
export function validateCompetencyRow(row: ScoredCompetency): CompetencyValidationError[] {
  const errors: CompetencyValidationError[] = []
  const { score, explanation, competency_key } = row

  if (score != null) {
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      errors.push({ competency_key, kind: 'invalid_score' })
      return errors
    }
    if (EXPLANATION_REQUIRED_SCORES.has(score)) {
      const trimmed = (explanation ?? '').trim()
      if (trimmed.length === 0) {
        errors.push({ competency_key, kind: 'explanation_required' })
      } else if (trimmed.length > EXPLANATION_MAX_LEN) {
        errors.push({
          competency_key,
          kind: 'explanation_too_long',
          max: EXPLANATION_MAX_LEN,
          actual: trimmed.length,
        })
      }
    }
  }

  return errors
}

/** Validate the full set of competencies for a weekly session. */
export function validateSessionScores(rows: ScoredCompetency[]): CompetencyValidationError[] {
  return rows.flatMap((r) => validateCompetencyRow(r))
}

/**
 * Returns the set of low-scoring competencies that should be auto-prefilled
 * into a deficiency draft. Explanation is preserved as the FTO recommendation
 * seed.
 */
export function extractLowScoreFlags(
  rows: Array<ScoredCompetency & { competency_label?: string }>
): Array<{
  competency_key: string
  competency_label: string
  score: number
  fto_recommendation: string
}> {
  return rows
    .filter((r) => typeof r.score === 'number' && isLowScore(r.score))
    .map((r) => ({
      competency_key: r.competency_key,
      competency_label: r.competency_label ?? r.competency_key,
      score: r.score as number,
      fto_recommendation: (r.explanation ?? '').trim(),
    }))
}

/**
 * Classify a week's average for the absence-aware trajectory display.
 * Returns null when insufficient data or the week was flagged DIT-absent.
 */
export function weekAverage(rows: ScoredCompetency[]): number | null {
  const valid = rows.filter((r) => typeof r.score === 'number') as Array<
    ScoredCompetency & { score: number }
  >
  if (valid.length === 0) return null
  const sum = valid.reduce((acc, r) => acc + r.score, 0)
  return sum / valid.length
}
