'use client'

import { FieldMapDynamic } from '@/components/map/field-map-dynamic'
import type { FieldMapCalloutOverlay } from '@/components/map/field-map'
import type { CallOutMapMarker, CaseMapMarker, MapPolygonRow } from '@/types/map'
import type { CaseTypeRow } from '@/types/operations'
import type { UserRoleValue } from '@/lib/auth/roles'

const COMPANION_MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'

export function CompanionMap({
  mapboxToken,
  mapboxStyleUrl,
  viewerRole,
  viewerId,
  initialCases,
  initialCallOuts,
  initialPolygons,
  caseTypes,
  addressQuery,
  calloutOverlay,
}: {
  mapboxToken: string
  mapboxStyleUrl?: string | null
  viewerRole: UserRoleValue
  viewerId: string
  initialCases: CaseMapMarker[]
  initialCallOuts: CallOutMapMarker[]
  initialPolygons: MapPolygonRow[]
  caseTypes: CaseTypeRow[]
  addressQuery?: string | null
  calloutOverlay?: FieldMapCalloutOverlay | null
}) {
  const style =
    mapboxStyleUrl?.trim() && mapboxStyleUrl.trim().length > 0
      ? mapboxStyleUrl.trim()
      : COMPANION_MAP_STYLE

  return (
    <div className="-mx-4 -mt-2 flex min-h-0 flex-1 flex-col">
      <FieldMapDynamic
        mapboxToken={mapboxToken}
        mapboxStyleUrl={style}
        viewerRole={viewerRole}
        viewerId={viewerId}
        initialCases={initialCases}
        initialCallOuts={initialCallOuts}
        initialPolygons={initialPolygons}
        caseTypes={caseTypes}
        addressQuery={addressQuery ?? null}
        calloutOverlay={calloutOverlay ?? null}
        companionMode
      />
    </div>
  )
}
