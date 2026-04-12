import { redirect } from 'next/navigation'

export default async function TnCodeLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x))
    else qs.set(k, v)
  }
  const tail = qs.toString()
  redirect(tail ? `/tools/tca?${tail}` : '/tools/tca')
}
