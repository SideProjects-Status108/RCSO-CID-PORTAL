import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { fetchPublicSurveyByToken } from '@/lib/training/vark'

import { SurveyForm } from './survey-form'

type PageProps = { params: Promise<{ token: string }> }

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Training survey | CID PORTAL',
}

export default async function PublicSurveyPage({ params }: PageProps) {
  const { token } = await params
  const ctx = await fetchPublicSurveyByToken(token)
  if (!ctx) notFound()

  const expired =
    ctx.status === 'expired' || new Date(ctx.expiresAt) < new Date()

  return (
    <div className="min-h-screen bg-bg-app px-4 py-10 md:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
            RCSO Detective Training Program
          </p>
          <h1 className="font-heading text-2xl font-semibold text-text-primary">
            Pre-start learning-style survey
          </h1>
          <p className="mx-auto max-w-lg text-sm text-text-secondary">
            This short survey helps your Field Training Officer tailor coaching to how you learn
            best. There are no right or wrong answers — just pick the option that feels most like
            you. Takes about 5 minutes.
          </p>
        </header>

        {ctx.status === 'completed' ? (
          <CompletedPanel ditName={ctx.ditName} />
        ) : expired ? (
          <ExpiredPanel />
        ) : (
          <SurveyForm
            token={token}
            questions={ctx.questions}
            ditName={ctx.ditName}
          />
        )}
      </div>
    </div>
  )
}

function CompletedPanel({ ditName }: { ditName: string | null }) {
  return (
    <section className="rounded-xl border border-border-subtle bg-bg-surface p-6 text-center">
      <h2 className="font-heading text-lg font-semibold text-text-primary">Thank you!</h2>
      <p className="mt-2 text-sm text-text-secondary">
        {ditName ? `${ditName}, y` : 'Y'}our survey has already been submitted. Your FTO Coordinator
        will review the results before your training starts.
      </p>
    </section>
  )
}

function ExpiredPanel() {
  return (
    <section className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-6 text-center">
      <h2 className="font-heading text-lg font-semibold text-text-primary">Link expired</h2>
      <p className="mt-2 text-sm text-text-secondary">
        This survey link is no longer active. Please contact your FTO Coordinator to request a new
        link.
      </p>
    </section>
  )
}
