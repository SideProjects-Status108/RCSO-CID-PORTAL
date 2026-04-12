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
  Minus,
  Plus,
  Search,
  X,
} from 'lucide-react'

import { saveMapPolygonAction, deleteMapPolygonAction } from '@/app/(dashboard)/map/actions'
import { geocodeAddress } from '@/lib/mapbox/geocode'
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

function webgl2Available() {
  const canvas = document.createElement('canvas')
  return Boolean(canvas.getContext('webgl2'))
}

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

/** Optional call-out context for address deep links (Requests / companion app). */
export type FieldMapCalloutOverlay = {
  title: string
  description?: string | null
  urgency?: string | null
  status?: string | null
}

export type FieldMapProps = {
  mapboxToken: string
  /** Mapbox Studio style URL, e.g. `mapbox://styles/<user>/<style_id>`. */
  mapboxStyleUrl: string
  viewerRole: UserRoleValue
  viewerId: string
  initialCases: CaseMapMarker[]
  initialCallOuts: CallOutMapMarker[]
  initialPolygons: MapPolygonRow[]
  caseTypes: CaseTypeRow[]
  addressQuery?: string | null
  /** When set with `addressQuery`, shown in the geocoded location popup. */
  calloutOverlay?: FieldMapCalloutOverlay | null
  /** Companion `/app/map`: minimal chrome, no draw/layers panel. */
  companionMode?: boolean
}

export function FieldMap({
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
  companionMode = false,
}: FieldMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const searchPopupRef = useRef<mapboxgl.Popup | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<'none' | 'draw' | 'radius' | 'locate'>('none')
  const [layersOpen, setLayersOpen] = useState(true)
  const [layerCases, setLayerCases] = useState(false)
  const [layerCallouts, setLayerCallouts] = useState(false)
  const [layerPolys, setLayerPolys] = useState(false)
  const [layerZones, setLayerZones] = useState(false)
  const [zonesMissing, setZonesMissing] = useState(false)
  const [search, setSearch] = useState('')
  const [companionSearchOpen, setCompanionSearchOpen] = useState(false)
  const locateClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
  const [mapRenderError, setMapRenderError] = useState<string | null>(null)
  const toolRef = useRef(tool)
  toolRef.current = tool

  const calloutOverlayRef = useRef(calloutOverlay ?? null)
  calloutOverlayRef.current = calloutOverlay ?? null

  const removeSearchPopup = useCallback(() => {
    searchPopupRef.current?.remove()
    searchPopupRef.current = null
  }, [])

  const openGeocodeResultPopup = useCallback(
    (
      map: mapboxgl.Map,
      lng: number,
      lat: number,
      placeName: string,
      callout?: FieldMapCalloutOverlay | null
    ) => {
      removeSearchPopup()
      const root = document.createElement('div')
      root.className = 'space-y-2 text-sm text-neutral-900'

      const title = document.createElement('p')
      title.className = 'm-0 font-medium leading-snug'
      title.textContent = placeName
      root.appendChild(title)

      const co = callout
      if (co && (co.title?.trim() || co.description?.trim())) {
        const sep = document.createElement('hr')
        sep.className = 'm-0 border-0 border-t border-neutral-200'
        root.appendChild(sep)

        const coLabel = document.createElement('p')
        coLabel.className =
          'm-0 text-[10px] font-semibold uppercase tracking-wide text-neutral-500'
        coLabel.textContent = 'Call-out'
        root.appendChild(coLabel)

        const coTitle = document.createElement('p')
        coTitle.className = 'm-0 font-semibold leading-snug text-neutral-900'
        coTitle.textContent = co.title.trim() || 'Call-out'
        root.appendChild(coTitle)

        if (co.description?.trim()) {
          const desc = document.createElement('p')
          desc.className = 'm-0 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-neutral-800'
          desc.textContent = co.description.trim()
          root.appendChild(desc)
        }

        const chips = document.createElement('div')
        chips.className = 'flex flex-wrap gap-1'
        if (co.urgency?.trim()) {
          const u = document.createElement('span')
          u.className = 'rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-800'
          u.textContent = co.urgency.trim()
          chips.appendChild(u)
        }
        if (co.status?.trim()) {
          const st = document.createElement('span')
          st.className = 'rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-800'
          st.textContent = co.status.trim().replaceAll('_', ' ')
          chips.appendChild(st)
        }
        if (chips.childNodes.length) root.appendChild(chips)
      }

      const coords = document.createElement('p')
      coords.className = 'm-0 font-mono text-xs text-neutral-600'
      coords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      root.appendChild(coords)

      const copyBtn = document.createElement('button')
      copyBtn.type = 'button'
      copyBtn.className =
        'mt-1 w-full cursor-pointer rounded border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-200'
      copyBtn.textContent = 'Copy coordinates'
      copyBtn.addEventListener('click', () => {
        void navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
      })
      root.appendChild(copyBtn)

      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth:
          co && (co.title?.trim() || co.description?.trim())
            ? 'min(100vw - 32px, 380px)'
            : 'min(100vw - 32px, 280px)',
        className: 'cid-geocode-popup',
      })
        .setLngLat([lng, lat])
        .setDOMContent(root)
        .addTo(map)

      popup.on('close', () => {
        if (searchPopupRef.current === popup) searchPopupRef.current = null
      })
      searchPopupRef.current = popup
    },
    [removeSearchPopup]
  )

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
    if (!companionMode) return
    setLayerCases(false)
    setLayerCallouts(false)
    setLayerPolys(false)
    setLayerZones(false)
    setLayersOpen(false)
    setTool('none')
  }, [companionMode])

  const locateUserCompanion = useCallback(() => {
    if (!navigator.geolocation || !mapRef.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current
        if (!map?.isStyleLoaded()) return
        const { longitude, latitude, accuracy } = pos.coords
        map.flyTo({ center: [longitude, latitude], zoom: 14 })
        const src = map.getSource('user-locate-src') as mapboxgl.GeoJSONSource | undefined
        if (src) {
          const accKm = Math.max(accuracy ?? 40, 25) / 1000
          const poly = circle([longitude, latitude], accKm, { steps: 64, units: 'kilometers' })
          src.setData(poly as never)
        }
        if (locateClearTimerRef.current) clearTimeout(locateClearTimerRef.current)
        locateClearTimerRef.current = setTimeout(() => {
          const m = mapRef.current
          const s = m?.getSource('user-locate-src') as mapboxgl.GeoJSONSource | undefined
          if (s) {
            s.setData({ type: 'FeatureCollection', features: [] } as never)
          }
          locateClearTimerRef.current = null
        }, 90_000)
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 }
    )
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let gaveUpWebgl = false
    let map: mapboxgl.Map | null = null
    let draw: MapboxDraw | null = null

    const safeResize = () => {
      try {
        map?.resize()
      } catch {
        /* map torn down */
      }
    }

    const tryCreateMap = () => {
      if (disposed || gaveUpWebgl || mapRef.current || map) return
      if (container.clientWidth < 32 || container.clientHeight < 32) return

      if (!webgl2Available()) {
        gaveUpWebgl = true
        setMapRenderError(
          'Your browser cannot run WebGL 2, which Mapbox GL JS v3 requires. Try another browser or turn off strict privacy / GPU-saving modes.',
        )
        return
      }

      setMapRenderError(null)
      mapboxgl.accessToken = mapboxToken
      mapboxgl.workerUrl = new URL(MAPBOX_WORKER_PATH, window.location.origin).href

      map = new mapboxgl.Map({
        container,
        style: mapboxStyleUrl,
        center: [-86.5, 35.85],
        zoom: 8,
      })
      mapRef.current = map

      map.on('error', (ev) => {
        console.error('[field-map] map error', ev)
        const err = (ev as { error?: { message?: string } }).error
        setMapRenderError((prev) => prev ?? err?.message ?? 'Map failed to load.')
      })

      if (!companionMode) {
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
        draw = new MapboxDraw({
          displayControlsDefault: false,
          controls: { polygon: false, trash: false },
        })
        map.addControl(draw)
        drawRef.current = draw
      } else {
        drawRef.current = null
      }

      requestAnimationFrame(() => {
        safeResize()
        requestAnimationFrame(safeResize)
      })

      map.on('load', () => {
        if (!map) return
        const m = map
        safeResize()
        m.addSource('cases-src', {
        type: 'geojson',
        data: caseData,
        cluster: true,
        clusterMaxZoom: 11,
        clusterRadius: 50,
      })
      m.addLayer({
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
      m.addLayer({
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
      m.addLayer({
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

      m.addSource('callouts-src', {
        type: 'geojson',
        data: callOutGeoJSON(callOuts),
      })
      m.addLayer({
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

      m.addSource('polys-src', {
        type: 'geojson',
        data: polygonFc(polygons),
      })
      m.addLayer({
        id: 'polys-fill',
        type: 'fill',
        source: 'polys-src',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.15,
        },
      })
      m.addLayer({
        id: 'polys-line',
        type: 'line',
        source: 'polys-src',
        layout: { visibility: 'none' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
        },
      })

      m.addSource('zones-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      m.addLayer({
        id: 'zones-fill',
        type: 'fill',
        source: 'zones-src',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ACCENT,
          'fill-opacity': 0.08,
        },
      })
      m.addLayer({
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
      m.addLayer({
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

      m.addSource('radius-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      m.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius-src',
        layout: { visibility: 'visible' },
        paint: { 'fill-color': '#fff', 'fill-opacity': 0.06 },
      })
      m.addLayer({
        id: 'radius-line',
        type: 'line',
        source: 'radius-src',
        layout: { visibility: 'visible' },
        paint: { 'line-color': '#fff', 'line-opacity': 0.4 },
      })

      if (companionMode) {
        m.addSource('user-locate-src', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        m.addLayer({
          id: 'user-locate-fill',
          type: 'fill',
          source: 'user-locate-src',
          paint: { 'fill-color': ACCENT, 'fill-opacity': 0.14 },
        })
        m.addLayer({
          id: 'user-locate-line',
          type: 'line',
          source: 'user-locate-src',
          paint: { 'line-color': ACCENT, 'line-width': 2, 'line-opacity': 0.85 },
        })
      }

      void fetch('/api/map/zones', { credentials: 'same-origin' })
        .then(async (r) => {
          if (!r.ok) return null
          const ct = r.headers.get('content-type') ?? ''
          if (!ct.includes('json')) return null
          return r.json() as Promise<unknown>
        })
        .then((gj) => {
          if (gj && typeof gj === 'object' && (gj as { type?: string }).type === 'FeatureCollection') {
            ;(m.getSource('zones-src') as mapboxgl.GeoJSONSource).setData(gj as never)
          } else {
            setZonesMissing(true)
          }
        })
        .catch(() => setZonesMissing(true))
      })

      if (!companionMode) {
        map.on('draw.create', (e: mapboxgl.MapboxEvent & { features?: Feature[] }) => {
          const f = e.features?.[0]
          if (f?.geometry?.type === 'Polygon') {
            setDrawModal(f as Feature<Polygon>)
            draw?.deleteAll()
            setTool('none')
          }
        })
      }

      map.on('click', (e) => {
        if (toolRef.current === 'radius') {
          setRadiusCenter([e.lngLat.lng, e.lngLat.lat])
        }
      })
    }

    const ro = new ResizeObserver(() => {
      tryCreateMap()
      safeResize()
    })
    ro.observe(container)
    tryCreateMap()

    return () => {
      disposed = true
      if (locateClearTimerRef.current) {
        clearTimeout(locateClearTimerRef.current)
        locateClearTimerRef.current = null
      }
      ro.disconnect()
      searchPopupRef.current?.remove()
      searchPopupRef.current = null
      drawRef.current = null
      if (map) {
        map.remove()
      }
      mapRef.current = null
    }
  }, [mapboxToken, mapboxStyleUrl, companionMode])

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
    void geocodeAddress(addressQuery, mapboxToken).then((hit) => {
      const map = mapRef.current
      if (!hit || !map) return
      map.flyTo({ center: [hit.lng, hit.lat], zoom: 14 })
      openGeocodeResultPopup(map, hit.lng, hit.lat, hit.placeName, calloutOverlayRef.current)
    })
  }, [addressQuery, mapboxToken, openGeocodeResultPopup])

  const runSearch = () => {
    const q = search.trim()
    if (!q || !mapRef.current) return
    void geocodeAddress(q, mapboxToken).then((hit) => {
      const mapNow = mapRef.current
      if (!hit || !mapNow) return
      mapNow.flyTo({ center: [hit.lng, hit.lat], zoom: 15 })
      openGeocodeResultPopup(mapNow, hit.lng, hit.lat, hit.placeName, null)
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
    <div
      className={cn(
        'relative isolate flex w-full flex-col bg-bg-app',
        companionMode
          ? 'h-[calc(100dvh-7.5rem)] min-h-[18rem] rounded-none border-0 md:h-[calc(100dvh-7.5rem)]'
          : 'h-[calc(100dvh-12rem)] min-h-[22rem] rounded-lg border border-border-subtle md:h-[calc(100dvh-13rem)]'
      )}
      style={{ transform: 'translateZ(0)' }}
    >
      <div ref={containerRef} className="absolute inset-0 z-0 min-h-0 w-full" />
      {mapRenderError ? (
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-6 text-center">
          <p className="pointer-events-auto max-w-md rounded-lg border border-danger/40 bg-bg-surface/95 px-4 py-3 text-sm text-danger shadow-lg">
            {mapRenderError}
          </p>
        </div>
      ) : null}

      {!companionMode ? (
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
      ) : null}

      {!companionMode ? (
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
      ) : null}

      {!companionMode ? (
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
      ) : null}

      {companionMode ? (
        <>
          <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[min(100%,calc(100%-5rem))] items-start gap-1">
            {!companionSearchOpen ? (
              <button
                type="button"
                title="Search address"
                aria-label="Open address search"
                onClick={() => setCompanionSearchOpen(true)}
                className="pointer-events-auto flex size-12 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface/95 text-text-primary shadow-md backdrop-blur-sm"
              >
                <Search className="size-5" />
              </button>
            ) : (
              <form
                className="pointer-events-auto flex w-[min(100%,280px)] gap-1 rounded-lg border border-border-subtle bg-bg-surface/95 p-1 shadow-md backdrop-blur-sm"
                onSubmit={(e) => {
                  e.preventDefault()
                  runSearch()
                  setCompanionSearchOpen(false)
                }}
              >
                <Input
                  className="h-12 min-h-12 flex-1 border-0 bg-transparent text-base shadow-none"
                  placeholder="Address…"
                  value={search}
                  autoFocus
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button type="submit" className="h-12 shrink-0 px-3">
                  Go
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 shrink-0 px-2"
                  onClick={() => setCompanionSearchOpen(false)}
                  aria-label="Close search"
                >
                  <X className="size-4" />
                </Button>
              </form>
            )}
          </div>
          <div className="pointer-events-none absolute right-2 top-2 z-10">
            <button
              type="button"
              title="My location"
              aria-label="My location"
              onClick={() => locateUserCompanion()}
              className="pointer-events-auto flex size-12 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface/95 text-text-primary shadow-md backdrop-blur-sm"
            >
              <Locate className="size-6" />
            </button>
          </div>
          <div className="pointer-events-none absolute bottom-20 right-2 z-10 flex flex-col gap-2">
            <button
              type="button"
              className="pointer-events-auto flex size-12 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface/95 text-text-primary shadow-md backdrop-blur-sm"
              aria-label="Zoom in"
              onClick={() => mapRef.current?.zoomIn({ duration: 200 })}
            >
              <Plus className="size-6" />
            </button>
            <button
              type="button"
              className="pointer-events-auto flex size-12 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface/95 text-text-primary shadow-md backdrop-blur-sm"
              aria-label="Zoom out"
              onClick={() => mapRef.current?.zoomOut({ duration: 200 })}
            >
              <Minus className="size-6" />
            </button>
          </div>
        </>
      ) : null}

      {!companionMode && drawModal ? (
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
