const DEFAULT_FALLBACK = '/dashboard'
const MAX_REDIRECT_LEN = 2048

/**
 * Returns a path+search safe for same-origin redirects after auth.
 * Blocks open redirects (absolute URLs, protocol-relative `//`, encoded `//`, etc.).
 * Use for `next` / post-login targets from query strings — never pass user input
 * directly to `new URL(unknown, origin)` or `router.push(unknown)`.
 */
export function sanitizeInternalRedirect(
  raw: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK
): string {
  const fb = normalizeFallback(fallback)

  if (raw == null || typeof raw !== 'string') return fb

  let s = raw.trim()
  if (!s || s.length > MAX_REDIRECT_LEN) return fb

  if (/[\0\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(s)) return fb

  for (let i = 0; i < 4; i++) {
    try {
      const decoded = decodeURIComponent(s)
      if (decoded === s) break
      s = decoded
    } catch {
      return fb
    }
    if (s.length > MAX_REDIRECT_LEN) return fb
  }

  if (!s.startsWith('/')) return fb
  if (s.startsWith('//')) return fb

  const q = s.indexOf('?')
  const pathPart = q === -1 ? s : s.slice(0, q)
  if (pathPart.includes('//') || pathPart.includes('\\')) return fb

  const lower = s.toLowerCase()
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return fb
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) return fb

  return s
}

function normalizeFallback(fallback: string): string {
  const t = fallback.trim()
  if (
    t.startsWith('/') &&
    !t.startsWith('//') &&
    t.length <= MAX_REDIRECT_LEN &&
    !t.includes('\\') &&
    !/[\0\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(t)
  ) {
    return t
  }
  return DEFAULT_FALLBACK
}
