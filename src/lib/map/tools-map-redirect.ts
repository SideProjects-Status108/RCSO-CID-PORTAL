/**
 * Preserve all search params when forwarding legacy or companion map URLs to `/tools/map`.
 */
export async function toolsMapPathFromSearchParams(
  searchParams: Promise<Record<string, string | string[] | undefined>>
): Promise<string> {
  const sp = await searchParams
  const q = new URLSearchParams()
  for (const [key, val] of Object.entries(sp)) {
    if (val === undefined) continue
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item !== undefined && item !== '') q.append(key, item)
      }
    } else if (val !== '') {
      q.set(key, val)
    }
  }
  const s = q.toString()
  return s ? `/tools/map?${s}` : '/tools/map'
}
