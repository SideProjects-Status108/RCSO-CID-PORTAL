import { notFound, redirect } from 'next/navigation'

import { fetchSubmissionDetail } from '@/lib/forms/queries'
import { submissionStatusForStamp } from '@/lib/forms/submission-status-display'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import type { FormFieldDefinition } from '@/types/forms'
import { FormPrintToolbar } from '@/components/forms/form-print-toolbar'

export const dynamic = 'force-dynamic'

function groupBySection(fields: FormFieldDefinition[]) {
  const map = new Map<string, FormFieldDefinition[]>()
  for (const f of fields) {
    const s = f.section?.trim() || 'General'
    if (!map.has(s)) map.set(s, [])
    map.get(s)!.push(f)
  }
  return [...map.entries()]
}

function displayValue(field: FormFieldDefinition, value: unknown): string {
  if (field.type === 'checkbox') return value === true ? 'Yes' : 'No'
  if (value === null || value === undefined) return '—'
  const s = String(value).trim()
  return s.length ? s : '—'
}

export default async function FormSubmissionPrintPage({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const { submissionId } = await params
  const detail = await fetchSubmissionDetail(submissionId)
  if (!detail) notFound()

  const supervision = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])
  if (!supervision && detail.submission.submitted_by !== session.user.id) {
    notFound()
  }

  const stamp = submissionStatusForStamp(detail.submission.status)
  const sections = groupBySection(detail.template.fields_schema)
  const isDraft = detail.submission.status === 'draft'

  return (
    <div className="relative mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-8 print:py-6">
      {isDraft ? (
        <div
          className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center print:flex"
          aria-hidden
        >
          <span className="-rotate-[35deg] select-none text-[4.5rem] font-bold uppercase tracking-widest text-neutral-300/90 print:text-neutral-400/80">
            Draft
          </span>
        </div>
      ) : null}

      <div className="relative z-10">
        <FormPrintToolbar />

        <header className="border-b-2 border-neutral-800 pb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
            Rutherford County Sheriff&apos;s Office
          </p>
          <p className="text-lg font-bold uppercase tracking-wide text-neutral-900">
            Criminal Investigation Division
          </p>
          <h1 className="mt-3 text-xl font-semibold text-neutral-900">{detail.template.name}</h1>
          <p className="mt-2 font-mono text-sm text-neutral-700">
            Generated {new Date(detail.submission.updated_at).toLocaleString()}
          </p>
        </header>

        <div className="mt-8 space-y-8 text-sm text-neutral-900">
          {sections.map(([sectionName, fields]) => (
            <section key={sectionName} className="break-inside-avoid">
              <h2 className="mb-3 border-b border-neutral-300 pb-1 text-xs font-bold uppercase tracking-wide text-neutral-700">
                {sectionName}
              </h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.id} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <dt className="text-xs font-semibold uppercase text-neutral-600">{f.label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap border-b border-dotted border-neutral-200 pb-1 font-serif text-base text-neutral-900">
                      {displayValue(f, detail.submission.form_data[f.id])}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t-2 border-neutral-800 pt-4 text-center text-xs text-neutral-700">
          <p>
            Submitted by <strong>{detail.submitter_name}</strong> on{' '}
            {new Date(detail.submission.created_at).toLocaleString()} | Status:{' '}
            <strong className="font-mono uppercase">{stamp.label}</strong>
          </p>
          {detail.case_number ? (
            <p className="mt-1 font-mono">Case: {detail.case_number}</p>
          ) : null}
        </footer>
      </div>
    </div>
  )
}
