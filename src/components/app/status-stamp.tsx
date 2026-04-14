import { cn } from '@/lib/utils'

type StatusStampProps = {
  children: string
  variant?: 'neutral' | 'teal' | 'gold' | 'primary' | 'muted' | 'danger'
  className?: string
}

const variants: Record<NonNullable<StatusStampProps['variant']>, string> = {
  neutral: 'border-border-subtle bg-bg-elevated text-text-secondary',
  teal: 'border-accent-teal/50 bg-accent-teal/10 text-accent-teal',
  gold: 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold',
  primary: 'border-accent-primary/45 bg-accent-primary-muted text-accent-primary',
  muted: 'border-border-subtle bg-bg-app text-text-disabled',
  danger: 'border-danger/50 bg-danger/10 text-danger',
}

export function StatusStamp({
  children,
  variant = 'neutral',
  className,
}: StatusStampProps) {
  return (
    <span
      className={cn(
        'inline-block border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
