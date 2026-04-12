import { redirect } from 'next/navigation'

import { toolsMapPathFromSearchParams } from '@/lib/map/tools-map-redirect'

/**
 * Companion entry for deep links with `?address=…` → forwards to desktop field map.
 * Otherwise shows the Phase 7C placeholder.
 */
export default async function CompanionMapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const addr = typeof sp.address === 'string' ? sp.address.trim() : ''
  if (addr) {
    redirect(await toolsMapPathFromSearchParams(Promise.resolve(sp)))
  }

  return (
    <div className="py-8">
      <h1 className="font-heading text-lg font-semibold uppercase tracking-wide text-text-primary">
        Field map
      </h1>
      <p className="mt-2 text-sm text-text-secondary">Map (coming in 7C)</p>
    </div>
  )
}
