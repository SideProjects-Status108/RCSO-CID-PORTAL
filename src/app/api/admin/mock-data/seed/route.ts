import { NextResponse } from 'next/server'

import { requireStrictAdmin } from '@/lib/admin/require-strict-admin'
import { seedMockTrainingData } from '@/lib/admin/mock-data-service'
import { createServiceRoleClient } from '@/lib/supabase/admin'

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
    const result = await seedMockTrainingData(svc)
    console.info('[mock-data] SEED requested by admin', gate.session.user.id, new Date().toISOString())
    return NextResponse.json({
      status: 'seeded',
      total_users: result.accounts.length,
      accounts: result.accounts.map((a) => ({
        email: a.email,
        name: a.full_name,
        role: a.role,
        password: a.password,
      })),
      pairings_created: result.pairings_created,
      dit_records_created: result.dit_records_created,
      exposures_created: result.exposures_created,
      weekly_sessions_created: result.weekly_sessions_created,
      competency_scores_created: result.competency_scores_created,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Seed failed'
    const code = msg.includes('already exist') ? 409 : 500
    return NextResponse.json({ error: msg }, { status: code })
  }
}
