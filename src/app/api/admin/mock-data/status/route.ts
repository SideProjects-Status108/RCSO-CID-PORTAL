import { NextResponse } from 'next/server'

import { requireStrictAdmin } from '@/lib/admin/require-strict-admin'
import { getMockDataStatus } from '@/lib/admin/mock-data-service'
import { createServiceRoleClient } from '@/lib/supabase/admin'

const EXPECTED_MOCK_USERS = 35

export async function GET() {
  const gate = await requireStrictAdmin()
  if (!gate.ok) return gate.response

  const svc = createServiceRoleClient()
  if (!svc) {
    return NextResponse.json({
      service_role_configured: false,
      seeded: false,
      mock_user_count: 0,
      expected: EXPECTED_MOCK_USERS,
      status_label: 'not_seeded',
    })
  }

  try {
    const { seeded, mock_user_count } = await getMockDataStatus(svc)
    const status_label =
      mock_user_count === 0
        ? 'not_seeded'
        : mock_user_count === EXPECTED_MOCK_USERS
          ? 'ready'
          : 'partial'
    return NextResponse.json({
      service_role_configured: true,
      seeded,
      mock_user_count,
      expected: EXPECTED_MOCK_USERS,
      status_label,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Status failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
