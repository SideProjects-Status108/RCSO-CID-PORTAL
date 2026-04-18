'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  TrainingQuiz,
  TrainingQuizOption,
  TrainingQuizQuestion,
} from '@/types/training'

type Props = {
  quiz: TrainingQuiz
  questions: TrainingQuizQuestion[]
  options: Array<Omit<TrainingQuizOption, 'is_correct'> & { is_correct?: boolean }>
  isWriter: boolean
}

export function QuizDetailClient({ quiz, questions, options, isWriter }: Props) {
  if (isWriter) return <AuthorView quiz={quiz} questions={questions} options={options} />
  return <TakeView quiz={quiz} questions={questions} options={options} />
}

/* --------------------------- Author ------------------------------------ */

function AuthorView({
  quiz,
  questions,
  options,
}: {
  quiz: TrainingQuiz
  questions: TrainingQuizQuestion[]
  options: Array<Omit<TrainingQuizOption, 'is_correct'> & { is_correct?: boolean }>
}) {
  const [published, setPublished] = useState(quiz.is_published)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [prompt, setPrompt] = useState('')
  const [explanation, setExplanation] = useState('')
  const [newOptions, setNewOptions] = useState<
    Array<{ label: string; is_correct: boolean }>
  >([
    { label: '', is_correct: false },
    { label: '', is_correct: false },
    { label: '', is_correct: false },
    { label: '', is_correct: false },
  ])

  const togglePublish = () => {
    start(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/training/quizzes/${quiz.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_published: !published }),
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? 'Failed to update')
        }
        setPublished(!published)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update')
      }
    })
  }

  const addQuestion = () => {
    if (prompt.trim().length < 3) {
      setError('Question prompt is required')
      return
    }
    const filled = newOptions.filter((o) => o.label.trim().length > 0)
    if (filled.length < 2) {
      setError('Provide at least 2 answer options')
      return
    }
    if (!filled.some((o) => o.is_correct)) {
      setError('Mark at least one option as correct')
      return
    }
    start(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/training/quizzes/${quiz.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            add_question: {
              prompt: prompt.trim(),
              display_order: questions.length + 1,
              explanation: explanation.trim() || null,
              options: filled.map((o, i) => ({
                label: o.label.trim(),
                is_correct: o.is_correct,
                display_order: i + 1,
              })),
            },
          }),
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? 'Failed to add question')
        }
        window.location.reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add question')
      }
    })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
          {quiz.title}
        </h1>
        {quiz.description ? <p className="text-sm text-text-secondary">{quiz.description}</p> : null}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-text-secondary">
            Thresholds: green ≥ {quiz.pass_threshold_green}% · amber ≥ {quiz.pass_threshold_amber}%
          </span>
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={togglePublish}>
            {published ? 'Unpublish' : 'Publish'}
          </Button>
          <span
            className={`rounded px-2 py-0.5 text-[11px] uppercase tracking-wide ${
              published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
            }`}
          >
            {published ? 'Published' : 'Draft'}
          </span>
        </div>
      </header>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">
          Questions ({questions.length})
        </h2>
        {questions.length === 0 ? (
          <p className="text-sm text-text-secondary">No questions yet.</p>
        ) : (
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li key={q.id}>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="text-sm text-text-primary">
                      {i + 1}. {q.prompt}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs text-text-secondary">
                    {options
                      .filter((o) => o.question_id === q.id)
                      .map((o) => (
                        <div key={o.id} className="flex items-center gap-2">
                          <span
                            className={`inline-block size-2 rounded-full ${
                              o.is_correct ? 'bg-emerald-400' : 'bg-border-subtle'
                            }`}
                          />
                          <span className={o.is_correct ? 'text-emerald-300' : ''}>
                            {o.label}
                          </span>
                        </div>
                      ))}
                    {q.explanation ? (
                      <p className="mt-2 text-[11px] italic text-text-secondary">
                        Explanation: {q.explanation}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm text-text-primary">Add a question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="qp">Prompt</Label>
            <Textarea
              id="qp"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Options (mark one or more correct)</Label>
            {newOptions.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={o.is_correct}
                  onChange={(e) =>
                    setNewOptions((prev) =>
                      prev.map((x, j) => (i === j ? { ...x, is_correct: e.target.checked } : x))
                    )
                  }
                />
                <Input
                  value={o.label}
                  placeholder={`Option ${i + 1}`}
                  onChange={(e) =>
                    setNewOptions((prev) =>
                      prev.map((x, j) => (i === j ? { ...x, label: e.target.value } : x))
                    )
                  }
                />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="qe">Explanation (optional)</Label>
            <Textarea
              id="qe"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Button type="button" disabled={pending} onClick={addQuestion}>
              {pending ? 'Saving…' : 'Add question'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* --------------------------- Take ------------------------------------- */

function TakeView({
  quiz,
  questions,
  options,
}: {
  quiz: TrainingQuiz
  questions: TrainingQuizQuestion[]
  options: Array<Omit<TrainingQuizOption, 'is_correct'>>
}) {
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{
    tier: 'green' | 'amber' | 'red'
    score_percent: number
    correct_count: number
    total_count: number
    notification_targets: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const startAttempt = () => {
    start(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/training/quizzes/${quiz.id}/attempts`, { method: 'POST' })
        const j = (await res.json()) as { error?: string; attempt?: { id: string } }
        if (!res.ok || !j.attempt) throw new Error(j.error ?? 'Failed to start attempt')
        setAttemptId(j.attempt.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start attempt')
      }
    })
  }

  const submit = () => {
    if (!attemptId) return
    start(async () => {
      setError(null)
      try {
        const payload = {
          answers: questions.map((q) => ({
            question_id: q.id,
            option_id: answers[q.id] ?? null,
          })),
        }
        const res = await fetch(`/api/training/quiz-attempts/${attemptId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const j = (await res.json()) as {
          error?: string
          attempt?: { tier: 'green' | 'amber' | 'red'; score_percent: number }
          correct_count?: number
          total_count?: number
          notification_targets?: string[]
        }
        if (!res.ok || !j.attempt) throw new Error(j.error ?? 'Failed to submit')
        setResult({
          tier: j.attempt.tier,
          score_percent: j.attempt.score_percent,
          correct_count: j.correct_count ?? 0,
          total_count: j.total_count ?? questions.length,
          notification_targets: j.notification_targets ?? [],
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to submit')
      }
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold text-text-primary">{quiz.title}</h1>
        {quiz.description ? (
          <p className="mt-1 text-sm text-text-secondary">{quiz.description}</p>
        ) : null}
      </header>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {result ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-text-primary">Your result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Score: {result.score_percent}% ({result.correct_count}/{result.total_count} correct)
            </p>
            <p>
              Tier:{' '}
              <span
                className={`rounded px-2 py-0.5 text-xs uppercase tracking-wide ${
                  result.tier === 'green'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : result.tier === 'amber'
                      ? 'bg-amber-500/10 text-amber-300'
                      : 'bg-red-500/15 text-red-300'
                }`}
              >
                {result.tier}
              </span>
            </p>
            {result.notification_targets.length > 0 ? (
              <p className="text-xs text-text-secondary">
                Notified: {result.notification_targets.join(', ')}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : !attemptId ? (
        <Button type="button" disabled={pending} onClick={startAttempt}>
          {pending ? 'Starting…' : 'Start quiz'}
        </Button>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <Card key={q.id} size="sm">
              <CardHeader>
                <CardTitle className="text-sm text-text-primary">
                  {i + 1}. {q.prompt}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <fieldset className="space-y-2">
                  {options
                    .filter((o) => o.question_id === q.id)
                    .map((o) => (
                      <label key={o.id} className="flex cursor-pointer items-start gap-2 text-sm">
                        <input
                          type="radio"
                          name={q.id}
                          value={o.id}
                          checked={answers[q.id] === o.id}
                          onChange={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: o.id }))
                          }
                          className="mt-1"
                        />
                        <span className="text-text-primary">{o.label}</span>
                      </label>
                    ))}
                </fieldset>
              </CardContent>
            </Card>
          ))}
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? 'Submitting…' : 'Submit quiz'}
          </Button>
        </div>
      )}
    </div>
  )
}
