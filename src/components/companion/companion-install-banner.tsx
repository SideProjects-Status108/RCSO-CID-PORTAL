'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function CompanionInstallBanner() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [standalone, setStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    const sync = () => setStandalone(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  if (!isMobile || standalone || dismissed || !deferred) return null

  return (
    <div className="border-b border-border-subtle bg-bg-elevated/80 px-3 py-2">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className={cn(
            'min-h-11 flex-1 rounded-md border border-accent-primary/30 bg-accent-primary/15 px-3 py-2 text-left text-sm text-text-primary',
            'active:bg-accent-primary/25'
          )}
          onClick={async () => {
            try {
              await deferred.prompt()
              await deferred.userChoice
            } catch {
              /* ignore */
            } finally {
              setDeferred(null)
            }
          }}
        >
          <span className="font-medium text-accent-primary">Install CID Portal</span>
          <span className="mt-0.5 block text-xs text-text-secondary">
            Add to your home screen for quick access
          </span>
        </button>
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border-subtle text-text-secondary hover:bg-bg-app"
          aria-label="Dismiss install prompt"
          onClick={() => setDismissed(true)}
        >
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
