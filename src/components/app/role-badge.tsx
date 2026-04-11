import { cn } from '@/lib/utils'
import type { UserRoleValue } from '@/lib/auth/roles'

type RoleBadgeProps = {
  role: UserRoleValue
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const label = role.replaceAll('_', ' ')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border border-border-subtle bg-bg-elevated px-2 py-0.5 text-xs font-medium capitalize text-text-secondary',
        className
      )}
    >
      {label}
    </span>
  )
}
