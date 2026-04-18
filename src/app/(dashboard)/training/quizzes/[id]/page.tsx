import { notFound, redirect } from 'next/navigation'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import {
  fetchOptionsForQuestions,
  fetchQuizById,
  fetchQuizQuestions,
} from '@/lib/training/quiz-queries'
import { sanitizeOptionsForTaker } from '@/lib/training/quizzes'

import { QuizDetailClient } from './detail-client'

export const dynamic = 'force-dynamic'

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const quiz = await fetchQuizById(id)
  if (!quiz) notFound()

  const writer = isTrainingWriter(session.profile)
  if (!writer && !quiz.is_published) notFound()

  const questions = await fetchQuizQuestions(id)
  const rawOptions = await fetchOptionsForQuestions(questions.map((q) => q.id))
  const options = writer ? rawOptions : sanitizeOptionsForTaker(rawOptions)

  return (
    <QuizDetailClient
      quiz={quiz}
      questions={questions}
      options={options}
      isWriter={writer}
    />
  )
}
