import { redirect } from 'next/navigation'

import { CompanionTnCodeView } from '@/components/companion/companion-tn-code-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import {
  fetchBookmarkSectionIds,
  fetchTnBookmarksForUser,
  fetchTnRecentsForUser,
} from '@/lib/tn-code/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CompanionTnCodePage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login?next=/app/tn-code')

  const [initialBookmarks, initialRecents, bookmarkSet] = await Promise.all([
    fetchTnBookmarksForUser(session.user.id),
    fetchTnRecentsForUser(session.user.id, 10),
    fetchBookmarkSectionIds(session.user.id),
  ])

  return (
    <CompanionTnCodeView
      initialBookmarks={initialBookmarks}
      initialRecents={initialRecents}
      initialBookmarkSectionIds={[...bookmarkSet]}
    />
  )
}
