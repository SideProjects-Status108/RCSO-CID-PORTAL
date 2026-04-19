import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type {
  EquipmentCheckoff,
  EquipmentCheckoffItem,
  EquipmentCheckoffStatus,
} from '@/types/training'

function fail(msg: string, err?: unknown): never {
  const suffix = err instanceof Error ? `: ${err.message}` : ''
  throw new Error(`${msg}${suffix}`)
}

function parseItems(raw: unknown): EquipmentCheckoffItem[] {
  if (!Array.isArray(raw)) return []
  const out: EquipmentCheckoffItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const r = entry as Record<string, unknown>
    const key = String(r.key ?? '').trim()
    const label = String(r.label ?? '').trim()
    if (!key || !label) continue
    out.push({
      key,
      label,
      checked: Boolean(r.checked),
      serial: r.serial != null ? String(r.serial) : null,
      note: r.note != null ? String(r.note) : null,
    })
  }
  return out
}

function mapRow(r: Record<string, unknown>): EquipmentCheckoff {
  return {
    id: String(r.id),
    dit_record_id: String(r.dit_record_id),
    status: r.status as EquipmentCheckoffStatus,
    items: parseItems(r.items),
    notes: r.notes != null ? String(r.notes) : null,
    signature_route_id: r.signature_route_id != null ? String(r.signature_route_id) : null,
    issued_by: r.issued_by != null ? String(r.issued_by) : null,
    issued_at: r.issued_at != null ? String(r.issued_at) : null,
    signed_at: r.signed_at != null ? String(r.signed_at) : null,
    voided_at: r.voided_at != null ? String(r.voided_at) : null,
    voided_by: r.voided_by != null ? String(r.voided_by) : null,
    void_reason: r.void_reason != null ? String(r.void_reason) : null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

export async function fetchEquipmentCheckoffForDit(
  dit_record_id: string,
): Promise<EquipmentCheckoff | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipment_checkoffs')
    .select('*')
    .eq('dit_record_id', dit_record_id)
    .maybeSingle()
  if (error) fail('Failed to load equipment checkoff', error)
  return data ? mapRow(data as Record<string, unknown>) : null
}

export async function fetchEquipmentCheckoffById(
  id: string,
): Promise<EquipmentCheckoff | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipment_checkoffs')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) fail('Failed to load equipment checkoff', error)
  return data ? mapRow(data as Record<string, unknown>) : null
}

export async function upsertEquipmentCheckoffDraft(input: {
  dit_record_id: string
  items: EquipmentCheckoffItem[]
  notes: string | null
}): Promise<EquipmentCheckoff> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipment_checkoffs')
    .upsert(
      {
        dit_record_id: input.dit_record_id,
        items: input.items,
        notes: input.notes,
        status: 'draft',
      },
      { onConflict: 'dit_record_id' },
    )
    .select('*')
    .single()
  if (error) fail('Failed to upsert equipment checkoff', error)
  return mapRow(data as Record<string, unknown>)
}

export async function updateEquipmentCheckoff(input: {
  id: string
  items?: EquipmentCheckoffItem[]
  notes?: string | null
}): Promise<EquipmentCheckoff> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = {}
  if (input.items) patch.items = input.items
  if (input.notes !== undefined) patch.notes = input.notes
  const { data, error } = await supabase
    .from('equipment_checkoffs')
    .update(patch)
    .eq('id', input.id)
    .select('*')
    .single()
  if (error) fail('Failed to update equipment checkoff', error)
  return mapRow(data as Record<string, unknown>)
}

export async function markEquipmentCheckoffIssued(params: {
  id: string
  issued_by: string
  signature_route_id: string
}): Promise<EquipmentCheckoff> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipment_checkoffs')
    .update({
      status: 'issued',
      issued_by: params.issued_by,
      issued_at: new Date().toISOString(),
      signature_route_id: params.signature_route_id,
    })
    .eq('id', params.id)
    .select('*')
    .single()
  if (error) fail('Failed to mark equipment checkoff issued', error)
  return mapRow(data as Record<string, unknown>)
}

export async function markEquipmentCheckoffSigned(id: string): Promise<EquipmentCheckoff> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipment_checkoffs')
    .update({ status: 'signed', signed_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) fail('Failed to mark equipment checkoff signed', error)
  return mapRow(data as Record<string, unknown>)
}

export async function voidEquipmentCheckoff(params: {
  id: string
  voided_by: string
  void_reason: string | null
}): Promise<EquipmentCheckoff> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipment_checkoffs')
    .update({
      status: 'voided',
      voided_by: params.voided_by,
      voided_at: new Date().toISOString(),
      void_reason: params.void_reason,
    })
    .eq('id', params.id)
    .select('*')
    .single()
  if (error) fail('Failed to void equipment checkoff', error)
  return mapRow(data as Record<string, unknown>)
}
