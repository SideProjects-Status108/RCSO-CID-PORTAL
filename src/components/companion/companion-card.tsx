import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function CompanionCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-border-subtle bg-bg-surface p-4', className)}
      {...props}
    />
  )
}
