import type { RequestRow } from '@/types/requests'

export function callOutAddress(r: RequestRow): string {
  const m = r.metadata
  const fromMeta = m && typeof m.address === 'string' ? m.address.trim() : ''
  if (fromMeta) return fromMeta
  return r.address?.trim() ?? ''
}

export function callOutCaseNumber(r: RequestRow): string | null {
  const m = r.metadata
  const cn = m && typeof m.case_number === 'string' ? m.case_number.trim() : ''
  return cn || null
}
