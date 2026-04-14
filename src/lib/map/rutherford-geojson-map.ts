import type { FeatureCollection } from 'geojson'
import type mapboxgl from 'mapbox-gl'

import { RUTHERFORD_GEOJSON_BASE, type GeojsonLayerDef } from '@/lib/map/geojson-layers'

export function overlaySourceId(layerId: string) {
  return `rutherford-overlay-${layerId}`
}

export function overlayLayerId(layerId: string) {
  return `rutherford-overlay-${layerId}-layer`
}

/** Safe URL for a known layer file (basename allowlist). */
export function rutherfordGeojsonUrl(def: GeojsonLayerDef): string {
  if (!/^[a-zA-Z0-9._-]+\.geojson$/.test(def.file)) {
    throw new Error(`Invalid GeoJSON filename: ${def.file}`)
  }
  return `${RUTHERFORD_GEOJSON_BASE}/${def.file}`
}

export function isFeatureCollection(x: unknown): x is FeatureCollection {
  return (
    typeof x === 'object' &&
    x !== null &&
    (x as FeatureCollection).type === 'FeatureCollection' &&
    Array.isArray((x as FeatureCollection).features)
  )
}

export async function fetchRutherfordGeojson(def: GeojsonLayerDef): Promise<FeatureCollection | null> {
  const url = rutherfordGeojsonUrl(def)
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) {
    console.warn(`[field-map] GeoJSON not found (${res.status}): ${url}`)
    return null
  }
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('json') && !ct.includes('geo+json')) {
    console.warn(`[field-map] GeoJSON unexpected content-type for ${url}`)
    return null
  }
  try {
    const data = (await res.json()) as unknown
    return isFeatureCollection(data) ? data : null
  } catch {
    return null
  }
}

function paintFor(def: GeojsonLayerDef): mapboxgl.LayerSpecification['paint'] {
  switch (def.type) {
    case 'fill':
      return {
        'fill-color': def.color,
        'fill-opacity': def.opacity,
      }
    case 'line':
      return {
        'line-color': def.color,
        'line-width': 1.5,
        'line-opacity': def.opacity,
      }
    case 'circle':
      return {
        'circle-color': def.color,
        'circle-radius': 5,
        'circle-opacity': def.opacity,
      }
    default:
      return {}
  }
}

/** Insert below operational data layers so cases/callouts stay on top. */
export function addOrUpdateRutherfordOverlay(
  map: mapboxgl.Map,
  def: GeojsonLayerDef,
  data: FeatureCollection,
  beforeId?: string
) {
  const sid = overlaySourceId(def.id)
  const lid = overlayLayerId(def.id)

  if (!map.getSource(sid)) {
    map.addSource(sid, { type: 'geojson', data })
  } else {
    ;(map.getSource(sid) as mapboxgl.GeoJSONSource).setData(data)
  }

  if (!map.getLayer(lid)) {
    const base = {
      id: lid,
      type: def.type,
      source: sid,
      layout: { visibility: 'visible' as const },
      paint: paintFor(def),
    }
    try {
      const spec = base as unknown as mapboxgl.LayerSpecification
      if (beforeId && map.getLayer(beforeId)) {
        map.addLayer(spec, beforeId)
      } else {
        map.addLayer(spec)
      }
    } catch (e) {
      console.error(`[field-map] addLayer failed for ${def.id}`, e)
    }
  } else {
    map.setLayoutProperty(lid, 'visibility', 'visible')
  }
}

export function setRutherfordOverlayVisibility(map: mapboxgl.Map, layerId: string, visible: boolean) {
  const lid = overlayLayerId(layerId)
  if (map.getLayer(lid)) {
    map.setLayoutProperty(lid, 'visibility', visible ? 'visible' : 'none')
  }
}
