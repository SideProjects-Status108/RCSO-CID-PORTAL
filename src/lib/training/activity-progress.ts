import type { ActivityExposure, ActivityTemplate } from '@/types/training'

/**
 * Activity-progress math for the Activity tab. Pure: hand it a DIT's phase
 * plus the universe of templates + the DIT's actual exposures and you get
 * a per-template (and total) progress breakdown for the current phase.
 *
 * The required counts live on the template as
 * `required_exposures_phase_{1,2,3}`. "Phase-scoped" intentionally means
 * we count exposures that happened at any point — not only within a given
 * phase — because an exposure in phase 1 still counts toward a DIT's
 * cumulative learning. If we later want strict per-phase gating we can
 * start filtering by exposure_date relative to pairing phase windows.
 */

export type PhaseNumber = 1 | 2 | 3

export type ActivityProgressRow = {
  template: ActivityTemplate
  required: number
  actual: number
  remaining: number
  percent: number // 0..100, clamped
  /** exposures that contributed to `actual`, newest-first. */
  recent_exposures: ActivityExposure[]
}

export type ActivityProgressSummary = {
  phase: PhaseNumber
  rows: ActivityProgressRow[]
  total_required: number
  total_actual: number
  total_percent: number
  /** Count of templates that have hit their required-exposure quota. */
  complete_count: number
  incomplete_count: number
}

function requiredForPhase(
  template: ActivityTemplate,
  phase: PhaseNumber,
): number {
  switch (phase) {
    case 1:
      return template.required_exposures_phase_1
    case 2:
      return template.required_exposures_phase_2
    case 3:
      return template.required_exposures_phase_3
  }
}

function clampPhase(phase: number): PhaseNumber {
  if (phase <= 1) return 1
  if (phase >= 3) return 3
  return 2
}

function percent(actual: number, required: number): number {
  if (required <= 0) return 100
  return Math.min(100, Math.round((actual / required) * 100))
}

/**
 * Build a per-template + aggregate progress summary. Exposures are
 * bucketed by template_id in O(n+m) so this is safe to run on every
 * tab render.
 */
export function computeActivityProgress(params: {
  phase: number
  templates: ActivityTemplate[]
  exposures: ActivityExposure[]
  /** Maximum recent exposures to surface per row; default 5. */
  recentPerTemplate?: number
}): ActivityProgressSummary {
  const phase = clampPhase(params.phase)
  const recentPerTemplate = params.recentPerTemplate ?? 5

  const byTemplate = new Map<string, ActivityExposure[]>()
  for (const e of params.exposures) {
    const bucket = byTemplate.get(e.activity_template_id) ?? []
    bucket.push(e)
    byTemplate.set(e.activity_template_id, bucket)
  }
  for (const bucket of byTemplate.values()) {
    bucket.sort((a, b) =>
      a.exposure_date < b.exposure_date ? 1 : a.exposure_date > b.exposure_date ? -1 : 0,
    )
  }

  const rows: ActivityProgressRow[] = params.templates
    .map((template) => {
      const required = requiredForPhase(template, phase)
      const bucket = byTemplate.get(template.id) ?? []
      const actual = bucket.length
      return {
        template,
        required,
        actual,
        remaining: Math.max(0, required - actual),
        percent: percent(actual, required),
        recent_exposures: bucket.slice(0, recentPerTemplate),
      }
    })
    .sort((a, b) => a.template.activity_name.localeCompare(b.template.activity_name))

  const total_required = rows.reduce((s, r) => s + r.required, 0)
  const total_actual = rows.reduce((s, r) => s + r.actual, 0)
  const complete_count = rows.filter((r) => r.actual >= r.required).length

  return {
    phase,
    rows,
    total_required,
    total_actual,
    total_percent: percent(total_actual, total_required),
    complete_count,
    incomplete_count: rows.length - complete_count,
  }
}

/**
 * Quick helper for the tiles / dashboards: single number summarizing
 * where the DIT is for their current phase.
 */
export function overallPhasePercent(summary: ActivityProgressSummary): number {
  return summary.total_percent
}
