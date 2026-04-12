import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { CallOutMapMarker, CaseMapMarker, MapPolygonRow } from '@/types/map'

export async function fetchCaseMapMarkers(
  supervisionPlus: boolean,
  userId: string
): Promise<CaseMapMarker[]> {
  const supabase = await createClient()
  let q = supabase
    .from('cases')
    .select(
      `
      id,
      case_number,
      case_type_id,
      status,
      date_opened,
      assigned_detective,
      latitude,
      longitude,
      case_types ( name )
    `
    )
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  if (!supervisionPlus) {
    q = q.or(`assigned_detective.eq.${userId},created_by.eq.${userId}`)
  }

  const { data, error } = await q
  if (error || !data) return []

  const detectiveIds = [
    ...new Set(
      data
        .map((r) => r.assigned_detective as string | null)
        .filter((x): x is string => Boolean(x))
    ),
  ]
  const nameById: Record<string, string> = {}
  if (detectiveIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', detectiveIds)
    for (const p of profs ?? []) {
      nameById[String(p.id)] = String(p.full_name ?? '')
    }
  }

  return data.map((r) => {
    const ct = r.case_types as { name?: string } | null
    const lat = Number(r.latitude)
    const lng = Number(r.longitude)
    const aid = r.assigned_detective != null ? String(r.assigned_detective) : null
    return {
      id: String(r.id),
      case_number: String(r.case_number ?? ''),
      case_type_id: String(r.case_type_id),
      case_type_name: ct?.name ?? null,
      assigned_detective: aid,
      assigned_name: aid ? nameById[aid] ?? null : null,
      status: String(r.status ?? ''),
      date_opened: r.date_opened != null ? String(r.date_opened) : null,
      latitude: lat,
      longitude: lng,
    }
  })
}

export async function fetchCallOutMapMarkers(): Promise<CallOutMapMarker[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('requests')
    .select('id, title, urgency, status, created_by, created_at, latitude, longitude')
    .eq('request_type', 'call_out')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  if (error || !data) return []

  const creatorIds = [...new Set(data.map((r) => String(r.created_by)))]
  const nameById: Record<string, string> = {}
  if (creatorIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', creatorIds)
    for (const p of profs ?? []) {
      nameById[String(p.id)] = String(p.full_name ?? '')
    }
  }

  return data.map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ''),
    urgency: String(r.urgency ?? ''),
    status: String(r.status ?? ''),
    created_by: String(r.created_by),
    creator_name: nameById[String(r.created_by)] ?? null,
    created_at: String(r.created_at ?? ''),
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
  }))
}

export async function fetchMapPolygons(): Promise<MapPolygonRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('map_polygons')
    .select('id, label, color, geojson, case_id, operation_name, created_by, created_at')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  const caseIds = [
    ...new Set(
      data.map((r) => r.case_id as string | null).filter((x): x is string => Boolean(x))
    ),
  ]
  const caseNumById: Record<string, string> = {}
  if (caseIds.length > 0) {
    const { data: cs } = await supabase.from('cases').select('id, case_number').in('id', caseIds)
    for (const c of cs ?? []) {
      caseNumById[String(c.id)] = String(c.case_number ?? '')
    }
  }

  return data.map((r) => ({
    id: String(r.id),
    label: String(r.label ?? ''),
    color: String(r.color ?? '#C8A84B'),
    geojson: r.geojson as MapPolygonRow['geojson'],
    case_id: r.case_id != null ? String(r.case_id) : null,
    case_number: r.case_id != null ? caseNumById[String(r.case_id)] ?? null : null,
    operation_name: r.operation_name != null ? String(r.operation_name) : null,
    created_by: String(r.created_by),
    created_at: String(r.created_at ?? ''),
  }))
}
