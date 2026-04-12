import type { Feature, Polygon } from 'geojson'

export type CaseMapMarker = {
  id: string
  case_number: string
  case_type_id: string
  case_type_name: string | null
  assigned_detective: string | null
  assigned_name: string | null
  status: string
  date_opened: string | null
  latitude: number
  longitude: number
}

export type CallOutMapMarker = {
  id: string
  title: string
  urgency: string
  status: string
  created_by: string
  creator_name: string | null
  created_at: string
  latitude: number
  longitude: number
}

export type MapPolygonRow = {
  id: string
  label: string
  color: string
  geojson: Feature<Polygon>
  case_id: string | null
  case_number: string | null
  operation_name: string | null
  created_by: string
  created_at: string
}
