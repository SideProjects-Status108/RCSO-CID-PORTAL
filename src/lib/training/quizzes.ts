/**
 * Segment C helpers for diagnostic Quizzes.
 *
 * Thresholds are stored per-quiz (pass_threshold_green default 80,
 * pass_threshold_amber default 61). Anything below the amber threshold is
 * red. Quizzes are NON-GATING — the tier is a diagnostic signal, not a
 * progression gate. The UI surfaces it; the business rule is the
 * notification routing described in tierNotificationTargets() below.
 *
 * Notification routing (from the FTO binder):
 *   green  -> no routing; DIT + FTO see the result
 *   amber  -> FTO Coordinator is notified (in-app)
 *   red    -> BOTH FTO Coordinator AND Training Supervisor are notified
 */

import type {
  QuizTier,
  TrainingQuiz,
  TrainingQuizAttempt,
  TrainingQuizAttemptAnswer,
  TrainingQuizOption,
  TrainingQuizQuestion,
} from '@/types/training'

export function computeQuizTier(
  scorePercent: number,
  thresholds: Pick<TrainingQuiz, 'pass_threshold_green' | 'pass_threshold_amber'>
): QuizTier {
  if (scorePercent >= thresholds.pass_threshold_green) return 'green'
  if (scorePercent >= thresholds.pass_threshold_amber) return 'amber'
  return 'red'
}

export type QuizNotificationTargetRole =
  | 'fto_coordinator'
  | 'training_supervisor'

export function tierNotificationTargets(tier: QuizTier): QuizNotificationTargetRole[] {
  switch (tier) {
    case 'green':
      return []
    case 'amber':
      return ['fto_coordinator']
    case 'red':
      return ['fto_coordinator', 'training_supervisor']
  }
}

/**
 * Score an attempt given the question bank + the DIT's answers.
 *
 * Returns the percentage (0..100, rounded to 2 decimals), the count of
 * correct answers, and the derived tier. Questions with no answer count as
 * incorrect. Answers referencing a deleted option (option_id null) count
 * as incorrect.
 */
export function scoreAttempt(params: {
  questions: Pick<TrainingQuizQuestion, 'id'>[]
  options: Pick<TrainingQuizOption, 'id' | 'question_id' | 'is_correct'>[]
  answers: Pick<TrainingQuizAttemptAnswer, 'question_id' | 'option_id'>[]
  thresholds: Pick<TrainingQuiz, 'pass_threshold_green' | 'pass_threshold_amber'>
}): {
  correctCount: number
  totalCount: number
  scorePercent: number
  tier: QuizTier
  answerMarks: Map<string, boolean>
} {
  const { questions, options, answers, thresholds } = params
  const correctByQuestion = new Map<string, Set<string>>()
  for (const opt of options) {
    if (opt.is_correct) {
      const set = correctByQuestion.get(opt.question_id) ?? new Set<string>()
      set.add(opt.id)
      correctByQuestion.set(opt.question_id, set)
    }
  }

  const answerByQuestion = new Map<string, string | null>()
  for (const a of answers) {
    answerByQuestion.set(a.question_id, a.option_id)
  }

  const answerMarks = new Map<string, boolean>()
  let correct = 0
  for (const q of questions) {
    const chosen = answerByQuestion.get(q.id) ?? null
    const correctSet = correctByQuestion.get(q.id) ?? new Set<string>()
    const isCorrect = chosen != null && correctSet.has(chosen)
    answerMarks.set(q.id, isCorrect)
    if (isCorrect) correct += 1
  }

  const total = questions.length
  const scorePercent = total === 0 ? 0 : Math.round((correct / total) * 10000) / 100
  const tier = computeQuizTier(scorePercent, thresholds)
  return { correctCount: correct, totalCount: total, scorePercent, tier, answerMarks }
}

/**
 * Safe projection of quiz options to send to DITs — strips is_correct so the
 * answer key is never serialized to an untrusted client. Training writers
 * (staff reviewing results) use the raw row instead.
 */
export function sanitizeOptionsForTaker(
  options: TrainingQuizOption[]
): Omit<TrainingQuizOption, 'is_correct'>[] {
  return options.map(({ is_correct: _omit, ...rest }) => {
    void _omit
    return rest
  })
}

/** True if the attempt is finalized (success or abandoned). */
export function isAttemptClosed(
  attempt: Pick<TrainingQuizAttempt, 'status'>
): boolean {
  return attempt.status !== 'in_progress'
}
