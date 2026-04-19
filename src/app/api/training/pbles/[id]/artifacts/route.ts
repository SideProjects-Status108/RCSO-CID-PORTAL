import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { insertArtifact, listArtifacts } from '@/lib/training/pble-queries'

// GET  /api/training/pbles/[id]/artifacts  — list artifacts + signed URLs
// POST /api/training/pbles/[id]/artifacts  — multipart upload for a new artifact
//
// Files live in the training-documents bucket under a pble/<id>/ prefix.
// RLS on pto_pble_artifacts and the bucket's policies provide the
// ultimate permission check; we only need to be authed here.

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await context.params

  try {
    const artifacts = await listArtifacts(id)
    const supabase = await createClient()
    const withUrls = await Promise.all(
      artifacts.map(async (a) => {
        const { data } = await supabase.storage
          .from(a.storage_bucket)
          .createSignedUrl(a.object_path, 60 * 5)
        return { ...a, signed_url: data?.signedUrl ?? null }
      }),
    )
    return NextResponse.json({ artifacts: withUrls })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list artifacts'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await context.params

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = form.get('file')
  const title = ((form.get('title') as string | null) ?? '').trim()
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  const MAX_BYTES = 25 * 1024 * 1024
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 25 MB)' }, { status: 400 })
  }
  const resolvedTitle = title || (file instanceof File ? file.name : 'artifact')

  const extFromName =
    file instanceof File && file.name ? file.name.split('.').pop()?.toLowerCase() ?? '' : ''
  const ext = extFromName ? `.${extFromName.replace(/[^a-z0-9]/g, '')}` : ''
  const objectPath = `pble/${id}/${crypto.randomUUID()}${ext}`

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
    const artifact = await insertArtifact({
      pble_id: id,
      uploaded_by: session.user.id,
      title: resolvedTitle,
      object_path: objectPath,
      mime_type: file.type || 'application/octet-stream',
      byte_size: file.size,
    })
    const { data } = await supabase.storage
      .from('training-documents')
      .createSignedUrl(objectPath, 60 * 5)
    return NextResponse.json({ artifact: { ...artifact, signed_url: data?.signedUrl ?? null } })
  } catch (e) {
    await supabase.storage.from('training-documents').remove([objectPath])
    const msg = e instanceof Error ? e.message : 'Failed to register artifact'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
