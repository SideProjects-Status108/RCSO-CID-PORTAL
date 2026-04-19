import { createClient } from '@/lib/supabase/server'
import type {
  DocumentCategory,
  DocumentVisibility,
  TrainingDocument,
} from '@/types/training'

function mapDocument(r: Record<string, unknown>): TrainingDocument {
  return {
    id: String(r.id),
    title: String(r.title),
    description: (r.description as string | null) ?? null,
    category: r.category as DocumentCategory,
    visibility: r.visibility as DocumentVisibility,
    storage_bucket: String(r.storage_bucket),
    object_path: String(r.object_path),
    mime_type: String(r.mime_type),
    byte_size: Number(r.byte_size ?? 0),
    uploaded_by: String(r.uploaded_by),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }
}

export async function listDocuments(): Promise<TrainingDocument[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_documents')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapDocument(r as Record<string, unknown>))
}

export async function insertDocument(input: {
  title: string
  description?: string | null
  category: DocumentCategory
  visibility: DocumentVisibility
  object_path: string
  mime_type: string
  byte_size: number
  uploaded_by: string
}): Promise<TrainingDocument> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_documents')
    .insert({
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      visibility: input.visibility,
      storage_bucket: 'training-documents',
      object_path: input.object_path,
      mime_type: input.mime_type,
      byte_size: input.byte_size,
      uploaded_by: input.uploaded_by,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to insert document')
  return mapDocument(data as Record<string, unknown>)
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: row, error: fetchErr } = await supabase
    .from('training_documents')
    .select('object_path, storage_bucket')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr) throw new Error(fetchErr.message)
  const { error } = await supabase.from('training_documents').delete().eq('id', id)
  if (error) throw new Error(error.message)
  if (row) {
    const r = row as { object_path: string; storage_bucket: string }
    await supabase.storage.from(r.storage_bucket).remove([r.object_path])
  }
}

export async function signDownloadUrl(
  objectPath: string,
  expiresIn = 60 * 5,
): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('training-documents')
    .createSignedUrl(objectPath, expiresIn)
  if (error || !data) return null
  return data.signedUrl
}
