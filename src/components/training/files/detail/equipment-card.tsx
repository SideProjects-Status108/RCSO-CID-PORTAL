import Link from 'next/link'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import { fetchEquipmentCheckoffForDit } from '@/lib/training/equipment-queries'

import { EquipmentChecklistClient } from './equipment-checklist-client'

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

export async function EquipmentCard({ ditRecordId }: { ditRecordId: string }) {
  const session = await getSessionUserWithProfile()
  const canWrite = session ? isTrainingWriter(session.profile) : false

  const row = await fetchEquipmentCheckoffForDit(ditRecordId)

  return (
    <section className="rounded-lg border border-border-subtle bg-bg-surface p-4 md:col-span-2 lg:col-span-3">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Equipment check-off
          </h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            Routed FTO Coordinator → Training Supervisor → Lieutenant. Final at LT.
          </p>
        </div>
        {row ? (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_TONE[row.status]}`}
          >
            {STATUS_LABEL[row.status]}
          </span>
        ) : null}
      </header>

      <EquipmentChecklistClient
        ditRecordId={ditRecordId}
        initial={row}
        canWrite={canWrite}
      />

      {row?.signature_route_id ? (
        <div className="mt-3">
          <Link
            href={'/training/settings' as never}
            className="text-xs font-medium text-accent-primary hover:underline"
          >
            Open signature inbox
          </Link>
        </div>
      ) : null}
    </section>
  )
}
