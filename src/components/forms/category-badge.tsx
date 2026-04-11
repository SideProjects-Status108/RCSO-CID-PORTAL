import { cn } from '@/lib/utils'

const categoryStyles: Record<string, string> = {
  case: 'border-violet-500/35 bg-violet-500/10 text-violet-200',
  administrative: 'border-amber-600/35 bg-amber-600/10 text-amber-100',
  training: 'border-emerald-600/35 bg-emerald-600/10 text-emerald-100',
  personnel: 'border-rose-500/35 bg-rose-500/10 text-rose-100',
}

export function CategoryBadge({
  category,
  className,
}: {
  category: string | null
  className?: string
}) {
  const key = (category ?? '').toLowerCase() || 'other'
  const style = categoryStyles[key] ?? 'border-border-subtle bg-bg-elevated text-text-secondary'
  const label = category?.replaceAll('_', ' ') || 'General'

  return (
    <span
      className={cn(
        'inline-block rounded border px-2 py-0.5 text-[11px] font-medium capitalize',
        style,
        className
      )}
    >
      {label}
    </span>
  )
}
