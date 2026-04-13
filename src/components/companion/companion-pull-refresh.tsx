'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

const PULL_PATHS = ['/app/schedule', '/app/callout', '/app/forms']

export function CompanionPullRefresh({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const enabled = PULL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  const startY = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)
  const offsetRef = useRef(0)
  const [refreshing, setRefreshing] = useState(false)
  const scrollEl = useRef<HTMLDivElement>(null)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    router.refresh()
    window.setTimeout(() => setRefreshing(false), 800)
  }, [router])

  const threshold = 72

  const scrollArea = (
    <div
      ref={scrollEl}
      className="min-h-0 flex-1 overflow-y-auto"
      onTouchStart={
        enabled
          ? (e) => {
              const el = scrollEl.current
              if (!el) return
              if (el.scrollTop > 0) return
              startY.current = e.touches[0]?.clientY ?? null
            }
          : undefined
      }
      onTouchMove={
        enabled
          ? (e) => {
              if (startY.current == null) return
              const el = scrollEl.current
              if (!el || el.scrollTop > 0) return
              const y = e.touches[0]?.clientY ?? startY.current
              const dy = y - startY.current
              if (dy > 0) {
                const damped = Math.min(threshold * 1.2, dy * 0.45)
                offsetRef.current = damped
                setOffset(damped)
              }
            }
          : undefined
      }
      onTouchEnd={
        enabled
          ? () => {
              if (offsetRef.current >= threshold) {
                onRefresh()
              }
              offsetRef.current = 0
              setOffset(0)
              startY.current = null
            }
          : undefined
      }
      onTouchCancel={
        enabled
          ? () => {
              offsetRef.current = 0
              setOffset(0)
              startY.current = null
            }
          : undefined
      }
    >
      {children}
    </div>
  )

  if (!enabled) return scrollArea

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {refreshing || offset > 8 ? (
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center py-2 text-xs font-medium text-accent-primary"
          style={{ transform: `translateY(${Math.min(40, offset)}px)` }}
        >
          {refreshing ? 'Refreshing…' : offset >= threshold ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      ) : null}
      {scrollArea}
    </div>
  )
}
