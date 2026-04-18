import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import { listQuizzes } from '@/lib/training/quiz-queries'

import { NewQuizForm } from './new-quiz-form'

export const dynamic = 'force-dynamic'

export default async function QuizzesIndexPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const writer = isTrainingWriter(session.profile)
  const quizzes = await listQuizzes({ publishedOnly: !writer })

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
          Training Quizzes
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
          Diagnostic quizzes. Non-gating — results route to coordinator (amber) or coordinator +
          training supervisor (red) when the DIT drops below the green threshold.
        </p>
      </header>

      {writer ? <NewQuizForm /> : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-primary">
          {writer ? 'All quizzes' : 'Available quizzes'}
        </h2>
        {quizzes.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No quizzes {writer ? 'yet. Create one above to get started.' : 'are currently published.'}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {quizzes.map((q) => (
              <li key={q.id}>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="text-sm text-text-primary">
                      {q.title}
                      {!q.is_published ? (
                        <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                          Draft
                        </span>
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-text-secondary">
                    {q.description ? <p>{q.description}</p> : null}
                    <p>
                      Thresholds: green ≥ {q.pass_threshold_green}% · amber ≥{' '}
                      {q.pass_threshold_amber}%
                    </p>
                    <Link
                      href={`/training/quizzes/${q.id}`}
                      className="inline-block text-accent-primary hover:underline"
                    >
                      {writer ? 'Manage' : 'Take quiz'} →
                    </Link>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
