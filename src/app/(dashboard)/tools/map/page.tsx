import { redirect } from 'next/navigation'

import { FieldMapDynamic } from '@/components/map/field-map-dynamic'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { fetchCaseTypes } from '@/lib/operations/queries'
import { fetchCaseMapMarkers, fetchCallOutMapMarkers, fetchMapPolygons } from '@/lib/map/queries'

export const dynamic = 'force-dynamic'

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string }>
}) {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

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
  const mapStyle =
    process.env.NEXT_PUBLIC_MAPBOX_STYLE?.trim() || 'mapbox://styles/mapbox/streets-v12'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border-subtle px-4 py-3 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary uppercase">
          Field map
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Investigative map: cases, call-outs, drawn areas, and zones. Reference only — not evidence storage.
        </p>
      </div>
      {!token ? (
        <p className="p-4 text-sm text-danger">NEXT_PUBLIC_MAPBOX_TOKEN is not configured.</p>
      ) : (
        <FieldMapDynamic
          mapboxToken={token}
          mapboxStyleUrl={mapStyle}
          viewerRole={session.profile.role}
          viewerId={session.user.id}
          initialCases={cases}
          initialCallOuts={callOuts}
          initialPolygons={polygons}
          caseTypes={caseTypes}
          addressQuery={sp.address ?? null}
        />
      )}
    </div>
  )
}
