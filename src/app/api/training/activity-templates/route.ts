import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('training_activity_templates')
    .select(
      'id, activity_name, category, required_exposures_phase_1, required_exposures_phase_2, required_exposures_phase_3, description'
    )
    .order('category')
    .order('activity_name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: data ?? [] })
}
