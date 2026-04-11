import { cn } from '@/lib/utils'
import type { ScheduleEventType } from '@/types/schedule'

const styles: Record<ScheduleEventType, string> = {
  regular: 'border-accent-teal/40 bg-accent-teal/15 text-accent-teal',
  on_call: 'border-accent-gold/50 bg-accent-gold/15 text-accent-gold',
  vacation: 'border-purple-500/30 bg-purple-500/10 text-purple-200',
  school: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  in_service: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  fto_shift: 'border-orange-500/35 bg-orange-500/10 text-orange-200',
}

const labels: Record<ScheduleEventType, string> = {
  regular: 'Regular',
  on_call: 'On-call',
  vacation: 'Vacation',
  school: 'School',
  in_service: 'In-service',
  fto_shift: 'FTO shift',
}

type EventTypeBadgeProps = {
  type: ScheduleEventType
  className?: string
}

export function EventTypeBadge({ type, className }: EventTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
        styles[type],
        className
      )}
    >
      {labels[type]}
    </span>
  )
}
