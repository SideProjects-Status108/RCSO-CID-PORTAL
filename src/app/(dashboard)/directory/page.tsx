import { redirect } from 'next/navigation'

export default async function DirectoryLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  const sp = await searchParams
  const q = sp.userId ? `?userId=${encodeURIComponent(sp.userId)}` : ''
  redirect(`/personnel${q}`)
}
