'use server'

import { revalidatePath } from 'next/cache'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { hasRole, UserRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import type { Feature, Polygon } from 'geojson'

function isPolygonFeature(g: unknown): g is Feature<Polygon> {
  if (!g || typeof g !== 'object') return false
  const f = g as Feature<Polygon>
  return (
    f.type === 'Feature' &&
    f.geometry?.type === 'Polygon' &&
    Array.isArray(f.geometry.coordinates)
  )
}

export async function saveMapPolygonAction(input: {
  label: string
  color: string
  geojson: unknown
  operation_name?: string | null
  case_id?: string | null
}) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const label = input.label?.trim()
  if (!label) throw new Error('Label is required')
  if (!isPolygonFeature(input.geojson)) throw new Error('Invalid polygon geometry')

  const supabase = await createClient()
  const { error } = await supabase.from('map_polygons').insert({
    label,
    color: input.color?.trim() || '#C8A84B',
    geojson: input.geojson,
    operation_name: input.operation_name?.trim() || null,
    case_id: input.case_id?.trim() || null,
    created_by: session.user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/map')
}

export async function deleteMapPolygonAction(polygonId: string) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { data: row, error: fe } = await supabase
    .from('map_polygons')
    .select('created_by')
    .eq('id', polygonId)
    .maybeSingle()
  if (fe || !row) throw new Error('Not found')

  const supervision = hasRole(session.profile.role, [
    UserRole.admin,
    UserRole.supervision_admin,
    UserRole.supervision,
  ])
  if (String(row.created_by) !== session.user.id && !supervision) {
    throw new Error('Forbidden')
  }

  const { error } = await supabase.from('map_polygons').delete().eq('id', polygonId)
  if (error) throw new Error(error.message)
  revalidatePath('/map')
}
