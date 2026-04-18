import { randomBytes } from 'node:crypto'

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getPublicOrigin } from '@/lib/url/public-origin'
import { logTrainingEmailPreview } from '@/lib/email/training-notifications'
import { requireJsonSession } from '@/lib/training/api-auth'
import { trainingFullRead } from '@/lib/training/access'

function generateToken(): string {
  return randomBytes(24).toString('base64url')
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response
  if (!trainingFullRead(gate.session.profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await ctx.params

  const supabase = await createClient()

  const { data: dit, error: ditErr } = await supabase
    .from('dit_records')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()
  if (ditErr) return NextResponse.json({ error: ditErr.message }, { status: 500 })
  if (!dit) return NextResponse.json({ error: 'DIT not found' }, { status: 404 })

  // Mark any existing pending surveys as expired before issuing the new link.
  await supabase
    .from('dit_surveys')
    .update({ status: 'expired' })
    .eq('dit_record_id', id)
    .eq('status', 'pending')

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error: insErr } = await supabase.from('dit_surveys').insert({
    dit_record_id: id,
    token,
    status: 'pending',
    expires_at: expiresAt,
    created_by: gate.session.user.id,
  })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  const origin = await getPublicOrigin()
  const link = `${origin}/survey/${token}`

  // Resolve DIT email for the preview (service role).
  const { createServiceRoleClient } = await import('@/lib/supabase/admin')
  const admin = createServiceRoleClient()
  let ditEmail: string | undefined
  if (admin) {
    const { data } = await admin.auth.admin.getUserById(String((dit as { user_id: string }).user_id))
    ditEmail = data.user?.email ?? undefined
  }

  logTrainingEmailPreview(
    'onboarding_survey_resend',
    'New pre-start survey link',
    `<p>Your pre-start survey link has been refreshed. It expires in 7 days: <a href="${link}">${link}</a></p>`,
    ditEmail
  )

  return NextResponse.json({ token, survey_link: link, expires_at: expiresAt })
}
