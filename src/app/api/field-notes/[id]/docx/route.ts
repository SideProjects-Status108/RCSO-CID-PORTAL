import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { buildFieldNoteDocx } from '@/lib/field-notes/docx'
import { mapFieldNoteRow } from '@/lib/field-notes/queries'
import type { FieldNoteRow } from '@/types/field-notes'

function filenameFor(note: FieldNoteRow) {
  const base = note.title
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 72)
  const safe = base || `field-note-${note.id.slice(0, 8)}`
  return `${safe}.docx`
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const { data, error } = await supabase.from('field_notes').select('*').eq('id', id).maybeSingle()
  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const note = mapFieldNoteRow(data as Record<string, unknown>)
  const buffer = await buildFieldNoteDocx(note)

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filenameFor(note)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
