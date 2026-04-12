import { redirect } from 'next/navigation'

import { toolsMapPathFromSearchParams } from '@/lib/map/tools-map-redirect'

export default async function MapLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  redirect(await toolsMapPathFromSearchParams(searchParams))
}
