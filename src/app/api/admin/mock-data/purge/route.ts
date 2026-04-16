import { NextResponse } from 'next/server'

import { requireStrictAdmin } from '@/lib/admin/require-strict-admin'
import { purgeMockTrainingData } from '@/lib/admin/mock-data-service'
import { createServiceRoleClient } from '@/lib/supabase/admin'

export async function DELETE() {
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
    const result = await purgeMockTrainingData(svc)
    console.info('[mock-data] PURGE requested by admin', gate.session.user.id, new Date().toISOString())
    return NextResponse.json({
      status: 'not_seeded',
      users_deleted: result.users_deleted,
      pairings_deleted: result.pairings_deleted,
      message:
        result.users_deleted === 0
          ? 'No mock-*@rcso.local users found.'
          : `Removed ${result.users_deleted} auth user(s) and related training rows.`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Purge failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
