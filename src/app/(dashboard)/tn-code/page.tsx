import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { TnCodeView } from '@/components/tn-code/tn-code-view'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import {
  fetchBookmarkSectionIds,
  fetchTnBookmarksForUser,
  fetchTnCodeTree,
  fetchTnRecentsForUser,
} from '@/lib/tn-code/queries'

export const dynamic = 'force-dynamic'

function TnCodeFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-text-secondary">
      Loading TN Code…
    </div>
  )
}

export default async function TnCodePage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const [tree, bookmarkIds, bookmarks, recents] = await Promise.all([
    fetchTnCodeTree(),
    fetchBookmarkSectionIds(session.user.id),
    fetchTnBookmarksForUser(session.user.id),
    fetchTnRecentsForUser(session.user.id),
  ])

  return (
    <Suspense fallback={<TnCodeFallback />}>
      <TnCodeView
        tree={tree}
        initialBookmarkIds={[...bookmarkIds]}
        initialBookmarks={bookmarks}
        initialRecents={recents}
      />
    </Suspense>
  )
}
