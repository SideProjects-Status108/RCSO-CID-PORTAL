import { StatusStamp } from '@/components/app/status-stamp'
import type { DitRecordStatus, OverallRating } from '@/types/training'
import { cn } from '@/lib/utils'

export function overallRatingStamp(r: OverallRating) {
  switch (r) {
    case 'excellent':
      return <StatusStamp variant="gold">Excellent</StatusStamp>
    case 'satisfactory':
      return <StatusStamp variant="teal">Satisfactory</StatusStamp>
    case 'needs_improvement':
      return (
        <StatusStamp
          variant="neutral"
          className="border-amber-500/50 bg-amber-500/10 text-amber-200"
        >
          Needs improvement
        </StatusStamp>
      )
    case 'unsatisfactory':
      return <StatusStamp variant="danger">Unsatisfactory</StatusStamp>
    default:
      return <StatusStamp variant="neutral">{r}</StatusStamp>
  }
}

export function ditStatusStamp(status: DitRecordStatus) {
  switch (status) {
    case 'active':
      return <StatusStamp variant="teal">Active</StatusStamp>
    case 'on_hold':
      return <StatusStamp variant="neutral">On hold</StatusStamp>
    case 'graduated':
      return <StatusStamp variant="gold">Graduated</StatusStamp>
    case 'separated':
      return <StatusStamp variant="muted">Separated</StatusStamp>
    default:
      return <StatusStamp variant="neutral">{status}</StatusStamp>
  }
}

export function phaseBadge(phase: number, className?: string) {
  const cls =
    phase >= 3
      ? 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold'
      : phase >= 2
        ? 'border-accent-teal/40 bg-accent-teal/10 text-accent-teal'
        : 'border-blue-400/35 bg-blue-950/50 text-blue-100/90'
  return (
    <span className={cn('rounded px-2 py-0.5 text-xs font-semibold', cls, className)}>
      Phase {phase}
    </span>
  )
}
