'use client'

import { useEffect } from 'react'

import { cn } from '@/lib/utils'

export type CompanionFlashTone = 'success' | 'error'

export function CompanionFlash({
  message,
  tone,
  onDismiss,
  autoHideMs = 5000,
}: {
  message: string | null
  tone: CompanionFlashTone
  onDismiss: () => void
  autoHideMs?: number
}) {
  useEffect(() => {
    if (!message || autoHideMs <= 0) return
    const t = window.setTimeout(onDismiss, autoHideMs)
    return () => window.clearTimeout(t)
  }, [message, autoHideMs, onDismiss])

  if (!message) return null

  return (
    <div
      role="status"
      className={cn(
        'mb-4 rounded-md border px-3 py-2 text-sm',
        tone === 'success'
          ? 'border-accent-teal/40 bg-accent-teal/10 text-text-primary'
          : 'border-danger/40 bg-danger/10 text-danger'
      )}
    >
      {message}
    </div>
  )
}
