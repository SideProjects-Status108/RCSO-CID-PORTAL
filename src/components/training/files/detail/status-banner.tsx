import { AlertCircle, CheckCircle2, CircleSlash, Clock, Pause } from 'lucide-react'

import type { DitRecordStatus } from '@/types/training'

const STATUS_META: Record<
  DitRecordStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    Icon: CheckCircle2,
  },
  suspended: {
    label: 'Suspended (absence)',
    className: 'bg-neutral-500/10 text-neutral-200 border-neutral-500/30',
    Icon: Pause,
  },
  on_hold: {
    label: 'On hold',
    className: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
    Icon: Clock,
  },
  graduated: {
    label: 'Graduated',
    className: 'bg-accent-primary/10 text-accent-primary border-accent-primary/20',
    Icon: CheckCircle2,
  },
  separated: {
    label: 'Separated',
    className: 'bg-red-500/10 text-red-300 border-red-500/20',
    Icon: CircleSlash,
  },
}

export function DitStatusBanner({
  status,
  expectedGraduationDate,
  openAbsenceNote,
}: {
  status: DitRecordStatus
  expectedGraduationDate: string | null
  openAbsenceNote?: string | null
}) {
  const meta = STATUS_META[status]
  const Icon = meta.Icon

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm ${meta.className}`}
      role="status"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="font-semibold">{meta.label}</span>
      {status === 'suspended' && openAbsenceNote ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-xs">
          <AlertCircle className="h-3 w-3" />
          {openAbsenceNote}
        </span>
      ) : null}
      {expectedGraduationDate ? (
        <span className="ml-auto text-xs opacity-80">
          Expected graduation: {expectedGraduationDate}
        </span>
      ) : null}
    </div>
  )
}
