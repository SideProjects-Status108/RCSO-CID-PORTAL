import { readFile } from 'fs/promises'
import path from 'path'

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const EMPTY = '{"type":"FeatureCollection","features":[]}\n'

/**
 * Serves optional zone polygons for the field map. Same-origin, session-auth,
 * so this never hits the static-file + middleware edge cases that can break
 * fetches to `/public/data/*.geojson`.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const filePath = path.join(process.cwd(), 'public', 'data', 'zones.geojson')
  let body: string
  try {
    body = await readFile(filePath, 'utf8')
  } catch {
    body = EMPTY
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/geo+json; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
