import Link from 'next/link'
import { ArrowLeft, BadgeCheck, Mail, Phone } from 'lucide-react'

import type { DitDetailPayload } from '@/lib/training/dit-detail'

export function DitDetailHeader({ payload }: { payload: DitDetailPayload }) {
  const { profile, record, activePairing } = payload
  const started = record.start_date || null

  return (
    <header className="space-y-3">
      <Link
        href="/training/dit-files"
        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-3 w-3" />
        All DIT Files
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
            {profile.full_name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
            {profile.badge_number ? (
              <span className="inline-flex items-center gap-1">
                <BadgeCheck className="h-3 w-3" />
                Badge #{profile.badge_number}
              </span>
            ) : null}
            {profile.email ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {profile.email}
              </span>
            ) : null}
            {profile.phone_cell ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {profile.phone_cell}
              </span>
            ) : null}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-xs">
          <dt className="text-text-tertiary">Phase</dt>
          <dd className="font-semibold text-text-primary">{record.current_phase}</dd>
          <dt className="text-text-tertiary">Start date</dt>
          <dd className="font-semibold text-text-primary">{started ?? '—'}</dd>
          <dt className="text-text-tertiary">Active FTO</dt>
          <dd className="font-semibold text-text-primary">
            {activePairing ? activePairing.fto_name : '—'}
          </dd>
        </dl>
      </div>
    </header>
  )
}
