'use server'

import { revalidatePath } from 'next/cache'

import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

export async function setTnBookmarkAction(sectionId: string, bookmarked: boolean) {
  const session = await getSessionUserWithProfile()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  const uid = session.user.id

  if (bookmarked) {
    const { error } = await supabase.from('tn_bookmarks').insert({
      user_id: uid,
      section_id: sectionId,
    })
    if (error && error.code !== '23505') {
      throw new Error(error.message)
    }
  } else {
    const { error } = await supabase
      .from('tn_bookmarks')
      .delete()
      .eq('user_id', uid)
      .eq('section_id', sectionId)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/tools/tca')
  revalidatePath('/tn-code')
}
