import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { addDeficiencyAction } from '@/lib/training/queries'
import type { DeficiencyFormAction } from '@/types/training'

type PostBody = Partial<DeficiencyFormAction> & {
  deficiency_form_id?: string
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: deficiency_form_id } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    await addDeficiencyAction({
      ...body,
      deficiency_form_id,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to record deficiency action'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
