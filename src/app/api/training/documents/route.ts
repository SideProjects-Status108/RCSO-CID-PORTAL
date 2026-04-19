import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { insertDocument, listDocuments, signDownloadUrl } from '@/lib/training/document-queries'
import { DOCUMENT_CATEGORIES, DOCUMENT_VISIBILITIES, type DocumentCategory, type DocumentVisibility } from '@/types/training'

// GET /api/training/documents
//   Lists visible documents (RLS handles visibility). Each row is
//   augmented with a short-lived signed URL for download, so the list
//   view can link directly to the file.
export async function GET() {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const docs = await listDocuments()
    const withUrls = await Promise.all(
      docs.map(async (d) => ({
        ...d,
        signed_url: await signDownloadUrl(d.object_path),
      })),
    )
    return NextResponse.json({ documents: withUrls })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list documents'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/training/documents
//   multipart/form-data:
//     file:        <Blob>                 (required)
//     title:       string                  (required)
//     description: string                  (optional)
//     category:    DocumentCategory        (default 'policy')
//     visibility:  DocumentVisibility      (default 'all')
//
// Uploads the blob to the 'training-documents' bucket through the
// authed client, then inserts the metadata row. Storage + RLS write
// permissions both require is_training_writer(); either failure rolls
// back (we don't retain the stored object if the row insert fails).
export async function POST(request: Request) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json(
      { error: 'Expected multipart/form-data' },
      { status: 400 },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = form.get('file')
  const title = (form.get('title') as string | null)?.trim() ?? ''
  const description = ((form.get('description') as string | null) ?? '').trim() || null
  const categoryRaw = ((form.get('category') as string | null) ?? 'policy').trim() as DocumentCategory
  const visibilityRaw = ((form.get('visibility') as string | null) ?? 'all').trim() as DocumentVisibility

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!DOCUMENT_CATEGORIES.includes(categoryRaw)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (!DOCUMENT_VISIBILITIES.includes(visibilityRaw)) {
    return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 })
  }
  const MAX_BYTES = 25 * 1024 * 1024
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 25 MB)' }, { status: 400 })
  }

  const extFromName =
    file instanceof File && file.name ? file.name.split('.').pop()?.toLowerCase() ?? '' : ''
  const ext = extFromName ? `.${extFromName.replace(/[^a-z0-9]/g, '')}` : ''
  const uniqueId = crypto.randomUUID()
  const objectPath = `${new Date().toISOString().slice(0, 10)}/${uniqueId}${ext}`

  const supabase = await createClient()
  const { error: uploadErr } = await supabase.storage
    .from('training-documents')
    .upload(objectPath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  try {
    const row = await insertDocument({
      title,
      description,
      category: categoryRaw,
      visibility: visibilityRaw,
      object_path: objectPath,
      mime_type: file.type || 'application/octet-stream',
      byte_size: file.size,
      uploaded_by: session.user.id,
    })
    return NextResponse.json({
      document: { ...row, signed_url: await signDownloadUrl(row.object_path) },
    })
  } catch (e) {
    await supabase.storage.from('training-documents').remove([objectPath])
    const msg = e instanceof Error ? e.message : 'Failed to register upload'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
