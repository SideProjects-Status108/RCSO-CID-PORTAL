'use client'

import dynamic from 'next/dynamic'

import type { FieldMapProps } from '@/components/map/field-map'

const FieldMapLazy = dynamic(
  () => import('@/components/map/field-map').then((m) => m.FieldMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100dvh-12rem)] min-h-[22rem] items-center justify-center rounded-lg border border-border-subtle bg-bg-surface text-sm text-text-secondary md:h-[calc(100dvh-13rem)]">
        Loading map…
      </div>
    ),
  }
)

export function FieldMapDynamic(props: FieldMapProps) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <FieldMapLazy {...props} />
    </div>
  )
}
