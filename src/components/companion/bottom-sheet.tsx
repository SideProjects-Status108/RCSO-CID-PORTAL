'use client'

import { useEffect } from 'react'

import { cn } from '@/lib/utils'

export type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** Sticky footer (e.g. primary action) */
  footer?: React.ReactNode
  /** Extra class on the sliding panel */
  panelClassName?: string
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  panelClassName,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-200',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close sheet"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative flex max-h-[min(85dvh,560px)] w-full flex-col rounded-t-xl border-t border-border-subtle bg-bg-surface shadow-2xl transition-transform duration-200 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
          panelClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex shrink-0 flex-col items-center border-b border-border-subtle bg-bg-surface px-4 pb-2 pt-2">
          <div className="mb-2 h-1 w-10 rounded-full bg-border-subtle" aria-hidden />
          {title ? (
            <p className="w-full text-center font-heading text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {title}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4',
            footer ? 'pb-2' : 'pb-8'
          )}
        >
          {children}
        </div>
        {footer ? (
          <div className="sticky bottom-0 border-t border-border-subtle bg-bg-surface p-4 pt-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
