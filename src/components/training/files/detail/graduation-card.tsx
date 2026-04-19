import Link from 'next/link'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import {
  fetchCertificateForDit,
  signCertificateDownloadUrl,
} from '@/lib/training/certificate-queries'

import { GraduationIssueButton } from './graduation-issue-button'

const STATUS_TONE: Record<'draft' | 'issued' | 'signed' | 'voided', string> = {
  draft: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30',
  issued: 'bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30',
  signed: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30',
  voided: 'bg-neutral-500/15 text-neutral-300 ring-1 ring-inset ring-neutral-500/30',
}

const STATUS_LABEL: Record<'draft' | 'issued' | 'signed' | 'voided', string> = {
  draft: 'Draft',
  issued: 'Issued — signatures pending',
  signed: 'Signed',
  voided: 'Voided',
}

export async function GraduationCard({ ditRecordId }: { ditRecordId: string }) {
  const session = await getSessionUserWithProfile()
  const canIssue = session ? isTrainingWriter(session.profile) : false

  const cert = await fetchCertificateForDit(ditRecordId)
  const downloadUrl = cert?.pdf_object_path
    ? await signCertificateDownloadUrl(cert.pdf_object_path)
    : null

  return (
    <section className="rounded-lg border border-border-subtle bg-bg-surface p-4 md:col-span-2 lg:col-span-3">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Graduation certificate
          </h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            Routed FTO Coordinator → Training Supervisor → Lieutenant → Captain.
          </p>
        </div>
        {cert ? (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_TONE[cert.status]}`}
          >
            {STATUS_LABEL[cert.status]}
          </span>
        ) : null}
      </header>

      {cert == null ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">
            No certificate yet. A draft is seeded automatically when week 10 is submitted cleanly,
            or a training writer can issue one manually.
          </p>
          {canIssue ? <GraduationIssueButton ditRecordId={ditRecordId} mode="create" /> : null}
        </div>
      ) : (
        <div className="space-y-3">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-4">
            <Field label="DIT" value={cert.dit_full_name ?? '—'} />
            <Field label="Badge" value={cert.dit_badge_number ?? '—'} />
            <Field label="Program" value={rangeLabel(cert.program_start_date, cert.program_end_date)} />
            <Field label="Effective grad" value={cert.effective_graduation_date ?? '—'} />
          </dl>

          <div className="flex flex-wrap items-center gap-3">
            {downloadUrl ? (
              <Link
                href={downloadUrl as never}
                target="_blank"
                rel="noopener"
                className="inline-flex h-8 items-center rounded-md border border-border-subtle px-3 text-xs font-medium text-text-primary transition hover:bg-bg-elevated"
              >
                Download PDF
              </Link>
            ) : null}
            {cert.signature_route_id ? (
              <Link
                href={`/training/settings` as never}
                className="text-xs font-medium text-accent-primary hover:underline"
              >
                Open signature inbox
              </Link>
            ) : null}
            {canIssue && (cert.status === 'draft' || cert.status === 'voided') ? (
              <GraduationIssueButton ditRecordId={ditRecordId} mode="issue" />
            ) : null}
            {canIssue && cert.status === 'issued' ? (
              <GraduationIssueButton ditRecordId={ditRecordId} mode="reissue" />
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-sm text-text-primary">{value}</dd>
    </div>
  )
}

function rangeLabel(start: string | null, end: string | null): string {
  if (!start && !end) return '—'
  return `${start ?? '—'} → ${end ?? '—'}`
}
