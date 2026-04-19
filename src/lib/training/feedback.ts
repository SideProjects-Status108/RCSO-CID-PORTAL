import {
  FTO_FEEDBACK_RUBRIC,
  type FtoFeedbackAggregate,
  type FtoFeedbackRatings,
  type FtoFeedbackRubricKey,
  type FtoFeedbackSurvey,
} from '@/types/training'

/**
 * Pure helpers for the FTO feedback survey (Prompt 14). Keep free of
 * Supabase + React imports so the rubric math is easy to unit test.
 */

export function validateRatings(ratings: FtoFeedbackRatings): string | null {
  const allowed = new Set(FTO_FEEDBACK_RUBRIC.map((r) => r.key))
  for (const [k, v] of Object.entries(ratings)) {
    if (!allowed.has(k as FtoFeedbackRubricKey)) return `Unknown rubric key: ${k}`
    if (v == null) continue
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return `Rating for ${k} must be an integer 1..5`
    }
  }
  return null
}

/**
 * True when a survey is ready for submission: every rubric key has a
 * value in 1..5. Comments are optional.
 */
export function isRubricComplete(ratings: FtoFeedbackRatings): boolean {
  return FTO_FEEDBACK_RUBRIC.every((r) => {
    const v = ratings[r.key]
    return typeof v === 'number' && v >= 1 && v <= 5
  })
}

/**
 * Aggregate a set of submitted/acknowledged surveys for a single FTO
 * into means + response count. Drafts and voided rows are excluded.
 */
export function aggregateSurveysForFto(params: {
  fto_id: string
  fto_name: string | null
  surveys: FtoFeedbackSurvey[]
}): FtoFeedbackAggregate {
  const rows = params.surveys.filter(
    (s) => s.status === 'submitted' || s.status === 'acknowledged',
  )
  const sums = new Map<FtoFeedbackRubricKey, { sum: number; count: number }>()
  for (const row of rows) {
    for (const r of FTO_FEEDBACK_RUBRIC) {
      const v = row.ratings[r.key]
      if (typeof v !== 'number') continue
      const cur = sums.get(r.key) ?? { sum: 0, count: 0 }
      cur.sum += v
      cur.count += 1
      sums.set(r.key, cur)
    }
  }
  const means: Partial<Record<FtoFeedbackRubricKey, number>> = {}
  for (const [k, v] of sums.entries()) {
    if (v.count > 0) means[k] = v.sum / v.count
  }
  const overall_mean = means.overall ?? null
  return {
    fto_id: params.fto_id,
    fto_name: params.fto_name,
    response_count: rows.length,
    means,
    overall_mean,
  }
}
