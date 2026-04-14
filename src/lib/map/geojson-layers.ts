export type GeojsonLayerType = 'fill' | 'line' | 'circle' | 'symbol'

export interface GeojsonLayerDef {
  id: string
  label: string
  file: string
  type: GeojsonLayerType
  color: string
  opacity: number
  defaultVisible: boolean
}

/** Static assets only — filenames must stay allowlisted (no user-controlled paths). */
export const RUTHERFORD_GEOJSON_BASE = '/geojson/rutherford'

export const GEOJSON_LAYERS: GeojsonLayerDef[] = [
  {
    id: 'county-boundary',
    label: 'County Boundary',
    file: 'county-boundary.geojson',
    type: 'line',
    color: '#1E6FD9',
    opacity: 0.8,
    defaultVisible: true,
  },
  {
    id: 'municipal-boundaries',
    label: 'City / Town Limits',
    file: 'municipal-boundaries.geojson',
    type: 'line',
    color: '#4A7C7E',
    opacity: 0.6,
    defaultVisible: false,
  },
  {
    id: 'census-tracts',
    label: 'Census Tracts',
    file: 'census-tracts.geojson',
    type: 'line',
    color: '#8A8880',
    opacity: 0.4,
    defaultVisible: false,
  },
  {
    id: 'roads',
    label: 'Major Roads',
    file: 'roads.geojson',
    type: 'line',
    color: '#E8C84B',
    opacity: 0.5,
    defaultVisible: false,
  },
  {
    id: 'schools',
    label: 'Schools',
    file: 'schools.geojson',
    type: 'circle',
    color: '#A84040',
    opacity: 0.8,
    defaultVisible: false,
  },
  {
    id: 'cid-zones',
    label: 'CID Zones',
    file: 'cid-zones.geojson',
    type: 'fill',
    color: '#1E6FD9',
    opacity: 0.15,
    defaultVisible: false,
  },
]

export function initialRutherfordOverlayVisibility(): Record<string, boolean> {
  return Object.fromEntries(GEOJSON_LAYERS.map((l) => [l.id, l.defaultVisible]))
}
