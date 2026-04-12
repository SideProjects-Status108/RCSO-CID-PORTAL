/**
 * Mapbox forward geocoding (Geocoding API v5 — same endpoint as `FieldMap`).
 * @see https://docs.mapbox.com/api/search/geocoding/
 */
export type GeocodeResult = {
  lng: number
  lat: number
  placeName: string
}

export async function geocodeAddress(
  address: string,
  accessToken: string
): Promise<GeocodeResult | null> {
  const q = address.trim()
  if (!q || !accessToken.trim()) return null
  const enc = encodeURIComponent(q)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${enc}.json?access_token=${accessToken}&limit=1`
  const res = await fetch(url)
  if (!res.ok) return null
  const j = (await res.json()) as {
    features?: { center?: [number, number]; place_name?: string }[]
  }
  const ft = j?.features?.[0]
  const c = ft?.center
  if (!c || c.length < 2) return null
  return {
    lng: c[0],
    lat: c[1],
    placeName: String(ft.place_name ?? 'Location'),
  }
}
