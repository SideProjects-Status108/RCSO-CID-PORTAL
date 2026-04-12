'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { circle } from '@turf/turf'
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson'
import { useRouter } from 'next/navigation'
import {
  CircleDot,
  Locate,
  PenLine,
  Camera,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'

import { saveMapPolygonAction, deleteMapPolygonAction } from '@/app/(dashboard)/map/actions'
import { cn } from '@/lib/utils'
import type { CallOutMapMarker, CaseMapMarker, MapPolygonRow } from '@/types/map'
import type { CaseTypeRow } from '@/types/operations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/app/modal'
import { hasRole, UserRole, type UserRoleValue } from '@/lib/auth/roles'

import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

/** Same-origin worker required — cross-origin workers (e.g. unpkg) throw SecurityError under CSP. */
const MAPBOX_WORKER_PATH = '/mapbox-gl-csp-worker.js'

const ACCENT = '#1E6FD9'
const MAP_FONTS: [string, string] = ['DIN Offc Pro Medium', 'Arial Unicode MS Regular']

function caseColor(caseTypeId: string): string {
  let h = 0
  for (let i = 0; i < caseTypeId.length; i++) h = (h + caseTypeId.charCodeAt(i) * 13) % 360
  return `hsl(${h} 70% 52%)`
}

function toCaseGeoJSON(
  cases: CaseMapMarker[],
  filters: {
    types: Set<string>
    det: string
    status: string
    dateMin: string
    dateMax: string
  }
): FeatureCollection<Point> {
  const feats = cases.filter((c) => {
    if (filters.types.size > 0 && !filters.types.has(c.case_type_id)) return false
    if (filters.det !== 'all' && c.assigned_detective !== filters.det) return false
    if (filters.status !== 'all' && c.status !== filters.status) return false
    const d = c.date_opened
    if (d) {
      if (filters.dateMin && d < filters.dateMin) return false
      if (filters.dateMax && d > filters.dateMax) return false
    }
    return true
  })
  return {
    type: 'FeatureCollection',
    features: feats.map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
      properties: {
        id: c.id,
        case_number: c.case_number,
        case_type_name: c.case_type_name,
        assigned_name: c.assigned_name,
        status: c.status,
        date_opened: c.date_opened,
        color: caseColor(c.case_type_id),
      },
    })),
  }
}

function callOutGeoJSON(rows: CallOutMapMarker[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: rows.map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
      properties: {
        id: r.id,
        title: r.title,
        urgency: r.urgency,
        status: r.status,
        creator_name: r.creator_name,
        created_at: r.created_at,
      },
    })),
  }
}

function polygonFc(rows: MapPolygonRow[]): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: rows.map((p) => ({
      type: 'Feature',
      id: p.id,
      geometry: p.geojson.geometry,
      properties: {
        id: p.id,
        label: p.label,
        color: p.color,
        case_number: p.case_number,
        operation_name: p.operation_name,
        created_by: p.created_by,
        created_at: p.created_at,
      },
    })),
  }
}

export type FieldMapProps = {
  mapboxToken: string
  viewerRole: UserRoleValue
  viewerId: string
  initialCases: CaseMapMarker[]
  initialCallOuts: CallOutMapMarker[]
  initialPolygons: MapPolygonRow[]
  caseTypes: CaseTypeRow[]
  addressQuery?: string | null
}

export function FieldMap({
  mapboxToken,
  viewerRole,
  viewerId,
  initialCases,
  initialCallOuts,
  initialPolygons,
  caseTypes,
  addressQuery,
}: FieldMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<'none' | 'draw' | 'radius' | 'locate'>('none')
  const [layersOpen, setLayersOpen] = useState(true)
  const [layerCases, setLayerCases] = useState(false)
  const [layerCallouts, setLayerCallouts] = useState(false)
  const [layerPolys, setLayerPolys] = useState(false)
  const [layerZones, setLayerZones] = useState(false)
  const [zonesMissing, setZonesMissing] = useState(false)
  const [search, setSearch] = useState('')
  const [polygons, setPolygons] = useState(initialPolygons)
  useEffect(() => {
    setPolygons(initialPolygons)
  }, [initialPolygons])
  const [cases] = useState(initialCases)
  const [callOuts] = useState(initialCallOuts)
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set())
  const [detFilter, setDetFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const dateBounds = useMemo(() => {
    let min = '1970-01-01'
    let max = new Date().toISOString().slice(0, 10)
    for (const c of cases) {
      if (c.date_opened) {
        if (c.date_opened < min) min = c.date_opened
        if (c.date_opened > max) max = c.date_opened
      }
    }
    return { min, max }
  }, [cases])
  const [dateMin, setDateMin] = useState(dateBounds.min)
  const [dateMax, setDateMax] = useState(dateBounds.max)
  const [radiusCenter, setRadiusCenter] = useState<[number, number] | null>(null)
  const [radiusMiles, setRadiusMiles] = useState(1)
  const [radiusCount, setRadiusCount] = useState<number | null>(null)
  const [drawModal, setDrawModal] = useState<Feature<Polygon> | null>(null)
  const [polyLabel, setPolyLabel] = useState('')
  const [polyColor, setPolyColor] = useState(ACCENT)
  const [polyOp, setPolyOp] = useState('')
  const [polyCaseId, setPolyCaseId] = useState('')
  const [savingPoly, setSavingPoly] = useState(false)

  const filters = useMemo(
    () => ({
      types: typeFilter,
      det: detFilter,
      status: statusFilter,
      dateMin,
      dateMax,
    }),
    [typeFilter, detFilter, statusFilter, dateMin, dateMax]
  )

  const caseData = useMemo(() => toCaseGeoJSON(cases, filters), [cases, filters])
  const caseCount = caseData.features.length

  const detectives = useMemo(() => {
    const s = new Set<string>()
    for (const c of cases) {
      if (c.assigned_detective) s.add(c.assigned_detective)
    }
    return [...s]
  }, [cases])

  const router = useRouter()

  const applySources = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const src = (id: string, data: object) => {
      if (map.getSource(id)) {
        ;(map.getSource(id) as mapboxgl.GeoJSONSource).setData(data as never)
      }
    }
    src('cases-src', caseData)
    src('callouts-src', callOutGeoJSON(callOuts))
    src('polys-src', polygonFc(polygons))
  }, [caseData, callOuts, polygons])

  useEffect(() => {
    applySources()
  }, [applySources])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const container = containerRef.current
    mapboxgl.accessToken = mapboxToken
    mapboxgl.workerUrl = new URL(MAPBOX_WORKER_PATH, window.location.origin).href
    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-86.5, 35.85],
      zoom: 8,
    })
    const safeResize = () => {
      try {
        map.resize()
      } catch {
        /* map torn down */
      }
    }
    const ro = new ResizeObserver(() => safeResize())
    ro.observe(container)
    requestAnimationFrame(() => {
      safeResize()
      requestAnimationFrame(safeResize)
    })
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: false, trash: false },
    })
    map.addControl(draw)
    drawRef.current = draw

    map.on('load', () => {
      safeResize()
      map.addSource('cases-src', {
        type: 'geojson',
        data: caseData,
        cluster: true,
        clusterMaxZoom: 11,
        clusterRadius: 50,
      })
      map.addLayer({
        id: 'cases-cluster',
        type: 'circle',
        source: 'cases-src',
        filter: ['has', 'point_count'],
        layout: { visibility: 'none' },
        paint: {
          'circle-color': '#1E6FD9',
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 50, 28],
        },
      })
      map.addLayer({
        id: 'cases-cluster-count',
        type: 'symbol',
        source: 'cases-src',
        filter: ['has', 'point_count'],
        layout: {
          visibility: 'none',
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': MAP_FONTS,
          'text-size': 12,
        },
        paint: { 'text-color': '#111' },
      })
      map.addLayer({
        id: 'cases-pin',
        type: 'circle',
        source: 'cases-src',
        filter: ['!', ['has', 'point_count']],
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 7,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#111',
        },
      })

      map.addSource('callouts-src', {
        type: 'geojson',
        data: callOutGeoJSON(callOuts),
      })
      map.addLayer({
        id: 'callouts-pin',
        type: 'circle',
        source: 'callouts-src',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 8,
          'circle-color': '#2dd4bf',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })

      map.addSource('polys-src', {
        type: 'geojson',
        data: polygonFc(polygons),
      })
      map.addLayer({
        id: 'polys-fill',
        type: 'fill',
        source: 'polys-src',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.15,
        },
      })
      map.addLayer({
        id: 'polys-line',
        type: 'line',
        source: 'polys-src',
        layout: { visibility: 'none' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
        },
      })

      map.addSource('zones-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'zones-fill',
        type: 'fill',
        source: 'zones-src',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ACCENT,
          'fill-opacity': 0.08,
        },
      })
      map.addLayer({
        id: 'zones-line',
        type: 'line',
        source: 'zones-src',
        layout: { visibility: 'none' },
        paint: {
          'line-color': ACCENT,
          'line-opacity': 0.6,
          'line-width': 1.5,
        },
      })
      map.addLayer({
        id: 'zones-label',
        type: 'symbol',
        source: 'zones-src',
        layout: {
          visibility: 'none',
          'text-field': ['get', 'name'],
          'text-font': MAP_FONTS,
          'text-size': 12,
        },
        paint: {
          'text-color': ACCENT,
        },
        minzoom: 11,
      })

      map.addSource('radius-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius-src',
        layout: { visibility: 'visible' },
        paint: { 'fill-color': '#fff', 'fill-opacity': 0.06 },
      })
      map.addLayer({
        id: 'radius-line',
        type: 'line',
        source: 'radius-src',
        layout: { visibility: 'visible' },
        paint: { 'line-color': '#fff', 'line-opacity': 0.4 },
      })

      void fetch('/api/map/zones', { credentials: 'same-origin' })
        .then(async (r) => {
          if (!r.ok) return null
          const ct = r.headers.get('content-type') ?? ''
          if (!ct.includes('json')) return null
          return r.json() as Promise<unknown>
        })
        .then((gj) => {
          if (gj && typeof gj === 'object' && (gj as { type?: string }).type === 'FeatureCollection') {
            ;(map.getSource('zones-src') as mapboxgl.GeoJSONSource).setData(gj as never)
          } else {
            setZonesMissing(true)
          }
        })
        .catch(() => setZonesMissing(true))
    })

    map.on('draw.create', (e: mapboxgl.MapboxEvent & { features?: Feature[] }) => {
      const f = e.features?.[0]
      if (f?.geometry?.type === 'Polygon') {
        setDrawModal(f as Feature<Polygon>)
        draw.deleteAll()
        setTool('none')
      }
    })

    map.on('click', (e) => {
      if (tool === 'radius') {
        setRadiusCenter([e.lngLat.lng, e.lngLat.lat])
      }
    })

    mapRef.current = map
    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [mapboxToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const vis = (id: string, on: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
    }
    vis('cases-cluster', layerCases)
    vis('cases-cluster-count', layerCases)
    vis('cases-pin', layerCases)
    vis('callouts-pin', layerCallouts)
    vis('polys-fill', layerPolys)
    vis('polys-line', layerPolys)
    vis('zones-fill', layerZones)
    vis('zones-line', layerZones)
    vis('zones-label', layerZones)
  }, [layerCases, layerCallouts, layerPolys, layerZones])

  useEffect(() => {
    const map = mapRef.current
    const draw = drawRef.current
    if (!map || !draw) return
    if (tool === 'draw') {
      draw.changeMode('draw_polygon')
    } else {
      draw.changeMode('simple_select')
    }
  }, [tool])

  useEffect(() => {
    if (!radiusCenter || !mapRef.current) {
      setRadiusCount(null)
      if (mapRef.current?.getSource('radius-src')) {
        ;(mapRef.current.getSource('radius-src') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        })
      }
      return
    }
    const poly = circle(radiusCenter, radiusMiles, { steps: 64, units: 'miles' })
    ;(mapRef.current.getSource('radius-src') as mapboxgl.GeoJSONSource).setData(poly)
    const [lng, lat] = radiusCenter
    const inside = cases.filter((c) => {
      const dx = (c.longitude - lng) * 54
      const dy = c.latitude - lat
      const mi = Math.sqrt(dx * dx + dy * dy) * 69
      return mi <= radiusMiles
    })
    setRadiusCount(inside.length)
  }, [radiusCenter, radiusMiles, cases])

  useEffect(() => {
    if (!addressQuery?.trim() || !mapRef.current) return
    const q = encodeURIComponent(addressQuery)
    void fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${mapboxToken}&limit=1`
    )
      .then((r) => r.json())
      .then((j) => {
        const ft = j?.features?.[0]
        if (ft?.center && mapRef.current) {
          mapRef.current.flyTo({ center: ft.center, zoom: 14 })
          new mapboxgl.Popup()
            .setLngLat(ft.center)
            .setHTML(`<div class="text-sm">${ft.place_name ?? 'Location'}</div>`)
            .addTo(mapRef.current)
        }
      })
  }, [addressQuery, mapboxToken])

  const runSearch = () => {
    const q = search.trim()
    if (!q || !mapRef.current) return
    const enc = encodeURIComponent(q)
    void fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${enc}.json?access_token=${mapboxToken}&limit=1`
    )
      .then((r) => r.json())
      .then((j) => {
        const ft = j?.features?.[0]
        if (ft?.center && mapRef.current) {
          const [lng, lat] = ft.center as [number, number]
          mapRef.current.flyTo({ center: [lng, lat], zoom: 15 })
          const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
          new mapboxgl.Popup({ closeButton: true })
            .setLngLat([lng, lat])
            .setHTML(
              `<div class="max-w-xs space-y-2 text-sm">
                <div>${ft.place_name ?? ''}</div>
                <div style="font-family: ui-monospace, monospace; font-size: 12px">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
                <a class="text-accent-primary underline" href="${mapsUrl}" target="_blank" rel="noreferrer">Open in Google Maps</a>
                <button type="button" id="copy-coords" class="block w-full rounded border px-2 py-1 text-xs">Copy coordinates</button>
              </div>`
            )
            .addTo(mapRef.current)
          setTimeout(() => {
            const b = document.getElementById('copy-coords')
            b?.addEventListener('click', () => {
              void navigator.clipboard.writeText(`${lat}, ${lng}`)
            })
          }, 0)
        }
      })
  }

  const snapshot = () => {
    const map = mapRef.current
    if (!map) return
    const url = map.getCanvas().toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `cid-map-snapshot-${new Date().toISOString().slice(0, 10)}.png`
    a.click()
  }

  const locateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return
    navigator.geolocation.getCurrentPosition((pos) => {
      mapRef.current?.flyTo({
        center: [pos.coords.longitude, pos.coords.latitude],
        zoom: 14,
      })
    })
  }

  const saveDrawn = async () => {
    if (!drawModal || !polyLabel.trim()) return
    setSavingPoly(true)
    try {
      await saveMapPolygonAction({
        label: polyLabel.trim(),
        color: polyColor,
        geojson: drawModal,
        operation_name: polyOp.trim() || null,
        case_id: polyCaseId.trim() || null,
      })
      setDrawModal(null)
      setPolyLabel('')
      setPolyOp('')
      setPolyCaseId('')
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setSavingPoly(false)
    }
  }

  const swatches = ['#1E6FD9', '#2dd4bf', '#ef4444', '#94a3b8', '#64748b', '#e2e8f0']

  return (
    <div className="relative flex h-[calc(100dvh-12rem)] min-h-[22rem] w-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-bg-app md:h-[calc(100dvh-13rem)]">
      <div ref={containerRef} className="absolute inset-0 min-h-0 w-full" />

      <div className="pointer-events-none absolute left-2 top-14 z-10 flex flex-col gap-1 md:left-3">
        <div className="pointer-events-auto flex flex-col gap-1 rounded-lg border border-border-subtle bg-bg-surface/95 p-1 shadow-md backdrop-blur-sm">
          <ToolBtn
            active={tool === 'draw'}
            label="Draw polygon"
            onClick={() => setTool((t) => (t === 'draw' ? 'none' : 'draw'))}
          >
            <PenLine className="size-4" />
          </ToolBtn>
          <ToolBtn
            active={tool === 'radius'}
            label="Radius tool"
            onClick={() => setTool((t) => (t === 'radius' ? 'none' : 'radius'))}
          >
            <CircleDot className="size-4" />
          </ToolBtn>
          <ToolBtn label="My location" onClick={() => locateMe()}>
            <Locate className="size-4" />
          </ToolBtn>
          {tool !== 'none' ? (
            <ToolBtn
              label="Clear selection"
              onClick={() => {
                setTool('none')
                setRadiusCenter(null)
              }}
            >
              <X className="size-4" />
            </ToolBtn>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute right-2 top-14 z-10 md:right-3">
        <div className="pointer-events-auto w-[min(100%,280px)] rounded-lg border border-border-subtle bg-bg-surface/95 p-3 shadow-md backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-text-primary"
              onClick={() => setLayersOpen((o) => !o)}
            >
              {layersOpen ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              Layers
            </button>
            <Button type="button" size="xs" variant="outline" className="gap-1" onClick={() => snapshot()}>
              <Camera className="size-3.5" />
              Snapshot
            </Button>
          </div>
          {layersOpen ? (
            <div className="space-y-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={layerCases} onChange={(e) => setLayerCases(e.target.checked)} />
                Case pins ({caseCount})
              </label>
              {layerCases ? (
                <div className="ml-6 space-y-2 border-l border-border-subtle pl-2 text-xs text-text-secondary">
                  <div>
                    <Label className="text-[10px] uppercase">Case types</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {caseTypes.map((ct) => (
                        <button
                          key={ct.id}
                          type="button"
                          className={cn(
                            'rounded px-1.5 py-0.5',
                            typeFilter.has(ct.id) ? 'bg-accent-primary/30 text-text-primary' : 'bg-bg-elevated'
                          )}
                          onClick={() =>
                            setTypeFilter((prev) => {
                              const n = new Set(prev)
                              if (n.has(ct.id)) n.delete(ct.id)
                              else n.add(ct.id)
                              return n
                            })
                          }
                        >
                          {ct.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase">Detective</Label>
                    <select
                      className="mt-1 w-full rounded border border-border-subtle bg-bg-app px-1 py-0.5"
                      value={detFilter}
                      onChange={(e) => setDetFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      {detectives.map((id) => (
                        <option key={id} value={id}>
                          {id.slice(0, 8)}…
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase">Status</Label>
                    <select
                      className="mt-1 w-full rounded border border-border-subtle bg-bg-app px-1 py-0.5"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase">Date opened</Label>
                    <input
                      type="range"
                      className="mt-1 w-full"
                      min={dateBounds.min}
                      max={dateBounds.max}
                      value={dateMax}
                      onChange={(e) => setDateMax(e.target.value)}
                    />
                    <div className="flex justify-between text-[10px]">
                      <span>{dateMin}</span>
                      <span>{dateMax}</span>
                    </div>
                  </div>
                </div>
              ) : null}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={layerCallouts}
                  onChange={(e) => setLayerCallouts(e.target.checked)}
                />
                Call-out history
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={layerPolys} onChange={(e) => setLayerPolys(e.target.checked)} />
                Drawn areas
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={layerZones} onChange={(e) => setLayerZones(e.target.checked)} />
                Zones
              </label>
              {zonesMissing && layerZones ? (
                <p className="text-xs text-danger">Zone file not found</p>
              ) : null}
              {tool === 'radius' && radiusCenter ? (
                <div className="rounded border border-border-subtle p-2 text-xs">
                  <p className="mb-1 font-medium text-text-primary">Radius (miles)</p>
                  <div className="flex flex-wrap gap-1">
                    {[0.25, 0.5, 1, 2, 5].map((m) => (
                      <Button key={m} type="button" size="xs" variant="outline" onClick={() => setRadiusMiles(m)}>
                        {m}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-text-secondary">
                    {radiusCount != null ? `${radiusCount} cases within ${radiusMiles} mi` : ''}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <form
        className="pointer-events-none absolute left-1/2 top-3 z-10 flex w-[min(96%,420px)] -translate-x-1/2 gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          runSearch()
        }}
      >
        <Input
          className="pointer-events-auto bg-bg-surface/95 shadow-md backdrop-blur-sm"
          placeholder="Search address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" className="pointer-events-auto shrink-0">
          Go
        </Button>
      </form>

      {drawModal ? (
        <Modal
          open
          title="Save drawn area"
          onOpenChange={(o) => {
            if (!o) setDrawModal(null)
          }}
        >
          <div className="space-y-3 p-1">
            <div>
              <Label>Label</Label>
              <Input value={polyLabel} onChange={(e) => setPolyLabel(e.target.value)} required />
            </div>
            <div>
              <Label>Color</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {swatches.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn('size-7 rounded-full border-2', polyColor === c ? 'border-white' : 'border-transparent')}
                    style={{ backgroundColor: c }}
                    onClick={() => setPolyColor(c)}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Operation name (optional)</Label>
              <Input value={polyOp} onChange={(e) => setPolyOp(e.target.value)} />
            </div>
            <div>
              <Label>Case ID (optional)</Label>
              <Input value={polyCaseId} onChange={(e) => setPolyCaseId(e.target.value)} placeholder="UUID" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDrawModal(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={savingPoly || !polyLabel.trim()} onClick={() => void saveDrawn()}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

function ToolBtn({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        'flex size-9 items-center justify-center rounded-md border border-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
        active && 'border-accent-primary/50 bg-accent-primary/15 text-accent-primary'
      )}
    >
      {children}
    </button>
  )
}
