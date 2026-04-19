import { NextResponse } from 'next/server'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { listTemplates } from '@/lib/training/pble-queries'

// GET /api/training/pble-templates
//   Lists active PBLE scenarios that coordinators can assign from.
export async function GET() {
  const session = await getSessionUserWithProfile()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const templates = await listTemplates()
    return NextResponse.json({ templates })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list PBLE templates'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
