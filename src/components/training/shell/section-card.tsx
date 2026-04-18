import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type SectionCardProps = {
  title: string
  description: string
  icon?: LucideIcon
  href?: string
  /**
   * Optional right-column content (stats, badges). Prefer keeping this short so
   * the cards align cleanly in the 2/3-column grid.
   */
  aside?: React.ReactNode
  /** Inline content under the description (renders the full card as a block, no link). */
  children?: React.ReactNode
  className?: string
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  href,
  aside,
  children,
  className,
}: SectionCardProps) {
  const body = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon ? (
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-bg-app/60 text-accent-primary"
            >
              <Icon className="size-4" strokeWidth={1.75} />
            </span>
          ) : null}
          <h2 className="font-heading text-sm font-semibold tracking-wide text-text-primary">
            {title}
          </h2>
        </div>
        {aside ? <div className="shrink-0 text-xs text-text-secondary">{aside}</div> : null}
      </div>
      <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
      {children ? <div className="mt-auto pt-1">{children}</div> : null}
    </div>
  )

  const base = cn(
    'group flex h-full flex-col rounded-xl border border-border-subtle bg-bg-surface p-4 text-left transition-colors',
    href && 'hover:border-accent-primary/40 hover:bg-bg-elevated/60',
    className
  )

  if (href && !children) {
    return (
      <Link href={href} className={base}>
        {body}
      </Link>
    )
  }
  return <div className={base}>{body}</div>
}
