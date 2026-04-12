import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { fetchSharedFieldNoteByToken } from '@/lib/field-notes/queries'

type PageProps = { params: Promise<{ token: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const note = await fetchSharedFieldNoteByToken(token)
  if (!note) return { title: 'Field note | CID PORTAL' }
  return { title: `${note.title} | Field note (shared)` }
}

function FieldBlock({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null
  return (
    <section className="space-y-2">
      <h2 className="font-heading text-xs font-medium uppercase tracking-wide text-accent-primary">
        {label}
      </h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{value.trim()}</p>
    </section>
  )
}

export default async function SharedFieldNotePage({ params }: PageProps) {
  const { token } = await params
  const note = await fetchSharedFieldNoteByToken(token)
  if (!note) notFound()

  return (
    <div className="min-h-full bg-bg-app px-4 py-10 md:px-8">
      <div className="mx-auto max-w-3xl space-y-8 rounded-xl border border-border-subtle bg-bg-surface p-6 md:p-10">
        <header className="space-y-2 border-b border-border-subtle pb-6">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
            CID PORTAL — shared field note (read-only)
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-wide text-text-primary">
            {note.title}
          </h1>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary">
            {note.incident_date ? (
              <div>
                <dt className="inline font-medium text-text-primary">Incident date: </dt>
                <dd className="inline">
                  {new Date(note.incident_date + 'T12:00:00').toLocaleDateString()}
                </dd>
              </div>
            ) : null}
            {note.location_description?.trim() ? (
              <div>
                <dt className="inline font-medium text-text-primary">Location: </dt>
                <dd className="inline">{note.location_description.trim()}</dd>
              </div>
            ) : null}
          </dl>
        </header>

        <div className="space-y-8">
          <FieldBlock label="Narrative" value={note.narrative} />
          <FieldBlock label="Evidence & observations" value={note.evidence_notes} />
          <FieldBlock label="Persons of interest" value={note.persons_of_interest} />
          <FieldBlock label="Follow-up actions" value={note.follow_up_actions} />
        </div>

        <p className="border-t border-border-subtle pt-6 text-center text-xs text-text-secondary">
          This link was shared by an authorized investigator.{' '}
          <Link href="/login" className="text-accent-primary hover:underline">
            Staff sign-in
          </Link>
        </p>
      </div>
    </div>
  )
}
