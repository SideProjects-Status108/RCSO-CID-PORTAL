import { EventTypeBadge } from '@/components/app/event-type-badge'
import type { ScheduleEventType } from '@/types/schedule'
import { cn } from '@/lib/utils'

/** Compact event type chip — same colors as desktop `EventTypeBadge`. */
export function CompanionEventTypeBadge({
  type,
  className,
}: {
  type: ScheduleEventType
  className?: string
}) {
  return (
    <EventTypeBadge
      type={type}
      className={cn('px-1.5 py-0 text-[10px] leading-tight', className)}
    />
  )
}
