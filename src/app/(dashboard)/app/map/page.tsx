import { redirect } from 'next/navigation'

import { toolsMapPathFromSearchParams } from '@/lib/map/tools-map-redirect'

/**
 * Companion app entry — forwards to `/tools/map` with the same query string.
 *
 * Typical call-out deep link:
 *   `/app/map?address=${encodeURIComponent(address)}` plus optional:
 *   `calloutTitle`, `calloutDescription`, `calloutUrgency`, `calloutStatus`
 * (same pattern as desktop Requests → GeoMap).
 */
export default async function CompanionMapEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  redirect(await toolsMapPathFromSearchParams(searchParams))
}
