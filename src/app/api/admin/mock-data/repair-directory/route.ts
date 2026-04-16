import { NextResponse } from 'next/server'

import { repairMockPersonnelDirectory } from '@/lib/admin/mock-data-service'
import { requireStrictAdmin } from '@/lib/admin/require-strict-admin'
import { createServiceRoleClient } from '@/lib/supabase/admin'

/** Backfill personnel_directory for mock users (no purge). */
export async function POST() {
  const gate = await requireStrictAdmin()
  if (!gate.ok) return gate.response

  const svc = createServiceRoleClient()
  if (!svc) {
    return NextResponse.json(
      { error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set.' },
      { status: 503 }
    )
  }

  try {
    const result = await repairMockPersonnelDirectory(svc)
    console.info('[mock-data] REPAIR-DIRECTORY by admin', gate.session.user.id, new Date().toISOString())
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Repair failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
