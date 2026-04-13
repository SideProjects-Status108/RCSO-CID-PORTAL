'use client'

import { RefreshCw } from 'lucide-react'

import { CompanionCard } from '@/components/companion/companion-card'

export default function CompanionAppError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="py-6">
      <CompanionCard
        role="button"
        tabIndex={0}
        className="flex cursor-pointer items-center gap-3 border-danger/30 bg-bg-elevated/40 p-4"
        onClick={() => reset()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            reset()
          }
        }}
      >
        <RefreshCw className="size-6 shrink-0 text-accent-primary" strokeWidth={1.75} />
        <div>
          <p className="font-heading text-sm font-semibold text-text-primary">Something went wrong</p>
          <p className="mt-0.5 font-sans text-xs text-text-secondary">Tap to retry</p>
        </div>
      </CompanionCard>
    </div>
  )
}
