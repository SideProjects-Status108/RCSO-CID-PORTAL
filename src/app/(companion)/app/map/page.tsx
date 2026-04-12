import { redirect } from 'next/navigation'

import type { FieldMapCalloutOverlay } from '@/components/map/field-map'
import { CompanionMap } from '@/components/companion/CompanionMap'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { fetchCaseTypes } from '@/lib/operations/queries'
import { fetchCaseMapMarkers, fetchCallOutMapMarkers, fetchMapPolygons } from '@/lib/map/queries'

export const dynamic = 'force-dynamic'

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const v = sp[key]
  if (Array.isArray(v)) return v[0]
  return v
}

function buildCalloutOverlay(
  sp: Record<string, string | string[] | undefined>
): FieldMapCalloutOverlay | null {
  const title = firstSearchParam(sp, 'calloutTitle')?.trim()
  const description = firstSearchParam(sp, 'calloutDescription')
  const urgency = firstSearchParam(sp, 'calloutUrgency')
  const status = firstSearchParam(sp, 'calloutStatus')
  if (!title && !description?.trim()) return null
  return {
    title: title || 'Call-out',
    description: description?.trim() ? description : null,
    urgency: urgency?.trim() ? urgency : null,
    status: status?.trim() ? status : null,
  }
}

export default async function CompanionMapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login?next=/app/map')

  const sp = await searchParams
  const supervisionPlus = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])

  const [cases, callOuts, polygons, caseTypes] = await Promise.all([
    fetchCaseMapMarkers(supervisionPlus, session.user.id),
    fetchCallOutMapMarkers(),
    fetchMapPolygons(),
    fetchCaseTypes(supervisionPlus),
  ])

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
  const mapStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE?.trim() || null

  const address = firstSearchParam(sp, 'address')?.trim() || null
  const calloutOverlay = buildCalloutOverlay(sp)

  return (
    <div className="-mx-4 -mt-2 flex min-h-0 flex-1 flex-col">
      {!token ? (
        <p className="px-4 py-4 text-sm text-danger">NEXT_PUBLIC_MAPBOX_TOKEN is not configured.</p>
      ) : (
        <CompanionMap
          mapboxToken={token}
          mapboxStyleUrl={mapStyle}
          viewerRole={session.profile.role}
          viewerId={session.user.id}
          initialCases={cases}
          initialCallOuts={callOuts}
          initialPolygons={polygons}
          caseTypes={caseTypes}
          addressQuery={address}
          calloutOverlay={calloutOverlay}
        />
      )}
    </div>
  )
}
